// Playwright config — E2E against real backend by default; mock mode opt-in via E2E_USE_MOCK

import { defineConfig, devices } from "@playwright/test";

const E2E_PORT = 3100;
const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;
const E2E_USE_MOCK = process.env.E2E_USE_MOCK === "true";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: E2E_BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `pnpm exec next dev --port ${E2E_PORT}`,
    url: E2E_BASE_URL,
    reuseExistingServer: !process.env.CI,
    env: {
      ...process.env,
      ...(E2E_USE_MOCK ? { NEXT_PUBLIC_USE_MOCK: "true" } : {}),
      NEXT_E2E: "true",
      PORT: String(E2E_PORT),
    },
  },
});
