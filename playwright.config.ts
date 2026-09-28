import { defineConfig, devices } from '@playwright/test';

// Separate servers and Vite caches: configured (4317) and without Supabase settings (4318).
const server = (port: number, mode: string, env: Record<string, string>) => ({
  command: `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port ${port} --strictPort --mode ${mode}`,
  url: `http://localhost:${port}`,
  env,
});

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  workers: 2,
  use: { baseURL: 'http://localhost:4317', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium', channel: 'chrome' } },
  ],
  webServer: [
    server(4317, 'e2e', { VITE_SUPABASE_URL: 'https://agentica-test.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_browser_test_only' }),
    server(4318, 'e2e-unconfigured', { VITE_SUPABASE_URL: '', VITE_SUPABASE_PUBLISHABLE_KEY: '' }),
  ],
});
