import { defineConfig, devices } from "@playwright/test";

process.env.MEDIA_E2E_PRODUCTION = "1";

const appOrigin = "http://localhost:3100";
process.env.PLATFORM_E2E_ORIGIN = appOrigin;
process.env.MEDIA_E2E_URL = `${appOrigin}/media`;

const appEnvironment = {
  ...process.env,
  APP_URL: appOrigin,
  BETTER_AUTH_SECRET: "media-e2e-only-secret-that-is-at-least-32-characters",
  DATABASE_URL: "",
};

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "media-tools.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  outputDir: "/tmp/myonlinereceipt-media-e2e",
  use: {
    ...devices["Desktop Chrome"],
    channel: "chrome",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  webServer: {
    command: "pnpm build && pnpm exec next start -p 3100",
    url: `${appOrigin}/media`,
    env: appEnvironment,
    reuseExistingServer: false,
    timeout: 300_000,
  },
});
