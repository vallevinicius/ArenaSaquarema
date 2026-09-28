import { Money, MoneyInput, registry, z } from '../../docs/registry';

export const CreatePlanInput = registry.register(
  'CreateDayUsePlanInput',
  z.object({
    name: z.string().trim().min(2).max(120).openapi({ example: 'Day Use Avulso' }),
    description: z.string().trim().max(255).nullish().openapi({ example: 'Acesso às quadras das 8h às 18h' }),
    price: MoneyInput,
  }),
);

export const UpdatePlanInput = registry.register(
  'UpdateDayUsePlanInput',
  CreatePlanInput.extend({ active: z.boolean() })
    .partial()
    .refine((v) => Object.keys(v).length > 0, 'Informe ao menos um campo'),
);

export const PlanDTO = registry.register(
  'DayUsePlan',
  z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable(),
    price: Money,
    active: z.boolean(),
  }),
);

export const ListPlansQuery = z.object({ active: z.stringbool().optional() });

export type CreatePlan = z.output<typeof CreatePlanInput>;
export type UpdatePlan = z.output<typeof UpdatePlanInput>;
