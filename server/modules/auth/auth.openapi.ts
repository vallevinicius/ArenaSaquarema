// Documentação OpenAPI das rotas deste módulo (handlers ficam em app/api/**/route.ts).
import { IdParam, body, json, paginated, registry, secured, withErrors, z } from '../../docs/registry';
import { ChangePasswordInput, LoginInput, MeDTO } from './auth.schemas';

const tags = ['Auth'];
registry.registerPath({
  method: 'post',
  path: '/api/auth/login',
  tags,
  summary: 'Login (define cookie httpOnly com JWT)',
  request: body(LoginInput),
  responses: { 200: json(MeDTO), ...withErrors({ 429: 'Muitas tentativas' }) },
});
registry.registerPath({
  method: 'post',
  path: '/api/auth/logout',
  tags,
  summary: 'Logout (remove cookie)',
  responses: { 204: { description: 'Sessão encerrada' } },
});
registry.registerPath({
  method: 'get',
  path: '/api/auth/me',
  tags,
  summary: 'Usuário autenticado',
  security: secured,
  responses: { 200: json(MeDTO), ...withErrors() },
});
registry.registerPath({
  method: 'patch',
  path: '/api/auth/password',
  tags,
  summary: 'Trocar a própria senha (encerra outras sessões)',
  security: secured,
  request: body(ChangePasswordInput),
  responses: { 204: { description: 'Senha alterada' }, ...withErrors() },
});
