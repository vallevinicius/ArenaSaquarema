import { Router } from 'express';
import { IdParam, body, json, registry, secured, withErrors, z } from '../../docs/registry.js';
import { handler } from '../../lib/handler.js';
import { requireRole } from '../../middlewares/auth.js';
import { CreatePlanInput, ListPlansQuery, PlanDTO, UpdatePlanInput } from './dayuse.schemas.js';
import * as service from './dayuse.service.js';

export const dayUseRouter = Router();

dayUseRouter.get(
  '/',
  handler({ query: ListPlansQuery }, async ({ query }, _req, res) => {
    res.json(await service.list(query.active));
  }),
);
dayUseRouter.post(
  '/',
  requireRole('ADMIN'),
  handler({ body: CreatePlanInput }, async ({ body }, _req, res) => {
    res.status(201).json(await service.create(body));
  }),
);
dayUseRouter.patch(
  '/:id',
  requireRole('ADMIN'),
  handler({ params: IdParam, body: UpdatePlanInput }, async ({ params, body }, _req, res) => {
    res.json(await service.update(params.id, body));
  }),
);

const tags = ['Day Use'];
registry.registerPath({
  method: 'get', path: '/api/day-use-plans', tags, security: secured,
  summary: 'Listar planos de day use',
  request: { query: ListPlansQuery },
  responses: { 200: json(z.array(PlanDTO)), ...withErrors() },
});
registry.registerPath({
  method: 'post', path: '/api/day-use-plans', tags, security: secured,
  summary: 'Criar plano de day use (ADMIN)',
  request: body(CreatePlanInput),
  responses: { 201: json(PlanDTO, 'Criado'), ...withErrors({ 409: 'Nome já existe' }) },
});
registry.registerPath({
  method: 'patch', path: '/api/day-use-plans/{id}', tags, security: secured,
  summary: 'Atualizar plano / preço / desativar (ADMIN)',
  request: { params: IdParam, ...body(UpdatePlanInput) },
  responses: { 200: json(PlanDTO), ...withErrors({ 404: 'Não encontrado' }) },
});
