/**
 * The folder-contract entry point. Formatting and minifying share
 * `transformJson`; validation reports the type of the value it already parsed.
 *
 * The `"2" | "4" | "tab"` setting is a UI value; `JsonIndentation` is the
 * transform's own `2 | 4 | "tab"`, so the mapping stays at this boundary.
 */

import { transformJson, type JsonIndentation } from "../../lib/devtools/shared/json.ts";
import { jsonType } from "../../lib/devtools/shared/json-input.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import { ToolError, type ToolRun } from "../../lib/tool-framework/run.ts";
import type { SettingsOf } from "../../lib/tool-framework/settings.ts";

type Settings = SettingsOf<typeof import("./definition.ts").default.settings>;

function indentationFrom(value: string): JsonIndentation {
  if (value === "tab") return "tab";
  return value === "4" ? 4 : 2;
}

export const run: ToolRun<Settings> = (ctx): ToolResult => {
  const operation = ctx.settings.operation ?? "format";
  const result = transformJson(ctx.input.text, {
    indentation: indentationFrom(ctx.settings.indentation),
    mode: operation === "minify" ? "minify" : "format",
  });
  if (!result.ok) {
    throw new ToolError(
      `json-${result.error.kind}`,
      result.error.message,
      "Check the reported line for a missing comma, quote, or bracket.",
    );
  }

  if (operation === "validate") {
    return {
      render: "text",
      text: `Valid JSON\nRoot type: ${jsonType(result.value)}`,
    };
  }

  if (operation === "minify") {
    return {
      render: "json-tree",
      text: result.output,
      downloadName: "smarttools-minified.json",
      value: result.value,
    };
  }

  return {
    render: "json-tree",
    text: result.output,
    downloadName: "smarttools-formatted.json",
    value: result.value,
  };
};

export default run;
