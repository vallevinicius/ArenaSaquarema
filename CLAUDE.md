# CLAUDE.md — Arena Saquarema

Contexto específico deste projeto. Regras globais de postura ficam fora daqui.

## Domínio
Arena de futevôlei em Saquarema/RJ. Controle de bar (bebidas/petiscos), estoque, comandas por cliente e venda de day use.
Identidade visual: azul `mar-*`, amarelo `sol-*`, branco (tokens em `app/globals.css`, `@theme`).

## Arquitetura
App único Next.js 16 (App Router), front e API no mesmo processo/porta, no mesmo modelo do PingoDeMeio.
- `app/(app)/*`: páginas logadas (client components + TanStack Query).
- `app/api/**/route.ts`: Route Handlers **finos**: `export const GET = route({ ...schemas, roles }, ({ body, user }) => service.x())`.
- `server/`: backend. Nada daqui pode ser importado por client component (`server/lib/prisma.ts` e `auth.ts` têm `import 'server-only'`).
- `proxy.ts`: só UX (redireciona página sem cookie válido para /login). A autorização real é o `route()` de cada handler.
- Next 16 tem APIs diferentes das versões antigas: antes de usar algo do framework, consulte `node_modules/next/dist/docs/`.

## Stack
- Prisma 7 (`provider = "prisma-client"`, saída em `server/generated/prisma`, **não versionado**, gerado no `postinstall`). URL do banco em `prisma.config.ts`.
- Driver `@prisma/adapter-mariadb` (compatível com MySQL 8). `overrides` no package.json forçam `mariadb`, `mysql2` e `deepmerge-ts` sem CVE; não remova sem `npm audit`.
- `serverExternalPackages` no `next.config.ts`: adapter mariadb, mariadb, pino, bcryptjs.
- Env validado de forma **preguiçosa** (`server/config/env.ts`): o `next build` roda sem `.env`.
- Prisma também é preguiçoso (Proxy + singleton em `globalThis`): o build não abre conexão e o hot reload não vaza pool.
- Swagger UI: `swagger-ui-dist` servido por `app/docs/route.ts` + `app/docs/[asset]/route.ts` (allowlist). `swagger-ui-react` quebra no bundle do Next; não volte para ele.

## Convenções
- Módulo = `x.schemas.ts` (Zod + `registry.register`) → `x.service.ts` (regra + Prisma) → `x.openapi.ts` (`registry.registerPath`).
  Rota nova: criar o `route.ts` **e** registrar em `x.openapi.ts` (e importar o arquivo em `server/docs/openapi.ts` se for módulo novo).
- Prisma é o repositório; não criar camada de repository sem necessidade concreta.
- Dinheiro: `Decimal(10,2)` no banco, string `"12.50"` na API (`money()`), `MoneyInput` na entrada.
- Estoque só muda via `applyDelta(tx, ...)` em `stock.service.ts`, dentro de transação.
- Operações em comanda: sempre `lockOpenTab(tx, id)` primeiro.
- Operações no caixa de day use: sempre `lockOpenSession(tx, id)` primeiro (mesmo padrão do `lockOpenTab`).
- Datas: banco em UTC; "hoje" usa `America/Sao_Paulo` (`server/lib/format.ts`).
- Mensagens em pt-BR. Códigos de erro em `UPPER_SNAKE` (`INSUFFICIENT_STOCK`, `TAB_NOT_OPEN`, `CUSTOMER_HAS_OPEN_TAB`...).

## Endpoints (`/api`)
- `auth`: POST login, POST logout, GET me, PATCH password
- `customers`: GET, GET :id, POST, PATCH :id
- `products`: GET, GET :id, POST*, PATCH :id*
- `stock/movements`: GET*, POST* (ENTRADA | SAIDA | AJUSTE)
- `day-use-plans`: GET, POST*, PATCH :id*
- `day-use-sessions`: GET, GET current, GET :id, POST (abre o caixa do dia), POST :id/entries (check-in de pagamento), DELETE :id/entries/:entryId, POST :id/close
- `tabs`: GET, GET :id, POST, POST :id/items, DELETE :id/items/:itemId, POST :id/close, POST :id/cancel*
- `dashboard`: GET?from&to*
- `users`: GET*, POST*, PATCH :id*
- `health`, `docs.json` (públicos). Rota inexistente em /api → 404 JSON (`app/api/[...path]`).
(* = ADMIN)

## Auth
JWT HS256 em cookie `arena_token` (httpOnly, SameSite=Strict, Secure em prod, path `/`). `tokenVersion` no usuário revoga sessões.
Rate limit do login em memória (por processo); IP só com `TRUST_PROXY>=1`.

## Variáveis (.env na raiz)
`DATABASE_URL`, `DB_ALLOW_PUBLIC_KEY_RETRIEVAL` (só dev), `JWT_SECRET` (≥32), `JWT_EXPIRES_IN`, `SWAGGER_ENABLED`, `TRUST_PROXY`, `SEED_ADMIN_*`.

## Git
Branches `feat/…`, `fix/…`, `refactor/…` a partir de `main`; nunca commitar direto em `main`.
Migrations Prisma são versionadas (`prisma/migrations`).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
