import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Sem fallback, `npm install` (postinstall: prisma generate) falharia antes de existir .env.
    // generate não conecta no banco; migrate/seed falham com erro de conexão claro se faltar a URL.
    url: process.env.DATABASE_URL ?? 'mysql://unset:unset@localhost:3306/unset',
  },
});
