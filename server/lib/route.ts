import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { ZodError, z } from 'zod';
import { Prisma } from '../generated/prisma/client';
import type { Role } from '../generated/prisma/enums';
import { COOKIE_NAME, authenticate, type AuthUser } from './auth';
import { AppError, Forbidden } from './errors';
import { logger } from './logger';

type Schemas = { body?: z.ZodTypeAny; query?: z.ZodTypeAny; params?: z.ZodTypeAny };
type Out<S, K extends keyof Schemas> = S extends { [P in K]: z.ZodTypeAny } ? z.output<S[K]> : undefined;

type Options<S extends Schemas, A extends boolean> = S & {
  /** false = rota pública. Padrão: exige sessão (deny by default). */
  auth?: A;
  /** Restringe a papéis específicos (implica auth). */
  roles?: Role[];
  /** Status de sucesso quando o handler devolve dados (padrão 200). */
  status?: number;
};

type Ctx<S extends Schemas, A extends boolean> = {
  body: Out<S, 'body'>;
  query: Out<S, 'query'>;
  params: Out<S, 'params'>;
  user: A extends false ? null : AuthUser;
  req: NextRequest;
};

type RouteContext = { params: Promise<Record<string, string | string[]>> };

const MAX_BODY_BYTES = 100 * 1024;
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Adaptador único dos Route Handlers: autenticação, RBAC, validação Zod de
 * body/query/params, defesa CSRF e mapeamento de erros. O handler recebe tudo
 * já validado e tipado; se devolver dados, vira JSON; se devolver Response, passa direto.
 */
export function route<S extends Schemas, A extends boolean = true>(
  opts: Options<S, A>,
  fn: (ctx: Ctx<S, A>) => Promise<unknown>,
) {
  return async (req: NextRequest, context: RouteContext): Promise<Response> => {
    try {
      if (MUTATING.has(req.method)) assertSameOrigin(req);

      const needsAuth = opts.auth !== false || !!opts.roles;
      const user = needsAuth ? await authenticate(req.cookies.get(COOKIE_NAME)?.value) : null;
      if (user && opts.roles && !opts.roles.includes(user.role)) throw Forbidden();

      const rawParams = context?.params ? await context.params : {};
      const ctx = {
        req,
        user,
        params: opts.params ? await opts.params.parseAsync(rawParams) : undefined,
        query: opts.query ? await opts.query.parseAsync(Object.fromEntries(req.nextUrl.searchParams)) : undefined,
        body: opts.body ? await opts.body.parseAsync(await readJson(req)) : undefined,
      } as Ctx<S, A>;

      const result = await fn(ctx);
      if (result instanceof Response) return result;
      if (result === undefined) return new NextResponse(null, { status: 204 });
      return NextResponse.json(result, { status: opts.status ?? 200 });
    } catch (err) {
      return toErrorResponse(err, req);
    }
  };
}

/**
 * CSRF: além do SameSite=Strict, mutações precisam vir da mesma origem.
 * Navegadores sempre mandam Origin em POST/PATCH/DELETE cross-site.
 */
function assertSameOrigin(req: NextRequest) {
  const origin = req.headers.get('origin');
  if (!origin) return; // clientes não-browser (curl, integração) não mandam Origin
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  if (!host || new URL(origin).host !== host) {
    throw new AppError(403, 'CSRF_ORIGIN_MISMATCH', 'Origem da requisição não permitida');
  }
}

async function readJson(req: NextRequest): Promise<unknown> {
  const type = req.headers.get('content-type') ?? '';
  if (!type.includes('application/json')) {
    throw new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Envie Content-Type: application/json');
  }
  const text = await req.text();
  if (Buffer.byteLength(text) > MAX_BODY_BYTES) {
    throw new AppError(413, 'PAYLOAD_TOO_LARGE', 'Payload muito grande');
  }
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new AppError(400, 'INVALID_JSON', 'JSON malformado');
  }
}

const json = (status: number, code: string, message: string, details?: unknown) =>
  NextResponse.json({ error: { code, message, details } }, { status });

export function toErrorResponse(err: unknown, req?: NextRequest): Response {
  if (err instanceof AppError) {
    const res = json(err.statusCode, err.code, err.message, err.details);
    if (err.statusCode === 429 && typeof err.details === 'object' && err.details && 'retryAfterSec' in err.details) {
      res.headers.set('Retry-After', String(err.details.retryAfterSec));
    }
    return res;
  }
  if (err instanceof ZodError) return json(400, 'VALIDATION_ERROR', 'Dados inválidos', z.flattenError(err));

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') return json(409, 'DUPLICATE', 'Registro já existe (campo único)');
    if (err.code === 'P2025') return json(404, 'NOT_FOUND', 'Registro não encontrado');
    if (err.code === 'P2003') return json(409, 'FK_CONSTRAINT', 'Registro está em uso');
  }

  // Detalhe só no log; o cliente recebe mensagem genérica (não vaza stack/SQL).
  logger.error({ err, method: req?.method, url: req?.nextUrl.pathname }, 'Unhandled error');
  return json(500, 'INTERNAL_ERROR', 'Erro interno');
}

/**
 * IP do cliente para rate limit. Route Handlers não expõem o IP do socket, então só
 * existe IP confiável quando há proxy reverso (TRUST_PROXY >= 1) anexando o endereço
 * que ele viu ao X-Forwarded-For. Sem proxy, o header é controlado pelo cliente e é
 * IGNORADO (retorna null): confiar nele deixaria burlar o limite trocando o header.
 */
export function clientIp(req: NextRequest, trustProxy: number): string | null {
  if (trustProxy < 1) return null;
  const chain = (req.headers.get('x-forwarded-for') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  // Cada proxy confiável anexa o IP que viu: o cliente real é o N-ésimo a partir do fim.
  return chain[chain.length - trustProxy] ?? null;
}
