/**
 * Moved verbatim from the `text-to-hex` case in `lib/devtools/format-json.ts`.
 * The hex formatting is the shared `bytesToHex`.
 */

import type { ToolRun } from "../../lib/tool-framework/run.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import type { SettingsOf } from "../../lib/tool-framework/settings.ts";
import { bytesToHex } from "../../lib/devtools/shared/encoding.ts";

type Settings = SettingsOf<typeof import("./definition.ts").default.settings>;

export const run: ToolRun<Settings> = (ctx): ToolResult => ({
  render: "text",
  text: bytesToHex(new TextEncoder().encode(ctx.input.text)),
});

export default run;
