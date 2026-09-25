# Arena Saquarema — Bar, Comandas e Day Use

Sistema de controle da arena de futevôlei: comandas por cliente, vendas do bar com baixa automática de estoque, venda de day use, movimentação de estoque e dashboard de vendas.

| Camada   | Stack |
|----------|-------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, TanStack Query, React Router |
| Backend  | Node.js 20+, Express 5, TypeScript, Zod 4 |
| Banco    | MySQL 8 via Prisma 7 (driver adapter `@prisma/adapter-mariadb`) |
| Docs     | OpenAPI 3.1 gerado dos schemas Zod → Swagger UI em `/api/docs` |

Backend e frontend ficam no **mesmo projeto** (monorepo) e, em produção, rodam em **um único processo/porta**: o Express serve a API em `/api` e o build do React no restante das rotas.

```
arena-saquarema/
├── backend/            API Express + Prisma
│   ├── prisma/         schema.prisma, migrations, seed
│   └── src/
│       ├── modules/    auth, users, customers, products, stock, dayuse, tabs, dashboard
│       │               (cada um: *.schemas.ts → *.service.ts → *.routes.ts)
│       ├── middlewares/ auth (JWT + RBAC), error-handler
│       ├── docs/       registry OpenAPI (zod-to-openapi)
│       └── lib/        prisma, logger, errors, handler (validação)
├── frontend/           React SPA
│   └── src/            api/, components/, hooks/, pages/
├── docker-compose.yml  MySQL 8 local
└── package.json        scripts que orquestram os dois
```

## Rodando localmente

Pré-requisitos: Node.js 20.19+ e Docker (ou um MySQL 8 próprio).

```bash
# 1. Banco
docker compose up -d

# 2. Variáveis de ambiente (antes do setup: o Prisma lê DATABASE_URL daqui)
cp backend/.env.example backend/.env
#   - JWT_SECRET: node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
#   - SEED_ADMIN_PASSWORD: senha do primeiro admin (mín. 10 caracteres)

# 3. Dependências + Prisma Client
npm run setup

# 4. Primeira migration (gera backend/prisma/migrations — faça commit dela)
npm run prisma:migrate --prefix backend -- --name init

# 5. Dados iniciais (admin + produtos e planos de exemplo)
npm run seed --prefix backend

# 6. Sobe API (:3333) e front (:5173) juntos
npm run dev
```

- App: http://localhost:5173
- Swagger: http://localhost:3333/api/docs (JSON em `/api/docs.json`)

No Swagger, execute `POST /api/auth/login` primeiro: o cookie de sessão é gravado e usado automaticamente nas demais chamadas.

### Produção (um processo só)

```bash
npm run build                 # build do React + compilação do backend
# backend/.env: NODE_ENV=production, SERVE_FRONTEND=true, SWAGGER_ENABLED=false (se a API não for pública)
npm run prisma:deploy --prefix backend
npm start
```

Coloque atrás de um proxy HTTPS (nginx/Caddy) e ajuste `TRUST_PROXY=1`. Em produção o cookie é `Secure`: **sem HTTPS o login não funciona**, e é esse o comportamento esperado.

## Perfis de acesso

| Ação | OPERADOR (caixa) | ADMIN |
|---|:---:|:---:|
| Abrir comanda, lançar itens, fechar comanda | ✔ | ✔ |
| Cadastrar/editar clientes | ✔ | ✔ |
| Remover item da comanda | só itens próprios, até 10 min | ✔ |
| Cancelar comanda (estorna estoque) | — | ✔ |
| Produtos, preços, planos de day use | só leitura | ✔ |
| Movimentar estoque (entrada, saída, ajuste) | — | ✔ |
| Dashboard | — | ✔ |
| Usuários | — | ✔ |

## Regras de negócio

- **1 comanda aberta por cliente**, garantido por índice único no banco (`openCustomerId`), inclusive sob concorrência.
- **Baixa de estoque atômica**: `UPDATE ... WHERE stock >= qtd`. Dois caixas vendendo a última unidade ao mesmo tempo → um recebe `409 INSUFFICIENT_STOCK`. Nunca fica negativo.
- **Comanda travada** (`SELECT ... FOR UPDATE`) ao lançar, remover, fechar ou cancelar: sem item lançado após o fechamento e sem fechamento duplo.
- **Preço congelado no item**: alterar o preço do produto não altera as comandas já lançadas.
- **Total sempre recalculado** a partir dos itens (a fonte da verdade), nunca incrementado às cegas.
- **Estoque só muda por movimentação** (ENTRADA, SAÍDA, AJUSTE, VENDA, ESTORNO), sempre com saldo resultante gravado para auditoria.
- Produtos com `trackStock=false` (drinks, porções preparados na hora) são vendidos sem controle de estoque.
- Day use tem **data de uso** (padrão: hoje; não aceita data passada). O dashboard conta pessoas pela data de uso.
- Datas e relatórios usam o fuso `America/Sao_Paulo`. O banco grava em UTC.

## Segurança

- JWT HS256 em **cookie httpOnly + SameSite=Strict + Secure (prod)**. O token nunca fica acessível ao JavaScript, então XSS não consegue roubá-lo.
- `algorithms`, `issuer` e `audience` fixos na verificação (bloqueia `alg=none` e confusão de algoritmo).
- **Revogação imediata**: `tokenVersion` no usuário; trocar senha, papel ou desativar derruba as sessões abertas.
- bcrypt custo 12; senha de 10 a 72 caracteres; comparação com hash fictício quando o e-mail não existe (tempo constante, sem enumeração de usuários).
- Rate limit no login (10 falhas / 15 min por IP).
- Validação Zod em todo body/query/params; campos não declarados são descartados (sem mass assignment).
- Somente SQL parametrizado (Prisma + `$queryRaw` com tagged template).
- IDOR: itens sempre buscados por `id + tabId`.
- Erros 500 com mensagem genérica; detalhes vão só para o log (pino com redaction de cookie/authorization/senha).
- Helmet (CSP), CORS com allowlist, `express.json` limitado a 100 kb, env validado no boot.

## Scripts úteis (backend)

| Script | O que faz |
|---|---|
| `npm run prisma:migrate --prefix backend -- --name <nome>` | Cria e aplica migration em dev |
| `npm run prisma:deploy --prefix backend` | Aplica migrations em produção |
| `npm run seed --prefix backend` | Cria admin e dados de exemplo (idempotente, não reseta senha) |
| `npm run openapi:export --prefix backend` | Gera `backend/openapi.json` estático |
