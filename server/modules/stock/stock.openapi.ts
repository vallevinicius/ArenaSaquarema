// Documentação OpenAPI das rotas deste módulo (handlers ficam em app/api/**/route.ts).
import { IdParam, body, json, paginated, registry, secured, withErrors, z } from '../../docs/registry';
import { CreateMovementInput, ListMovementsQuery, MovementDTO } from './stock.schemas';

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
