import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:4399',
    headless: true,
  },
  webServer: {
    command: 'npx vite --host 127.0.0.1 --port 4399 --strictPort',
    port: 4399,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
