import { jsonType, parseStrictJson } from "../../lib/devtools/shared/json-input.ts";
import type { ToolRun } from "../../lib/tool-framework/run.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import type { SettingsOf } from "../../lib/tool-framework/settings.ts";

type Settings = SettingsOf<typeof import("./definition.ts").default.settings>;

export const run: ToolRun<Settings> = (ctx): ToolResult => {
  const value = parseStrictJson(ctx.input.text, "JSON input");
  return { render: "text", text: `Valid JSON\nRoot type: ${jsonType(value)}` };
};

export default run;
