/**
 * Moved verbatim from the `css-formatter` case in
 * `lib/devtools/format-json.ts` (line 2698).
 *
 * `formatDelimitedCode` is imported from `lib/devtools/shared/code.ts` and
 * deliberately not inlined: the sibling `javascript-formatter` tool runs the
 * same routine with a different language argument.
 */

import type { ToolRun } from "../../lib/tool-framework/run.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import { formatDelimitedCode } from "../../lib/devtools/shared/code.ts";

export const run: ToolRun<Record<string, never>> = (ctx): ToolResult => ({
  render: "text",
  text: formatDelimitedCode(ctx.input.text, "css"),
});

export default run;
