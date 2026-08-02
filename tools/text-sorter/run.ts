/**
 * Moved verbatim from the `text-sorter` case in `lib/devtools/format-json.ts`
 * (arm at line 2380). `localeCompare` is still called with an `undefined`
 * locale, exactly as before, so the ordering matches the old implementation on
 * the same machine.
 */

import type { ToolRun } from "../../lib/tool-framework/run.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import type { SettingsOf } from "../../lib/tool-framework/settings.ts";

type Settings = SettingsOf<typeof import("./definition.ts").default.settings>;

export const run: ToolRun<Settings> = (ctx): ToolResult => {
  const sensitivity = ctx.settings.ci ? "base" : "variant";
  const direction = ctx.settings.order === "desc" ? -1 : 1;
  return {
    render: "text",
    text: ctx.input.text
      .split(/\r\n|\r|\n/)
      .sort((left, right) => left.localeCompare(right, undefined, { sensitivity }) * direction)
      .join("\n"),
  };
};

export default run;
