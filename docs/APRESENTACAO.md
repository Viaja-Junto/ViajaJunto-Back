# ViajaJunto - Apresentação (Grupo 5: EKS + ECR)

A API roda **num cluster EKS**, com a imagem no **ECR**, o banco no **RDS** e a infra criada por **CloudFormation**. Tudo emulado pelo **Ministack** (AWS local, sem conta e sem custo).

## Comandos

Tudo com o **Docker Desktop aberto**, dentro da pasta do projeto.

### 1. Subir no EKS (Ministack)

```bash
./demo.sh prepare                # primeira vez (faz o build das imagens, ~2 min)
SKIP_BUILD=1 ./demo.sh prepare   # depois de reiniciar o notebook/Docker (~1min30, sem internet)
```

### 2. Apresentar

| Terminal | Comando | Para quê |
|---|---|---|
| 1 | `./demo.sh show` | Roteiro: infra → API no cluster → fluxo real → autocura (Enter entre os passos) |
| 2 | `./demo.sh api` | Deixa a API do cluster aberta em `http://localhost:8080/api` (`Ctrl+C` fecha) |

### 3. Chamar as rotas (com o `./demo.sh api` rodando)

**Pelo terminal:**
```bash
./demo.sh smoke       # rotas principais (19), com ✓ em cada uma
./demo.sh smoke all   # todas as rotas (81), incluindo cada regra de negócio
```

**Pelo Swagger:** http://localhost:8080/swagger (clássico) ou http://localhost:8080/docs (Scalar), mesma documentação
1. Rode `POST /auth/login` com uma das contas abaixo.
2. Copie o `accessToken` e cole em **Authentication → Bearer**.
3. Chame qualquer rota.

**Pelo Postman:**
1. **Cmd + O** e importe os 3 arquivos da pasta `postman/` (na raiz do projeto) (também estão em Downloads).
2. No canto superior direito, escolha o environment **ViajaJunto - EKS**.
3. Rode **Auth → Register** (o token fica salvo) e depois qualquer rota; ou **Run** na collection para rodar tudo.

**Contas prontas** (senha `viaja-junto-demo`): `demo@viajajunto.local` (cadastrou os pontos) e `viajante@viajajunto.local` (fez as avaliações).

### 4. Testes, banco e status

```bash
npm test               # 813 testes unitários
npm run smoke          # rotas principais contra a API no ar
npm run prisma:studio  # ver o banco local em http://localhost:5555
npm run aws:status     # estado do EKS, ECR, RDS e dos pods
```

### 5. Rodar local, sem o EKS (opcional)

```bash
npm run db:up          # banco local
npm run start:dev      # API em http://localhost:3000/api, Swagger em /swagger ou /docs
npm run smoke          # rotas principais na API local
npm run smoke:all      # todas as rotas na API local
```
No Postman, use o environment **ViajaJunto - Local**.

### 6. Derrubar tudo

```bash
npm run aws:destroy    # apaga o cluster EKS, as imagens do ECR, o RDS e as stacks
npm run db:down        # para todos os containers
```

## Rotas

Todas começam com `/api`.

| Método | Rota | Quem pode |
|---|---|---|
| GET | `/health` | Público |
| POST | `/auth/register` | Público |
| POST | `/auth/login` | Público |
| GET | `/auth/me` | Logado |
| GET | `/tourist-spots` (filtros `q`, `city`, `country`, `category`, `minRating`, `sort`) | Público |
| GET | `/tourist-spots/top` | Público |
| GET | `/tourist-spots/:id` | Público |
| POST | `/tourist-spots` | Logado |
| PATCH / DELETE | `/tourist-spots/:id` | Só quem cadastrou |
| GET | `/reviews` (filtros `touristSpotId`, `userId`, `minRating`) | Público |
| GET | `/reviews/:id` | Público |
| POST | `/reviews` | Logado |
| PATCH / DELETE | `/reviews/:id` | Só o autor |

## Infra: para que serve cada peça

| Peça | Para quê |
|---|---|
| **CloudFormation** | Infra como código. Cria o ECR e o cluster EKS (com node group e roles IAM) |
| **ECR** | Guarda as imagens Docker da API e das migrations, com a tag do commit |
| **EKS** | Kubernetes gerenciado: roda e mantém a API no ar |
| **RDS** | Banco PostgreSQL gerenciado |
| **Deployment** | 2 réplicas da API, atualização sem queda e recriação de pod que cai |
| **Probes** | Readiness testa o banco (`/api/health`); liveness só verifica se o processo está vivo |
| **Service** | Endereço fixo que distribui o tráfego entre as réplicas |
| **Secret / ConfigMap** | Configurações; o Secret guarda a URL do banco e a chave do JWT fora do código |
| **Jobs** | Rodam as migrations e os dados de exemplo antes da API subir |
| **HPA** | Escala de 2 a 5 réplicas por CPU (precisa do metrics-server, ainda não instalado) |

## Arquitetura do back-end

**Stack:** NestJS 12 + TypeScript, PostgreSQL 17 com Prisma (ORM), seguindo o projeto de referência da turma.

**Monólito modular:** uma única API, dividida em um módulo por assunto:

| Módulo | Responsável por |
|---|---|
| `auth` | Cadastro, login e JWT |
| `users` | Dados do usuário |
| `tourist-spots` | Pontos turísticos |
| `reviews` | Avaliações e nota média |
| `health` | Saúde da API e do banco (usado pelo Kubernetes) |

**Camadas de cada módulo** (a dependência sempre aponta para o domínio):

```
presentation  →  application  →  domain  ←  infrastructure
  (rotas)        (regras)        (núcleo)     (banco, JWT)
```

| Camada | O que tem | Exemplo |
|---|---|---|
| **domain** | Entidades e contratos (interfaces) dos repositórios; não conhece framework nem banco | `TouristSpot`, `ReviewRepository` |
| **application** | Services com as regras de negócio e os DTOs que validam a entrada | `ReviewsService` barra quem avalia o próprio ponto |
| **infrastructure** | Implementação concreta do que o domínio pede | `ReviewPrismaRepository`, hash de senha, JWT |
| **presentation** | Controllers: rotas HTTP e documentação Swagger | `ReviewsController` |

**Padrões usados:**
- **Inversão de dependência:** o service depende do contrato do repositório, e o NestJS injeta a implementação com Prisma. Nos testes, troca-se por um mock sem subir banco.
- **DTOs:** validam tudo que entra (tipos, tamanhos, intervalos) e montam a resposta campo a campo, sem expor dados internos como o hash da senha.
- **Respostas padronizadas:** listas paginadas no formato `{ data, meta }` e erros sempre como `{ statusCode, message, error }`.
- **Transações:** criar, editar ou apagar uma avaliação recalcula a média do ponto na mesma transação, com lock no ponto.
- **Migrations versionadas:** cada mudança no banco é um arquivo SQL em `prisma/migrations`.

**Segurança:**
- Senha guardada só como hash (scrypt) e login com JWT, válido por 1h.
- Validação de entrada: campo desconhecido ou inválido → `422`.
- Helmet (cabeçalhos de segurança), CORS e limite de requisições por IP.
- Variáveis de ambiente validadas ao subir: se faltar alguma, a API nem inicia.

## Testes

| Tipo | Quantos | O que testa | Como |
|---|---|---|---|
| **Unitário** | 813 | Regras de negócio, validações, funções de domínio, controllers, proteção das rotas e a regra de dependência entre camadas | Isolado, sem banco: o repositório é um **mock**. Roda em segundos |
| **Smoke** (ponta a ponta) | 19 / 81 | A API no ar (local ou no EKS) contra o banco real: fluxo principal ou todas as regras de negócio | `npm run smoke` / `./demo.sh smoke`: roda a collection do Postman |

| Lib | Para quê |
|---|---|
| **Vitest** | Roda os testes, faz as verificações e cria os mocks |
| **@nestjs/testing** | Monta os módulos NestJS dentro do teste |
| **Coverage v8** | Mede a cobertura; mínimo exigido de 90% das linhas (hoje ~98%) |

**CI (GitHub Actions), em toda PR:** lint (oxlint + Prettier), tipos, testes unitários com cobertura, validação do Swagger (Spectral) e scan de vulnerabilidades da imagem Docker (Trivy).

## Regras de negócio

- **Login:** email inexistente e senha errada dão o mesmo erro, para não revelar quem tem conta.
- **Pontos turísticos:**
  - qualquer um vê, e usuários logados cadastram;
  - **só quem cadastrou edita ou apaga**;
  - não pode repetir nome + cidade + país.
- **Avaliações:**
  - nota de 1 a 5, **uma por pessoa em cada ponto**;
  - **quem cadastrou o ponto não pode avaliá-lo**;
  - a data da visita não pode estar no futuro.
- **Nota média:** recalculada automaticamente a cada avaliação, inclusive com várias ao mesmo tempo.
- **Ranking:** `/tourist-spots/top` traz os mais bem avaliados.
- **Localização:** cada ponto guarda latitude e longitude (padrão GPS), que qualquer mapa consegue exibir.

## Perguntas prováveis

**Por que EKS?** O Kubernetes mantém a API no ar sozinho: recria pod que cai, distribui o tráfego, atualiza sem queda e escala. No EKS, a AWS gerencia o cluster e a gente cuida só da aplicação.

**Para que o ECR?** Guarda as imagens da aplicação; o cluster baixa de lá. A tag do commit mostra qual versão está rodando e permite voltar atrás.

**É AWS de verdade?** É emulado, mas usa os mesmos templates, o mesmo AWS CLI e os mesmos manifests. Na AWS real, mudariam só o endpoint e as credenciais.

**E se o banco cair?** O health responde 503 e o Kubernetes para de mandar tráfego para os pods, sem reiniciá-los. Quando o banco volta, eles voltam a receber.

**Onde ficam os segredos?** Num Secret do Kubernetes, criado no deploy. Nunca vão para o Git.

**Como as migrations rodam?** Como Job do Kubernetes, antes da nova versão. Se falham, o deploy para e a versão antiga continua no ar.

**Por que essa arquitetura em camadas?** Para separar a regra de negócio do framework e do banco. O domínio não depende de nada: dá para testar as regras sem subir banco e trocar a implementação sem mexer nelas.

**Como testaram?** Com Vitest: testes unitários com mocks para as regras de negócio, e o smoke, que roda a collection do Postman contra a API no ar (local ou no EKS). O CI roda os unitários em toda PR e exige 90% de cobertura.

**Como garantem que a média não fica errada?** O recálculo acontece na mesma transação da avaliação, com o ponto travado (`SELECT … FOR UPDATE`), então duas avaliações ao mesmo tempo esperam uma pela outra.

**Como marcam os pontos no mapa?** Com latitude e longitude, validadas pela API. O front exibe com qualquer biblioteca de mapa (Leaflet, Google Maps) e também consegue pegar as coordenadas de um clique no mapa e salvar.
