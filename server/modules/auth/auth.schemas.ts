import { registry, z } from '../../docs/registry';

// bcrypt trunca silenciosamente acima de 72 bytes: limitar evita falsa sensação de segurança.
export const Password = z.string().min(10, 'Mínimo 10 caracteres').max(72, 'Máximo 72 caracteres');

export const LoginInput = registry.register(
  'LoginInput',
  z.object({
    // Aceita e-mail ou o nome do usuário (ambos únicos em User).
    identifier: z.string().trim().min(1).max(160).openapi({ example: 'admin@arenasaquarema.com.br ou admin' }),
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
    role: z.enum(['ADMIN', 'OPERADOR', 'ALUNO']),
    active: z.boolean(),
    createdAt: z.string(),
  }),
);

export const MeDTO = registry.register(
  'Me',
  z.object({ id: z.number(), name: z.string(), email: z.string(), role: z.enum(['ADMIN', 'OPERADOR', 'ALUNO']) }),
);

/** Senha provisória de todo aluno novo. Nunca vira sessão sozinha: o 1º login exige o código por e-mail. */
export const DEFAULT_STUDENT_PASSWORD = 'mudar123';

export const PasswordResetRequiredDTO = registry.register(
  'PasswordResetRequired',
  z.object({
    passwordResetRequired: z.literal(true),
    email: z.string().openapi({ example: 'a***@gmail.com', description: 'E-mail mascarado para onde o código foi enviado' }),
  }),
);

export const ConfirmPasswordResetInput = registry.register(
  'ConfirmPasswordResetInput',
  z.object({
    identifier: z.string().trim().min(1).max(160),
    code: z.string().trim().regex(/^\d{6}$/, 'O código tem 6 dígitos').openapi({ example: '123456' }),
    newPassword: Password.refine((v) => v !== DEFAULT_STUDENT_PASSWORD, 'Escolha uma senha diferente da padrão'),
  }),
);
