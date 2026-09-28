// Documentação OpenAPI das rotas deste módulo (handlers ficam em app/api/**/route.ts).
import { IdParam, body, json, paginated, registry, secured, withErrors, z } from '../../docs/registry';
import { DashboardDTO, DashboardQuery } from './dashboard.schemas';

registry.registerPath({
  method: 'get', path: '/api/dashboard', tags: ['Dashboard'], security: secured,
  summary: 'Indicadores de vendas do período (ADMIN)',
  request: { query: DashboardQuery },
  responses: { 200: json(DashboardDTO), ...withErrors() },
});
