/**
 * The folder-contract entry point. The transform is `transformJson` from
 * `lib/devtools/shared/json.ts`, unchanged — the same function the workbench's
 * format, minify, and validate commands already call, so there is one
 * implementation rather than two.
 *
 * The `"2" | "4" | "tab"` setting is a UI value; `JsonIndentation` is the
 * transform's own `2 | 4 | "tab"`. The mapping between them is the only logic
 * this file owns.
 */

import {
  summarizeJson,
  transformJson,
  type JsonIndentation,
} from "../../lib/devtools/shared/json.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import { ToolError, type ToolRun } from "../../lib/tool-framework/run.ts";
import type { SettingsOf } from "../../lib/tool-framework/settings.ts";

type Settings = SettingsOf<typeof import("./definition.ts").default.settings>;

function indentationFrom(value: string): JsonIndentation {
  if (value === "tab") return "tab";
  return value === "4" ? 4 : 2;
}

export const run: ToolRun<Settings> = (ctx): ToolResult => {
  const result = transformJson(ctx.input.text, {
    indentation: indentationFrom(ctx.settings.indentation),
    mode: "format",
  });
  if (!result.ok) {
    throw new ToolError(
      `json-${result.error.kind}`,
      result.error.message,
      "Check the reported line for a missing comma, quote, or bracket.",
    );
  }

  const summary = summarizeJson(result.value, result.output);
  return {
    render: "code",
    code: result.output,
    language: "json",
    downloadName: "smarttools-formatted.json",
    stats: [
      { label: "Keys", value: String(summary.keyCount) },
      { label: "Size", value: `${summary.byteSize.toLocaleString("en-US")} B` },
    ],
  };
};

export default run;
