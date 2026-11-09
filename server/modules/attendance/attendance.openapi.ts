import { IdParam, json, registry, secured, withErrors, z } from '../../docs/registry';
import { CheckInDTO, DayCheckInDTO, DayQuery, MonthQuery, MyAttendanceDTO } from './attendance.schemas';

const tags = ['Presença'];
registry.registerPath({
  method: 'post',
  path: '/api/me/check-in',
  tags,
  summary: 'Aluno: check-in de hoje (1 por dia)',
  security: secured,
  responses: { 201: json(CheckInDTO, 'Check-in registrado'), ...withErrors({ 409: 'Já fez check-in hoje' }) },
});
registry.registerPath({
  method: 'get',
  path: '/api/me/attendance',
  tags,
  summary: 'Aluno: minha taxa de presença e histórico do mês',
  security: secured,
  request: { query: MonthQuery },
  responses: { 200: json(MyAttendanceDTO), ...withErrors() },
});
registry.registerPath({
  method: 'get',
  path: '/api/check-ins',
  tags,
  summary: 'Check-ins de um dia (ADMIN)',
  security: secured,
  request: { query: DayQuery },
  responses: { 200: json(z.array(DayCheckInDTO)), ...withErrors() },
});
registry.registerPath({
  method: 'delete',
  path: '/api/check-ins/{id}',
  tags,
  summary: 'Remover check-in lançado por engano (ADMIN)',
  security: secured,
  request: { params: IdParam },
  responses: { 204: { description: 'Removido' }, ...withErrors({ 404: 'Não encontrado' }) },
});
