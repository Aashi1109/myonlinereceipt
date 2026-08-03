/**
 * Moved verbatim from the `url-query-builder` case in
 * `lib/devtools/format-json.ts` (line 2672). `safeUrl` (which enforces the
 * absolute http/https rule) and `requireUtilityInput` are the shared helpers;
 * the row-format error string is preserved exactly.
 *
 * `safeUrl` returns a fresh `URL`, so mutating its `searchParams` does not
 * touch the caller's input.
 */

import { ToolError, type ToolRun } from "../../lib/tool-framework/run.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import { requireUtilityInput } from "../../lib/devtools/shared/options.ts";
import { safeUrl } from "../../lib/devtools/shared/url.ts";

export const run: ToolRun<Record<string, never>> = (ctx): ToolResult => {
  const url = safeUrl(
    requireUtilityInput(ctx.input.text, "Base URL"),
    "Base URL",
  );
  for (const line of (ctx.input.secondary ?? "").split(/\r\n|\r|\n/)) {
    if (!line.trim()) continue;
    const separator = line.indexOf("=");
    if (separator < 1) {
      throw new ToolError(
        "invalid-query-row",
        "Each query row must use key=value format.",
        "Give every non-blank line a key, an equals sign, and a value.",
      );
    }
    url.searchParams.append(
      line.slice(0, separator).trim(),
      line.slice(separator + 1).trim(),
    );
  }
  return { render: "text", text: url.toString(), downloadName: "built-url.txt" };
};

export default run;
