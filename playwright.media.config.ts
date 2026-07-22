import { defineConfig, devices } from "@playwright/test";

process.env.MEDIA_E2E_PRODUCTION = "1";

const platformOrigin = "http://localhost:3100";
const mediaOrigin = "http://localhost:3105";
process.env.PLATFORM_E2E_ORIGIN = platformOrigin;
process.env.MEDIA_E2E_ORIGIN = mediaOrigin;

const appEnvironment = {
  ...process.env,
  AUTH_TRUSTED_ORIGINS: `${platformOrigin},${mediaOrigin}`,
  BETTER_AUTH_SECRET: "media-e2e-only-secret-that-is-at-least-32-characters",
  DATABASE_URL: "",
  MEDIA_URL: mediaOrigin,
  PLATFORM_URL: platformOrigin,
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
  webServer: [
    {
      command:
        "pnpm --pm-on-fail=ignore --filter @smarttools/platform exec next dev -p 3100",
      url: platformOrigin,
      env: appEnvironment,
      reuseExistingServer: false,
      timeout: 180_000,
    },
    {
      command:
        "pnpm --pm-on-fail=ignore --filter @smarttools/media run prepare:vendor && pnpm --pm-on-fail=ignore --filter @smarttools/media exec tsc --noEmit && pnpm --pm-on-fail=ignore --filter @smarttools/media exec next build --webpack && pnpm --pm-on-fail=ignore --filter @smarttools/media exec next start -p 3105",
      url: mediaOrigin,
      env: appEnvironment,
      reuseExistingServer: false,
      timeout: 300_000,
    },
  ],
});
