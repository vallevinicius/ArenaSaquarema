import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { z } from 'zod';

type Schemas = {
  body?: z.ZodTypeAny;
  query?: z.ZodTypeAny;
  params?: z.ZodTypeAny;
};

type Infer<S extends Schemas> = {
  body: S['body'] extends z.ZodTypeAny ? z.output<S['body']> : undefined;
  query: S['query'] extends z.ZodTypeAny ? z.output<S['query']> : undefined;
  params: S['params'] extends z.ZodTypeAny ? z.output<S['params']> : undefined;
};

/**
 * Valida body/query/params com zod ANTES do controller e entrega o input já tipado.
 * Campos não declarados no schema são descartados (z.object faz strip por padrão),
 * o que bloqueia mass assignment (ex.: mandar "role" no cadastro).
 */
export function handler<S extends Schemas>(
  schemas: S,
  fn: (input: Infer<S>, req: Request, res: Response) => Promise<unknown>,
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = {
        body: schemas.body ? await schemas.body.parseAsync(req.body) : undefined,
        query: schemas.query ? await schemas.query.parseAsync(req.query) : undefined,
        params: schemas.params ? await schemas.params.parseAsync(req.params) : undefined,
      } as Infer<S>;
      await fn(input, req, res);
    } catch (e) {
      next(e);
    }
  };
}
