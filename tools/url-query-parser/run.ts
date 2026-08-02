/**
 * Moved verbatim from the `url-query-parser` case in
 * `lib/devtools/format-json.ts` (arm at line 2655). `requireUtilityInput` is
 * shared (`lib/devtools/shared/options.ts`); the legacy error message
 * "URL or query string is invalid." is preserved exactly.
 */

import { ToolError, type ToolRun } from "../../lib/tool-framework/run.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import type { SettingsOf } from "../../lib/tool-framework/settings.ts";
import { requireUtilityInput } from "../../lib/devtools/shared/options.ts";

type Settings = SettingsOf<typeof import("./definition.ts").default.settings>;

export const run: ToolRun<Settings> = (ctx): ToolResult => {
  const input = requireUtilityInput(ctx.input.text, "URL or query string").trim();
  let parameters: URLSearchParams;
  try {
    parameters =
      input.includes("?") || /^[a-z][a-z\d+.-]*:/i.test(input)
        ? new URL(input).searchParams
        : new URLSearchParams(input.replace(/^\?/, ""));
  } catch {
    throw new ToolError(
      "query-invalid",
      "URL or query string is invalid.",
      "Paste a complete URL, or just the part after the ? on its own.",
    );
  }
  const value: Record<string, string | string[]> = {};
  for (const [key, item] of parameters) {
    const current = value[key];
    value[key] =
      current === undefined
        ? item
        : Array.isArray(current)
          ? [...current, item]
          : [current, item];
  }
  return { render: "text", text: JSON.stringify(value, null, 2) };
};

export default run;
