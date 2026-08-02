/**
 * Moved verbatim from the `css-box-shadow` case in
 * `lib/devtools/format-json.ts` (line 2741).
 *
 * `parseHexColor` is called for its validation side effect only — the colour is
 * then emitted as the user typed it (trimmed), exactly as before, so shorthand
 * and casing survive.
 */

import type { ToolRun } from "../../lib/tool-framework/run.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import type { SettingsOf } from "../../lib/tool-framework/settings.ts";
import { parseHexColor } from "../../lib/devtools/shared/color.ts";

type Settings = SettingsOf<typeof import("./definition.ts").default.settings>;

export const run: ToolRun<Settings> = (ctx): ToolResult => {
  parseHexColor(ctx.input.text);
  const { x, y, blur, spread } = ctx.settings;
  const inset = ctx.settings.inset ? " inset" : "";
  return {
    render: "text",
    text: `box-shadow: ${x}px ${y}px ${blur}px ${spread}px ${ctx.input.text.trim()}${inset};`,
  };
};

export default run;
