# ViajaJunto - Back-end

API REST do ViajaJunto: viajantes descobrem destinos e pontos turísticos (sugeridos pelos usuários e moderados por um admin), avaliam os lugares, planejam viagens em grupo com roteiro, atividades e orçamento, e recebem notificações das mudanças.

**Vai construir o front?** Comece por [docs/FRONTEND.md](docs/FRONTEND.md).

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
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Não | — | OAuth Client do Google Cloud. Sem eles, `/auth/google` responde `503` e o resto funciona |
| `GOOGLE_CALLBACK_URL` | Não | `http://localhost:3000/api/auth/google/callback` | Tem que estar registrada no OAuth Client |
| `AUTH_REDIRECT_URL` | Não | `http://localhost:5173/auth/callback` | Página do front que recebe o token depois do login com Google |
| `S3_BUCKET` | Não | — | Bucket das fotos. Sem ele, o upload responde `503` |
| `S3_ENDPOINT` / `S3_PUBLIC_URL` / `S3_FORCE_PATH_STYLE` / `AWS_REGION` | Não | — / — / `false` / `us-east-1` | Para usar um emulador (Ministack) ou expor as fotos por outro endereço |

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
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/google` (+ callback), `GET /auth/me`, `POST /auth/logout` | Público (cadastro e login); usuário autenticado (`me`, `logout`) |
| Users | `GET /users?q=`, `GET /users/:id`, `PATCH`/`DELETE /users/:id`, `GET /users/me/visited-countries` | Autenticado; só a própria conta é alterada |
| Destinations | `GET /destinations` (`q`, `country`, `category`), `/top`, `/:id`, `/:id/details`, `/mine`, `/moderation`; `POST`, `PATCH /:id`, `DELETE /:id`, `PATCH /:id/approve`, `PATCH /:id/reject`, `PUT /:id/photo` | Leitura pública (só aprovados); usuário sugere; admin modera |
| Tourist Spots | `GET /tourist-spots` (`q`, `city`, `country`, `category`, `minRating`, `destinationId`, `sort`), `/top`, `/:id`, `/:id/details`, `/mine`, `/moderation`; `POST`, `PATCH /:id`, `DELETE /:id`, `PATCH /:id/approve`, `PATCH /:id/reject`, `PUT /:id/photo` | Igual aos destinos |
| Reviews | `GET /reviews` (`touristSpotId`, `userId`, `minRating`), `/:id`, `POST`, `PATCH /:id`, `DELETE /:id` | Leitura pública; uma por pessoa e ponto, nunca no próprio ponto; só o autor altera |
| Destination Reviews | `GET /destination-reviews` (`destinationId`), `/:id`, `POST`, `PATCH /:id`, `DELETE /:id` | Leitura pública; só quem concluiu uma viagem para o destino avalia |
| Trips | `GET /trips?status=`, `/:id`, `POST`, `PATCH`/`DELETE /:id`, `POST /trips/join`, `GET /trips/:id/invite-code`, `POST /trips/:id/invite-code/regenerate` | Participantes leem; o criador edita, apaga e gerencia o convite |
| Trip Members | `GET /trip-members?tripId=`, `/:id`, `POST`, `PATCH`/`DELETE /:id` | Participantes leem; o criador gerencia |
| Trip Destinations | `GET /trip-destinations?tripId=`, `/:id`, `POST`, `PATCH`/`DELETE /:id`, `PUT /trips/:tripId/destinations/order` | Participantes leem; criador e `EDITOR` alteram |
| Trip Activities | `GET /trip-activities?tripDestinationId=`, `/:id`, `POST`, `PATCH`/`DELETE /:id` | Participantes leem; criador e `EDITOR` alteram |
| Budgets | `GET /budgets`, `/:id`, `POST`, `PATCH`/`DELETE /:id`, `GET /trips/:id/budget/summary` | Participantes leem; criador e `EDITOR` alteram |
| Notifications | `GET /notifications`, `/unread-count`, `PATCH /notifications/read-all`, `PATCH /notifications/:id/read` | Cada usuário vê só as suas |

## Convenções da API

| Tema | Regra |
| ---- | ----- |
| Paginação | Listas aceitam `page` (padrão 1) e `limit` (padrão 20, máximo 100) e respondem `{ data, meta }` |
| Erros | Formato `{ statusCode, message, error }`; `422` lista todas as regras de validação violadas |
| Login | Email desconhecido e senha errada recebem o mesmo `401`, para não revelar quais contas existem |
| Moderação | Sugestões entram como `PENDING`; o admin aprova (público) ou recusa com motivo, e o autor é notificado. O autor altera a sugestão enquanto não está aprovada; depois, só o admin (`403`) |
| Viagens | Criador (`OWNER`) gerencia tudo; `EDITOR` altera roteiro, atividades e orçamento; `VIEWER` só lê; quem está fora recebe `404` |
| Notificações | Mudanças na viagem avisam todos os participantes, menos quem fez a ação |
| Duplicados | Ponto único por nome, cidade e país; destino único por nome e país; uma avaliação por pessoa (`409`). Destino ou ponto usado numa viagem não pode ser apagado (`409`) |
| Nota média | `averageRating` e `reviewCount` de pontos e destinos são recalculados na mesma transação que cria, altera ou apaga uma avaliação, com lock no ponto para avaliações simultâneas não se atropelarem |
| Datas | `visitedAt` nunca no futuro; paradas dentro das datas da viagem; atividades dentro da estadia (`422`) |
| Rate limit | `429` com `Retry-After` quando o limite é excedido |

## Banco de dados

O schema fica em [`prisma/schema.prisma`](prisma/schema.prisma) e as migrations em [`prisma/migrations/`](prisma/migrations). Tabelas: `user`, `destination`, `tourist_spot`, `review`, `destination_review`, `trip`, `trip_member`, `trip_destination`, `trip_activity`, `budget` e `notification`.

| Tarefa | Comando |
| ------ | ------- |
| Aplicar as migrations | `npx prisma migrate deploy` |
| Criar uma migration depois de mudar o schema | `npm run prisma:migrate` |
| Recriar o banco do zero (com seed) | `npm run db:reset` |
| Dados de exemplo: destinos, pontos de Porto Alegre, avaliações, uma viagem concluída e as contas `demo@`, `viajante@` e `admin@viajajunto.local` (admin), todas com a senha `viaja-junto-demo` | `npm run db:seed` |
| Promover uma conta a admin | `npm run user:make-admin -- <email>` |
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
| 2a | S3 | Stack [`storage.yaml`](infra/cloudformation/storage.yaml) com o bucket público das fotos. Os pods recebem o bucket e o endereço do Ministack num ConfigMap |
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
