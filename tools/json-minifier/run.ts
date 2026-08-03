/**
 * Moved verbatim from the `json-minifier` case in
 * `lib/devtools/format-json.ts` (line 2125): `parseUtilityJson` followed by a
 * `JSON.stringify` with no indent argument. The parse/repair step is the shared
 * helper, not a copy.
 */

import type { ToolRun } from "../../lib/tool-framework/run.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import type { SettingsOf } from "../../lib/tool-framework/settings.ts";
import { parseUtilityJson } from "../../lib/devtools/shared/json-input.ts";

type Settings = SettingsOf<typeof import("./definition.ts").default.settings>;

export const run: ToolRun<Settings> = (ctx): ToolResult => {
  const value = parseUtilityJson(ctx.input.text, {
    repairMode: ctx.settings.repairMode,
  });
  return { render: "text", text: JSON.stringify(value), downloadName: "minified.json" };
};

export default run;
