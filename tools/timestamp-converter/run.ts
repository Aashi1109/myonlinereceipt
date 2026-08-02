/**
 * Moved from the `timestamp-converter` case in `lib/devtools/format-json.ts`
 * (line 2764), with one deliberate change.
 *
 * DELIBERATE FIX — host-locale dependence. The original called
 * `date.toLocaleString()` with no locale argument, so the "Local:" line was
 * whatever the host's default locale produced: "1/1/2024, 12:00:00 am" under
 * en_IN, "1/1/2024, 12:00:00 AM" under en_US. The same input produced different
 * output on different machines, which is a bug in a tool whose whole job is
 * turning one instant into canonical strings — and it is untestable, since a
 * process's locale cannot be pinned the way `TZ` can.
 *
 * The locale is now pinned to "en-US". The time zone is still the host's, which
 * is the point of the line. `tools/timestamp-converter/fixtures.json` was
 * updated from "12:00:00 am" to "12:00:00 AM" to match.
 *
 * `parseDate` (shared) still decides seconds-versus-milliseconds by magnitude,
 * unchanged.
 */

import type { ToolRun } from "../../lib/tool-framework/run.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import { parseDate } from "../../lib/devtools/shared/datetime.ts";

const DISPLAY_LOCALE = "en-US";

export const run: ToolRun<Record<string, never>> = (ctx): ToolResult => {
  const date = parseDate(ctx.input.text, "Timestamp or date");
  return {
    render: "text",
    text: `ISO: ${date.toISOString()}\nUTC: ${date.toUTCString()}\nLocal: ${date.toLocaleString(DISPLAY_LOCALE)}\nUnix seconds: ${Math.floor(date.getTime() / 1000)}\nUnix milliseconds: ${date.getTime()}`,
  };
};

export default run;
