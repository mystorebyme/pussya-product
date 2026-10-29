import { defineConfig, devices } from "@playwright/test";

/**
 * E2E production build ke against chalta hai (dev server nahi) —
 * taaki static rendering + image fallbacks bhi cover ho.
 *
 * Pehli baar: npx playwright install --with-deps chromium
 */
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "mobile", use: devices["iPhone 13"] },
    { name: "desktop", use: devices["Desktop Chrome"] },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run start --workspace @noor/web",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
