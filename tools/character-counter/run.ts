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
    render: "text",
    text: `Characters: ${metrics.characters}\nCharacters without spaces: ${metrics.charactersWithoutSpaces}\nWords: ${metrics.words}\nLines: ${metrics.lines}\nUTF-8 bytes: ${metrics.bytes}`,
  };
};

export default run;
