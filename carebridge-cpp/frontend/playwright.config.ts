import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    ...devices['Desktop Chrome'],
    browserName: 'chromium',
    headless: true,
    timezoneId: 'Asia/Kolkata',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5173 --strictPort',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    env: {
      VITE_API_BASE_URL: 'http://127.0.0.1:8001',
      VITE_CAREBRIDGE_TIMEZONE: process.env.VITE_CAREBRIDGE_TIMEZONE || 'America/New_York',
    },
  },
})
