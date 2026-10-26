import { defineConfig, devices } from '@playwright/test';

/**
 * E2E targets:
 *  - default ("qa"): Docker-free QA stack (real migrations in PGlite + PostgREST/Auth subset). Fast, deterministic.
 *  - E2E_TARGET=supabase: a running local Supabase (`supabase start` + `supabase functions serve`).
 *    Set E2E_SUPABASE_URL / E2E_SUPABASE_KEY accordingly.
 */
const target = process.env.E2E_TARGET ?? 'qa';
const supabaseUrl = process.env.E2E_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const supabaseKey = process.env.E2E_SUPABASE_KEY ?? 'sb_publishable_e2e_local';
const BASE_PATH = '/home-heroes/'; // same as GitHub Pages project sites

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:4173${BASE_PATH}`,
    locale: 'ar-AE',
    timezoneId: 'Asia/Dubai',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE, args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'] }
      : undefined,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /layout\.spec\.ts/ },
  ],
  webServer: [
    ...(target === 'qa'
      ? [{ command: 'npx tsx scripts/qa-stack/server.ts', url: 'http://127.0.0.1:54321/auth/v1/user', reuseExistingServer: !process.env.CI, timeout: 120_000, ignoreHTTPSErrors: true }]
      : []),
    {
      command: 'npx vite build && npx vite preview --port 4173 --strictPort',
      url: `http://localhost:4173${BASE_PATH}`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: { VITE_SUPABASE_URL: supabaseUrl, VITE_SUPABASE_PUBLISHABLE_KEY: supabaseKey, VITE_BASE_PATH: BASE_PATH },
    },
  ],
});
