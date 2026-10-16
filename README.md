<div align="center">

# Arena Saquarema — Bar, Tabs & Day Use

**Point-of-sale and stock control for a footvolley arena in Saquarema, Brazil.**

🇧🇷 [Leia em português](README.pt-BR.md)

![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white) ![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white) ![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white) ![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?logo=mysql&logoColor=white) ![OpenAPI](https://img.shields.io/badge/OpenAPI-3.1-85EA2D?logo=swagger&logoColor=white)

</div>

## About

Management system for the arena's bar: customer tabs, bar sales with automatic stock deduction, day-use passes, stock movements and a sales dashboard.

**Front-end and API live in the same Next.js app**: pages under `app/(app)/…`, the API under `app/api/…` (Route Handlers), all served by a single process on a single port.

## Tech stack

| Layer | Technology |
|---|---|
| App | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, TanStack Query |
| API | Next.js Route Handlers + Zod 4 validation + a `server/` business layer |
| Data | MySQL 8 via Prisma 7 (`@prisma/adapter-mariadb` driver adapter) |
| Docs | OpenAPI 3.1 generated from the Zod schemas → Swagger UI at `/docs` |

## Architecture

```
app/
  (app)/        authenticated pages: tabs, customers, products, stock, day-use, users, dashboard
  login/        login page
  docs/         Swagger UI (served from swagger-ui-dist)
  api/          thin Route Handlers: route() + service call only
server/         back-end code (never shipped to the browser)
  modules/      auth, users, customers, products, stock, dayuse, tabs, dashboard
                (each: *.schemas.ts → *.service.ts + *.openapi.ts)
  lib/          route() (auth / RBAC / validation / errors), auth, prisma, rate-limit, logger
  config/env.ts environment validated with Zod
prisma/         schema, migrations, seed
proxy.ts        redirects pages without a session to /login
```

## Roles

| Action | OPERATOR (cashier) | ADMIN |
|---|:---:|:---:|
| Open a tab, add items, close a tab | ✔ | ✔ |
| Create / edit customers | ✔ | ✔ |
| Remove an item from a tab | own items, up to 10 min | ✔ |
| Cancel a tab (returns stock) | — | ✔ |
| Products, prices, day-use plans | read only | ✔ |
| Stock movements (in, out, adjustment) | — | ✔ |
| Dashboard and users | — | ✔ |

## Business rules

- **One open tab per customer**, enforced by a unique index (`openCustomerId`), including under concurrency.
- **Atomic stock deduction**: `UPDATE … WHERE stock >= qty`. Two cashiers selling the last unit at the same time → one gets `409 INSUFFICIENT_STOCK`. Stock never goes negative.
- **Tab row lock** (`SELECT … FOR UPDATE`) when adding, removing, closing or cancelling: no item after closing and no double close.
- **Price frozen on the item**: changing a product price does not change tabs already recorded.
- **Totals are always recalculated** from the items, never blindly incremented.
- **Stock only changes through movements** (IN, OUT, ADJUSTMENT, SALE, REVERSAL), each storing the resulting balance for auditing.
- Products with `trackStock=false` (drinks and dishes made to order) are sold without stock control.
- Day use has a **usage date** (default today, past dates rejected); the dashboard counts people by usage date.
- Dates and reports use `America/Sao_Paulo`; the database stores UTC.

## Security

- HS256 JWT in an **httpOnly + SameSite=Strict + Secure (prod) cookie**: JavaScript can never read the token.
- `algorithms`, `issuer` and `audience` pinned on verification (blocks `alg=none` and algorithm confusion).
- **Immediate revocation** with `tokenVersion`: changing password or role, or deactivating a user, ends open sessions.
- bcrypt cost 12; passwords of 10–72 characters; dummy-hash comparison for unknown e-mails (constant time, no user enumeration).
- Login rate limit: 20 attempts / 15 min per account and 10 per IP. The IP is only trusted with `TRUST_PROXY>=1`.
- Zod validation on every body/query/params; undeclared fields are dropped (no mass assignment).
- Parameterized SQL only (Prisma + `$queryRaw` tagged templates). IDOR: tab items are always fetched by `id + tabId`.
- 500 errors return a generic message; details go to the log only (pino with redaction of cookie/authorization/password).
- Mutations require `Content-Type: application/json` and an `Origin` matching the host (CSRF, on top of SameSite=Strict). Body limited to 100 kB.
- Security headers in `next.config.ts` (CSP, HSTS, X-Frame-Options, nosniff).
- `proxy.ts` only redirects pages; the real barrier is `route()` in each Route Handler (deny by default).

## Getting started

**Prerequisites:** Node.js 20.19+, Docker (or your own MySQL 8)

```bash
docker compose up -d                 # 1. database
cp .env.example .env                 # 2. variables (before install: Prisma reads DATABASE_URL)
#   JWT_SECRET: node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
#   SEED_ADMIN_PASSWORD: first admin password (min. 10 characters)
npm install                          # 3. postinstall runs prisma generate
npm run db:migrate -- --name init    # 4. first migration
npm run db:seed                      # 5. admin + sample products and plans
npm run dev                          # 6. app + API on http://localhost:3000
```

Swagger UI: http://localhost:3000/docs (JSON at `/api/docs.json`). Call `POST /api/auth/login` first; the session cookie is reused by the other calls.

**Production:** `npm run build && npm run db:deploy && npm start`, behind an HTTPS proxy with `TRUST_PROXY=1`. The cookie is `Secure` in production, so login does not work without HTTPS.

### Environment variables

`.env.example` — never commit real values.

| Variable | Description |
|---|---|
| `DATABASE_URL` | MySQL connection string |
| `JWT_SECRET` / `JWT_EXPIRES_IN` | Session token secret and lifetime |
| `TRUST_PROXY` | Reverse proxies in front of the app |
| `SWAGGER_ENABLED` | Exposes `/docs` |
| `SEED_ADMIN_NAME` / `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | First admin created by the seed |
| `DB_ALLOW_PUBLIC_KEY_RETRIEVAL` | MySQL 8 auth option for the MariaDB driver |

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | App + API with hot reload |
| `npm run build` / `npm start` | Production build and server |
| `npm run typecheck` | Generates Next route types and runs `tsc` |
| `npm run db:migrate -- --name <name>` | Create and apply a migration (dev) |
| `npm run db:deploy` | Apply migrations (production) |
| `npm run db:seed` | Admin and sample data (idempotent) |
| `npm run openapi:export` | Export a static `openapi.json` |

## Team

- [Vinicius do Valle](https://github.com/vallevinicius)
