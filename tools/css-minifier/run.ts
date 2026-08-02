/**
 * Moved verbatim from the `css-minifier` case in
 * `lib/devtools/format-json.ts` (arm at line 2704) — the same five replace
 * steps in the same order. `requireUtilityInput` is shared
 * (`lib/devtools/shared/options.ts`).
 */

import type { ToolRun } from "../../lib/tool-framework/run.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import type { SettingsOf } from "../../lib/tool-framework/settings.ts";
import { requireUtilityInput } from "../../lib/devtools/shared/options.ts";

type Settings = SettingsOf<typeof import("./definition.ts").default.settings>;

export const run: ToolRun<Settings> = (ctx): ToolResult => ({
  render: "text",
  text: requireUtilityInput(ctx.input.text, "CSS input")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}:;,>+~])\s*/g, "$1")
    .replace(/;}/g, "}")
    .trim(),
});

export default run;
