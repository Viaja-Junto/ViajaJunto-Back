# ViajaJunto - Como rodar o back-end

Três formas de subir a API, do mais simples ao ambiente AWS emulado. Para chamar as rotas depois, veja [docs/SWAGGER.md](docs/SWAGGER.md).

## Pré-requisitos

| Ferramenta | Versão | Para quê |
|---|---|---|
| Node.js | **22.23.2** (`.nvmrc`; rode `nvm install && nvm use`) | Rodar a API e os scripts. O Nest CLI 12 quebra em Node 22 mais antigo |
| npm | 10 | Instalar com `npm ci` |
| Docker Desktop | com Compose | Banco PostgreSQL, stack completa e MiniStack |
| AWS CLI v2 e kubectl | só na opção 3 | `brew install awscli kubectl` |

Antes de qualquer opção:

```bash
nvm use
cp .env.example .env     # troque o JWT_SECRET: openssl rand -base64 48
npm ci                   # instala e gera o Prisma Client
```

## Opção 1: Node local + banco no Docker (desenvolvimento)

```bash
npm run db:up                 # PostgreSQL 17 em localhost:5432
npx prisma migrate deploy     # cria as tabelas
npm run db:seed               # dados de exemplo (pode rodar de novo)
npm run start:dev             # API com reload em http://localhost:3000/api
```

| O quê | Endereço |
|---|---|
| API | http://localhost:3000/api |
| Swagger UI | http://localhost:3000/swagger |
| Scalar | http://localhost:3000/docs |
| Health check | http://localhost:3000/api/health |

## Opção 2: tudo no Docker Compose

Sobe o banco, roda as migrations e a API já compilada na imagem de produção.

```bash
npm run stack:up        # build + postgres + migrate + api em http://localhost:3000/api
npm run db:seed         # dados de exemplo (usa o DATABASE_URL do .env, que aponta para o mesmo banco)
npm run stack:logs      # logs da API
npm run stack:down      # para tudo
```

Adminer (interface web do banco): `npm run db:admin` → http://localhost:8080 (servidor `postgres`, usuário e senha `postgres`).

## Opção 3: AWS emulada (EKS + ECR + RDS + S3 no MiniStack)

É o tema do seminário: a API roda num cluster EKS, com as imagens no ECR, o banco no RDS e as fotos no S3. Tudo local, sem conta AWS.

```bash
./demo.sh prepare    # sobe o MiniStack e faz o deploy completo (~2 min, idempotente)
./demo.sh api        # abre a API do cluster em http://localhost:8080/api (deixe rodando)
./demo.sh smoke      # em outro terminal: chama as rotas principais no cluster
./demo.sh show       # roteiro da apresentação, passo a passo
npm run aws:status   # stacks, imagens, banco, pods, HPA e jobs
```

No cluster, o Swagger fica em http://localhost:8080/swagger.

Se o Docker reiniciar, o MiniStack perde o estado: rode `./demo.sh prepare` de novo.

## Contas do seed

Todas com a senha `viaja-junto-demo`:

| Email | Papel |
|---|---|
| `demo@viajajunto.local` | Usuário. Cadastrou os destinos e os pontos turísticos |
| `viajante@viajajunto.local` | Usuário. Tem avaliações e uma viagem concluída |
| `admin@viajajunto.local` | **ADMIN**. Aprova e recusa as sugestões dos catálogos |

Para promover outra conta: `npm run user:make-admin -- email@exemplo.com`.

## Banco de dados

| Tarefa | Comando |
|---|---|
| Ver e editar as tabelas no navegador | `npm run prisma:studio` → http://localhost:5555 |
| Aplicar as migrations | `npx prisma migrate deploy` |
| Nova migration depois de mudar o `schema.prisma` | `npm run prisma:migrate` |
| Recriar o banco do zero (com seed) | `npm run db:reset` |
| Logs do PostgreSQL | `npm run db:logs` |

## Recursos opcionais

**Fotos (S3).** Sem `S3_BUCKET`, o upload responde `503` e o resto funciona. Para usar o S3 do MiniStack com `npm run start:dev`, rode `npm run aws:up && npm run aws:deploy` uma vez. Depois descomente no `.env` o bloco `S3_*` do `.env.example`, com o nome do bucket que o deploy imprimiu.

**Login com Google.** Sem `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`, `/auth/google` responde `503`. Para usar:
1. Crie um OAuth Client em Google Cloud Console → APIs & Services → Credentials.
2. Registre `http://localhost:3000/api/auth/google/callback` como redirect URI.
3. Preencha as duas variáveis no `.env`.

## Testes e qualidade

| Comando | O que faz |
|---|---|
| `npm test` | 888 testes unitários (Vitest), sem banco, em segundos |
| `npm run test:cov` | O mesmo com cobertura; falha abaixo de 90% das linhas |
| `npm run smoke` | Com a API rodando: executa a collection do Postman nas **24 rotas principais** e confere cada resposta |
| `npm run smoke:all` | O mesmo nas **99 requisições**, incluindo cada regra de negócio com o erro esperado |
| `npm run smoke -- http://localhost:8080/api` | Smoke contra outra URL (por exemplo o EKS) |
| `npm run lint` / `npm run format` | oxlint / Prettier |
| `npm run openapi:generate && npm run openapi:lint` | Gera o `openapi.json` e valida o contrato com o Spectral |

O CI do GitHub roda lint, tipos, testes com cobertura, contrato OpenAPI e o scan de segurança da imagem (Trivy) em toda PR.

## Postman

1. **Import** → arraste os 3 arquivos da pasta `postman/`.
2. No canto superior direito, escolha o environment: **ViajaJunto - Local** (porta 3000) ou **ViajaJunto - EKS** (porta 8080).
3. Botão direito na collection → **Run**.

A collection cria um usuário, faz login e guarda o token e os ids sozinha. No final, apaga o que criou.

## Derrubar tudo

```bash
npm run aws:destroy   # apaga cluster, imagens, RDS, bucket e stacks do MiniStack
npm run db:down       # para todos os containers (MiniStack, Adminer e Postgres)
npm run db:nuke       # o mesmo e apaga o volume do banco local
```

## Problemas comuns

| Sintoma | Causa e solução |
|---|---|
| `ERR_REQUIRE_CYCLE_MODULE` ao rodar o Nest | Node antigo. Rode `nvm use` (22.23.2) |
| A API não sobe e lista variáveis | O `.env` está faltando algo. Compare com o `.env.example` (o `JWT_SECRET` precisa de 32+ caracteres) |
| `EADDRINUSE :3000` | Já tem uma API rodando (`npm run start:dev` ou `stack:up`). Pare uma delas ou mude `PORT` |
| `401` em rota protegida | Faltou o token, ou ele expirou (1 hora) ou foi revogado pelo logout. Faça login de novo |
| `422` no login pelo Postman | O body precisa ser JSON (`raw` + `JSON`) com `email` e `password` |
| `404` num destino ou ponto recém-criado | Ele ainda está `PENDING`: aparece em `/mine` até o admin aprovar |
| `503` no upload ou no Google | Recurso opcional sem configuração (veja acima) |
| Postman sem environment | Selecione **ViajaJunto - Local** no canto superior direito |
