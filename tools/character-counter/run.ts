/**
 * Moved verbatim from the `character-counter` case in
 * `lib/devtools/format-json.ts` (line 2307). `textMetrics` is the shared helper
 * and is called with no options, exactly as before; the label order and wording
 * of the five lines are unchanged.
 */

import type { ToolRun } from "../../lib/tool-framework/run.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import type { SettingsOf } from "../../lib/tool-framework/settings.ts";
import { textMetrics } from "../../lib/devtools/shared/text.ts";

type Settings = SettingsOf<typeof import("./definition.ts").default.settings>;

export const run: ToolRun<Settings> = (ctx): ToolResult => {
  const metrics = textMetrics(ctx.input.text);
  const {
    includeSpaces = true,
    limit280 = false,
    countLineBreaks = true,
  } = ctx.settings;
  const withoutExcludedLineBreaks = countLineBreaks
    ? ctx.input.text
    : ctx.input.text.replace(/\r\n|\r|\n/gu, "");
  const countedCharacters = Array.from(
    includeSpaces
      ? withoutExcludedLineBreaks
      : withoutExcludedLineBreaks.replace(/[^\S\r\n]/gu, ""),
  ).length;
  return {
    render: "key-value",
    entries: [
      {
        label: "Characters",
        value: limit280
          ? `${countedCharacters} / 280`
          : String(countedCharacters),
      },
      ...(limit280
        ? [{ label: "Remaining", value: String(280 - countedCharacters) }]
        : []),
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
