/**
 * Moved verbatim from the `csv-to-markdown-table` case in
 * `lib/devtools/format-json.ts` (line 2203). Parsing and delimiter validation
 * are the shared `table.ts` helpers; only the Markdown cell escaping is local,
 * and it is byte-for-byte the original.
 */

import type { ToolRun } from "../../lib/tool-framework/run.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import type { SettingsOf } from "../../lib/tool-framework/settings.ts";
import {
  parseUtilityTable,
  utilityDelimiter,
} from "../../lib/devtools/shared/table.ts";

type Settings = SettingsOf<typeof import("./definition.ts").default.settings>;

const markdownCell = (cell: string): string =>
  cell.replaceAll("\\", "\\\\").replaceAll("|", "\\|").replace(/\r?\n/g, "<br>");

export const run: ToolRun<Settings> = (ctx): ToolResult => {
  const rows = parseUtilityTable(
    ctx.input.text,
    utilityDelimiter(ctx.settings.delimiter),
  );
  return {
    render: "text",
    text: [
      `| ${rows[0].map(markdownCell).join(" | ")} |`,
      `| ${rows[0].map(() => "---").join(" | ")} |`,
      ...rows.slice(1).map((row) => `| ${row.map(markdownCell).join(" | ")} |`),
    ].join("\n"),
    downloadName: "table.md",
  };
};

export default run;
