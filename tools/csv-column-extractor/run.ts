/**
 * Moved verbatim from the `csv-column-extractor` case in
 * `lib/devtools/format-json.ts`. Cell re-quoting is the shared `csvCell`, so
 * a value containing the delimiter stays unambiguous.
 */

import { ToolError, type ToolRun } from "../../lib/tool-framework/run.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import type { SettingsOf } from "../../lib/tool-framework/settings.ts";
import { csvCell } from "../../lib/devtools/shared/csv.ts";
import { parseUtilityTable, utilityDelimiter } from "../../lib/devtools/shared/table.ts";

type Settings = SettingsOf<typeof import("./definition.ts").default.settings>;

export const run: ToolRun<Settings> = (ctx): ToolResult => {
  const delimiter = utilityDelimiter(ctx.settings.delimiter);
  const rows = parseUtilityTable(ctx.input.text, delimiter);
  const requested = ctx.settings.column.trim();
  const column = /^\d+$/.test(requested) ? Number(requested) - 1 : rows[0].indexOf(requested);
  if (column < 0 || column >= rows[0].length) {
    throw new ToolError(
      "column-not-found",
      "Column was not found.",
      "Use the exact header text, or the one-based column number.",
    );
  }
  return {
    render: "text",
    text: rows.map((row) => csvCell(row[column], delimiter)).join("\n"),
  };
};

export default run;
