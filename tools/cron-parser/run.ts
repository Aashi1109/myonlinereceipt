/**
 * Moved verbatim from the `cron-parser` case in
 * `lib/devtools/format-json.ts`. `describeCron` (and the `parseCronField` it
 * builds on) is shared with cron-builder and is imported from
 * `lib/devtools/shared/datetime.ts` rather than copied.
 */

import { describeCron } from "../../lib/devtools/shared/datetime.ts";
import { requireUtilityInput } from "../../lib/devtools/shared/options.ts";
import type { ToolRun } from "../../lib/tool-framework/run.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import type { SettingsOf } from "../../lib/tool-framework/settings.ts";

type Settings = SettingsOf<typeof import("./definition.ts").default.settings>;

export const run: ToolRun<Settings> = (ctx): ToolResult => {
  const expression = requireUtilityInput(ctx.input.text, "Cron expression").trim();
  return { render: "text", text: `${expression}\n${describeCron(expression)}` };
};

export default run;
