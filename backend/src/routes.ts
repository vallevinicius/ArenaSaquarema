import { Router } from 'express';
import { authenticate } from './middlewares/auth.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { usersRouter } from './modules/users/users.routes.js';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

apiRouter.use('/auth', authRouter);

// Tudo abaixo exige sessão válida (deny by default).
apiRouter.use(authenticate);
apiRouter.use('/users', usersRouter);
