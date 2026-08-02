/**
 * Moved verbatim from the `whitespace-remover` case in
 * `lib/devtools/format-json.ts` (line 2390). Every regular expression, flag set
 * and fallback branch is unchanged: an unrecognised mode still falls through to
 * the 'extra' behaviour, as it did before.
 */

import type { ToolRun } from "../../lib/tool-framework/run.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import type { SettingsOf } from "../../lib/tool-framework/settings.ts";

type Settings = SettingsOf<typeof import("./definition.ts").default.settings>;

export const run: ToolRun<Settings> = (ctx): ToolResult => {
  const { mode } = ctx.settings;
  const primary = ctx.input.text;
  const text =
    mode === "all"
      ? primary.replace(/\s/gu, "")
      : mode === "leading"
        ? primary.replace(/^\s+/gmu, "")
        : mode === "trailing"
          ? primary.replace(/\s+$/gmu, "")
          : mode === "blank"
            ? primary.replace(/^(?:\s*\r?\n)+/gmu, "")
            : primary.replace(/[ \t]+/g, " ").replace(/^ | $/gmu, "");
  return { render: "text", text };
};

export default run;
