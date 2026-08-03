/**
 * Moved verbatim from the `csv-formatter` case in
 * `lib/devtools/format-json.ts` (arm at line 2216).
 */

import type { ToolRun } from "../../lib/tool-framework/run.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import type { SettingsOf } from "../../lib/tool-framework/settings.ts";
import {
  parseUtilityTable,
  serializeTable,
  utilityDelimiter,
} from "../../lib/devtools/shared/table.ts";

type Settings = SettingsOf<typeof import("./definition.ts").default.settings>;

export const run: ToolRun<Settings> = (ctx): ToolResult => {
  const delimiter = utilityDelimiter(ctx.settings.delimiter);
  const rows = parseUtilityTable(ctx.input.text, delimiter).map((row) =>
    row.map((cell) => cell.trim()),
  );
  return {
    render: "text",
    text: serializeTable(rows, delimiter),
    downloadName: "formatted-data.txt",
  };
};

export default run;
