/**
 * Moved from the `iso-date-converter` case in `lib/devtools/format-json.ts`
 * (arm at line 2794). `parseDate` is shared
 * (`lib/devtools/shared/datetime.ts`).
 *
 * ONE DELIBERATE CHANGE. The old arm called `date.toLocaleString()` with no
 * locale, so the `Local:` line depended on the host's locale: `5:30:00 am`
 * under en_IN, `12:00:00 AM` under en_US. Same input, same time zone, different
 * output on a different machine — the tool was not deterministic. The locale is
 * now pinned to "en-US", and `tools/iso-date-converter/fixtures.json` was
 * updated to match. The time zone is still the host's, as before.
 */

import type { ToolRun } from "../../lib/tool-framework/run.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import type { SettingsOf } from "../../lib/tool-framework/settings.ts";
import { parseDate } from "../../lib/devtools/shared/datetime.ts";

type Settings = SettingsOf<typeof import("./definition.ts").default.settings>;

/** Pinned so the same instant renders identically on every machine. */
const LOCAL_FORMAT_LOCALE = "en-US";

export const run: ToolRun<Settings> = (ctx): ToolResult => {
  const date = parseDate(ctx.input.text, "Date input");
  return {
    render: "text",
    text: `ISO: ${date.toISOString()}\nUTC: ${date.toUTCString()}\nLocal: ${date.toLocaleString(LOCAL_FORMAT_LOCALE)}\nUnix: ${Math.floor(date.getTime() / 1000)}`,
  };
};

export default run;
