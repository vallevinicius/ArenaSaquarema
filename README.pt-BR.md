# Arena Saquarema — Bar, Comandas e Day Use

🇺🇸 [Read in English](README.md)

![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white) ![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white) ![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white) ![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?logo=mysql&logoColor=white) ![OpenAPI](https://img.shields.io/badge/OpenAPI-3.1-85EA2D?logo=swagger&logoColor=white)

Sistema de controle da arena de futevôlei: comandas por cliente, vendas do bar com baixa automática de estoque, venda de day use, movimentação de estoque e dashboard de vendas.

**Frontend e backend no mesmo app Next.js** (mesmo modelo do PingoDeMeio): as telas ficam em `app/(app)/…`, a API em `app/api/…` (Route Handlers) e tudo roda num único processo e numa única porta com `npm run dev` / `npm start`.

| Camada   | Stack |
|----------|-------|
| App      | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, TanStack Query |
| API      | Route Handlers do Next + Zod 4 (validação) + camada `server/` (regras de negócio) |
| Banco    | MySQL 8 via Prisma 7 (driver adapter `@prisma/adapter-mariadb`) |
| Docs     | OpenAPI 3.1 gerado dos schemas Zod → Swagger UI em `/docs` |

```
arena-saquarema/
├── app/
│   ├── (app)/            páginas logadas: comandas, clientes, produtos, estoque, day-use, usuarios, dashboard
│   ├── login/            página de login
│   ├── docs/             Swagger UI (servido do swagger-ui-dist)
│   └── api/              Route Handlers: finos, só chamam route() + service
├── server/               backend (nunca vai para o browser)
│   ├── modules/          auth, users, customers, products, stock, dayuse, tabs, dashboard
│   │                     (cada um: *.schemas.ts → *.service.ts + *.openapi.ts)
│   ├── lib/              route() (auth/RBAC/validação/erros), auth, prisma, rate-limit, logger
│   ├── docs/             registry OpenAPI
│   └── config/env.ts     variáveis validadas com Zod
├── components/ hooks/ lib/   UI e cliente HTTP do front
├── prisma/               schema, migrations, seed
├── proxy.ts              redireciona páginas sem sessão para /login
└── docker-compose.yml    MySQL 8 local
```

## Rodando localmente

Pré-requisitos: Node.js 20.19+ e Docker (ou um MySQL 8 próprio).

```bash
docker compose up -d                 # 1. banco

cp .env.example .env                 # 2. variáveis (antes do install: o Prisma lê DATABASE_URL daqui)
#   - JWT_SECRET: node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
#   - SEED_ADMIN_PASSWORD: senha do primeiro admin (mín. 10 caracteres)

npm install                          # 3. dependências (postinstall roda prisma generate)
npm run db:migrate -- --name init    # 4. primeira migration (commite prisma/migrations)
npm run db:seed                      # 5. admin + produtos e planos de exemplo
npm run dev                          # 6. app + API em http://localhost:3000
```

- App: http://localhost:3000
- Swagger: http://localhost:3000/docs (JSON em `/api/docs.json`)

No Swagger, execute `POST /api/auth/login` primeiro: o cookie de sessão é gravado e usado automaticamente nas demais chamadas.

### Produção

```bash
npm run build
npm run db:deploy
npm start          # porta 3000 (ou -p)
```

Coloque atrás de um proxy HTTPS (nginx/Caddy) e defina `TRUST_PROXY=1`. Em produção o cookie é `Secure`: **sem HTTPS o login não funciona** (localhost é exceção nos navegadores). O `next build` não precisa do `.env`; as variáveis são validadas na primeira requisição.

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
- Rate limit no login: 20 tentativas / 15 min por conta e 10 por IP. O IP só é usado com `TRUST_PROXY>=1` (atrás de proxy reverso); sem proxy o `X-Forwarded-For` é do cliente e é ignorado. O contador é em memória, por processo: com várias instâncias, mova para Redis.
- Validação Zod em todo body/query/params; campos não declarados são descartados (sem mass assignment).
- Somente SQL parametrizado (Prisma + `$queryRaw` com tagged template).
- IDOR: itens sempre buscados por `id + tabId`.
- Erros 500 com mensagem genérica; detalhes vão só para o log (pino com redaction de cookie/authorization/senha).
- Mutações exigem `Content-Type: application/json` e Origin igual ao host (CSRF, além do SameSite=Strict). Body limitado a 100 kb.
- Headers de segurança no `next.config.ts` (CSP, HSTS, X-Frame-Options, nosniff). A CSP tem `'unsafe-inline'` em scripts porque o Next injeta scripts de hidratação; o token fica protegido pelo cookie httpOnly.
- `proxy.ts` só faz o redirect das páginas; a barreira real é o `route()` em cada Route Handler (deny by default).

## Scripts

| Script | O que faz |
|---|---|
| `npm run dev` | App + API com hot reload |
| `npm run build` / `npm start` | Build e servidor de produção |
| `npm run typecheck` | Gera tipos de rota do Next e roda `tsc` |
| `npm run db:migrate -- --name <nome>` | Cria e aplica migration em dev |
| `npm run db:deploy` | Aplica migrations em produção |
| `npm run db:seed` | Cria admin e dados de exemplo (idempotente, não reseta senha) |
| `npm run openapi:export` | Gera `openapi.json` estático |

## Equipe

- [Vinicius do Valle](https://github.com/vallevinicius)
