import { OpenAPIRegistry, extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

// Única fonte de verdade: os mesmos schemas zod validam a request e geram o OpenAPI.
extendZodWithOpenApi(z);

export { z };
export const registry = new OpenAPIRegistry();

export const COOKIE_NAME = 'arena_token';

registry.registerComponent('securitySchemes', 'cookieAuth', {
  type: 'apiKey',
  in: 'cookie',
  name: COOKIE_NAME,
  description: 'JWT em cookie httpOnly. Faça POST /api/auth/login pelo Swagger e o cookie é enviado automaticamente.',
});

export const ErrorSchema = registry.register(
  'Error',
  z.object({
    error: z.object({
      code: z.string().openapi({ example: 'VALIDATION_ERROR' }),
      message: z.string(),
      details: z.unknown().optional(),
    }),
  }),
);

export const IdParam = z.object({
  id: z.coerce.number().int().positive().openapi({ param: { name: 'id', in: 'path' }, example: 1 }),
});

export const PaginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// Dinheiro trafega como string decimal ("12.50") para não perder precisão em float.
export const Money = z.string().regex(/^\d+\.\d{2}$/).openapi({ example: '12.50' });
export const MoneyInput = z
  .union([z.number(), z.string()])
  .transform((v) => (typeof v === 'number' ? v : Number(v)))
  .pipe(z.number().positive().max(99_999_999.99).multipleOf(0.01))
  .openapi({ type: 'number', example: 12.5 });

export const paginated = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    data: z.array(item),
    meta: z.object({ page: z.number(), pageSize: z.number(), total: z.number() }),
  });

export const json = <T extends z.ZodTypeAny>(schema: T, description = 'OK') => ({
  description,
  content: { 'application/json': { schema } },
});

export const body = <T extends z.ZodTypeAny>(schema: T) => ({
  body: { required: true, content: { 'application/json': { schema } } },
});

const err = (description: string) => json(ErrorSchema, description);

export const commonErrors = {
  400: err('Requisição inválida'),
  401: err('Não autenticado'),
  403: err('Sem permissão'),
  500: err('Erro interno'),
} as const;

export const withErrors = (extra: Record<number, string> = {}) => ({
  ...commonErrors,
  ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, err(v)])),
});

export const secured = [{ cookieAuth: [] as string[] }];
