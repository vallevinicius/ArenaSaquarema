import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().startsWith('mysql://'),
  // MySQL 8 (caching_sha2_password) sem TLS exige troca de chave pública. Só em dev/local.
  DB_ALLOW_PUBLIC_KEY_RETRIEVAL: z.stringbool().default(false),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET precisa de pelo menos 32 caracteres'),
  JWT_EXPIRES_IN: z.string().regex(/^\d+[smhd]$/, 'Use formato como 8h, 30m').default('8h'),
  SWAGGER_ENABLED: z.stringbool().default(true),
  // Nº de proxies reversos à frente (nginx, load balancer). Define qual IP o rate limit enxerga.
  // E-mail transacional (Resend). Sem chave: em dev o código aparece no log; em produção o envio falha.
  RESEND_API_KEY: z.string().min(1).optional(),
  MAIL_FROM: z.string().min(3).default('Arena Saquarema <onboarding@resend.dev>'),
  // Pasta das fotos enviadas pelo admin (precisa ser disco persistente em produção).
  UPLOAD_DIR: z.string().min(1).default('uploads'),
  // Integração TotalPass (docs: dev.totalpass.com). Tudo opcional: sem as chaves, a integração fica desligada e o lançamento manual segue valendo.
  TOTALPASS_PARTNER_API_KEY: z.string().min(1).optional(),
  TOTALPASS_PLACE_API_KEY: z.string().min(1).optional(),
  TOTALPASS_API_URL: z.url().default('https://gym-service-api.totalpass.com'),
  // Base da confirmação do check-in (sem barra final). Não há default: a TotalPass só documentou o host de testes.
  TOTALPASS_VALIDATE_URL: z.url().optional(),
  // Vai no caminho da URL do webhook (a TotalPass não assina as chamadas). Gere com: openssl rand -base64 36 | tr '+/' '-_'
  TOTALPASS_WEBHOOK_SECRET: z.string().min(24).optional(),
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
});

export type Env = z.output<typeof envSchema>;

let cached: Env | null = null;

/**
 * Validação preguiçosa: o `next build` importa os módulos de rota sem as variáveis
 * de runtime, então validar no import quebraria o build. A 1ª request valida e
 * falha alto se algo estiver errado (sem expor valores, só nomes).
 */
function load(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const fields = Object.keys(z.flattenError(parsed.error).fieldErrors).join(', ');
    throw new Error(`Variáveis de ambiente inválidas: ${fields}`);
  }
  cached = parsed.data;
  return cached;
}

export const env = new Proxy({} as Env, { get: (_t, key) => load()[key as keyof Env] });
export const isProd = () => env.NODE_ENV === 'production';
