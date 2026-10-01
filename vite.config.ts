import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Test servers must not invalidate the running developer server's dependencies.
  cacheDir: mode.startsWith('e2e') ? `.local/vite-${mode}` : 'node_modules/.vite',
  // The landing's motion layer loads lazily; pre-bundling its dependencies up front keeps
  // the first visit from re-optimizing them and reloading the page mid-session or mid-test.
  optimizeDeps: { include: ['gsap', 'gsap/ScrollTrigger', 'gsap/SplitText', 'gsap/ScrambleTextPlugin', 'gsap/DrawSVGPlugin', '@gsap/react', 'lenis'] },
  server: { port: 3000 },
}));
