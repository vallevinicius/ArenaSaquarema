import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import { ServiceUnavailable } from '../../lib/errors';

const DB_TIMEOUT_MS = 3000;

/**
 * Saúde para monitor externo (UptimeRobot etc.): confirma que o app responde E que o banco atende.
 * Sem o `SELECT 1`, o monitor veria "ok" com o banco fora do ar. O detalhe do erro só vai para o log, não para quem chamou.
 */
export async function check() {
  let timer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`banco sem resposta em ${DB_TIMEOUT_MS}ms`)), DB_TIMEOUT_MS);
      }),
    ]);
    return { status: 'ok' as const, db: 'ok' as const };
  } catch (err) {
    logger.error({ err }, 'health: banco indisponível');
    throw ServiceUnavailable('Banco de dados indisponível', 'DB_UNAVAILABLE');
  } finally {
    clearTimeout(timer);
  }
}
