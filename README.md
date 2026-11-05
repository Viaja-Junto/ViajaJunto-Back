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
| Infraestrutura | Docker / Docker Compose, CloudFormation, EKS + ECR + RDS (Ministack), Kubernetes |

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
npm run db:seed             # opcional: contas demo, pontos de Porto Alegre e avaliações
npm run start:dev           # API em http://localhost:3000/api
```

- Documentação interativa: <http://localhost:3000/docs> (Scalar) ou <http://localhost:3000/swagger> (Swagger UI clássico), as duas geradas do mesmo OpenAPI
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
| `SWAGGER_PATH` | Não | `docs` | Caminho da documentação (Scalar) |
| `SWAGGER_UI_PATH` | Não | `swagger` | Caminho do Swagger UI clássico |
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
| Tourist Spots | `GET /tourist-spots` (filtros `q`, `city`, `country`, `category`, `minRating`; `sort=newest\|rating\|name`), `GET /tourist-spots/top`, `GET /tourist-spots/:id`, `POST`, `PATCH /:id`, `DELETE /:id` | Leitura pública; qualquer usuário autenticado cadastra; só quem cadastrou edita ou apaga |
| Reviews | `GET /reviews` (filtros `touristSpotId`, `userId`, `minRating`), `GET /reviews/:id`, `POST`, `PATCH /:id`, `DELETE /:id` | Leitura pública; uma avaliação por usuário e ponto, nunca no ponto que você cadastrou; só o autor edita ou apaga |

## Convenções da API

| Tema | Regra |
| ---- | ----- |
| Paginação | Listas aceitam `page` (padrão 1) e `limit` (padrão 20, máximo 100) e respondem `{ data, meta }` |
| Erros | Formato `{ statusCode, message, error }`; `422` lista todas as regras de validação violadas |
| Login | Email desconhecido e senha errada recebem o mesmo `401`, para não revelar quais contas existem |
| Permissões | Só o dono de um registro (quem cadastrou o ponto) altera ou apaga; os outros recebem `403` |
| Duplicados | Um ponto turístico é único por nome, cidade e país; cada usuário avalia um ponto uma vez (`409`) |
| Nota média | `averageRating` e `reviewCount` do ponto são recalculados na mesma transação que cria, altera ou apaga uma avaliação, com lock no ponto para avaliações simultâneas não se atropelarem |
| Data da visita | `visitedAt` no formato `YYYY-MM-DD`, nunca no futuro (`422`) |
| Rate limit | `429` com `Retry-After` quando o limite é excedido |

## Banco de dados

O schema fica em [`prisma/schema.prisma`](prisma/schema.prisma) e as migrations em [`prisma/migrations/`](prisma/migrations). Tabelas: `user`, `tourist_spot` e `review`.

| Tarefa | Comando |
| ------ | ------- |
| Aplicar as migrations | `npx prisma migrate deploy` |
| Criar uma migration depois de mudar o schema | `npm run prisma:migrate` |
| Recriar o banco do zero (com seed) | `npm run db:reset` |
| Dados de exemplo: pontos de Porto Alegre, avaliações e as contas `demo@viajajunto.local` e `viajante@viajajunto.local` (senha `viaja-junto-demo`) | `npm run db:seed` |
| Navegar nos dados | `npm run prisma:studio` ou `npm run db:admin` (Adminer em <http://localhost:8080>) |

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
prisma/      Schema, migrations e seed
scripts/     Exportação do OpenAPI
test/        Testes e2e e utilitários
infra/       CloudFormation e scripts do deploy no EKS (Ministack)
k8s/         Manifests do Kubernetes
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
| `npm run db:seed` / `db:reset` | Dados de exemplo / recria o banco do zero |
| `npm run prisma:migrate` / `prisma:generate` / `prisma:studio` | Nova migration / gera o client / navega nos dados |
| `npm run openapi:generate` / `openapi:lint` | Exporta / valida o contrato OpenAPI |
| `npm run stack:up` / `stack:logs` / `stack:down` | Stack completa no Docker Compose |
| `npm run aws:up` / `aws:deploy` / `aws:status` / `aws:destroy` / `aws:down` | Ambiente AWS emulado (EKS + ECR + RDS) |

## Deploy no EKS + ECR (Ministack)

Entrega do seminário de Cloud (Grupo 5): a API roda em um cluster **EKS**, com as imagens publicadas no **ECR**, o banco no **RDS** e a infraestrutura descrita em **CloudFormation**. Tudo é emulado localmente pelo [Ministack](https://ministack.org): nenhuma conta AWS é usada e nada é cobrado.

Pré-requisitos: Docker Desktop em execução, [AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) (`brew install awscli`) e `kubectl` (`brew install kubectl`).

```bash
npm run aws:up        # sobe o Ministack em http://localhost:4566
npm run aws:deploy    # RDS, imagens no ECR, cluster EKS, migrations, API e seed
npm run aws:status    # stacks, imagens, banco, cluster, pods, autoscaler e jobs
npm run aws:destroy   # remove tudo o que o deploy criou
npm run aws:down      # remove o container do Ministack
```

Para acessar a API que está no cluster:

```bash
export KUBECONFIG=$PWD/infra/.out/kubeconfig
kubectl -n viajajunto port-forward svc/viajajunto-api 8080:80
curl localhost:8080/api/health        # documentação em http://localhost:8080/docs ou /swagger
```

### O que o `infra/deploy.sh` faz

| Passo | Serviço | Como |
| ----- | ------- | ---- |
| 1 | RDS | Cria a instância PostgreSQL 17 `viajajunto-db` pela API do RDS. No Ministack, o `AWS::RDS::DBInstance` via CloudFormation só registra metadados, sem banco real |
| 2 | ECR | Stack [`registry.yaml`](infra/cloudformation/registry.yaml) com os repositórios `viajajunto-api` (imagem de runtime) e `viajajunto-migrate` (estágio `build`, com o Prisma CLI). As imagens recebem a tag do commit |
| 3 | EKS | Stack [`cluster.yaml`](infra/cloudformation/cluster.yaml): roles IAM do cluster e dos nós, `AWS::EKS::Cluster` e node group gerenciado. O `kubectl` autentica como no EKS de verdade, via `aws eks get-token` |
| 4 | Kubernetes | Namespace `viajajunto`, ConfigMap e o Secret `viajajunto-secrets` (`DATABASE_URL` e `JWT_SECRET`, gerado na primeira vez e mantido nos deploys seguintes) |
| 5 | Migrations | Job [`k8s/jobs/migrate.yaml`](k8s/jobs/migrate.yaml) com `prisma migrate deploy`. O deploy só continua se ele terminar com sucesso |
| 6 | API | [`Deployment`](k8s/deployment.yaml) com 2 réplicas, rolling update sem indisponibilidade, probes, limites de CPU e memória e container sem root com filesystem somente leitura; [`Service`](k8s/service.yaml) e [`HPA`](k8s/hpa.yaml) |
| 7 | Seed | Job [`k8s/jobs/seed.yaml`](k8s/jobs/seed.yaml) com os dados de exemplo (`SKIP_SEED=1` pula) |

Detalhes que importam:

- **Probes**: a liveness só confere a porta, então uma oscilação do banco não reinicia todos os pods em loop. A readiness usa `GET /api/health` (com o banco), e um pod só recebe tráfego quando alcança o PostgreSQL.
- **Configuração**: o hash do ConfigMap e do Secret vai como annotation do pod, então qualquer mudança de configuração reinicia as réplicas. Um redeploy sem mudanças não mexe em nada.
- **Imagens**: os pods puxam de `000000000000.dkr.ecr.us-east-1.amazonaws.com/...`. O k3s do Ministack espelha esse host para o ECR local, do mesmo jeito que um nó do EKS puxa do ECR na AWS.
- **Autoscaler**: o HPA escala de 2 a 5 réplicas por CPU, mas, como no EKS, depende do add-on metrics-server. Sem ele, mostra `cpu: <unknown>` e mantém as 2 réplicas.

Variáveis: `DB_MODE=cluster` sobe o PostgreSQL como pod dentro do cluster ([`k8s/optional/postgres.yaml`](k8s/optional/postgres.yaml)) em vez do RDS; `SKIP_BUILD=1` reaproveita as imagens já construídas; `IMAGE_TAG` troca a tag.

### Roteiro da apresentação

```bash
./demo.sh prepare   # antes da aula (~2 min, pode rodar de novo)
./demo.sh show      # ao vivo, com pausa (Enter) entre os passos
```

O `show` mostra as stacks do CloudFormation, as imagens no ECR, o cluster (nó, pods, service, HPA e jobs) e a API respondendo de dentro do cluster. Depois faz um fluxo real (cadastro, avaliação, nota média e ranking atualizados), apaga um pod para mostrar a autocura e, opcionalmente, escala para 4 réplicas.
