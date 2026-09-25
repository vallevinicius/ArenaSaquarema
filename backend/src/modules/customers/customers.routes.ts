import { Router } from 'express';
import { IdParam, body, json, paginated, registry, secured, withErrors } from '../../docs/registry.js';
import { handler } from '../../lib/handler.js';
import { CreateCustomerInput, CustomerDTO, ListCustomersQuery, UpdateCustomerInput } from './customers.schemas.js';
import * as service from './customers.service.js';

// ADMIN e OPERADOR: operador cadastra cliente no balcão.
export const customersRouter = Router();

customersRouter.get(
  '/',
  handler({ query: ListCustomersQuery }, async ({ query }, _req, res) => {
    res.json(await service.list(query));
  }),
);
customersRouter.get(
  '/:id',
  handler({ params: IdParam }, async ({ params }, _req, res) => {
    res.json(await service.get(params.id));
  }),
);
customersRouter.post(
  '/',
  handler({ body: CreateCustomerInput }, async ({ body }, _req, res) => {
    res.status(201).json(await service.create(body));
  }),
);
customersRouter.patch(
  '/:id',
  handler({ params: IdParam, body: UpdateCustomerInput }, async ({ params, body }, _req, res) => {
    res.json(await service.update(params.id, body));
  }),
);

const tags = ['Clientes'];
registry.registerPath({
  method: 'get', path: '/api/customers', tags, security: secured,
  summary: 'Listar/buscar clientes',
  request: { query: ListCustomersQuery },
  responses: { 200: json(paginated(CustomerDTO)), ...withErrors() },
});
registry.registerPath({
  method: 'get', path: '/api/customers/{id}', tags, security: secured,
  summary: 'Detalhar cliente',
  request: { params: IdParam },
  responses: { 200: json(CustomerDTO), ...withErrors({ 404: 'Não encontrado' }) },
});
registry.registerPath({
  method: 'post', path: '/api/customers', tags, security: secured,
  summary: 'Cadastrar cliente',
  request: body(CreateCustomerInput),
  responses: { 201: json(CustomerDTO, 'Criado'), ...withErrors({ 409: 'CPF já cadastrado' }) },
});
registry.registerPath({
  method: 'patch', path: '/api/customers/{id}', tags, security: secured,
  summary: 'Atualizar cliente',
  request: { params: IdParam, ...body(UpdateCustomerInput) },
  responses: { 200: json(CustomerDTO), ...withErrors({ 404: 'Não encontrado', 409: 'CPF já cadastrado' }) },
});
