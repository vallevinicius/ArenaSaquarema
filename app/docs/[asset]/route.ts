import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { env } from '@/server/config/env';

const INIT_JS = `window.ui = SwaggerUIBundle({
  url: '/api/docs.json',
  dom_id: '#swagger-ui',
  withCredentials: true,
  persistAuthorization: false,
  deepLinking: true,
});`;

// Allowlist explícita: o nome do arquivo vem da URL, então nada de path livre (path traversal).
const FILES: Record<string, string> = {
  'swagger-ui.css': 'text/css; charset=utf-8',
  'swagger-ui-bundle.js': 'application/javascript; charset=utf-8',
};

const DIST = path.join(process.cwd(), 'node_modules', 'swagger-ui-dist');

export async function GET(_req: Request, ctx: RouteContext<'/docs/[asset]'>) {
  if (!env.SWAGGER_ENABLED) return new Response('Not found', { status: 404 });
  const { asset } = await ctx.params;

  if (asset === 'init.js') {
    return new Response(INIT_JS, { headers: { 'Content-Type': 'application/javascript; charset=utf-8' } });
  }
  const type = FILES[asset];
  if (!type) return new Response('Not found', { status: 404 });

  const body = await readFile(path.join(DIST, asset));
  return new Response(body, { headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=86400' } });
}
