import { defineConfig, devices } from '@playwright/test';
import fs from 'node:fs';

/**
 * Playwright E2E config for MRDCalc.
 * Dev server roda em http://localhost:8080 (ver vite.config.ts).
 *
 * Notas:
 *  - O dev server sobe em mode=test para carregar `.env.test`.
 *  - Em ambientes onde o download do Chromium oficial é bloqueado
 *    (ex: sandbox sem internet), aceitamos um chrome local via
 *    PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ou autodetectado em
 *    /opt/pw-browsers/chromium.
 */
const PORT = 8080;
const BASE_URL = `http://localhost:${PORT}`;

const FALLBACK_CHROMIUM = '/opt/pw-browsers/chromium';
const envExecPath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const executablePath =
  envExecPath && fs.existsSync(envExecPath)
    ? envExecPath
    : fs.existsSync(FALLBACK_CHROMIUM)
      ? FALLBACK_CHROMIUM
      : undefined;

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        launchOptions: executablePath ? { executablePath } : undefined,
      },
    },
  ],
  webServer: {
    command: 'npm run dev -- --mode e2e',
    url: BASE_URL,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
