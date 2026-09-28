// Documentação OpenAPI das rotas deste módulo (handlers ficam em app/api/**/route.ts).
import { IdParam, body, json, paginated, registry, secured, withErrors, z } from '../../docs/registry';
import { UserDTO } from '../auth/auth.schemas';
import { CreateUserInput, ListUsersQuery, UpdateUserInput } from './users.schemas';

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
