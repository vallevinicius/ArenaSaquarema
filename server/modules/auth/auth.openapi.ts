// Documentação OpenAPI das rotas deste módulo (handlers ficam em app/api/**/route.ts).
import { IdParam, body, json, paginated, registry, secured, withErrors, z } from '../../docs/registry';
import { ChangePasswordInput, ConfirmPasswordResetInput, LoginInput, MeDTO, PasswordResetRequiredDTO } from './auth.schemas';

const tags = ['Auth'];
registry.registerPath({
  method: 'post',
  path: '/api/auth/login',
  tags,
  summary: 'Login (define cookie httpOnly com JWT)',
  description:
    'Aluno com senha provisória recebe **202** (sem cookie) e um código por e-mail; conclua em `POST /api/auth/password-reset`.',
  request: body(LoginInput),
  responses: {
    200: json(MeDTO),
    202: json(PasswordResetRequiredDTO, 'Senha provisória: código enviado por e-mail'),
    ...withErrors({ 429: 'Muitas tentativas', 502: 'Falha ao enviar o e-mail' }),
  },
});
registry.registerPath({
  method: 'post',
  path: '/api/auth/password-reset',
  tags,
  summary: 'Confirmar o código do e-mail e definir a senha (abre a sessão)',
  request: body(ConfirmPasswordResetInput),
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
