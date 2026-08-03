/**
 * Moved verbatim from the `random-number-generator` case in
 * `lib/devtools/format-json.ts`. Randomness stays the shared
 * `secureRandomInt` — a CSPRNG draw with rejection sampling — and is not
 * replaced with `Math.random`.
 */

import { ToolError, type ToolRun } from "../../lib/tool-framework/run.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import type { SettingsOf } from "../../lib/tool-framework/settings.ts";
import { secureRandomInt } from "../../lib/devtools/shared/crypto.ts";

type Settings = SettingsOf<typeof import("./definition.ts").default.settings>;

export const run: ToolRun<Settings> = (ctx): ToolResult => {
  const { min, max, count } = ctx.settings;
  if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max)) {
    throw new ToolError(
      "bounds-not-integers",
      "Min and max must be integers.",
      "Remove any decimal part from the range.",
    );
  }
  if (min > max) {
    throw new ToolError(
      "bounds-inverted",
      "Min cannot be greater than max.",
      "Swap the two values.",
    );
  }
  return {
    render: "list",
    items: Array.from({ length: count }, () => String(min + secureRandomInt(max - min + 1))),
  };
};

export default run;
