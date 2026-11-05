# Arquitetura

Monólito modular em NestJS 12 + TypeScript (ESM), seguindo o projeto de referência [ViajaJunto/viaja-junto.server](https://github.com/ViajaJunto/viaja-junto.server). Cada funcionalidade é um módulo com quatro camadas, organizadas pela regra de dependência da Clean Architecture.

## Camadas

```
            presentation  ──►  application  ──►  domain
 (controllers, guards,         (services,        (entidades, contratos,
  decorators do Swagger)        DTOs)             regras puras, erros)
                                                     ▲
            infrastructure  ─────────────────────────┘
            (repositórios Prisma, JWT, scrypt, S3, Google)
```

| Camada | Contém | Pode depender de |
|---|---|---|
| `domain` | Entidades, contratos de repositório (classes abstratas), funções puras (datas, orçamento, convite, moderação) | Só de outro `domain` e de `@shared/domain`. Nada de Nest, Prisma ou class-validator |
| `application` | Services (casos de uso) e DTOs com validação | `domain` e services de outros módulos. Nunca de `infrastructure` nem de `presentation` |
| `infrastructure` | Implementações dos contratos: Prisma, JWT, scrypt, S3, strategies do passport | `domain`, `@shared/database` e as libs externas |
| `presentation` | Controllers, guards e decorators | `application` e tipos do `domain` |

**Inversão de dependência.** O service depende do contrato (`TripRepository`, `PasswordHasher`, `ObjectStorage`). O módulo liga o contrato à implementação com `{ provide: TripRepository, useClass: TripPrismaRepository }`. Os contratos são classes abstratas porque o Nest precisa de um token que exista em runtime, e interfaces somem na compilação. Nos testes, o contrato é trocado por um mock e nenhum teste sobe banco.

**Regra verificada no CI.** O [`src/architecture.spec.ts`](../src/architecture.spec.ts) lê todos os imports de `src` e falha se:
- o `domain` importar framework, ORM ou uma camada externa;
- a `application` importar `infrastructure` ou `presentation`;
- o `shared` importar um módulo de feature.

## Estrutura

```
src/
├── main.ts, app.module.ts          bootstrap, filtros globais e rate limit
├── architecture.spec.ts            regra de dependência
├── shared/                         núcleo comum, não conhece nenhum módulo
│   ├── config/                     variáveis de ambiente validadas com Zod
│   ├── domain/                     paginação, moderação, datas, moeda, erros, AuthenticatedUser
│   ├── database/                   PrismaService, locks de nota média, filtros reutilizáveis
│   ├── events/                     EventPublisher (porta) + EventEmitter2 (adaptador)
│   ├── http/                       CORS, Helmet, ValidationPipe, filtros de erro, OpenAPI, DTOs e decorators comuns
│   └── storage/                    fotos: ObjectStorage (porta), S3 (adaptador), validação do arquivo
└── modules/
    ├── auth, users                 conta, login (senha e Google), JWT, logout, papéis
    ├── destinations, tourist-spots catálogos com moderação e fotos
    ├── moderation                  regra de quem altera um registro do catálogo
    ├── reviews, destination-reviews avaliações e nota média
    ├── trips, trip-access          viagens, convite e a política de permissões
    ├── trip-members, trip-destinations, trip-activities, budgets
    ├── notifications               notificações geradas a partir de eventos
    └── health                      health check (Terminus)
```

## Imports com alias

Os imports entre módulos usam alias, configurados em `paths` no `tsconfig.json` e em `resolve.alias` no `vitest.config.ts`:

```ts
import { toPageRequest } from '@shared/http/dto/pagination-query.dto.js';
import { TripAccessService } from '@modules/trip-access/application/trip-access.service.js';
```

Dentro do próprio módulo, o import continua relativo (`../domain/trip.entity.js`), o que deixa claro o que é do módulo e o que vem de fora. O `nest build` reescreve os alias para caminhos relativos no `dist`, então o `node dist/main` funciona sem nenhum loader extra.

## Erros

A `application` não conhece HTTP. Ela lança erros de domínio, de [`src/shared/domain/errors.ts`](../src/shared/domain/errors.ts), e o [`DomainExceptionFilter`](../src/shared/http/domain-exception.filter.ts) traduz cada um para o status HTTP:

| Erro | HTTP |
|---|---|
| `NotFoundError` | 404 |
| `ForbiddenError` | 403 |
| `ConflictError` | 409 |
| `InvalidInputError` | 422 |
| `UnauthorizedError` | 401 |
| `UnavailableError` | 503 |

Os outros erros seguem estas regras:
- **Banco:** o `PrismaExceptionFilter` mapeia os erros do Prisma (registro duplicado → 409, chave estrangeira → 404 ou 409, registro ausente → 404).
- **Validação do body:** o `ValidationPipe` responde 422.
- **Guards:** usam as exceções do Nest, porque já estão na borda HTTP.

Todos os erros saem no mesmo formato: `{ statusCode, message, error }`.

## Decisões de design

- **Permissões de viagem centralizadas.** O `TripAccessService` resolve o papel do usuário (`CREATOR`, `EDITOR` ou `VIEWER`) e é a única porta de entrada para as regras de permissão. Quem não participa recebe 404, para não revelar quais viagens existem.
- **Moderação como regra pura.** [`src/shared/domain/moderation.ts`](../src/shared/domain/moderation.ts) decide o status inicial e quem pode alterar um registro. O `ModerationService` lê o papel do usuário no banco, nunca do token, então uma promoção a admin vale na hora.
- **Eventos para notificações.** Os services publicam um `AppEvent` pela porta `EventPublisher`. O módulo de notificações escuta, decide os destinatários (quem fez a ação nunca é notificado) e grava. Uma falha na notificação nunca desfaz a ação.
- **Nota média consistente.** `averageRating` e `reviewCount` são recalculados na mesma transação da avaliação, com lock da linha (`SELECT … FOR UPDATE`, em ordem de id), para que avaliações simultâneas não gravem uma média errada.
- **Dinheiro em centavos.** O resumo do orçamento soma valores inteiros em centavos e só converte no fim, sem erro de ponto flutuante.
- **Recursos opcionais não derrubam a API.** Sem S3 ou sem as credenciais do Google, só as rotas que dependem deles respondem 503.
- **Health check.** O controller usa o indicador do banco direto, o padrão do `@nestjs/terminus`. É a única exceção consciente às camadas: não existe regra de negócio ali.

## Testes

| Tipo | Ferramenta | O que cobre |
|---|---|---|
| Unitário (813) | Vitest | Regras de domínio, services com repositórios mock, DTOs, guards, filtros, decorators do Swagger, a regra de arquitetura e a proteção de cada rota. Sem banco, em segundos. Cobertura mínima: 90% das linhas |
| Ponta a ponta | `npm run smoke` / `smoke:all` | A collection do Postman contra a API rodando (local ou EKS): 19 rotas principais ou as 81 requisições com cada regra de negócio |
| Contrato | Spectral | O OpenAPI gerado segue as regras do `.spectral.yaml` |

## Infraestrutura

- **Local:** Docker Compose com PostgreSQL, migrations, API e Adminer. Imagem multi-stage, sem root, com `tini`.
- **AWS (emulada pelo MiniStack):**
  - CloudFormation cria o ECR, o EKS (com IAM e node group) e o bucket S3;
  - o RDS é criado pela API;
  - no Kubernetes, a API roda com 2 réplicas, probes, HPA, e Jobs de migration e seed.

  Detalhes no [README](../README.md#deploy-no-eks--ecr-ministack).
- **CI (GitHub Actions):** lint, tipos, testes com cobertura, contrato OpenAPI e scan da imagem com Trivy.
