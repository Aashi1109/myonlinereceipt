import { fileURLToPath } from "node:url";

export const sharedNextConfig = {
  reactStrictMode: true,
  // TypeScript 7 uses its native compiler; each app type-checks before Next runs.
  typescript: { ignoreBuildErrors: true },
  outputFileTracingRoot: fileURLToPath(new URL(".", import.meta.url)),
};
