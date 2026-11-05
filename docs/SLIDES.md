# ViajaJunto - API de Pontos Turísticos

**Grupo 5 · Tema do seminário: EKS + ECR**

Uma API onde viajantes cadastram pontos turísticos e avaliam os lugares que visitaram.

---

## O que dá para fazer

- Criar conta e fazer login
- Cadastrar pontos turísticos (nome, categoria, endereço, coordenadas)
- Buscar pontos por nome, cidade, país, categoria e nota
- Avaliar um ponto de 1 a 5, com comentário e data da visita
- Ver o ranking dos pontos mais bem avaliados

---

## Stack

| | |
|---|---|
| Linguagem | TypeScript |
| Framework | NestJS 12 |
| Banco | PostgreSQL 17 |
| ORM | Prisma 7 |
| Autenticação | JWT (senha guardada como hash) |
| Documentação | Swagger (OpenAPI), gerado pelo código |
| Testes | Vitest + smoke com a collection do Postman |
| Infra | Docker, CloudFormation, ECR, EKS, RDS |

---

## Arquitetura

Monólito modular: um módulo por assunto (`auth`, `users`, `tourist-spots`, `reviews`, `health`), cada um dividido em 4 camadas:

```
presentation  →  application  →  domain  ←  infrastructure
   (rotas)         (regras)       (núcleo)    (banco, JWT)
```

- **domain:** entidades e contratos, sem depender de framework nem de banco
- **application:** regras de negócio e validação
- **infrastructure:** Prisma, hash de senha, JWT
- **presentation:** rotas HTTP e Swagger

Seguimos o padrão do projeto de referência da turma.

---

## Rotas

| | Rotas |
|---|---|
| Health | `GET /health` |
| Auth | `POST /auth/register` · `POST /auth/login` · `GET /auth/me` |
| Pontos turísticos | `GET`, `POST /tourist-spots` · `GET /tourist-spots/top` · `GET`, `PATCH`, `DELETE /tourist-spots/:id` |
| Avaliações | `GET`, `POST /reviews` · `GET`, `PATCH`, `DELETE /reviews/:id` |

Leitura pública. Para cadastrar, avaliar, editar ou apagar, é preciso estar logado.

---

## Regras de negócio

- Só quem cadastrou um ponto pode editá-lo ou apagá-lo
- Não pode existir dois pontos com o mesmo nome, cidade e país
- Cada pessoa avalia um ponto **uma única vez**
- **Ninguém avalia o próprio ponto** (para não inflar a nota)
- A data da visita não pode estar no futuro
- A **nota média** do ponto é recalculada a cada avaliação, mesmo com várias ao mesmo tempo
- Login errado não revela se o email existe

---

## Nossa parte: EKS + ECR

A API não roda "solta": roda dentro de um **cluster Kubernetes na AWS**.

| Serviço | Para quê |
|---|---|
| **CloudFormation** | Cria a infraestrutura a partir de arquivos YAML |
| **ECR** | Guarda as imagens Docker da API |
| **EKS** | Cluster Kubernetes que roda a API |
| **RDS** | Banco PostgreSQL gerenciado |

Tudo emulado localmente pelo **Ministack** (mesmos serviços e comandos da AWS, sem custo).

---

## Como o deploy acontece

```
Código → Imagem Docker → ECR → EKS → API no ar
                                 ↘ Job de migrations (banco)
```

1. CloudFormation cria o ECR e o cluster EKS
2. A imagem da API é construída e enviada ao ECR
3. Um Job aplica as migrations no banco (RDS)
4. A API sobe com **2 réplicas**
5. Os dados de exemplo são carregados

Um comando faz tudo: `./demo.sh prepare`

---

## O que o Kubernetes garante

- **2 réplicas** da API dividindo o tráfego
- **Autocura:** se um pod cai, outro é criado sozinho
- **Atualização sem queda:** a versão nova sobe antes da antiga sair
- **Health check:** um pod só recebe tráfego se consegue falar com o banco
- **Segredos fora do código:** senha do banco e chave do JWT ficam num Secret
- **Escala:** dá para aumentar as réplicas com um comando

---

## Qualidade

- **813 testes unitários:** regras de negócio isoladas, sem banco, e a regra de arquitetura
- **Smoke:** a collection do Postman contra a API no ar (19 rotas principais ou 81 requisições)
- **Cobertura mínima de 90%** (hoje ~98%)
- **CI no GitHub em toda PR:** lint, testes, validação do Swagger e scan de segurança da imagem

---

## Demonstração

1. A infraestrutura no ar (CloudFormation, ECR, EKS)
2. A API respondendo de dentro do cluster
3. Cadastro → avaliação → a nota média e o ranking mudam
4. Apagamos um pod e o Kubernetes recria
5. Todas as rotas testadas automaticamente

---

## Obrigado!

**ViajaJunto · Grupo 5 · EKS + ECR**

Dúvidas?
