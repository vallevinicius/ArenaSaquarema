import { Money, PaginationQuery, registry, z } from '../../docs/registry';
import { PaymentMethod } from '../tabs/tabs.schemas';

export const SessionStatus = z.enum(['ABERTO', 'FECHADO']);

export const ListSessionsQuery = PaginationQuery;

export const AddEntryInput = registry.register(
  'AddDayUseEntryInput',
  z.object({
    dayUsePlanId: z.number().int().positive(),
    personName: z.string().trim().min(2).max(120).openapi({ example: 'Família Silva' }),
    quantity: z.number().int().min(1).max(50).openapi({ description: 'Nº de pessoas' }),
    paymentMethod: PaymentMethod,
  }),
);

export const EntryParams = z.object({
  id: z.coerce.number().int().positive().openapi({ param: { name: 'id', in: 'path' } }),
  entryId: z.coerce.number().int().positive().openapi({ param: { name: 'entryId', in: 'path' } }),
});

export const DayUseEntryDTO = registry.register(
  'DayUseEntry',
  z.object({
    id: z.number(),
    dayUsePlanId: z.number(),
    planName: z.string(),
    personName: z.string(),
    quantity: z.number(),
    unitPrice: Money,
    subtotal: Money,
    paymentMethod: PaymentMethod,
    createdBy: z.string(),
    createdById: z.number(),
    createdAt: z.string(),
  }),
);

export const DayUseSessionDTO = registry.register(
  'DayUseSession',
  z.object({
    id: z.number(),
    date: z.string(),
    status: SessionStatus,
    openedBy: z.string(),
    closedBy: z.string().nullable(),
    openedAt: z.string(),
    closedAt: z.string().nullable(),
    entriesCount: z.number(),
    peopleCount: z.number(),
    total: Money,
  }),
);

export const DayUseSessionDetailDTO = registry.register(
  'DayUseSessionDetail',
  DayUseSessionDTO.extend({
    entries: z.array(DayUseEntryDTO),
    totalsByMethod: z.array(z.object({ method: PaymentMethod, total: Money, count: z.number() })),
  }),
);

export type ListSessions = z.output<typeof ListSessionsQuery>;
export type AddEntry = z.output<typeof AddEntryInput>;
