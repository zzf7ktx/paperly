import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 90_000,
  workers: 1,
  use: {
    actionTimeout: 15_000,
    baseURL: process.env.PAPERLY_TEST_URL || 'http://127.0.0.1:4175',
    viewport: { width: 1440, height: 1000 },
    trace: 'retain-on-failure',
  },
  webServer: process.env.PAPERLY_TEST_URL
    ? undefined
    : {
        command: 'node node_modules/vite/bin/vite.js preview --config portable.vite.config.ts --host 127.0.0.1 --port 4175 --strictPort',
        url: 'http://127.0.0.1:4175',
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
