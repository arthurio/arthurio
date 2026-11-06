import { defineConfig, devices, type ReporterDescription } from '@playwright/test';

const PORT = 4173;

const reporters: ReporterDescription[] = process.env['CI']
  ? [['github'], ['html', { open: 'never' }]]
  : [['list']];
if (process.env['MCODE_DIR']) {
  reporters.push([
    'json',
    { outputFile: `${process.env['MCODE_DIR']}/fe_testing/playwright-results.json` },
  ]);
}

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: reporters,
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env['CI'],
    timeout: 180_000,
  },
});
