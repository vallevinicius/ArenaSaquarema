import { registry, z } from '../../docs/registry';
import { PERMISSION_KEYS } from '../../../lib/permissions';

const Permissions = z
  .array(z.enum(PERMISSION_KEYS))
  .max(PERMISSION_KEYS.length)
  .openapi({ description: 'Áreas liberadas para quem tem este perfil', example: ['COMANDAS', 'CLIENTES'] });

export const CreateProfileInput = registry.register(
  'CreateProfileInput',
  z.object({
    name: z.string().trim().min(2).max(60).openapi({ example: 'Gerente de estoque' }),
    description: z.string().trim().max(160).optional(),
    permissions: Permissions,
  }),
);

export const UpdateProfileInput = registry.register(
  'UpdateProfileInput',
  z
    .object({ name: z.string().trim().min(2).max(60), description: z.string().trim().max(160).nullable(), permissions: Permissions })
    .partial()
    .refine((v) => Object.keys(v).length > 0, 'Informe ao menos um campo'),
);

export const ProfileDTO = registry.register(
  'Profile',
  z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable(),
    permissions: Permissions,
    usersCount: z.number().openapi({ description: 'Quantos usuários usam este perfil' }),
  }),
);

export type CreateProfile = z.output<typeof CreateProfileInput>;
export type UpdateProfile = z.output<typeof UpdateProfileInput>;
