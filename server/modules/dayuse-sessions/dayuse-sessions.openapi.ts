// Documentação OpenAPI das rotas deste módulo (handlers ficam em app/api/**/route.ts).
import { IdParam, body, json, paginated, registry, secured, withErrors, z } from '../../docs/registry';
import { AddEntryInput, DayUseSessionDTO, DayUseSessionDetailDTO, EntryParams, ListSessionsQuery } from './dayuse-sessions.schemas';

const tags = ['Day Use'];
const notOpen = { 404: 'Caixa não encontrado', 409: 'Caixa não está aberto' };

registry.registerPath({
  method: 'get', path: '/api/day-use-sessions', tags, security: secured,
  summary: 'Listar histórico de caixas de day use',
  request: { query: ListSessionsQuery },
  responses: { 200: json(paginated(DayUseSessionDTO)), ...withErrors() },
});
registry.registerPath({
  method: 'get', path: '/api/day-use-sessions/current', tags, security: secured,
  summary: 'Caixa de day use aberto agora (null se nenhum)',
  responses: { 200: json(DayUseSessionDetailDTO.nullable()), ...withErrors() },
});
registry.registerPath({
  method: 'get', path: '/api/day-use-sessions/{id}', tags, security: secured,
  summary: 'Detalhar caixa com os lançamentos',
  request: { params: IdParam },
  responses: { 200: json(DayUseSessionDetailDTO), ...withErrors({ 404: 'Não encontrado' }) },
});
registry.registerPath({
  method: 'post', path: '/api/day-use-sessions', tags, security: secured,
  summary: 'Abrir o caixa de day use de hoje (máx. 1 aberto por vez)',
  responses: { 201: json(DayUseSessionDetailDTO, 'Aberto'), ...withErrors({ 409: 'Já existe caixa aberto ou de hoje' }) },
});
registry.registerPath({
  method: 'post', path: '/api/day-use-sessions/{id}/entries', tags, security: secured,
  summary: 'Registrar quem pagou o day use no caixa aberto',
  request: { params: IdParam, ...body(AddEntryInput) },
  responses: { 201: json(DayUseSessionDetailDTO, 'Registrado'), ...withErrors(notOpen) },
});
registry.registerPath({
  method: 'delete', path: '/api/day-use-sessions/{id}/entries/{entryId}', tags, security: secured,
  summary: 'Remover lançamento. Operador: só os próprios em até 10 min; admin: qualquer.',
  request: { params: EntryParams },
  responses: { 200: json(DayUseSessionDetailDTO), ...withErrors(notOpen) },
});
registry.registerPath({
  method: 'post', path: '/api/day-use-sessions/{id}/close', tags, security: secured,
  summary: 'Fechar o caixa de day use do dia',
  request: { params: IdParam },
  responses: { 200: json(DayUseSessionDetailDTO), ...withErrors(notOpen) },
});
