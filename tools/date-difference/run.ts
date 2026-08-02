/**
 * Moved verbatim from the `date-difference` case in
 * `lib/devtools/format-json.ts`. Parsing is the shared `parseDate` (which is
 * what accepts bare Unix seconds and milliseconds), and the three-decimal
 * rounding plus the leading "-" for a negative gap are preserved exactly.
 */

import type { ToolRun } from "../../lib/tool-framework/run.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import type { SettingsOf } from "../../lib/tool-framework/settings.ts";
import { parseDate } from "../../lib/devtools/shared/datetime.ts";

type Settings = SettingsOf<typeof import("./definition.ts").default.settings>;

export const run: ToolRun<Settings> = (ctx): ToolResult => {
  const start = parseDate(ctx.input.text, "Start date");
  const end = parseDate(ctx.input.secondary ?? "", "End date");
  const milliseconds = end.getTime() - start.getTime();
  const direction = milliseconds < 0 ? "-" : "";
  const hours = Math.abs(milliseconds) / 3_600_000;
  const days = hours / 24;
  return {
    render: "text",
    text: `${direction}${Number(days.toFixed(3))} days (${direction}${Number(hours.toFixed(3))} hours)`,
  };
};

export default run;
