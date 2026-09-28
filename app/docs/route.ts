import { env } from '@/server/config/env';

// Página do Swagger UI. HTML estático sem script inline (compatível com a CSP):
// a inicialização fica em /docs/init.js e os assets vêm do swagger-ui-dist pré-compilado.
const HTML = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Arena Saquarema API · Swagger</title>
    <link rel="icon" href="/favicon.svg" />
    <link rel="stylesheet" href="/docs/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="/docs/swagger-ui-bundle.js"></script>
    <script src="/docs/init.js"></script>
  </body>
</html>`;

export function GET() {
  if (!env.SWAGGER_ENABLED) return new Response('Not found', { status: 404 });
  return new Response(HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
