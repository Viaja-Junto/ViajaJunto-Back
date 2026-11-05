# Como chamar as rotas pelo Swagger

O Swagger é gerado a partir do próprio código (decorators do `@nestjs/swagger`), então está sempre igual à API que está rodando. Cada rota mostra os campos, exemplos, regras de validação e todas as respostas possíveis.

## 1. Abrir

Suba a API (veja [COMO-RODAR.md](../COMO-RODAR.md)) e abra:

| Ambiente | Swagger UI | Scalar (alternativa, mesmo conteúdo) |
|---|---|---|
| Local | http://localhost:3000/swagger | http://localhost:3000/docs |
| EKS (`./demo.sh api`) | http://localhost:8080/swagger | http://localhost:8080/docs |

No topo, em **Servers**, deixe **`/` (Same host as this page)**: assim o "Try it out" chama a mesma API que serve a página.

## 2. Rota pública (sem login)

1. Abra **Tourist Spots → `GET /tourist-spots`**.
2. Clique em **Try it out**.
3. Preencha os filtros que quiser (`city=Porto Alegre`, `sort=rating`, `limit=5`).
4. Clique em **Execute**.

A resposta aparece embaixo, com o `curl` equivalente. As listas sempre vêm em `{ data, meta }`.

## 3. Fazer login e autorizar

As rotas com **cadeado** exigem token.

1. Abra **Auth → `POST /auth/login`** → **Try it out**.
2. No body, use uma conta do seed:
   ```json
   { "email": "demo@viajajunto.local", "password": "viaja-junto-demo" }
   ```
3. **Execute** e copie o valor de `accessToken` da resposta (sem as aspas).
4. Clique no botão **Authorize** (cadeado, no topo da página), cole o token no campo `bearer` → **Authorize** → **Close**.

Pronto: todas as rotas com cadeado passam a enviar `Authorization: Bearer <token>`. O token vale 1 hora e continua salvo se você recarregar a página. Para trocar de usuário, clique em **Authorize → Logout** e cole outro token.

Conta nova: `POST /auth/register` com `{ "name", "email", "password" }` (senha de 8 a 72 caracteres) também devolve um `accessToken`.

Confira com **`GET /auth/me`**: ele mostra quem está logado e o `role` (`USER` ou `ADMIN`).

## 4. Fluxo completo de exemplo

**Sugerir um ponto turístico** (como `demo@viajajunto.local`):

1. `POST /tourist-spots`, com o body de exemplo do Swagger (troque o `name` para não dar `409`).
2. Ele volta com `status: "PENDING"` e aparece em `GET /tourist-spots/mine`, mas ainda não na lista pública.

**Aprovar como admin:**

1. Faça login com `admin@viajajunto.local` e troque o token em **Authorize**.
2. `GET /tourist-spots/moderation?status=PENDING` mostra o ponto sugerido. Copie o `id`.
3. `PATCH /tourist-spots/{id}/approve`. Para recusar, use `PATCH /tourist-spots/{id}/reject` com `{ "reason": "..." }`.
4. O autor recebe uma notificação (`GET /notifications`), e o ponto passa a aparecer em `GET /tourist-spots`.

**Avaliar** (como `viajante@viajajunto.local`): `POST /reviews` com `{ "touristSpotId": "<id>", "rating": 5, "comment": "..." }`. Depois, `GET /tourist-spots/{id}` mostra o `averageRating` e o `reviewCount` atualizados.

**Planejar uma viagem:**

1. `POST /trips` com `{ "name": "Férias", "startDate": "2026-12-01", "endDate": "2026-12-10" }`.
2. `POST /trip-destinations` com `{ "tripId", "destinationId", "arrival", "departure" }` (o `destinationId` vem de `GET /destinations`).
3. `POST /trip-activities` com `{ "tripDestinationId", "touristSpotId", "dateTime", "expectedCost" }`.
4. `POST /budgets` com `{ "tripId", "totalValue": 3000 }` e depois `GET /trips/{id}/budget/summary`.
5. Convite: `GET /trips/{id}/invite-code`. Outro usuário entra com `POST /trips/join` e `{ "code": "..." }`.

## 5. Upload de foto

1. Abra `PUT /tourist-spots/{id}/photo` ou `PUT /destinations/{id}/photo` → **Try it out**.
2. Informe o `id` e escolha a imagem no campo **file** (JPEG, PNG ou WebP, até 5 MB) → **Execute**.

A resposta traz o `photoUrl`. Sem S3 configurado, a rota responde `503`.

## 6. Ler os erros

Todo erro tem o formato `{ "statusCode", "message", "error" }`. Cada rota lista no Swagger os códigos que pode devolver.

| Código | O que fazer |
|---|---|
| `401` | Faça login e clique em **Authorize** de novo (token ausente, expirado ou revogado pelo logout) |
| `403` | Logado, mas sem permissão: não é o autor, não é admin, ou é `VIEWER` na viagem |
| `404` | Não existe ou não é visível para você (catálogo não aprovado, viagem de outra pessoa) |
| `409` | Duplicado ou em uso |
| `422` | Body inválido. `message` lista cada regra violada. Campos que não existem no DTO também dão `422` |
| `429` | Limite de requisições. Espere os segundos do header `Retry-After` |

## 7. Exportar o contrato

`npm run openapi:generate` gera o `openapi.json`, útil para gerar tipos e cliente no front (por exemplo, com `openapi-typescript`). Ele também pode ser importado no Postman ou no Insomnia.
