import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Em dev o Vite faz proxy de /api para o backend: front e API ficam na mesma origem,
// então o cookie httpOnly SameSite=Strict funciona sem CORS.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: { '/api': { target: 'http://localhost:3333', changeOrigin: false } },
  },
  build: { sourcemap: false },
});
