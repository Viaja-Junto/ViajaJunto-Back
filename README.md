# ViajaJunto - Back-end

API do projeto ViajaJunto.

## Stack

- Node.js + NestJS + TypeScript
- Prisma (ORM)
- PostgreSQL (executado via Docker Compose)

## Pré-requisitos

- **Node.js >= 22.13.0** (obrigatório). Versões anteriores, incluindo `22.11.0` e `22.12.0`, não são compatíveis com o Prisma 7.
- npm
- Docker / Docker Compose (para o banco de dados)

A versão exigida está definida em `.nvmrc`. Se você usa [nvm](https://github.com/nvm-sh/nvm), rode `nvm use` dentro desta pasta.

## Banco de dados

O PostgreSQL sobe pelo `docker-compose.yml` na **raiz do repositório**:

```bash
# na raiz do repositório
cp .env.example .env
docker compose up -d
```

Os dados ficam persistidos em um volume Docker.

## Como executar

```bash
cd backend
nvm use
cp .env.example .env
npm install
npx prisma generate
npm run start:dev
```

A API sobe por padrão em `http://localhost:3000`.

## Scripts

```bash
npm run start:dev  # inicia a API em modo desenvolvimento (watch)
npm run build      # compila o projeto
npm run lint       # roda o ESLint
npm run test       # roda os testes
```

## Prisma

Os models ficam em `prisma/schema.prisma`. Depois de defini-los, crie e aplique as migrations com:

```bash
npx prisma migrate dev
```

Sempre que alterar o schema, rode também `npx prisma generate` para atualizar o client.

## Demo EKS + ECR (Ministack)

Demonstração do seminário de Cloud (Grupo 5): a API roda em um cluster EKS, com a imagem vinda do ECR, tudo emulado localmente pelo [Ministack](https://ministack.org) e provisionado por CloudFormation.

Pré-requisitos: Docker em execução, [AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) (`brew install awscli`) e `kubectl`.

```bash
./demo.sh prepare   # antes da apresentação (~1 min, pode rodar de novo)
./demo.sh show      # ao vivo, com pausa (Enter) entre os passos
```

- `infra/eks-ecr.yaml`: CloudFormation com o repositório ECR `t2-app` e o cluster EKS `t2-cluster` (+ node group).
- `k8s/`: `Deployment` (2 réplicas, porta 3000) e `Service` `t2-app` (porta 80 → 3000).
- `GET /health`: consulta o Postgres (`SELECT now(), version()`) e devolve o nome do pod, mostrando a integração da aplicação com o banco.
- Banco: `DB_MODE=rds` (padrão) usa um Postgres real do RDS do Ministack; `DB_MODE=cluster` sobe um Postgres dentro do cluster (`k8s/optional/postgres.yaml`). Em ambos os casos o `DATABASE_URL` vai para os pods pelo Secret `t2-db`.

O `prepare` sobe o Ministack na rede Docker `t2-net` com `DOCKER_NETWORK=t2-net`, para que o RDS devolva um IP alcançável pelos pods do k3s. O RDS é criado pela API (`aws rds create-db-instance`), e não pelo CloudFormation, porque no Ministack o `AWS::RDS::DBInstance` só registra metadados, sem banco real.

## Observações

Este diretório contém apenas o boilerplate inicial: estrutura, configuração de ferramentas e integração com o banco. Nenhuma funcionalidade ou regra de negócio foi implementada ainda.