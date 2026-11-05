# ViajaJunto - Back-end

API REST do ViajaJunto: cadastro de pontos turísticos e avaliações feitas pelos viajantes.

Segue a arquitetura e as convenções do projeto de referência [ViajaJunto/viaja-junto.server](https://github.com/ViajaJunto/viaja-junto.server).

## Stack

| Camada | Tecnologia |
| ------ | ---------- |
| Runtime e framework | Node.js 22, NestJS 12, TypeScript (ESM) |
| Banco de dados | PostgreSQL 17 com Prisma 7 (driver adapter `pg`) |
| Validação | `class-validator` nos payloads, Zod nas variáveis de ambiente |
| Segurança HTTP | Helmet, CORS por allow-list, rate limit por IP (`@nestjs/throttler`) |
| Documentação | OpenAPI gerado pelos decorators do `@nestjs/swagger`, renderizado com Scalar |
| Testes e qualidade | Vitest (unit e e2e), oxlint, Prettier, Spectral, Trivy |
| Infraestrutura | Docker / Docker Compose, CloudFormation, EKS + ECR (Ministack) |

O código é organizado em módulos de feature, cada um com as camadas `domain / application / infrastructure / presentation`. As dependências só apontam para dentro (`presentation → application → domain ← infrastructure`).

## Pré-requisitos

- **Node.js 22.23.2** (está no `.nvmrc`; rode `nvm use`). O Nest CLI 12 não funciona em versões antigas do Node 22.
- npm 10. Instale com **`npm ci`**, que não reescreve o `package-lock.json`.
- Docker Desktop (com Compose).

## Como executar

```bash
nvm use
cp .env.example .env        # preencha o JWT_SECRET: openssl rand -base64 48
npm ci                      # também roda `prisma generate`
npm run db:up               # PostgreSQL no Docker
npx prisma migrate deploy   # cria as tabelas
npm run start:dev           # API em http://localhost:3000/api
```

- Documentação interativa: <http://localhost:3000/docs>
- Health check (API + banco): <http://localhost:3000/api/health>

### Tudo pelo Docker Compose

```bash
npm run stack:up                     # PostgreSQL, migrations e a API (com build)
docker compose --profile tools up -d # + Adminer em http://localhost:8080
npm run stack:logs
npm run stack:down
```

## Variáveis de ambiente

Todas são validadas na inicialização por [`src/shared/config/env.ts`](src/shared/config/env.ts). Se faltar alguma obrigatória, a API não sobe e lista os problemas. O [`.env.example`](.env.example) documenta cada uma.

| Variável | Obrigatória? | Padrão | O que é |
| -------- | ------------ | ------ | ------- |
| `DATABASE_URL` | **Sim** | — | Conexão PostgreSQL (`postgresql://...`) |
| `JWT_SECRET` | **Sim** | — | Segredo que assina os tokens, **mínimo de 32 caracteres** (`openssl rand -base64 48`) |
| `JWT_EXPIRES_IN` | Não | `3600` | Validade do token, em segundos |
| `NODE_ENV` | Não | `development` | `development`, `test` ou `production` |
| `PORT` | Não | `3000` | Porta HTTP |
| `API_PREFIX` | Não | `api` | Prefixo das rotas |
| `SWAGGER_PATH` | Não | `docs` | Caminho da documentação |
| `CORS_ORIGINS` | Não | `http://localhost:5173` | Origens permitidas, separadas por vírgula |
| `THROTTLE_TTL_SECONDS` / `THROTTLE_LIMIT` / `THROTTLE_WRITE_LIMIT` / `THROTTLE_STRICT_LIMIT` | Não | `60` / `300` / `60` / `10` | Janela e limites de requisições por IP |
| `TRUST_PROXY_HOPS` | Não | `0` | Quantos proxies existem na frente da API |

## Autenticação

Cadastro e login com email e senha. A senha é guardada só como hash (scrypt com salt), e as duas rotas devolvem um JWT:

```bash
curl -X POST http://localhost:3000/api/auth/register -H 'Content-Type: application/json' \
  -d '{"name":"Ana Souza","email":"ana@example.com","password":"viaja-junto-2026"}'

curl -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"ana@example.com","password":"viaja-junto-2026"}'

curl http://localhost:3000/api/auth/me -H "Authorization: Bearer <accessToken>"
```

Na documentação interativa, cole o token em **Authentication → Bearer**. As rotas com cadeado exigem `Authorization: Bearer <token>`; sem ele, respondem `401`.

## Endpoints

Todas as rotas usam o prefixo `/api`. Detalhes completos em `/docs`.

| Módulo | Rotas | Quem pode |
| ------ | ----- | --------- |
| Health | `GET /health` | Público |
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` | Público (cadastro e login); usuário autenticado (`me`) |

## Convenções da API

| Tema | Regra |
| ---- | ----- |
| Paginação | Listas aceitam `page` (padrão 1) e `limit` (padrão 20, máximo 100) e respondem `{ data, meta }` |
| Erros | Formato `{ statusCode, message, error }`; `422` lista todas as regras de validação violadas |
| Login | Email desconhecido e senha errada recebem o mesmo `401`, para não revelar quais contas existem |
| Rate limit | `429` com `Retry-After` quando o limite é excedido |

## Testes

```bash
npm test             # unitários (nunca tocam no banco)
npm run test:cov     # com cobertura (limites em vitest.config.ts)
npm run test:e2e     # ponta a ponta, contra um PostgreSQL real
```

Os testes e2e sobem a aplicação inteira. Use um banco separado:

```bash
docker compose exec postgres createdb -U postgres viajajunto_test
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/viajajunto_test?schema=public"
npx prisma migrate deploy
npm run test:e2e
```

## Qualidade e CI

Todo pull request roda [`.github/workflows/ci.yml`](.github/workflows/ci.yml): lint (oxlint + Prettier), testes (migrations, unitários com cobertura e e2e no PostgreSQL), contrato da API (OpenAPI validado pelo Spectral) e build da imagem com scan do Trivy.

Antes de abrir um PR:

```bash
npm run lint && npx prettier --check "src/**/*.ts" "test/**/*.ts"
npm run test:cov
npm run openapi:generate && npm run openapi:lint
```

## Estrutura

```
src/
├── main.ts, app.module.ts
├── shared/
│   ├── config/     Validação das variáveis de ambiente (Zod)
│   ├── database/   PrismaService e utilitários de consulta
│   ├── domain/     Tipos de domínio compartilhados (paginação)
│   └── http/       CORS, Helmet, rate limit, filtros de erro, OpenAPI, DTOs comuns
└── modules/<feature>/
    ├── domain/          Entidades e contratos de repositório, sem framework nem ORM
    ├── application/     Casos de uso (services) e DTOs
    ├── infrastructure/  Repositórios Prisma e outros adaptadores
    ├── presentation/    Controllers (rotas HTTP e documentação OpenAPI)
    └── <feature>.module.ts
prisma/      Schema e migrations
scripts/     Exportação do OpenAPI
test/        Testes e2e e utilitários
infra/, k8s/ CloudFormation e manifests do Kubernetes
```

## Scripts npm

| Comando | O que faz |
| ------- | --------- |
| `npm run start:dev` | API com reload |
| `npm run build` / `npm run start:prod` | Compila / roda a versão compilada |
| `npm test` / `npm run test:cov` / `npm run test:e2e` | Testes |
| `npm run lint` / `npm run format` | oxlint / Prettier |
| `npm run db:up` / `db:down` / `db:nuke` | Sobe o PostgreSQL / para os containers / apaga o volume |
| `npm run db:logs` / `db:admin` | Logs do banco / Adminer |
| `npm run prisma:migrate` / `prisma:generate` / `prisma:studio` | Nova migration / gera o client / navega nos dados |
| `npm run openapi:generate` / `openapi:lint` | Exporta / valida o contrato OpenAPI |
| `npm run stack:up` / `stack:logs` / `stack:down` | Stack completa no Docker Compose |

## Demo EKS + ECR (Ministack)

Demonstração do seminário de Cloud (Grupo 5): a API roda em um cluster EKS, com a imagem vinda do ECR, tudo emulado localmente pelo [Ministack](https://ministack.org) e provisionado por CloudFormation.

Pré-requisitos: Docker em execução, [AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) (`brew install awscli`) e `kubectl`.

```bash
./demo.sh prepare   # antes da apresentação (~1 min, pode rodar de novo)
./demo.sh show      # ao vivo, com pausa (Enter) entre os passos
```

- `infra/eks-ecr.yaml`: CloudFormation com o repositório ECR `t2-app` e o cluster EKS `t2-cluster` (+ node group).
- `k8s/`: `Deployment` (2 réplicas, porta 3000) e `Service` `t2-app` (porta 80 → 3000). A readiness probe usa `GET /api/health`, então um pod só recebe tráfego quando alcança o banco.
- Banco: `DB_MODE=rds` (padrão) usa um Postgres real do RDS do Ministack; `DB_MODE=cluster` sobe um Postgres dentro do cluster (`k8s/optional/postgres.yaml`). Em ambos os casos o `DATABASE_URL` e o `JWT_SECRET` (gerado na primeira execução) vão para os pods pelo Secret `t2-db`.

O `prepare` sobe o Ministack na rede Docker `t2-net` com `DOCKER_NETWORK=t2-net`, para que o RDS devolva um IP alcançável pelos pods do k3s. O RDS é criado pela API (`aws rds create-db-instance`), e não pelo CloudFormation, porque no Ministack o `AWS::RDS::DBInstance` só registra metadados, sem banco real.
