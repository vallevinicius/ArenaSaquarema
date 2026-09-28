import { env } from '@/server/config/env';
import { buildOpenApiDocument } from '@/server/docs/openapi';
import { NotFound } from '@/server/lib/errors';
import { route } from '@/server/lib/route';

export const GET = route({ auth: false }, async () => {
  if (!env.SWAGGER_ENABLED) throw NotFound('Recurso');
  return buildOpenApiDocument();
});
