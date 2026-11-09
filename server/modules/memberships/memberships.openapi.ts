// Documentação OpenAPI das rotas deste módulo (handlers ficam em app/api/**/route.ts).
import { IdParam, PaginationQuery, body, json, paginated, registry, secured, withErrors, z } from '../../docs/registry';
import {
  CreateMembershipPlanInput,
  ListMembershipsQuery,
  MembershipPlanDTO,
  MembershipOverviewDTO,
  MembershipRowDTO,
  MyMembershipDTO,
  PaymentDTO,
  RegisterPaymentInput,
  SetPlanInput,
  UpdateMembershipPlanInput,
  UserIdParam,
  VoidPaymentInput,
} from './memberships.schemas';

const tags = ['Mensalidades'];
const base = { tags, security: secured };

registry.registerPath({ ...base, method: 'get', path: '/api/membership-plans', summary: 'Planos de mensalidade', responses: { 200: json(z.array(MembershipPlanDTO)), ...withErrors() } });
registry.registerPath({
  ...base,
  method: 'post',
  path: '/api/membership-plans',
  summary: 'Criar plano de mensalidade',
  request: body(CreateMembershipPlanInput),
  responses: { 201: json(MembershipPlanDTO), ...withErrors({ 409: 'Já existe plano com esse nome' }) },
});
registry.registerPath({
  ...base,
  method: 'patch',
  path: '/api/membership-plans/{id}',
  summary: 'Editar plano (nome, preço, se é cobrado, ativo)',
  request: { params: IdParam, ...body(UpdateMembershipPlanInput) },
  responses: { 200: json(MembershipPlanDTO), ...withErrors({ 404: 'Plano não encontrado', 409: 'Já existe plano com esse nome' }) },
});
registry.registerPath({
  ...base,
  method: 'get',
  path: '/api/memberships',
  summary: 'Situação das mensalidades dos alunos ativos (quem precisa de cobrança primeiro)',
  request: { query: ListMembershipsQuery },
  responses: { 200: json(MembershipOverviewDTO), ...withErrors() },
});
registry.registerPath({
  ...base,
  method: 'put',
  path: '/api/memberships/{userId}/plan',
  summary: 'Definir (ou remover, com null) o plano do aluno',
  request: { params: UserIdParam, ...body(SetPlanInput) },
  responses: { 200: json(MembershipRowDTO), ...withErrors({ 404: 'Aluno ou plano não encontrado', 409: 'Plano desativado' }) },
});
registry.registerPath({
  ...base,
  method: 'get',
  path: '/api/memberships/{userId}/payments',
  summary: 'Histórico de pagamentos do aluno',
  request: { params: UserIdParam, query: PaginationQuery },
  responses: { 200: json(paginated(PaymentDTO)), ...withErrors({ 404: 'Aluno não encontrado' }) },
});
registry.registerPath({
  ...base,
  method: 'post',
  path: '/api/memberships/{userId}/payments',
  summary: 'Registrar pagamento (vale 30 dias; pagando antes de vencer, soma ao período atual)',
  request: { params: UserIdParam, ...body(RegisterPaymentInput) },
  responses: {
    201: json(PaymentDTO),
    ...withErrors({ 404: 'Aluno não encontrado', 409: 'Sem plano, plano de parceiro ou pagamento duplicado (NO_PLAN, PLAN_NOT_CHARGEABLE, DUPLICATE_PAYMENT)', 422: 'Dados inválidos' }),
  },
});
registry.registerPath({
  ...base,
  method: 'post',
  path: '/api/membership-payments/{id}/void',
  summary: 'Estornar pagamento (continua no histórico, deixa de valer)',
  request: { params: IdParam, ...body(VoidPaymentInput) },
  responses: { 200: json(PaymentDTO), ...withErrors({ 404: 'Pagamento não encontrado', 409: 'Já estornado' }) },
});
registry.registerPath({
  tags: ['Mensalidades'],
  security: secured,
  method: 'get',
  path: '/api/me/membership',
  summary: 'Situação da PRÓPRIA mensalidade (aluno)',
  responses: { 200: json(MyMembershipDTO), ...withErrors() },
});
