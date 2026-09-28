// Documentação OpenAPI das rotas deste módulo (handlers ficam em app/api/**/route.ts).
import { IdParam, body, json, paginated, registry, secured, withErrors, z } from '../../docs/registry';
import {
  AddItemInput, CancelTabInput, CloseTabInput, ItemParams, ListTabsQuery, OpenTabInput, TabDTO, TabDetailDTO,
} from './tabs.schemas';

const tags = ['Comandas'];
const notOpen = { 404: 'Comanda não encontrada', 409: 'Comanda não está aberta' };
registry.registerPath({
  method: 'get', path: '/api/tabs', tags, security: secured,
  summary: 'Listar comandas',
  request: { query: ListTabsQuery },
  responses: { 200: json(paginated(TabDTO)), ...withErrors() },
});
registry.registerPath({
  method: 'get', path: '/api/tabs/{id}', tags, security: secured,
  summary: 'Detalhar comanda com itens',
  request: { params: IdParam },
  responses: { 200: json(TabDetailDTO), ...withErrors({ 404: 'Não encontrada' }) },
});
registry.registerPath({
  method: 'post', path: '/api/tabs', tags, security: secured,
  summary: 'Abrir comanda para um cliente (máx. 1 aberta por cliente)',
  request: body(OpenTabInput),
  responses: { 201: json(TabDetailDTO, 'Aberta'), ...withErrors({ 404: 'Cliente não encontrado', 409: 'Cliente já possui comanda aberta' }) },
});
registry.registerPath({
  method: 'post', path: '/api/tabs/{id}/items', tags, security: secured,
  summary: 'Lançar produto do bar (baixa estoque) ou day use na comanda',
  request: { params: IdParam, ...body(AddItemInput) },
  responses: { 201: json(TabDetailDTO, 'Lançado'), ...withErrors({ ...notOpen, 409: 'Comanda fechada ou estoque insuficiente' }) },
});
registry.registerPath({
  method: 'delete', path: '/api/tabs/{id}/items/{itemId}', tags, security: secured,
  summary: 'Remover item (estorna estoque). Operador: só itens próprios em até 10 min; admin: qualquer.',
  request: { params: ItemParams },
  responses: { 200: json(TabDetailDTO), ...withErrors(notOpen) },
});
registry.registerPath({
  method: 'post', path: '/api/tabs/{id}/close', tags, security: secured,
  summary: 'Fechar comanda com forma de pagamento',
  request: { params: IdParam, ...body(CloseTabInput) },
  responses: { 200: json(TabDetailDTO), ...withErrors(notOpen) },
});
registry.registerPath({
  method: 'post', path: '/api/tabs/{id}/cancel', tags, security: secured,
  summary: 'Cancelar comanda aberta e estornar estoque (ADMIN)',
  request: { params: IdParam, ...body(CancelTabInput) },
  responses: { 200: json(TabDetailDTO), ...withErrors(notOpen) },
});
