import { registry, z } from '../../docs/registry';

// bcrypt trunca silenciosamente acima de 72 bytes: limitar evita falsa sensação de segurança.
export const Password = z.string().min(10, 'Mínimo 10 caracteres').max(72, 'Máximo 72 caracteres');

export const LoginInput = registry.register(
  'LoginInput',
  z.object({
    email: z.email().max(160).transform((v) => v.toLowerCase().trim()).openapi({ example: 'admin@arenasaquarema.com.br' }),
    password: z.string().min(1).max(72).openapi({ example: '••••••••••' }),
  }),
);

export const ChangePasswordInput = registry.register(
  'ChangePasswordInput',
  z.object({ currentPassword: z.string().min(1).max(72), newPassword: Password }),
);

export const UserDTO = registry.register(
  'User',
  z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
    role: z.enum(['ADMIN', 'OPERADOR']),
    active: z.boolean(),
    createdAt: z.string(),
  }),
);

export const MeDTO = registry.register(
  'Me',
  z.object({ id: z.number(), name: z.string(), email: z.string(), role: z.enum(['ADMIN', 'OPERADOR']) }),
);
