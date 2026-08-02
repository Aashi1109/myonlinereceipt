/**
 * Moved verbatim from the `json-to-xml` case in
 * `lib/devtools/format-json.ts` (line 2160) plus its single-consumer helper
 * `jsonToXml` (line 3315). Only this tool calls the helper, so it stays here
 * rather than in `lib/devtools/shared/`.
 *
 * `escapeHtml` escapes more than XML strictly requires (it also escapes quotes
 * and apostrophes). That is the pre-migration behaviour and is preserved: the
 * output is still valid XML, and widening it would be a behaviour change.
 */

import type { ToolRun } from "../../lib/tool-framework/run.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import type { SettingsOf } from "../../lib/tool-framework/settings.ts";
import { parseUtilityJson } from "../../lib/devtools/shared/json-input.ts";
import { isRecord } from "../../lib/devtools/shared/json.ts";
import { escapeHtml } from "../../lib/devtools/shared/text.ts";

type Settings = SettingsOf<typeof import("./definition.ts").default.settings>;

function jsonToXml(value: unknown, name = "root"): string {
  const tag = /^[A-Za-z_][\w.-]*$/.test(name) ? name : "item";
  if (value === null || value === undefined) return `<${tag}/>`;
  if (Array.isArray(value)) return value.map((item) => jsonToXml(item, tag)).join("");
  if (isRecord(value)) {
    return `<${tag}>${Object.entries(value)
      .map(([key, child]) => jsonToXml(child, key))
      .join("")}</${tag}>`;
  }
  return `<${tag}>${escapeHtml(value)}</${tag}>`;
}

export const run: ToolRun<Settings> = (ctx): ToolResult => {
  const value = parseUtilityJson(ctx.input.text, {
    repairMode: ctx.settings.repairMode,
  });
  return {
    render: "text",
    text: `<?xml version="1.0" encoding="UTF-8"?>\n${jsonToXml(value)}`,
  };
};

export default run;
