# ViajaJunto - Como rodar

## Já está pronto na sua máquina

- Node 22.23.2 (padrão do nvm) e dependências instaladas
- `.env` configurado
- Banco com tabelas e dados de exemplo
- Ambiente EKS no Ministack no ar

## Rodar a API

1. Abra o **Docker Desktop**.
2. No terminal, dentro da pasta do projeto:

```bash
npm run db:up        # liga o banco (se já estiver ligado, não faz nada)
npm run start:dev    # API em http://localhost:3000/api
```

**Contas de teste** (senha `viaja-junto-demo`):
- `demo@viajajunto.local`: cadastrou os pontos turísticos
- `viajante@viajajunto.local`: fez as avaliações e tem uma viagem concluída
- `admin@viajajunto.local`: administrador (modera os catálogos)

## Testar tudo com um comando

| Comando | O que faz |
|---|---|
| `npm run smoke` | Chama as **rotas principais** (19) na API local (precisa do `npm run start:dev` rodando) e confere cada resposta |
| `npm run smoke:all` | O mesmo, com **todas** as rotas (81) e todas as regras de negócio |
| `./demo.sh smoke` | Rotas principais, na API dentro do EKS (só precisa do `./demo.sh prepare` feito) |
| `./demo.sh smoke all` | Todas as rotas, na API dentro do EKS |
| `npm run test:all` | Testes automatizados: 262 unitários + 54 e2e (precisa do banco ligado) |

As rotas principais são: health, cadastro, usuário logado, listar pontos, ranking, cadastrar ponto, avaliar, ver a média atualizada, a regra "não pode avaliar o próprio ponto" e, no final, apagar o que criou.

## Rodar no EKS (apresentação)

```bash
./demo.sh prepare    # sobe tudo no Ministack (~2 min)
./demo.sh show       # roteiro da apresentação, passo a passo
```

Se o Docker for reiniciado, o Ministack perde o estado: rode `./demo.sh prepare` de novo.

Para acessar a API do cluster fora do roteiro:

```bash
export KUBECONFIG=$PWD/infra/.out/kubeconfig
kubectl -n viajajunto port-forward svc/viajajunto-api 8080:80    # http://localhost:8080/api
```

## Ver o banco (Prisma Studio)

```bash
npm run prisma:studio    # abre http://localhost:5555
```

Interface web para ver e editar as tabelas (`user`, `tourist_spot`, `review`), parecida com o DBeaver. Ela mostra o **banco local** (o do `npm run db:up`); `Ctrl+C` fecha.

## Derrubar tudo

```bash
npm run aws:destroy   # apaga o cluster EKS, as imagens do ECR, o RDS e as stacks
npm run db:down       # para todos os containers (Ministack e o Postgres local)
```

Os dados do Postgres local continuam salvos. Para apagar também o banco local: `npm run db:nuke`.

## Swagger

| | Swagger UI (clássico) | Scalar |
|---|---|---|
| Local | http://localhost:3000/swagger | http://localhost:3000/docs |
| EKS (com `./demo.sh api`) | http://localhost:8080/swagger | http://localhost:8080/docs |

As duas telas mostram a mesma documentação. Rotas com cadeado: faça login, copie o `accessToken` e cole em **Authorize** (Swagger) ou **Authentication → Bearer** (Scalar).

## Postman

1. **Import** → arraste os 3 arquivos da pasta `postman/`.
2. No canto superior direito, escolha o environment: **ViajaJunto - Local** (porta 3000) ou **ViajaJunto - EKS** (porta 8080).
3. Botão direito na collection → **Run** → **Run ViajaJunto API**.

A collection cria o usuário, faz login, guarda o token e os ids sozinha, e no final apaga o que criou. A pasta **Business rules** mostra cada regra de negócio retornando o erro esperado.

## Arquitetura

NestJS 12 + TypeScript, seguindo o projeto de referência ([ViajaJunto/viaja-junto.server](https://github.com/ViajaJunto/viaja-junto.server)). Cada módulo (`auth`, `users`, `tourist-spots`, `reviews`, `health`) é dividido em 4 camadas:

| Camada | O que tem |
|---|---|
| `domain` | Entidades e contratos dos repositórios (sem framework nem ORM) |
| `application` | Services (regras de negócio) e DTOs com validação |
| `infrastructure` | Repositórios com Prisma, hash de senha e JWT |
| `presentation` | Controllers (rotas e Swagger) |

- **Banco:** PostgreSQL 17 com Prisma. Tabelas `user`, `tourist_spot` e `review`.
- **Listas:** paginadas, no formato `{ data, meta }`.
- **Erros:** sempre `{ statusCode, message, error }`. Dados inválidos → `422`, listando todos os problemas.
- **Testes:** 262 unitários e 54 e2e (contra o banco real).

## Infraestrutura

- **Local:** Docker Compose com banco, migrations, API e Adminer.
- **CI (GitHub Actions):** lint, testes, validação do Swagger e scan de segurança da imagem em toda PR.
- **AWS (emulada pelo Ministack, nosso tema do seminário):**
  - **CloudFormation:** cria o **ECR** (onde ficam as imagens) e o cluster **EKS** (com roles IAM e nós).
  - **RDS:** banco PostgreSQL.
  - **Kubernetes:**
    - API com 2 réplicas, atualização sem queda e health check do banco;
    - migrations e dados de exemplo rodam como Jobs;
    - autoscaler (HPA) de 2 a 5 réplicas, que ainda precisa do metrics-server para funcionar;
    - se um pod cai, o cluster recria sozinho.

## Rotas

| Rota | Quem pode |
|---|---|
| `GET /health` | Público |
| `POST /auth/register`, `POST /auth/login` | Público |
| `GET /auth/me` | Logado |
| `GET /tourist-spots`, `/tourist-spots/top`, `/tourist-spots/:id` | Público |
| `POST /tourist-spots` | Logado |
| `PATCH` e `DELETE /tourist-spots/:id` | Só quem cadastrou |
| `GET /reviews`, `/reviews/:id` | Público |
| `POST /reviews` | Logado |
| `PATCH` e `DELETE /reviews/:id` | Só o autor |

## Regras de negócio

- **Login:** a senha é salva só como hash. Email inexistente e senha errada dão o mesmo erro, para não revelar quem tem conta.
- **Pontos turísticos:**
  - só quem cadastrou edita ou apaga;
  - não pode repetir nome + cidade + país;
  - apagar o ponto apaga as avaliações dele.
- **Avaliações:**
  - nota de 1 a 5, uma por pessoa em cada ponto;
  - **quem cadastrou o ponto não pode avaliá-lo**;
  - a data da visita não pode estar no futuro;
  - só o autor edita ou apaga.
- **Nota média:** recalculada automaticamente a cada avaliação criada, editada ou apagada, inclusive com várias avaliações ao mesmo tempo.
- **Ranking:** `/tourist-spots/top` lista os mais bem avaliados.
- **Limite de requisições:** cadastro, login e avaliações aceitam no máximo 10 por minuto por IP.
