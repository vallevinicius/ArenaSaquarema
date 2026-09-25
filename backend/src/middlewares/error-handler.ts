import type { NextFunction, Request, Response } from 'express';
import { ZodError, z } from 'zod';
import { Prisma } from '../generated/prisma/client.js';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

type Body = { error: { code: string; message: string; details?: unknown } };

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response<Body>, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Dados inválidos', details: z.flattenError(err) },
    });
  }

  // JSON malformado vindo do express.json()
  if (err instanceof SyntaxError && 'type' in err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'INVALID_JSON', message: 'JSON malformado' } });
  }
  if (typeof err === 'object' && err && 'type' in err && err.type === 'entity.too.large') {
    return res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Payload muito grande' } });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: { code: 'DUPLICATE', message: 'Registro já existe (campo único)' } });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Registro não encontrado' } });
    }
    if (err.code === 'P2003') {
      return res.status(409).json({ error: { code: 'FK_CONSTRAINT', message: 'Registro está em uso' } });
    }
  }

  // Detalhe fica só no log; o cliente recebe mensagem genérica (não vaza stack/SQL).
  logger.error({ err, method: req.method, url: req.originalUrl }, 'Unhandled error');
  return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno' } });
}
