import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pinoHttp } from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { buildOpenApiDocument } from './docs/openapi.js';
import { logger } from './lib/logger.js';
import { errorHandler } from './middlewares/error-handler.js';
import { apiRouter } from './routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIST = path.resolve(__dirname, '../../frontend/dist');

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY);

  app.use(helmet());
  app.use(
    cors({
      // Allowlist explícita. Nunca "*" com credentials.
      origin: (origin, cb) => cb(null, !origin || env.CORS_ORIGINS.includes(origin)),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use(
    pinoHttp({
      logger,
      autoLogging: { ignore: (req) => req.url === '/api/health' },
      serializers: { req: (req) => ({ method: req.method, url: req.url }) },
    }),
  );

  if (env.SWAGGER_ENABLED) {
    const doc = buildOpenApiDocument();
    app.get('/api/docs.json', (_req, res) => {
      res.json(doc);
    });
    app.use(
      '/api/docs',
      // Swagger UI usa estilos inline: CSP relaxada SOMENTE nesta rota.
      helmet.contentSecurityPolicy({
        directives: { ...helmet.contentSecurityPolicy.getDefaultDirectives(), 'style-src': ["'self'", "'unsafe-inline'"] },
      }),
      swaggerUi.serve,
      swaggerUi.setup(doc, {
        customSiteTitle: 'Arena Saquarema API',
        swaggerOptions: { withCredentials: true, persistAuthorization: false },
      }),
    );
  }

  app.use('/api', apiRouter);
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Rota não encontrada' } });
  });

  // Produção: um único processo/porta serve API + React (cookie SameSite=Strict funciona sem CORS).
  if (env.SERVE_FRONTEND) {
    if (!existsSync(FRONTEND_DIST)) {
      logger.warn(`SERVE_FRONTEND=true mas ${FRONTEND_DIST} não existe. Rode "npm run build" na raiz.`);
    } else {
      app.use(express.static(FRONTEND_DIST, { index: false, maxAge: '1h' }));
      // Fallback do SPA (React Router).
      app.get(/^(?!\/api).*/, (_req, res) => {
        res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
      });
    }
  }

  app.use(errorHandler);
  return app;
}
