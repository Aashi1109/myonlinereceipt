/**
 * Moved verbatim from the `csv-filter` case in `lib/devtools/format-json.ts`
 * (region: `executeUtilityTool`). Same delimiter resolution, same header
 * handling, same case-insensitive substring match, same column resolution by
 * name or 1-based index.
 */

import {
  parseUtilityTable,
  serializeTable,
  utilityDelimiter,
} from "../../lib/devtools/shared/table.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import { ToolError, type ToolRun } from "../../lib/tool-framework/run.ts";
import type { SettingsOf } from "../../lib/tool-framework/settings.ts";

type Settings = SettingsOf<typeof import("./definition.ts").default.settings>;

export const run: ToolRun<Settings> = (ctx): ToolResult => {
  const delimiter = utilityDelimiter(ctx.settings.delimiter);
  const [header, ...rows] = parseUtilityTable(ctx.input.text, delimiter);
  const query = ctx.settings.query.toLocaleLowerCase();
  if (!query) {
    throw new ToolError(
      "filter-required",
      "Filter text is required.",
      "Enter the text a row must contain to be kept.",
    );
  }
  const requested = ctx.settings.column.trim();
  const column = requested
    ? /^\d+$/.test(requested)
      ? Number(requested) - 1
      : header.indexOf(requested)
    : -1;
  if (requested && (column < 0 || column >= header.length)) {
    throw new ToolError(
      "column-not-found",
      "Filter column was not found.",
      "Use a header name from the first row, or a 1-based column number.",
    );
  }
  const filtered = rows.filter((row) =>
    (column >= 0 ? [row[column]] : row).some((cell) =>
      cell.toLocaleLowerCase().includes(query),
    ),
  );

  return { render: "text", text: serializeTable([header, ...filtered], delimiter) };
};

export default run;
