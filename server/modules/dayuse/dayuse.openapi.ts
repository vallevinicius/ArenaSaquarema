// Documentação OpenAPI das rotas deste módulo (handlers ficam em app/api/**/route.ts).
import { IdParam, body, json, paginated, registry, secured, withErrors, z } from '../../docs/registry';
import { CreatePlanInput, ListPlansQuery, PlanDTO, UpdatePlanInput } from './dayuse.schemas';

const tags = ['Day Use'];
registry.registerPath({
  method: 'get', path: '/api/day-use-plans', tags, security: secured,
  summary: 'Listar planos de day use',
  request: { query: ListPlansQuery },
  responses: { 200: json(z.array(PlanDTO)), ...withErrors() },
});
registry.registerPath({
  method: 'post', path: '/api/day-use-plans', tags, security: secured,
  summary: 'Criar plano de day use (ADMIN)',
  request: body(CreatePlanInput),
  responses: { 201: json(PlanDTO, 'Criado'), ...withErrors({ 409: 'Nome já existe' }) },
});
registry.registerPath({
  method: 'patch', path: '/api/day-use-plans/{id}', tags, security: secured,
  summary: 'Atualizar plano / preço / desativar (ADMIN)',
  request: { params: IdParam, ...body(UpdatePlanInput) },
  responses: { 200: json(PlanDTO), ...withErrors({ 404: 'Não encontrado' }) },
});
