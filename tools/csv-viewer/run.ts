/**
 * Moved verbatim from the shared `csv-viewer` / `csv-to-table` case body in
 * `lib/devtools/format-json.ts` (arm at lines 2198-2202).
 *
 * The two tools fell through to one `case` body in the old switch. Under the
 * folder contract a tool may not import from a sibling tool folder, so each
 * folder carries its own copy of the two-line body. That is cheap because the
 * body is only a call into `lib/devtools/shared/table.ts` — the real
 * implementation (`utilityDelimiter`, `parseUtilityTable`, `tableToHtml`, and
 * the `escapeHtml` inside it) is shared and imported, not duplicated.
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
  };
};

export default run;
