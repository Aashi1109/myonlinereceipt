/**
 * Moved verbatim from the `color-picker` case in
 * `lib/devtools/format-json.ts` (arm at line 2725). `parseHexColor`,
 * `rgbToHex`, and `rgbToHsl` are shared (`lib/devtools/shared/color.ts`).
 */

import type { ToolRun } from "../../lib/tool-framework/run.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import type { SettingsOf } from "../../lib/tool-framework/settings.ts";
import {
  parseHexColor,
  rgbToHex,
  rgbToHsl,
} from "../../lib/devtools/shared/color.ts";

type Settings = SettingsOf<typeof import("./definition.ts").default.settings>;

export const run: ToolRun<Settings> = (ctx): ToolResult => {
  const color = parseHexColor(ctx.input.text);
  const rgb =
    color.alpha < 1
      ? `rgba(${color.red}, ${color.green}, ${color.blue}, ${Number(color.alpha.toFixed(3))})`
      : `rgb(${color.red}, ${color.green}, ${color.blue})`;
  return {
    render: "text",
    text: `HEX: ${rgbToHex(color)}\nRGB: ${rgb}\nHSL: ${rgbToHsl(color)}`,
  };
};

export default run;
