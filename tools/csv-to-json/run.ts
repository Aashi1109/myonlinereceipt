import {
  convertCsvToJson,
  parseDelimitedRows,
} from "../../lib/devtools/shared/csv.ts";
import { utilityDelimiter } from "../../lib/devtools/shared/table.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import { ToolError, type ToolRun } from "../../lib/tool-framework/run.ts";
import type { SettingsOf } from "../../lib/tool-framework/settings.ts";

type Settings = SettingsOf<typeof import("./definition.ts").default.settings>;

export const run: ToolRun<Settings> = (ctx): ToolResult => {
  const delimiter = utilityDelimiter(ctx.settings.delimiter);
  const normalizeCell = (value: string): string | number => {
    const normalized = ctx.settings.trimWhitespace ? value.trim() : value;
    return ctx.settings.parseNumbers &&
      normalized.trim() !== "" &&
      Number.isFinite(Number(normalized))
      ? Number(normalized)
      : normalized;
  };

  let output: string;
  let rowCount: number;
  let columnCount: number;

  if (ctx.settings.firstRowAsHeaders !== false) {
    const result = convertCsvToJson(ctx.input.text, { delimiter });
    if (!result.ok) {
      throw new ToolError(
        result.error.kind,
        result.error.message,
        "Check the delimiter, header row, quotes, and field counts, then try again.",
      );
    }

    output = result.output;
    rowCount = result.rowCount;
    columnCount = result.columns.length;
    if (ctx.settings.trimWhitespace || ctx.settings.parseNumbers) {
      const rows = JSON.parse(result.output) as Array<Record<string, string>>;
      const normalizedRows = rows
        .map((row) =>
          Object.fromEntries(
            Object.entries(row).map(([column, value]) => [column, normalizeCell(value)]),
          ),
        )
        .filter(
          (row) =>
            !ctx.settings.trimWhitespace ||
            Object.values(row).some((value) => value !== ""),
        );
      output = JSON.stringify(normalizedRows, null, 2);
      rowCount = normalizedRows.length;
    }
  } else {
    if (!ctx.input.text.trim()) {
      throw new ToolError("empty", "Paste CSV to convert it to JSON.");
    }
    if (ctx.input.text.length > 2_000_000) {
      throw new ToolError(
        "too-large",
        "CSV must be 2,000,000 characters or fewer.",
      );
    }

    const parsed = parseDelimitedRows(ctx.input.text, delimiter);
    if (!parsed.ok) {
      throw new ToolError("syntax", parsed.message);
    }

    columnCount = parsed.rows[0]?.length ?? 0;
    if (parsed.rows.some((row) => row.length !== columnCount)) {
      throw new ToolError(
        "shape",
        "Every CSV row must have the same number of fields.",
        "Check the delimiter, quotes, and field counts, then try again.",
      );
    }

    const rows = parsed.rows
      .map((row) => row.map(normalizeCell))
      .filter(
        (row) =>
          !ctx.settings.trimWhitespace || row.some((value) => value !== ""),
      );
    output = JSON.stringify(rows, null, 2);
    rowCount = rows.length;
  }

  return {
    render: "text",
    text: output,
    downloadName: "data.json",
    stats: [
      { label: "Rows", value: String(rowCount) },
      { label: "Columns", value: String(columnCount) },
    ],
  };
};

export default run;
