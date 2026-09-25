import { Router } from 'express';
import { IdParam, body, json, paginated, registry, secured, withErrors } from '../../docs/registry.js';
import { handler } from '../../lib/handler.js';
import { currentUser, requireRole } from '../../middlewares/auth.js';
import { UserDTO } from '../auth/auth.schemas.js';
import { CreateUserInput, ListUsersQuery, UpdateUserInput } from './users.schemas.js';
import * as service from './users.service.js';

export const usersRouter = Router();
usersRouter.use(requireRole('ADMIN'));

usersRouter.get(
  '/',
  handler({ query: ListUsersQuery }, async ({ query }, _req, res) => {
    res.json(await service.list(query));
  }),
);

usersRouter.post(
  '/',
  handler({ body: CreateUserInput }, async ({ body }, _req, res) => {
    res.status(201).json(await service.create(body));
  }),
);

usersRouter.patch(
  '/:id',
  handler({ params: IdParam, body: UpdateUserInput }, async ({ params, body }, req, res) => {
    res.json(await service.update(currentUser(req).id, params.id, body));
  }),
);

const tags = ['Usuários'];
registry.registerPath({
  method: 'get',
  path: '/api/users',
  tags,
  summary: 'Listar usuários (ADMIN)',
  security: secured,
  request: { query: ListUsersQuery },
  responses: { 200: json(paginated(UserDTO)), ...withErrors() },
});
registry.registerPath({
  method: 'post',
  path: '/api/users',
  tags,
  summary: 'Criar usuário (ADMIN)',
  security: secured,
  request: body(CreateUserInput),
  responses: { 201: json(UserDTO, 'Criado'), ...withErrors({ 409: 'E-mail já cadastrado' }) },
});
registry.registerPath({
  method: 'patch',
  path: '/api/users/{id}',
  tags,
  summary: 'Atualizar usuário / resetar senha / desativar (ADMIN). Revoga sessões ativas.',
  security: secured,
  request: { params: IdParam, ...body(UpdateUserInput) },
  responses: { 200: json(UserDTO), ...withErrors({ 404: 'Não encontrado' }) },
});
