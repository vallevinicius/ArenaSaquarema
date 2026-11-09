// Documentação OpenAPI das rotas deste módulo (handlers ficam em app/api/**/route.ts).
import { ErrorSchema, IdParam, body, json, registry, secured, withErrors, z } from '../../docs/registry';
import {
  CreatePartnerCheckInInput,
  IntegrationStatusDTO,
  ListPartnerCheckInsQuery,
  MonthQuery,
  PartnerCheckInDTO,
  PartnerCheckInListDTO,
  PartnerSummaryDTO,
  TotalPassWebhookInput,
} from './partners.schemas';

const tags = ['Parceiros'];
const base = { tags, security: secured };
const adminOnly = 'Somente ADMIN.';

registry.registerPath({
  ...base,
  method: 'get',
  path: '/api/partner-check-ins',
  summary: 'Check-ins de Wellhub/TotalPass de um dia (com nomes)',
  description: `${adminOnly} Contagem separada da presença dos alunos.`,
  request: { query: ListPartnerCheckInsQuery },
  responses: { 200: json(PartnerCheckInListDTO), ...withErrors() },
});
registry.registerPath({
  ...base,
  method: 'post',
  path: '/api/partner-check-ins',
  summary: 'Lançar check-in de parceiro à mão',
  description: adminOnly,
  request: body(CreatePartnerCheckInInput),
  responses: { 201: json(PartnerCheckInDTO), ...withErrors() },
});
registry.registerPath({
  ...base,
  method: 'get',
  path: '/api/partner-check-ins/summary',
  summary: 'Contagem do mês por plataforma e por dia (sem nomes)',
  description: adminOnly,
  request: { query: MonthQuery },
  responses: { 200: json(PartnerSummaryDTO), ...withErrors() },
});
registry.registerPath({
  ...base,
  method: 'delete',
  path: '/api/partner-check-ins/{id}',
  summary: 'Remover lançamento manual',
  description: `${adminOnly} Check-in recebido da plataforma não pode ser removido.`,
  request: { params: IdParam },
  responses: { 204: { description: 'Removido' }, ...withErrors({ 404: 'Não encontrado', 409: 'Veio da plataforma (NOT_MANUAL)' }) },
});
registry.registerPath({
  ...base,
  method: 'post',
  path: '/api/partner-check-ins/{id}/validate',
  summary: 'Tentar confirmar de novo um check-in TotalPass pendente',
  description: adminOnly,
  request: { params: IdParam },
  responses: { 200: json(PartnerCheckInDTO), ...withErrors({ 404: 'Não encontrado', 409: 'Não está pendente', 503: 'Integração desligada' }) },
});
registry.registerPath({
  ...base,
  method: 'get',
  path: '/api/partner-integrations',
  summary: 'Estado das integrações (sem expor chaves)',
  description: adminOnly,
  responses: { 200: json(IntegrationStatusDTO), ...withErrors() },
});
registry.registerPath({
  ...base,
  method: 'post',
  path: '/api/partner-integrations/totalpass/webhook',
  summary: 'Registrar na TotalPass a URL que recebe os check-ins',
  description: `${adminOnly} Exige as chaves e o segredo no .env e SITE_URL com https.`,
  responses: { 200: json(z.object({ registered: z.boolean(), webhookUrl: z.string() })), ...withErrors({ 409: 'Integração não configurada', 503: 'TotalPass não respondeu' }) },
});
registry.registerPath({
  tags,
  method: 'post',
  path: '/api/partners/totalpass/webhook/{secret}',
  summary: 'Webhook de check-in da TotalPass (público, protegido pelo segredo no caminho)',
  description:
    'Chamado pela TotalPass a cada check-in. O check-in só vale depois de confirmado na TotalPass com o token. ' +
    'Segredo errado ou integração desligada = 404. Reenvio do mesmo check-in não duplica.',
  request: { params: z.object({ secret: z.string() }), ...body(TotalPassWebhookInput) },
  responses: {
    200: json(z.object({ status: z.enum(['validated', 'pending', 'expired', 'duplicate', 'ignored']) })),
    400: json(ErrorSchema, 'Aviso inválido'),
    404: json(ErrorSchema, 'Segredo inválido ou integração desligada'),
  },
});
