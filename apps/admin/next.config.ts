import type { NextConfig } from "next";
import { sharedNextConfig } from "../../next.config.shared.mjs";

const nextConfig: NextConfig = {
  ...sharedNextConfig,
  turbopack: {
    resolveAlias: {
      module: { browser: "./src/lib/browserEmptyModule.ts" },
    },
  },
  transpilePackages: [
    "@smarttools/auth",
    "@smarttools/authorization",
    "@smarttools/control-plane",
    "@smarttools/database",
    "@smarttools/invoice-templates",
    "@smarttools/tool-catalog",
    "@smarttools/ui",
  ],
};

export default nextConfig;
