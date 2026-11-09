// Documentação OpenAPI da rota de saúde (handler em app/api/health/route.ts).
import { ErrorSchema, json, registry, z } from '../../docs/registry';

const HealthDTO = z.object({ status: z.literal('ok'), db: z.literal('ok') }).openapi('Health');

registry.registerPath({
  method: 'get',
  path: '/api/health',
  tags: ['Saúde'],
  summary: 'Saúde do app e do banco (público, para monitor de uptime)',
  responses: { 200: json(HealthDTO, 'App e banco respondendo'), 503: json(ErrorSchema, 'Banco de dados indisponível (código DB_UNAVAILABLE)') },
});
