import { defineConfig, devices } from '@playwright/test'

const frontendPort = process.env.CAREBRIDGE_FRONTEND_PORT || '5173'
const frontendUrl = `http://127.0.0.1:${frontendPort}`
const apiBaseUrl = process.env.CAREBRIDGE_API_BASE_URL || 'http://127.0.0.1:8001'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: frontendUrl,
    ...devices['Desktop Chrome'],
    browserName: 'chromium',
    headless: true,
    timezoneId: 'Asia/Kolkata',
  },
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${frontendPort} --strictPort`,
    url: frontendUrl,
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === 'true',
    timeout: 30_000,
    env: {
      VITE_API_BASE_URL: apiBaseUrl,
      VITE_CAREBRIDGE_TIMEZONE: process.env.VITE_CAREBRIDGE_TIMEZONE || 'America/New_York',
    },
  },
})
