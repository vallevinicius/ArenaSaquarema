// Documentação OpenAPI das rotas deste módulo (handlers ficam em app/api/**/route.ts).
import { IdParam, body, json, paginated, registry, secured, withErrors, z } from '../../docs/registry';
import { CreateCustomerInput, CustomerDTO, ListCustomersQuery, UpdateCustomerInput } from './customers.schemas';

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
