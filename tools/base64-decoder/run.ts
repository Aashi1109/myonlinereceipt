/**
 * Moved verbatim from the `base64-decoder` case in
 * `lib/devtools/format-json.ts` (line 2447). Both the required-input guard and
 * the decode itself are shared helpers, so the error strings ("Base64 input is
 * required.", "Base64 input is invalid.", "Base64 does not contain valid UTF-8
 * text.") are the originals rather than copies.
 */

import type { ToolRun } from "../../lib/tool-framework/run.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import { decodeBase64 } from "../../lib/devtools/shared/encoding.ts";
import { requireUtilityInput } from "../../lib/devtools/shared/options.ts";

export const run: ToolRun<Record<string, never>> = (ctx): ToolResult => ({
  render: "text",
  text: decodeBase64(requireUtilityInput(ctx.input.text, "Base64 input")),
});

export default run;
