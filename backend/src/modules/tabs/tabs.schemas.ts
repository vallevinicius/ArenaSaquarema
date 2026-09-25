import { Money, PaginationQuery, registry, z } from '../../docs/registry.js';

export const TabStatus = z.enum(['ABERTA', 'FECHADA', 'CANCELADA']);
export const PaymentMethod = z.enum(['DINHEIRO', 'PIX', 'CARTAO_DEBITO', 'CARTAO_CREDITO']);
const Ymd = z.iso.date().openapi({ example: '2026-09-26' });

export const ListTabsQuery = PaginationQuery.extend({
  status: TabStatus.optional(),
  customerId: z.coerce.number().int().positive().optional(),
});

export const OpenTabInput = registry.register(
  'OpenTabInput',
  z.object({
    customerId: z.number().int().positive(),
    notes: z.string().trim().max(255).optional().openapi({ example: 'Mesa 4 / Quadra 2' }),
  }),
);

export const AddItemInput = registry.register(
  'AddTabItemInput',
  z.discriminatedUnion('type', [
    z.object({
      type: z.literal('PRODUTO'),
      productId: z.number().int().positive(),
      quantity: z.number().int().min(1).max(100),
    }),
    z.object({
      type: z.literal('DAY_USE'),
      dayUsePlanId: z.number().int().positive(),
      quantity: z.number().int().min(1).max(50).openapi({ description: 'Nº de pessoas' }),
      usageDate: Ymd.optional().openapi({ description: 'Padrão: hoje (America/Sao_Paulo)' }),
    }),
  ]),
);

export const CloseTabInput = registry.register('CloseTabInput', z.object({ paymentMethod: PaymentMethod }));
export const CancelTabInput = registry.register(
  'CancelTabInput',
  z.object({ reason: z.string().trim().min(3).max(200).openapi({ example: 'Comanda aberta por engano' }) }),
);

export const ItemParams = z.object({
  id: z.coerce.number().int().positive().openapi({ param: { name: 'id', in: 'path' } }),
  itemId: z.coerce.number().int().positive().openapi({ param: { name: 'itemId', in: 'path' } }),
});

export const TabItemDTO = registry.register(
  'TabItem',
  z.object({
    id: z.number(),
    type: z.enum(['PRODUTO', 'DAY_USE']),
    productId: z.number().nullable(),
    dayUsePlanId: z.number().nullable(),
    description: z.string(),
    quantity: z.number(),
    unitPrice: Money,
    subtotal: Money,
    usageDate: z.string().nullable(),
    createdBy: z.string(),
    createdById: z.number(),
    createdAt: z.string(),
  }),
);

export const TabDTO = registry.register(
  'Tab',
  z.object({
    id: z.number(),
    customer: z.object({ id: z.number(), name: z.string(), phone: z.string().nullable() }),
    status: TabStatus,
    total: Money,
    paymentMethod: PaymentMethod.nullable(),
    notes: z.string().nullable(),
    itemsCount: z.number(),
    openedBy: z.string(),
    closedBy: z.string().nullable(),
    openedAt: z.string(),
    closedAt: z.string().nullable(),
  }),
);

export const TabDetailDTO = registry.register('TabDetail', TabDTO.extend({ items: z.array(TabItemDTO) }));

export type ListTabs = z.output<typeof ListTabsQuery>;
export type OpenTab = z.output<typeof OpenTabInput>;
export type AddItem = z.output<typeof AddItemInput>;
export type PaymentMethodT = z.output<typeof PaymentMethod>;
