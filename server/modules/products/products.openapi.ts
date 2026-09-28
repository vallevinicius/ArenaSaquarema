// Documentação OpenAPI das rotas deste módulo (handlers ficam em app/api/**/route.ts).
import { IdParam, body, json, paginated, registry, secured, withErrors, z } from '../../docs/registry';
import { CreateProductInput, ListProductsQuery, ProductDTO, UpdateProductInput } from './products.schemas';

const tags = ['Produtos (Bar)'];
registry.registerPath({
  method: 'get', path: '/api/products', tags, security: secured,
  summary: 'Listar produtos do bar',
  request: { query: ListProductsQuery },
  responses: { 200: json(paginated(ProductDTO)), ...withErrors() },
});
registry.registerPath({
  method: 'get', path: '/api/products/{id}', tags, security: secured,
  summary: 'Detalhar produto',
  request: { params: IdParam },
  responses: { 200: json(ProductDTO), ...withErrors({ 404: 'Não encontrado' }) },
});
registry.registerPath({
  method: 'post', path: '/api/products', tags, security: secured,
  summary: 'Cadastrar produto (ADMIN)',
  request: body(CreateProductInput),
  responses: { 201: json(ProductDTO, 'Criado'), ...withErrors({ 409: 'Nome já existe' }) },
});
registry.registerPath({
  method: 'patch', path: '/api/products/{id}', tags, security: secured,
  summary: 'Atualizar produto / preço / desativar (ADMIN)',
  request: { params: IdParam, ...body(UpdateProductInput) },
  responses: { 200: json(ProductDTO), ...withErrors({ 404: 'Não encontrado', 409: 'Nome já existe' }) },
});
