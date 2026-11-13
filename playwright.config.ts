import { defineConfig, devices } from '@playwright/test';

// full: run against a live stack (`docker compose up --build -d`, default http://localhost:3000).
// demo: run against the static build served at http://localhost:4173/Intern-break/
//       (`npm run build:pages && VITE_BASE_PATH=/Intern-break/ npx vite preview --outDir dist/pages --port 4173`).
export default defineConfig({
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['list'], ['json', { outputFile: 'test-results/e2e.json' }], ['html', { open: 'never' }]]
    : [['list']],
  use: { trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    {
      name: 'full',
      testDir: './tests/e2e/full',
      use: { ...devices['Desktop Chrome'], baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000' },
    },
    {
      name: 'demo',
      testDir: './tests/e2e/demo',
      use: { ...devices['Desktop Chrome'], baseURL: process.env.E2E_DEMO_URL ?? 'http://localhost:4173/Intern-break/' },
    },
  ],
});
