# ViajaJunto API — Guia para o front-end

Tudo que o front precisa para consumir a API. Os detalhes de cada rota (campos, exemplos, erros) estão no Swagger; o passo a passo para usá-lo está em [SWAGGER.md](SWAGGER.md), e para subir o back, em [COMO-RODAR.md](../COMO-RODAR.md).

## 1. Onde está a API

| Ambiente | Base | Documentação |
|---|---|---|
| Local (`npm run start:dev`) | `http://localhost:3000/api` | `http://localhost:3000/swagger` (Swagger UI) ou `/docs` (Scalar) |
| EKS (`./demo.sh api`) | `http://localhost:8080/api` | `http://localhost:8080/swagger` |

- **Collection do Postman:** `postman/ViajaJunto.postman_collection.json`, com todas as rotas num fluxo pronto.
- **Contrato OpenAPI:** `npm run openapi:generate` gera o `openapi.json`, útil para gerar tipos e cliente (por exemplo com `openapi-typescript`).

**CORS:** a API só aceita as origens listadas em `CORS_ORIGINS` no `.env` (padrão `http://localhost:5173`, a porta do Vite). Se o front rodar em outra porta, adicione-a nessa variável, separando por vírgula.

**Contas do seed** (todas com a senha `viaja-junto-demo`; `npm run db:reset` recria tudo com os ids fixos usados nos exemplos do Swagger):

| Email | Papel |
|---|---|
| `demo@viajajunto.local` | Usuário: cadastrou os lugares, é EDITOR na viagem "Férias no Sul" e tem sugestões pendentes |
| `viajante@viajajunto.local` | Usuário: dono da "Férias no Sul" (roteiro, orçamento, despesas) e de uma viagem concluída; tem avaliações e favoritos |
| `admin@viajajunto.local` | ADMIN: modera os catálogos |

## 2. Autenticação

Toda rota protegida exige o header `Authorization: Bearer <accessToken>`. O token vale 1 hora (`expiresIn`, em segundos). Quando ele expira ou a sessão é encerrada, a API responde `401`; nesse caso, mande o usuário para o login.

**Email e senha:**

```http
POST /auth/register   { "name": "Ana", "email": "ana@ex.com", "password": "min 8 caracteres" }
POST /auth/login      { "email": "ana@ex.com", "password": "..." }
→ 201/200 { "accessToken": "eyJ...", "tokenType": "Bearer", "expiresIn": 3600 }
```

**Google:**
1. Abra `GET /auth/google` como **navegação de página inteira** (`window.location.href = ...`), nunca com `fetch`.
2. Depois do consentimento, a API redireciona para `AUTH_REDIRECT_URL` (padrão `http://localhost:5173/auth/callback`) com o token no **fragmento**: `#access_token=...&token_type=Bearer&expires_in=3600`. Leia com `new URLSearchParams(location.hash.slice(1))`.
3. Se o login falhar, o fragmento traz `#error=google_sign_in_failed`.

Sem as credenciais do Google no servidor, `/auth/google` responde `503`. Esconda o botão nesse caso.

**Outras rotas da sessão:**
- `GET /auth/me`: o usuário logado, com `role` (`USER` ou `ADMIN`). Use o `role` para mostrar a área de moderação.
- `POST /auth/logout`: encerra **todas** as sessões da conta (o token deixa de valer em qualquer dispositivo).

## 3. Convenções

**Listas paginadas.** Query: `?page=1&limit=20` (máximo 100). Resposta:

```json
{ "data": [ ... ], "meta": { "page": 1, "limit": 20, "total": 137, "totalPages": 7, "hasNext": true, "hasPrevious": false } }
```

**Erros.** Sempre `{ "statusCode", "message", "error" }`. No `422`, `message` é uma lista com cada regra violada; dá para mostrar direto no formulário.

| Código | Quando |
|---|---|
| 400 | Id da URL não é um UUID |
| 401 | Sem token, token inválido/expirado ou login errado |
| 403 | Logado, mas sem permissão (ver seção 4) |
| 404 | Não existe, ou não é visível para você (viagem de outra pessoa, catálogo não aprovado) |
| 409 | Duplicado ou em uso (email, avaliação repetida, ponto/destino usado numa viagem) |
| 413 | Foto maior que 5 MB |
| 422 | Dados inválidos (`message` lista os problemas); campos desconhecidos também dão 422 |
| 429 | Muitas requisições; espere `Retry-After` segundos |
| 503 | Recurso opcional não configurado (S3 para fotos, Google) |

**Datas.**
- Datas sem hora (`startDate`, `arrival`, `visitedAt`) vão como `YYYY-MM-DD`.
- Data e hora (`dateTime` das atividades) vão em ISO 8601 (`2026-12-02T15:00:00Z`).

**Dinheiro.** `totalValue` e `expectedCost` são números com até 2 casas, na moeda da viagem (`currency`, padrão `BRL`).

## 4. Permissões

**Catálogos (destinos e pontos turísticos) com moderação**

| Status | Quem vê | Quem altera ou apaga |
|---|---|---|
| `PENDING` (sugestão aguardando o admin) | Só o autor (`/mine`) e o admin (`/moderation`) | O autor e o admin |
| `REJECTED` (com `rejectionReason`) | Só o autor e o admin | O autor (editar devolve para `PENDING`) e o admin |
| `APPROVED` (público) | Todo mundo | Só o admin |

- Quando um admin cadastra, o registro já entra `APPROVED`.
- O autor recebe uma notificação quando a sugestão é aprovada ou recusada.

**Viagens**

| Ação | Criador (`OWNER`) | `EDITOR` | `VIEWER` | Fora da viagem |
|---|---|---|---|---|
| Ver a viagem e tudo dentro dela | ✔ | ✔ | ✔ | 404 |
| Paradas, atividades e orçamento | ✔ | ✔ | 403 | 404 |
| Editar ou apagar a viagem, membros e convite | ✔ | 403 | 403 | 404 |

**Avaliações**
- Ponto turístico: uma por pessoa; nunca no ponto que você cadastrou (403).
- Destino: só quem tem uma viagem `COMPLETED` que passou por ele (403).
- Em ambos, só o autor edita ou apaga.

## 5. Telas e rotas

| Tela | Rotas |
|---|---|
| Home (descoberta) | `GET /destinations/top`, `GET /tourist-spots/top` |
| Busca de destinos | `GET /destinations?q=&country=&category=` |
| Busca de pontos | `GET /tourist-spots?q=&city=&country=&category=&minRating=&destinationId=&sort=newest\|rating\|name` |
| Página do destino | `GET /destinations/:id/details` (com as 10 últimas avaliações) + `GET /tourist-spots?destinationId=:id` + `GET /destination-reviews?destinationId=:id` |
| Página do ponto | `GET /tourist-spots/:id/details` + `GET /reviews?touristSpotId=:id` |
| Sugerir lugar | `POST /destinations` ou `POST /tourist-spots`, depois `PUT /…/:id/photo` |
| Minhas sugestões | `GET /destinations/mine`, `GET /tourist-spots/mine` (com `status` e `rejectionReason`) |
| Moderação (admin) | `GET /…/moderation?status=PENDING`, `PATCH /…/:id/approve`, `PATCH /…/:id/reject` `{ reason }` |
| Minhas viagens | `GET /trips?status=` (cada uma com o seu `role`) |
| Criar viagem | `POST /trips` `{ name, description?, startDate?, endDate?, currency? }` |
| Convidar | `GET /trips/:id/invite-code` (só o criador) → compartilhar o código → o outro usuário faz `POST /trips/join` `{ code }` |
| Membros | `GET /trip-members?tripId=`, `POST /trip-members`, `PATCH /trip-members/:id` `{ permission }`, `DELETE` (buscar pessoas: `GET /users?q=`) |
| Roteiro | `GET /trip-destinations?tripId=` (em ordem), `POST`, `PATCH`, `DELETE`, reordenar com `PUT /trips/:tripId/destinations/order` `{ destinationIds: [...] }` |
| Atividades | `GET /trip-activities?tripDestinationId=` (cronológico), `POST`, `PATCH`, `DELETE` |
| Orçamento | `POST /budgets` `{ tripId, totalValue }`, `PATCH /budgets/:id`, `GET /trips/:id/budget/summary` |
| Despesas | `GET /trip-expenses?tripId=`, `POST /trip-expenses`, `PATCH`/`DELETE /trip-expenses/:id` |
| Acerto de contas | `GET /trips/:id/expenses/balance` (quanto cada um pagou e deve, e quem paga quem) |
| Exportar para a agenda | `GET /trips/:id/calendar.ics` (ver seção 6) |
| Favoritos | Coração nas listas: `GET /favorites/ids` uma vez e marque os ids. Salvar: `PUT /favorites/{destinations\|tourist-spots}/:id`; remover: `DELETE` na mesma rota. Tela: `GET /favorites/destinations` e `GET /favorites/tourist-spots` |
| Notificações (sino) | `GET /notifications/unread-count`, `GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all` |
| Mapa de países visitados | `GET /users/me/visited-countries` (`countryCode` em ISO alpha-2, pronto para colorir o mapa) |
| Perfil | `GET /auth/me`, `PATCH /users/:id`, `DELETE /users/:id` (409 enquanto a pessoa ainda for dona de alguma viagem) |

## 6. Detalhes úteis

**Fotos.** Envie `multipart/form-data` com o campo `file` (JPEG, PNG ou WebP, até 5 MB) para `PUT /destinations/:id/photo` ou `PUT /tourist-spots/:id/photo`. A resposta traz o registro com o `photoUrl` público, que pode ir direto num `<img>`. Também dá para mandar um `photoUrl` externo no cadastro.

```js
const form = new FormData();
form.append('file', input.files[0]);
await fetch(`${API}/tourist-spots/${id}/photo`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: form });
```

**Mapa.** Destinos e pontos têm `latitude` e `longitude` (graus decimais, padrão GPS). Para exibir, use Leaflet + OpenStreetMap (gratuito) ou Google Maps. Para cadastrar, use as coordenadas do clique no mapa (`e.latlng`), com no máximo 6 casas decimais.

**Resumo do orçamento** (`GET /trips/:id/budget/summary`):
- `planned`: soma dos `expectedCost` das atividades;
- `remaining`: orçamento menos planejado;
- `overBudget`: se o planejado passou do orçamento;
- `unpricedActivities`: atividades sem custo;
- `byCategory`: as 8 categorias de ponto turístico, sempre na mesma ordem (dá para montar o gráfico direto).

**Despesas.** O corpo do `POST /trip-expenses`:

```json
{ "tripId": "...", "payerId": "<quem pagou>", "amount": 120, "description": "Jantar", "category": "ENTERTAINMENT", "spentOn": "2026-12-02",
  "splitType": "EQUAL", "participantIds": ["<id>", "<id>"] }
```

- `EQUAL` divide igualmente entre `participantIds` (todos da viagem quando omitido); centavos que sobram vão para os primeiros.
- `EXACT` usa `shares: [{ "userId", "amount" }]`, que precisam somar o `amount`.
- Quem pagou e quem divide precisam ser da viagem (criador ou membro); senão `422`. Para listar as pessoas: `GET /trip-members?tripId=` + o criador.
- O resumo do orçamento ganha `spent`, `remainingAfterSpent` e `spent` por categoria.

**Exportar para a agenda.** A rota exige o token, então baixe com `fetch` e salve como arquivo:

```js
const res = await fetch(`${API}/trips/${id}/calendar.ics`, { headers: { Authorization: `Bearer ${token}` } });
const name = res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] ?? 'viagem.ics';
const url = URL.createObjectURL(await res.blob());
Object.assign(document.createElement('a'), { href: url, download: name }).click();
```

O arquivo abre direto no Google Agenda, Apple Calendar e Outlook. Exportar de novo atualiza os eventos em vez de duplicar.

**Notificações.** Cada notificação tem `type` (por exemplo `MEMBER_JOINED`, `DESTINATION_ADDED`, `ACTIVITY_UPDATED`, `BUDGET_CHANGED`, `EXPENSE_ADDED`, `TRIP_STATUS_CHANGED` ou `SUBMISSION_APPROVED`/`SUBMISSION_REJECTED`) e um `payload` com o necessário para montar o texto:
- viagens: `tripName`, `actorName`, `subjectId` e `from`/`to`/`permission`/`action`;
- moderação: `catalog`, `subjectName`, `actorName` e `reason`.

O `tripId` é `null` nas notificações de moderação.

**Rate limit.** Por IP, por minuto: 300 leituras e 60 escritas; cadastro, login, avaliações, convite e upload aceitam 10. Acima disso, `429`.

**Valores calculados.** `averageRating` e `reviewCount` são calculados pela API e nunca entram no corpo da requisição (422).
