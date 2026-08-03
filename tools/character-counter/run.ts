/**
 * Moved verbatim from the `character-counter` case in
 * `lib/devtools/format-json.ts` (line 2307). `textMetrics` is the shared helper
 * and is called with no options, exactly as before; the label order and wording
 * of the five lines are unchanged.
 */

import type { ToolRun } from "../../lib/tool-framework/run.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import { textMetrics } from "../../lib/devtools/shared/text.ts";

export const run: ToolRun<Record<string, never>> = (ctx): ToolResult => {
  const metrics = textMetrics(ctx.input.text);
  return {
    render: "key-value",
    entries: [
      { label: "Characters", value: String(metrics.characters) },
      {
        label: "Characters without spaces",
        value: String(metrics.charactersWithoutSpaces),
      },
      { label: "Words", value: String(metrics.words) },
      { label: "Lines", value: String(metrics.lines) },
      { label: "UTF-8 bytes", value: String(metrics.bytes) },
    ],
  };
};

export default run;
