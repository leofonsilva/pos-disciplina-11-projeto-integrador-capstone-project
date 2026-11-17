import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env['PLAYWRIGHT_TEST_BASE_URL'] ?? 'http://localhost:4200',
    trace: 'on-first-retry',
  },

  // Só Chromium por enquanto — F.7 é um caminho feliz único, não uma matriz de navegadores.
  // Adicionar firefox/webkit é trivial (mesmo padrão de `devices[...]`) quando fizer sentido.
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Sobe os dois processos reais (não fakes) antes dos testes: apps/api em DEMO=true — sem
  // Postgres nem Vertex AI, ver packages/agent/src/{llm-demo,db/retrieve-demo}.ts — e apps/web
  // via `ng serve`, que já proxia /api pra localhost:3000 (angular.json, serve.options).
  // `pnpm --filter` funciona a partir de qualquer lugar do workspace, então os comandos abaixo
  // não dependem do cwd deste arquivo.
  webServer: [
    {
      command: 'pnpm --filter @hero/api run start',
      url: 'http://localhost:3000/api/health',
      env: { DEMO: 'true', PORT: '3000' },
      reuseExistingServer: !process.env['CI'],
      timeout: 30_000,
    },
    {
      command: 'pnpm --filter @hero/web run start',
      url: 'http://localhost:4200',
      reuseExistingServer: !process.env['CI'],
      timeout: 60_000,
    },
  ],
});
