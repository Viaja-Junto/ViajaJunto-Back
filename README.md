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

## Observações

Este diretório contém apenas o boilerplate inicial: estrutura, configuração de ferramentas e integração com o banco. Nenhuma funcionalidade ou regra de negócio foi implementada ainda.