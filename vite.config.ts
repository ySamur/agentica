import { defineConfig, loadEnv, type HtmlTagDescriptor, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const tag = (attrs: Record<string, string>): HtmlTagDescriptor => ({ tag: 'meta', attrs, injectTo: 'head' });

// Link previews (Telegram, Slack, search) need absolute addresses, so the tags that carry them
// are added only when the build knows the site's origin: VITE_SITE_URL, e.g. https://agentica.ru.
function siteMeta(site: string | undefined): Plugin {
  const origin = site?.trim().replace(/\/+$/, '');
  return {
    name: 'site-meta',
    transformIndexHtml() {
      if (!origin) return [];
      const url = `${origin}/`;
      return [
        tag({ property: 'og:url', content: url }),
        tag({ property: 'og:image', content: `${origin}/og.jpg` }),
        tag({ property: 'og:image:width', content: '1200' }),
        tag({ property: 'og:image:height', content: '630' }),
        tag({ property: 'og:image:alt', content: 'agentica: «Код пишет Claude. Решения — ваши.»' }),
        {
          tag: 'script',
          attrs: { type: 'application/ld+json' },
          children: JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebSite', name: 'agentica', url, inLanguage: 'ru' }),
          injectTo: 'head',
        },
      ];
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), siteMeta(loadEnv(mode, process.cwd(), 'VITE_').VITE_SITE_URL)],
  // Test servers must not invalidate the running developer server's dependencies.
  cacheDir: mode.startsWith('e2e') ? `.local/vite-${mode}` : 'node_modules/.vite',
  // The landing's motion layer loads lazily; pre-bundling its dependencies up front keeps
  // the first visit from re-optimizing them and reloading the page mid-session or mid-test.
  optimizeDeps: { include: ['gsap', 'gsap/ScrollTrigger', 'gsap/SplitText', 'gsap/ScrambleTextPlugin', 'gsap/DrawSVGPlugin', '@gsap/react', 'lenis'] },
  server: { port: 3000 },
}));
