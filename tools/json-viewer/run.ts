/**
 * The folder-contract entry point. The parse itself is `executeJsonViewer` in
 * `./execution.ts`, unchanged — this file only maps its result onto a
 * `ToolResult`, so the workbench and this run stay on one implementation.
 *
 * `json-tree` carries both the parsed value and the pretty-printed text, which
 * is what lets the custom `workspace.tsx` keep rendering the interactive tree.
 */

import { executeJsonViewer } from "./execution.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import { ToolError, type ToolRun } from "../../lib/tool-framework/run.ts";
import type { SettingsOf } from "../../lib/tool-framework/settings.ts";

type Settings = SettingsOf<typeof import("./definition.ts").default.settings>;

export const run: ToolRun<Settings> = (ctx): ToolResult => {
  const result = executeJsonViewer(ctx.input.text);
  if (!result.ok) {
    throw new ToolError(
      `json-${result.error.kind}`,
      result.error.message,
      "Fix the reported line, or run Repair & clean to drop the broken parts.",
    );
  }
  return {
    render: "json-tree",
    value: result.value,
    text: result.formattedValue,
  };
};

export default run;
