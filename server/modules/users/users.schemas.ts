import { PaginationQuery, registry, z } from '../../docs/registry';
import { Password } from '../auth/auth.schemas';

const Role = z.enum(['ADMIN', 'OPERADOR']);

export const CreateUserInput = registry.register(
  'CreateUserInput',
  z.object({
    name: z.string().trim().min(2).max(120),
    email: z.email().max(160).transform((v) => v.toLowerCase().trim()),
    password: Password,
    role: Role.default('OPERADOR'),
    profileId: z.number().int().positive().optional().openapi({ description: 'Obrigatório quando role = OPERADOR; ignorado para ADMIN' }),
  }).refine((v) => v.role === 'ADMIN' || v.profileId !== undefined, { message: 'Escolha um perfil de acesso', path: ['profileId'] }),
);

export const UpdateUserInput = registry.register(
  'UpdateUserInput',
  z
    .object({
      name: z.string().trim().min(2).max(120),
      role: Role,
      profileId: z.number().int().positive(),
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
