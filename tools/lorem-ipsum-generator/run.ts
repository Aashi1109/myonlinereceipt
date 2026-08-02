/**
 * Moved verbatim from the `lorem-ipsum-generator` case in
 * `lib/devtools/format-json.ts`, together with its `LOREM_SENTENCES` pool —
 * this tool is that constant's only consumer, so it lives here rather than in
 * `lib/devtools/shared/`.
 */

import type { ToolRun } from "../../lib/tool-framework/run.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import type { SettingsOf } from "../../lib/tool-framework/settings.ts";

type Settings = SettingsOf<typeof import("./definition.ts").default.settings>;

const LOREM_SENTENCES = [
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
  "Integer feugiat nibh sed velit luctus, vitae facilisis justo luctus.",
  "Praesent commodo sem at augue posuere, non suscipit ipsum viverra.",
  "Donec vitae lectus sed neque efficitur consequat.",
];

export const run: ToolRun<Settings> = (ctx): ToolResult => ({
  render: "text",
  text: Array.from({ length: ctx.settings.paragraphs }, (_, index) =>
    Array.from(
      { length: 3 },
      (__, offset) => LOREM_SENTENCES[(index + offset) % LOREM_SENTENCES.length],
    ).join(" "),
  ).join("\n\n"),
});

export default run;
