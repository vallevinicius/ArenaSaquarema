import { IdParam, body, json, registry, secured, withErrors, z } from '../../docs/registry';
import { CreateProfileInput, ProfileDTO, UpdateProfileInput } from './profiles.schemas';

const tags = ['Perfis'];
registry.registerPath({
  method: 'get',
  path: '/api/profiles',
  tags,
  summary: 'Listar perfis de acesso (ADMIN)',
  security: secured,
  responses: { 200: json(z.array(ProfileDTO)), ...withErrors() },
});
registry.registerPath({
  method: 'post',
  path: '/api/profiles',
  tags,
  summary: 'Criar perfil de acesso (ADMIN)',
  security: secured,
  request: body(CreateProfileInput),
  responses: { 201: json(ProfileDTO, 'Criado'), ...withErrors({ 409: 'Já existe um perfil com esse nome' }) },
});
registry.registerPath({
  method: 'patch',
  path: '/api/profiles/{id}',
  tags,
  summary: 'Editar nome, descrição ou permissões (ADMIN). Vale na hora para quem usa o perfil.',
  security: secured,
  request: { params: IdParam, ...body(UpdateProfileInput) },
  responses: { 200: json(ProfileDTO), ...withErrors({ 404: 'Não encontrado', 409: 'Nome já existe' }) },
});
registry.registerPath({
  method: 'delete',
  path: '/api/profiles/{id}',
  tags,
  summary: 'Excluir perfil sem usuários (ADMIN)',
  security: secured,
  request: { params: IdParam },
  responses: { 204: { description: 'Excluído' }, ...withErrors({ 404: 'Não encontrado', 409: 'Perfil em uso' }) },
});
