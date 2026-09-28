import 'server-only';
import pino from 'pino';

// JSON puro (sem transport/worker thread, que não sobrevive ao bundle do Next).
// Em dev, para ler bonito: npm run dev | npx pino-pretty
export const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  redact: {
    paths: ['*.password', '*.passwordHash', '*.cookie', '*.authorization', 'err.config'],
    censor: '[REDACTED]',
  },
});
