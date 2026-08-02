/**
 * Moved verbatim from the `hex-to-rgb` case in `lib/devtools/format-json.ts`.
 * Parsing is the shared `parseHexColor`; the alpha rounding
 * (`Number(alpha.toFixed(3))`) is preserved exactly.
 */

import type { ToolRun } from "../../lib/tool-framework/run.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import type { SettingsOf } from "../../lib/tool-framework/settings.ts";
import { parseHexColor } from "../../lib/devtools/shared/color.ts";

type Settings = SettingsOf<typeof import("./definition.ts").default.settings>;

export const run: ToolRun<Settings> = (ctx): ToolResult => {
  const color = parseHexColor(ctx.input.text);
  return {
    render: "text",
    text:
      color.alpha < 1
        ? `rgba(${color.red}, ${color.green}, ${color.blue}, ${Number(color.alpha.toFixed(3))})`
        : `rgb(${color.red}, ${color.green}, ${color.blue})`,
  };
};

export default run;
