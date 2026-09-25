export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const NotFound = (what: string, fem = false) =>
  new AppError(404, 'NOT_FOUND', `${what} não ${fem ? 'encontrada' : 'encontrado'}`);
export const Conflict = (msg: string, code = 'CONFLICT') => new AppError(409, code, msg);
export const BadRequest = (msg: string, code = 'BAD_REQUEST') => new AppError(400, code, msg);
export const Unauthorized = (msg = 'Não autenticado') => new AppError(401, 'UNAUTHORIZED', msg);
export const Forbidden = (msg = 'Acesso negado') => new AppError(403, 'FORBIDDEN', msg);
