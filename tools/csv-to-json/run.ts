import { convertCsvToJson } from "../../lib/devtools/shared/csv.ts";
import { utilityDelimiter } from "../../lib/devtools/shared/table.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import { ToolError, type ToolRun } from "../../lib/tool-framework/run.ts";
import type { SettingsOf } from "../../lib/tool-framework/settings.ts";

type Settings = SettingsOf<typeof import("./definition.ts").default.settings>;

export const run: ToolRun<Settings> = (ctx): ToolResult => {
  const result = convertCsvToJson(ctx.input.text, {
    delimiter: utilityDelimiter(ctx.settings.delimiter),
  });
  if (!result.ok) {
    throw new ToolError(
      result.error.kind,
      result.error.message,
      "Check the delimiter, header row, quotes, and field counts, then try again.",
    );
  }

  return {
    render: "text",
    text: result.output,
    downloadName: "data.json",
    stats: [
      { label: "Rows", value: String(result.rowCount) },
      { label: "Columns", value: String(result.columns.length) },
    ],
  };
};

export default run;
