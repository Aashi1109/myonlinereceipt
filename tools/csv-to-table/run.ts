/**
 * Moved verbatim from the shared `csv-viewer` / `csv-to-table` case body in
 * `lib/devtools/format-json.ts` (arm at lines 2198-2202).
 *
 * See the note in `tools/csv-viewer/run.ts`: the two tools shared one
 * fall-through `case`, and each folder now owns its own copy of the two-line
 * body rather than importing across tool folders. The implementation itself
 * lives in `lib/devtools/shared/table.ts` and is imported, not copied.
 */

import type { ToolRun } from "../../lib/tool-framework/run.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import type { SettingsOf } from "../../lib/tool-framework/settings.ts";
import {
  parseUtilityTable,
  tableToHtml,
  utilityDelimiter,
} from "../../lib/devtools/shared/table.ts";

type Settings = SettingsOf<typeof import("./definition.ts").default.settings>;

export const run: ToolRun<Settings> = (ctx): ToolResult => {
  const delimiter = utilityDelimiter(ctx.settings.delimiter);
  return {
    render: "html",
    html: tableToHtml(parseUtilityTable(ctx.input.text, delimiter)),
    downloadName: "table.html",
  };
};

export default run;
