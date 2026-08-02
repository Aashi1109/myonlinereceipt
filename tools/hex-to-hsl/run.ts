/**
 * Moved verbatim from the `hex-to-hsl` case in `lib/devtools/format-json.ts`
 * (arm at line 2762). Both helpers are shared
 * (`lib/devtools/shared/color.ts`).
 */

import type { ToolRun } from "../../lib/tool-framework/run.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import type { SettingsOf } from "../../lib/tool-framework/settings.ts";
import { parseHexColor, rgbToHsl } from "../../lib/devtools/shared/color.ts";

type Settings = SettingsOf<typeof import("./definition.ts").default.settings>;

export const run: ToolRun<Settings> = (ctx): ToolResult => ({
  render: "text",
  text: rgbToHsl(parseHexColor(ctx.input.text)),
});

export default run;
