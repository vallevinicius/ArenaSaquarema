import { Money, MoneyInput, PaginationQuery, registry, z } from '../../docs/registry';

export const Category = z.enum([
  'CERVEJA', 'REFRIGERANTE', 'AGUA', 'ISOTONICO', 'SUCO', 'DRINK', 'DESTILADO', 'PETISCO', 'OUTROS',
]);

export const CreateProductInput = registry.register(
  'CreateProductInput',
  z.object({
    name: z.string().trim().min(2).max(120).openapi({ example: 'Cerveja Long Neck 355ml' }),
    category: Category,
    price: MoneyInput,
    trackStock: z.boolean().default(true).openapi({ description: 'false para itens preparados na hora (drinks, porções)' }),
    minStock: z.number().int().min(0).max(100_000).default(0),
    initialStock: z.number().int().min(0).max(100_000).default(0).openapi({ description: 'Gera movimento de ENTRADA' }),
  }),
);

// Estoque NÃO é editável aqui: só via /stock/movements, para manter trilha de auditoria.
export const UpdateProductInput = registry.register(
  'UpdateProductInput',
  z
    .object({
      name: z.string().trim().min(2).max(120),
      category: Category,
      price: MoneyInput,
      trackStock: z.boolean(),
      minStock: z.number().int().min(0).max(100_000),
      active: z.boolean(),
    })
    .partial()
    .refine((v) => Object.keys(v).length > 0, 'Informe ao menos um campo'),
);

export const ProductDTO = registry.register(
  'Product',
  z.object({
    id: z.number(),
    name: z.string(),
    category: Category,
    price: Money,
    trackStock: z.boolean(),
    stock: z.number(),
    minStock: z.number(),
    lowStock: z.boolean(),
    active: z.boolean(),
  }),
);

export const ListProductsQuery = PaginationQuery.extend({
  q: z.string().trim().max(120).optional(),
  category: Category.optional(),
  active: z.stringbool().optional(),
  lowStock: z.stringbool().optional().openapi({ description: 'Somente com estoque <= mínimo' }),
});

export type CreateProduct = z.output<typeof CreateProductInput>;
export type UpdateProduct = z.output<typeof UpdateProductInput>;
export type ListProducts = z.output<typeof ListProductsQuery>;
