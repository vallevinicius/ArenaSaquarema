import { Money, MoneyInput, PaginationQuery, registry, z } from '../../docs/registry';

export const PaymentMethod = z.enum(['DINHEIRO', 'PIX', 'CARTAO_DEBITO', 'CARTAO_CREDITO']);
export const MembershipStatusEnum = z
  .enum(['SEM_PLANO', 'PARCEIRO', 'SEM_PAGAMENTO', 'EM_DIA', 'VENCE_EM_BREVE', 'VENCIDO'])
  .openapi('MembershipStatus');

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato AAAA-MM-DD');
// Plano de parceiro (Wellhub/TotalPass) não tem preço: aceita 0.
const PlanPrice = z
  .union([z.number(), z.string()])
  .transform((v) => (typeof v === 'number' ? v : Number(v)))
  .pipe(z.number().min(0).max(99_999_999.99).multipleOf(0.01))
  .openapi({ type: 'number', example: 130 });

export const CreateMembershipPlanInput = registry.register(
  'CreateMembershipPlanInput',
  z.object({
    name: z.string().trim().min(2).max(60).openapi({ example: '2x na semana' }),
    price: PlanPrice,
    chargeable: z.boolean().default(true).openapi({ description: 'false = aluno de parceiro (Wellhub/TotalPass): a arena não cobra e ele nunca fica em atraso' }),
  }),
);
export const UpdateMembershipPlanInput = registry.register(
  'UpdateMembershipPlanInput',
  z
    .object({ name: z.string().trim().min(2).max(60), price: PlanPrice, chargeable: z.boolean(), active: z.boolean() })
    .partial()
    .refine((v) => Object.keys(v).length > 0, 'Informe ao menos um campo'),
);
export const MembershipPlanDTO = registry.register(
  'MembershipPlan',
  z.object({ id: z.number(), name: z.string(), price: Money, chargeable: z.boolean(), active: z.boolean(), studentsCount: z.number() }),
);

export const SetPlanInput = registry.register('SetStudentPlanInput', z.object({ planId: z.number().int().positive().nullable() }));

export const RegisterPaymentInput = registry.register(
  'RegisterMembershipPaymentInput',
  z.object({
    amount: MoneyInput.optional().openapi({ description: 'Valor recebido. Sem valor, usa o preço do plano (permite desconto: informe o valor menor).' }),
    method: PaymentMethod,
    paidOn: ymd.optional().openapi({ description: 'Dia em que recebeu (AAAA-MM-DD). Padrão: hoje. Não pode ser no futuro.' }),
    note: z.string().trim().max(200).optional(),
  }),
);
export const VoidPaymentInput = registry.register('VoidMembershipPaymentInput', z.object({ reason: z.string().trim().min(3).max(200) }));

export const UserIdParam = z.object({
  userId: z.coerce.number().int().positive().openapi({ param: { name: 'userId', in: 'path' }, example: 1 }),
});

export const ListMembershipsQuery = PaginationQuery.extend({
  q: z.string().trim().max(120).optional(),
  status: MembershipStatusEnum.optional(),
});

export const PaymentDTO = registry.register(
  'MembershipPayment',
  z.object({
    id: z.number(),
    planName: z.string(),
    amount: Money,
    method: PaymentMethod,
    paidOn: z.string(),
    periodStart: z.string(),
    periodEnd: z.string(),
    note: z.string().nullable(),
    registeredBy: z.string(),
    voided: z.boolean(),
    voidReason: z.string().nullable(),
  }),
);

const StatusFields = {
  status: MembershipStatusEnum,
  validUntil: z.string().nullable().openapi({ description: 'Último dia coberto pelos pagamentos (AAAA-MM-DD)' }),
  daysLeft: z.number().nullable().openapi({ description: 'Dias até acabar (negativo = dias de atraso)' }),
};

export const MembershipRowDTO = registry.register(
  'MembershipRow',
  z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
    plan: z.object({ id: z.number(), name: z.string(), price: Money, chargeable: z.boolean() }).nullable(),
    ...StatusFields,
  }),
);

export const MembershipOverviewDTO = registry.register(
  'MembershipOverview',
  z.object({
    data: z.array(MembershipRowDTO),
    meta: z.object({ page: z.number(), pageSize: z.number(), total: z.number() }),
    summary: z.object({
      counts: z.record(z.string(), z.number()).openapi({ description: 'Alunos ativos por situação' }),
      receivedThisMonth: Money,
    }),
  }),
);

export const MyMembershipDTO = registry.register(
  'MyMembership',
  z.object({ planName: z.string().nullable(), ...StatusFields }),
);

export type CreateMembershipPlan = z.output<typeof CreateMembershipPlanInput>;
export type UpdateMembershipPlan = z.output<typeof UpdateMembershipPlanInput>;
export type RegisterPayment = z.output<typeof RegisterPaymentInput>;
export type ListMemberships = z.output<typeof ListMembershipsQuery>;
export type PaymentMethodT = z.output<typeof PaymentMethod>;
