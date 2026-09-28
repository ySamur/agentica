import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Test servers must not invalidate the running developer server's dependencies.
  cacheDir: mode.startsWith('e2e') ? `.local/vite-${mode}` : 'node_modules/.vite',
  server: { port: 3000 },
}));
