/**
 * Moved verbatim from the `cron-builder` case in
 * `lib/devtools/format-json.ts`: the same five-field assembly, the same
 * `describeCron` validation pass, and the same optional trailing `Label:` line.
 */

import { describeCron } from "../../lib/devtools/shared/datetime.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import type { ToolRun } from "../../lib/tool-framework/run.ts";
import type { SettingsOf } from "../../lib/tool-framework/settings.ts";

type Settings = SettingsOf<typeof import("./definition.ts").default.settings>;

export const run: ToolRun<Settings> = (ctx): ToolResult => {
  const minute = ctx.settings.minute.trim();
  const hour = ctx.settings.hour.trim();
  const expression = `${minute} ${hour} ${ctx.settings.dayOfMonth} ${ctx.settings.month} ${ctx.settings.dayOfWeek}`;
  const commandLabel = ctx.settings.commandLabel.trim();

  return {
    render: "text",
    text: [
      expression,
      describeCron(expression),
      ...(commandLabel ? [`Label: ${commandLabel}`] : []),
    ].join("\n"),
    downloadName: "cron-schedule.txt",
  };
};

export default run;
