import { parseUtilityTable, serializeTable } from "../../lib/devtools/shared/table.ts";
import type { ToolRun } from "../../lib/tool-framework/run.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import type { SettingsOf } from "../../lib/tool-framework/settings.ts";

type Settings = SettingsOf<typeof import("./definition.ts").default.settings>;

export const run: ToolRun<Settings> = (ctx): ToolResult => ({
  render: "text",
  text: serializeTable(parseUtilityTable(ctx.input.text, "\t"), ","),
});

export default run;
