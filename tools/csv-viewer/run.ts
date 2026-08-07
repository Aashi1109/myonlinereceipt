/** Parses CSV rows into the shared structured table result renderer. */

import type { ToolRun } from "../../lib/tool-framework/run.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import type { SettingsOf } from "../../lib/tool-framework/settings.ts";
import {
  parseUtilityTable,
  utilityDelimiter,
} from "../../lib/devtools/shared/table.ts";

type Settings = SettingsOf<typeof import("./definition.ts").default.settings>;

export const run: ToolRun<Settings> = (ctx): ToolResult => {
  const delimiter = utilityDelimiter(ctx.settings.delimiter);
  const [columns, ...rows] = parseUtilityTable(ctx.input.text, delimiter);
  return {
    render: "table",
    columns,
    rows,
    showColumnDividers: true,
  };
};

export default run;
