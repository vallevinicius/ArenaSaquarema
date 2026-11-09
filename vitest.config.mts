import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': r('./'),
      // 'server-only' quebra fora do bundler do Next; nos testes vira um módulo vazio.
      'server-only': r('./test/server-only-stub.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['server/**/*.test.ts'],
    setupFiles: ['./test/setup.ts'],
  },
});
