import { z } from 'zod';

// Falha rápido no boot: configuração inválida nunca deve chegar a atender request.
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3333),
  DATABASE_URL: z.string().startsWith('mysql://'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET precisa de pelo menos 32 caracteres'),
  JWT_EXPIRES_IN: z.string().regex(/^\d+[smhd]$/, 'Use formato como 8h, 30m').default('8h'),
  CORS_ORIGINS: z
    .string()
    .default('')
    .transform((v) => v.split(',').map((s) => s.trim()).filter(Boolean)),
  SERVE_FRONTEND: z.stringbool().default(false),
  SWAGGER_ENABLED: z.stringbool().default(true),
  // Nº de proxies reversos à frente (nginx, load balancer). Necessário para rate limit por IP real.
  // MySQL 8 (caching_sha2_password) sem TLS exige troca de chave pública. Só em dev/local.
  DB_ALLOW_PUBLIC_KEY_RETRIEVAL: z.stringbool().default(false),
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  // Mostra apenas nomes/regras, nunca valores (evita vazar segredo em log).
  console.error('Variáveis de ambiente inválidas:', z.flattenError(parsed.error).fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
