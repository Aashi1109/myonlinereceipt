/**
 * Moved verbatim from the `javascript-formatter` case in
 * `lib/devtools/format-json.ts` (arm at line 2696). The formatter itself is
 * shared with `css-formatter` and lives in `lib/devtools/shared/code.ts`.
 */

import type { ToolRun } from "../../lib/tool-framework/run.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import type { SettingsOf } from "../../lib/tool-framework/settings.ts";
import { formatDelimitedCode } from "../../lib/devtools/shared/code.ts";

type Settings = SettingsOf<typeof import("./definition.ts").default.settings>;

export const run: ToolRun<Settings> = (ctx): ToolResult => ({
  render: "text",
  text: formatDelimitedCode(ctx.input.text, "javascript"),
});

export default run;
