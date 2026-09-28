import { PaginationQuery, registry, z } from '../../docs/registry';

export const MovementType = z.enum(['ENTRADA', 'SAIDA', 'AJUSTE', 'VENDA', 'ESTORNO']);

export const CreateMovementInput = registry.register(
  'CreateStockMovementInput',
  z.discriminatedUnion('type', [
    z.object({
      type: z.literal('ENTRADA'),
      productId: z.number().int().positive(),
      quantity: z.number().int().positive().max(100_000).openapi({ description: 'Unidades que entraram' }),
      reason: z.string().trim().max(255).optional().openapi({ example: 'NF 1234 - Distribuidora X' }),
    }),
    z.object({
      type: z.literal('SAIDA'),
      productId: z.number().int().positive(),
      quantity: z.number().int().positive().max(100_000).openapi({ description: 'Unidades que saíram' }),
      reason: z.string().trim().min(3).max(255).openapi({ example: 'Garrafa quebrada' }),
    }),
    z.object({
      type: z.literal('AJUSTE'),
      productId: z.number().int().positive(),
      countedStock: z.number().int().min(0).max(1_000_000).openapi({ description: 'Quantidade contada no inventário (valor absoluto)' }),
      reason: z.string().trim().min(3).max(255).openapi({ example: 'Inventário semanal' }),
    }),
  ]),
);

export const MovementDTO = registry.register(
  'StockMovement',
  z.object({
    id: z.number(),
    productId: z.number(),
    productName: z.string(),
    type: MovementType,
    quantity: z.number().openapi({ description: 'Delta com sinal aplicado ao estoque' }),
    balance: z.number().openapi({ description: 'Estoque após o movimento' }),
    reason: z.string().nullable(),
    userName: z.string(),
    tabId: z.number().nullable(),
    createdAt: z.string(),
  }),
);

export const ListMovementsQuery = PaginationQuery.extend({
  productId: z.coerce.number().int().positive().optional(),
  type: MovementType.optional(),
});

export type CreateMovement = z.output<typeof CreateMovementInput>;
export type ListMovements = z.output<typeof ListMovementsQuery>;
export type MovementTypeT = z.output<typeof MovementType>;
