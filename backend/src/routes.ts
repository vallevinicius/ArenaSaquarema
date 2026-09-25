import { Router } from 'express';
import { authenticate } from './middlewares/auth.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { customersRouter } from './modules/customers/customers.routes.js';
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js';
import { dayUseRouter } from './modules/dayuse/dayuse.routes.js';
import { productsRouter } from './modules/products/products.routes.js';
import { stockRouter } from './modules/stock/stock.routes.js';
import { tabsRouter } from './modules/tabs/tabs.routes.js';
import { usersRouter } from './modules/users/users.routes.js';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

apiRouter.use('/auth', authRouter);

// Tudo abaixo exige sessão válida (deny by default).
apiRouter.use(authenticate);
apiRouter.use('/customers', customersRouter);
apiRouter.use('/products', productsRouter);
apiRouter.use('/stock', stockRouter);
apiRouter.use('/day-use-plans', dayUseRouter);
apiRouter.use('/tabs', tabsRouter);
apiRouter.use('/dashboard', dashboardRouter);
apiRouter.use('/users', usersRouter);
