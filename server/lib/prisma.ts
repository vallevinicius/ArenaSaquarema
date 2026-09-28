import 'server-only';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../generated/prisma/client';
import { env } from '../config/env';

function poolConfigFromUrl(raw: string) {
  const url = new URL(raw);
  return {
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ''),
    connectionLimit: Number(url.searchParams.get('connection_limit') ?? 10),
    allowPublicKeyRetrieval: env.DB_ALLOW_PUBLIC_KEY_RETRIEVAL,
  };
}

// Singleton em globalThis: o hot reload do `next dev` reavalia módulos e, sem isso,
// abriria um pool novo de conexões a cada edição até estourar o max_connections.
const g = globalThis as unknown as { __prisma?: PrismaClient };

function getPrisma(): PrismaClient {
  g.__prisma ??= new PrismaClient({
    adapter: new PrismaMariaDb(poolConfigFromUrl(env.DATABASE_URL)),
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
  return g.__prisma;
}

/** Cliente criado só no 1º uso (o build não abre conexão com o banco). */
export const prisma = new Proxy({} as PrismaClient, {
  get(_t, key) {
    const client = getPrisma();
    const value = Reflect.get(client, key, client);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

export type Tx = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];
