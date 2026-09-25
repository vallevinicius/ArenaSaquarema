import { Router } from 'express';
import { json, registry, secured, withErrors } from '../../docs/registry.js';
import { handler } from '../../lib/handler.js';
import { requireRole } from '../../middlewares/auth.js';
import { DashboardDTO, DashboardQuery } from './dashboard.schemas.js';
import * as service from './dashboard.service.js';

export const dashboardRouter = Router();
dashboardRouter.use(requireRole('ADMIN'));

dashboardRouter.get(
  '/',
  handler({ query: DashboardQuery }, async ({ query }, _req, res) => {
    res.json(await service.summary(query));
  }),
);

registry.registerPath({
  method: 'get', path: '/api/dashboard', tags: ['Dashboard'], security: secured,
  summary: 'Indicadores de vendas do período (ADMIN)',
  request: { query: DashboardQuery },
  responses: { 200: json(DashboardDTO), ...withErrors() },
});
