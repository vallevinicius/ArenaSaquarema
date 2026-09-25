import { Router } from 'express';
import { body, json, paginated, registry, secured, withErrors } from '../../docs/registry.js';
import { handler } from '../../lib/handler.js';
import { currentUser, requireRole } from '../../middlewares/auth.js';
import { CreateMovementInput, ListMovementsQuery, MovementDTO } from './stock.schemas.js';
import * as service from './stock.service.js';

export const stockRouter = Router();
stockRouter.use(requireRole('ADMIN'));

stockRouter.get(
  '/movements',
  handler({ query: ListMovementsQuery }, async ({ query }, _req, res) => {
    res.json(await service.list(query));
  }),
);

stockRouter.post(
  '/movements',
  handler({ body: CreateMovementInput }, async ({ body }, req, res) => {
    res.status(201).json(await service.createManual(body, currentUser(req).id));
  }),
);

const tags = ['Estoque'];
registry.registerPath({
  method: 'get', path: '/api/stock/movements', tags, security: secured,
  summary: 'Histórico de movimentações (ADMIN)',
  request: { query: ListMovementsQuery },
  responses: { 200: json(paginated(MovementDTO)), ...withErrors() },
});
registry.registerPath({
  method: 'post', path: '/api/stock/movements', tags, security: secured,
  summary: 'Registrar entrada, saída ou ajuste de inventário (ADMIN)',
  description: 'VENDA e ESTORNO são gerados automaticamente pelas comandas e não podem ser lançados manualmente.',
  request: body(CreateMovementInput),
  responses: {
    201: json(MovementDTO, 'Registrado'),
    ...withErrors({ 404: 'Produto não encontrado', 409: 'Estoque insuficiente' }),
  },
});
