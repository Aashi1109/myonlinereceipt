/**
 * Moved verbatim from the `word-counter` case in
 * `lib/devtools/format-json.ts` (arm at line 2296). `textMetrics` is shared
 * (`lib/devtools/shared/text.ts`); the reading-time line and the exact label
 * order are the arm's own and are reproduced byte-for-byte.
 */

import type { ToolRun } from "../../lib/tool-framework/run.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import type { SettingsOf } from "../../lib/tool-framework/settings.ts";
import { textMetrics } from "../../lib/devtools/shared/text.ts";

type Settings = SettingsOf<typeof import("./definition.ts").default.settings>;

export const run: ToolRun<Settings> = (ctx): ToolResult => {
  const metrics = textMetrics(ctx.input.text, {
    countHyphenated: ctx.settings.countHyphenated,
    excludeEmails: ctx.settings.excludeEmails,
    ignoreNumbers: ctx.settings.ignoreNumbers,
  });
  const minutes = metrics.words ? Math.max(1, Math.ceil(metrics.words / 200)) : 0;
  return {
    render: "text",
    text: `Words: ${metrics.words}\nCharacters: ${metrics.characters}\nCharacters without spaces: ${metrics.charactersWithoutSpaces}\nSentences: ${metrics.sentences}\nParagraphs: ${metrics.paragraphs}\nLines: ${metrics.lines}${ctx.settings.estimateReadingTime ? `\nReading time: ${minutes} minute${minutes === 1 ? "" : "s"}` : ""}`,
  };
};

export default run;
