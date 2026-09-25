# CLAUDE.md — Arena Saquarema

Contexto específico deste projeto. Regras globais de postura ficam fora daqui.

## Domínio
Arena de futevôlei em Saquarema/RJ. Controle de bar (bebidas/petiscos), estoque, comandas por cliente e venda de day use.
Identidade visual: azul `mar-*`, amarelo `sol-*`, branco (tokens em `frontend/src/index.css`, `@theme`).

## Stack
- Monorepo sem workspaces: `backend/` e `frontend/` com `package.json` próprios; a raiz só orquestra (`npm run dev|build|start`).
- Backend: Node 20.19+, Express 5, TypeScript (NodeNext/ESM, imports com `.js`), Zod 4, `@asteasolutions/zod-to-openapi` 9, pino.
- Prisma 7 (`provider = "prisma-client"`, saída em `backend/src/generated/prisma`, **não versionado**). URL do banco em `prisma.config.ts`, não no schema.
- Driver: `@prisma/adapter-mariadb` (compatível com MySQL 8). `overrides` no package.json forçam `mariadb`, `mysql2` e `deepmerge-ts` em versões sem CVE; não remova sem rodar `npm audit`.
- Frontend: React 19, Vite 8, Tailwind 4 (componentes via `@utility`, não `@layer components`), TanStack Query 5, React Router 7.

## Convenções
- Módulo backend = `x.schemas.ts` (Zod + `registry.register`) → `x.service.ts` (regra + Prisma) → `x.routes.ts` (rota fina + `registry.registerPath`).
  Prisma é o repositório; não criar camada de repository sem necessidade concreta.
- Toda rota nova: `handler({ body, query, params }, fn)` para validar e **registrar no OpenAPI** no mesmo arquivo.
- Dinheiro: `Decimal(10,2)` no banco, string `"12.50"` na API (`money()`), `MoneyInput` na entrada.
- Estoque só muda via `applyDelta(tx, ...)` em `stock.service.ts`, dentro de transação.
- Operações em comanda: sempre `lockOpenTab(tx, id)` primeiro.
- Datas: banco em UTC; regras de "hoje" usam `America/Sao_Paulo` (`lib/format.ts`).
- Mensagens ao usuário em pt-BR. Códigos de erro em `UPPER_SNAKE` (`INSUFFICIENT_STOCK`, `TAB_NOT_OPEN`, `CUSTOMER_HAS_OPEN_TAB`...).

## Endpoints (`/api`)
- `auth`: POST login, POST logout, GET me, PATCH password
- `customers`: GET, GET :id, POST, PATCH :id
- `products`: GET, GET :id, POST* , PATCH :id*
- `stock/movements`: GET*, POST* (ENTRADA | SAIDA | AJUSTE)
- `day-use-plans`: GET, POST*, PATCH :id*
- `tabs`: GET, GET :id, POST, POST :id/items, DELETE :id/items/:itemId, POST :id/close, POST :id/cancel*
- `dashboard`: GET?from&to*
- `users`: GET*, POST*, PATCH :id*
(* = ADMIN)

## Auth
JWT em cookie `arena_token` (httpOnly, SameSite=Strict, path `/api`). Front e API precisam estar na mesma origem: em dev via proxy do Vite, em prod o Express serve o `frontend/dist` (`SERVE_FRONTEND=true`).

## Variáveis (backend/.env)
`DATABASE_URL`, `JWT_SECRET` (≥32), `JWT_EXPIRES_IN`, `CORS_ORIGINS`, `SERVE_FRONTEND`, `SWAGGER_ENABLED`, `TRUST_PROXY`, `DB_ALLOW_PUBLIC_KEY_RETRIEVAL` (só dev), `SEED_ADMIN_*`.

## Git
Branches `feat/…`, `fix/…`, `refactor/…` a partir de `main`; nunca commitar direto em `main`.
Migrations Prisma são versionadas (`backend/prisma/migrations`).
