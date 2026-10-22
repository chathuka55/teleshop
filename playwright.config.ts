import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.E2E_PORT ?? 3100);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${port}`;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    // Own rate-limit bucket per run, so back-to-back runs don't trip the 5/min auth limits.
    extraHTTPHeaders: { "x-forwarded-for": `e2e-${Date.now()}` },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  // Reuse a running `pnpm dev`; otherwise start one. Preview deploys set E2E_BASE_URL instead.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: `pnpm dev --port ${port}`, url: baseURL, reuseExistingServer: true, timeout: 180_000 },
});
