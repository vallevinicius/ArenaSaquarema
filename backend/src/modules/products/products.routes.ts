import { Router } from 'express';
import { IdParam, body, json, paginated, registry, secured, withErrors } from '../../docs/registry.js';
import { handler } from '../../lib/handler.js';
import { currentUser, requireRole } from '../../middlewares/auth.js';
import { CreateProductInput, ListProductsQuery, ProductDTO, UpdateProductInput } from './products.schemas.js';
import * as service from './products.service.js';

export const productsRouter = Router();

productsRouter.get(
  '/',
  handler({ query: ListProductsQuery }, async ({ query }, _req, res) => {
    res.json(await service.list(query));
  }),
);
productsRouter.get(
  '/:id',
  handler({ params: IdParam }, async ({ params }, _req, res) => {
    res.json(await service.get(params.id));
  }),
);
productsRouter.post(
  '/',
  requireRole('ADMIN'),
  handler({ body: CreateProductInput }, async ({ body }, req, res) => {
    res.status(201).json(await service.create(body, currentUser(req).id));
  }),
);
productsRouter.patch(
  '/:id',
  requireRole('ADMIN'),
  handler({ params: IdParam, body: UpdateProductInput }, async ({ params, body }, _req, res) => {
    res.json(await service.update(params.id, body));
  }),
);

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
