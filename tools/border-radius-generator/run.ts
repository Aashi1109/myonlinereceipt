/**
 * Moved verbatim from the `border-radius-generator` case in
 * `lib/devtools/format-json.ts`, including the clockwise-from-top-left corner
 * order of the CSS shorthand.
 */

import type { ToolRun } from "../../lib/tool-framework/run.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import type { SettingsOf } from "../../lib/tool-framework/settings.ts";

type Settings = SettingsOf<typeof import("./definition.ts").default.settings>;

export const run: ToolRun<Settings> = (ctx): ToolResult => {
  const { topLeft, topRight, bottomRight, bottomLeft } = ctx.settings;
  return {
    render: "text",
    text: `border-radius: ${topLeft}px ${topRight}px ${bottomRight}px ${bottomLeft}px;`,
  };
};

export default run;
