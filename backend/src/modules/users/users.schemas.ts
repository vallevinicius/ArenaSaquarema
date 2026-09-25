import { PaginationQuery, registry, z } from '../../docs/registry.js';
import { Password } from '../auth/auth.schemas.js';

const Role = z.enum(['ADMIN', 'OPERADOR']);

export const CreateUserInput = registry.register(
  'CreateUserInput',
  z.object({
    name: z.string().trim().min(2).max(120),
    email: z.email().max(160).transform((v) => v.toLowerCase().trim()),
    password: Password,
    role: Role.default('OPERADOR'),
  }),
);

export const UpdateUserInput = registry.register(
  'UpdateUserInput',
  z
    .object({
      name: z.string().trim().min(2).max(120),
      role: Role,
      active: z.boolean(),
      password: Password.openapi({ description: 'Reset de senha pelo admin' }),
    })
    .partial()
    .refine((v) => Object.keys(v).length > 0, 'Informe ao menos um campo'),
);

export const ListUsersQuery = PaginationQuery.extend({ q: z.string().trim().max(120).optional() });

export type CreateUser = z.output<typeof CreateUserInput>;
export type UpdateUser = z.output<typeof UpdateUserInput>;
export type ListUsers = z.output<typeof ListUsersQuery>;
