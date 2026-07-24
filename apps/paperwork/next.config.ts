import type { NextConfig } from "next";
import { sharedNextConfig } from "../../next.config.shared.mjs";

const nextConfig: NextConfig = {
  ...(sharedNextConfig as NextConfig),
  turbopack: {
    resolveAlias: {
      module: { browser: "./src/lib/browserEmptyModule.ts" },
    },
  },
};

export default nextConfig;
