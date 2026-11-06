# Como testar as rotas pelo Swagger

O Swagger é gerado a partir do próprio código, então está sempre igual à API que está rodando. Os exemplos já vêm preenchidos com dados que existem no banco depois do seed. Na maioria das rotas basta clicar em **Try it out → Execute**, sem copiar id nenhum.

## 1. Preparar

Com a API parada:

```bash
npm run db:up
npm run db:reset      # recria o banco com os dados de teste (ids fixos)
npm run start:dev
```

O `db:reset` **apaga o banco local** e recria tudo a partir das migrations e do seed. Rode-o uma vez antes de testar, e de novo sempre que quiser voltar ao estado inicial. O `npm run db:seed` sozinho só recria o que foi apagado, sem mexer no resto.

Abra **http://localhost:3000/swagger**. Em **Servers**, deixe **`/` (Same host as this page)**.

## 2. Login (já preenchido)

1. **Auth → `POST /auth/login`** → **Try it out** → **Execute**. O body já vem com `viajante@viajajunto.local` / `viaja-junto-demo`.
2. Copie o `accessToken` da resposta, sem as aspas.
3. Clique em **Authorize** (cadeado no topo), cole o token, depois **Authorize** e **Close**.

O token vale 1 hora e continua salvo se você recarregar a página. Para trocar de usuário, use **Authorize → Logout**, faça login com outra conta e cole o novo token.

| Conta (senha `viaja-junto-demo`) | O que ela tem no seed |
|---|---|
| `viajante@viajajunto.local` | Dona da viagem **Férias no Sul** (planejada) e de uma viagem concluída. Tem avaliações, favoritos e uma notificação |
| `demo@viajajunto.local` | EDITOR na Férias no Sul. Cadastrou os lugares e tem duas sugestões aguardando o admin |
| `admin@viajajunto.local` | ADMIN: aprova e recusa as sugestões |

## 3. Roteiro (logado como viajante)

Em cada linha: **Try it out → Execute**, sem mudar nada.

| Rota | O que você deve ver |
|---|---|
| `GET /auth/me` | O viajante, com `role: USER` |
| `GET /destinations`, `GET /tourist-spots` | Os destinos e pontos aprovados (as sugestões pendentes não aparecem) |
| `GET /destinations/{id}/details` | Porto Alegre, com nota média e as últimas avaliações |
| `GET /tourist-spots/{id}/details` | Usina do Gasômetro, com a avaliação do viajante |
| `GET /trips` | As duas viagens, com `role: OWNER` |
| `GET /trips/{id}` | Férias no Sul (10 a 20/12) |
| `GET /trip-members` | A Conta Demo como `EDITOR` |
| `GET /trip-destinations` | Porto Alegre e Gramado, em ordem |
| `GET /trip-activities` | Usina, Mercado e Iberê, em ordem cronológica |
| `GET /trips/{id}/budget/summary` | Orçamento 3000: `planned` 110 e `spent` 1440 |
| `GET /trip-expenses` | Hotel (1200, dividido igualmente) e jantar (240, divisão exata) |
| `GET /trips/{id}/expenses/balance` | A Conta Demo deve **460** ao viajante |
| `GET /trips/{id}/calendar.ics` | O arquivo da agenda. Clique em **Download file** e abra no Google Agenda ou no Calendário |
| `GET /favorites/ids`, `GET /favorites/tourist-spots` | 3 pontos e Porto Alegre favoritados |
| `GET /notifications` | A Conta Demo registrou o jantar (`EXPENSE_ADDED`) |
| `GET /users/me/visited-countries` | O Brasil, da viagem concluída |

**Escritas que funcionam direto com o exemplo:**

| Rota | Efeito |
|---|---|
| `POST /trip-expenses` | Escolha o exemplo **equal** ou **exact** no menu *Examples*. Depois rode o `balance` de novo para ver o acerto mudar |
| `PATCH /trip-expenses/{id}` | Muda o valor do hotel; a divisão é recalculada |
| `POST /reviews` | Avalia a Orla do Guaíba. A nota média do ponto é atualizada |
| `PUT /favorites/destinations/{id}` e `DELETE` na mesma rota | Favorita e desfavorita |
| `POST /trip-destinations` | Adiciona o Rio de Janeiro no fim da viagem (18 a 20/12) |
| `POST /trip-activities` | Adiciona a Orla em 12/12 |
| `PATCH /trip-activities/{id}` | Confirma a atividade do Mercado |
| `POST /trips` | Cria outra viagem |
| `POST /budgets` | Cria o orçamento da viagem concluída |
| `POST /trip-members` | Convida o admin para a Férias no Sul |
| `POST /destinations`, `POST /tourist-spots` | Sugere Canela e a Casa de Cultura Mario Quintana, que ficam `PENDING` |
| `PATCH /notifications/{id}/read` | Marca a notificação como lida |

## 4. Moderação (logado como admin)

1. Faça login com `admin@viajajunto.local` e troque o token em **Authorize**.
2. `GET /tourist-spots/moderation` e `GET /destinations/moderation` mostram o Cais Mauá e Bento Gonçalves aguardando.
3. `PATCH /tourist-spots/{id}/approve` já vem com o id do Cais Mauá. Depois disso, ele aparece em `GET /tourist-spots`.
4. `PATCH /destinations/{id}/reject` recusa Bento Gonçalves. O body pede o motivo (`reason`).

Em cada caso, o autor (Conta Demo) recebe uma notificação.

## 5. Erros que são a regra funcionando

Com os exemplos prontos, estas respostas são **esperadas**:

| Chamada (como viajante) | Resposta | Por quê |
|---|---|---|
| `PATCH /destinations/{id}` ou `PATCH /tourist-spots/{id}` | 403 | Depois de aprovado, só o admin edita (faça como admin) |
| `POST /destination-reviews` | 409 | O viajante já avaliou Porto Alegre (apague com `DELETE /destination-reviews/{id}` e crie de novo) |
| `POST /trips/join` | 404 / 409 | Use o código de `GET /trips/{id}/invite-code` com **outra conta**; quem já está na viagem recebe 409 |
| `PUT /trips/{tripId}/destinations/order` depois de adicionar uma parada | 422 | A lista precisa ter **todas** as paradas da viagem |
| `POST /reviews` repetido | 409 | Uma avaliação por pessoa e ponto |
| `POST /trip-expenses` com `payerId` de quem não está na viagem | 422 | Pagador e divisão só com participantes |

Todo erro vem como `{ "statusCode", "message", "error" }`:

| Código | Significado |
|---|---|
| `401` | Faltou o token, ou ele expirou ou foi revogado pelo logout. Faça login e **Authorize** de novo |
| `403` | Logado, mas sem permissão (não é o autor, não é admin, ou é `VIEWER`) |
| `404` | Não existe ou não é visível para você |
| `409` | Duplicado ou em uso |
| `422` | Body inválido. `message` lista cada regra violada |
| `429` | Limite de requisições. Espere os segundos do header `Retry-After` |

## 6. Upload de foto

1. Abra `PUT /tourist-spots/{id}/photo` → **Try it out**.
2. Escolha a imagem no campo **file** (JPEG, PNG ou WebP, até 5 MB) → **Execute**.

Sem S3 configurado, a rota responde `503`, o que é esperado no `start:dev` puro (veja [COMO-RODAR.md](../COMO-RODAR.md#recursos-opcionais)).

## 7. Voltar ao estado inicial

```bash
npm run db:reset    # apaga o banco local e recria os dados de teste
```

## 8. Exportar o contrato

`npm run openapi:generate` gera o `openapi.json`, útil para gerar tipos e cliente no front (por exemplo, com `openapi-typescript`). Ele também pode ser importado no Postman ou no Insomnia.
