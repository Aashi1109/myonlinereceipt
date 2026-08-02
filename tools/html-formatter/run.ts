/**
 * Moved verbatim from the `html-formatter` case in
 * `lib/devtools/format-json.ts`, together with its `formatHtml` helper — this
 * tool is that helper's only consumer, so it lives here rather than in
 * `lib/devtools/shared/`.
 *
 * The tokeniser, the void-tag set, and the indent bookkeeping are unchanged.
 * Nothing here escapes or rewrites the markup: the result is the same bytes
 * with newlines and indentation inserted, so untrusted input stays exactly as
 * untrusted as it arrived and the renderer remains responsible for sandboxing.
 */

import type { ToolRun } from "../../lib/tool-framework/run.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import type { SettingsOf } from "../../lib/tool-framework/settings.ts";
import { requireUtilityInput } from "../../lib/devtools/shared/options.ts";

type Settings = SettingsOf<typeof import("./definition.ts").default.settings>;

function formatHtml(input: string): string {
  requireUtilityInput(input, "HTML input");
  const voidTags = new Set([
    "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta",
    "param", "source", "track", "wbr",
  ]);
  const tokens =
    input.replace(/>\s*</g, "><").match(/<!--[\s\S]*?-->|<![^>]*>|<[^>]+>|[^<]+/g) ?? [];
  const lines: string[] = [];
  let indent = 0;
  for (const raw of tokens) {
    const token = raw.trim();
    if (!token) continue;
    const closing = /^<\//.test(token);
    if (closing) indent = Math.max(0, indent - 1);
    lines.push(`${"  ".repeat(indent)}${token}`);
    const tag = token.match(/^<([A-Za-z][\w:-]*)/)?.[1].toLowerCase();
    if (
      tag &&
      !closing &&
      !token.endsWith("/>") &&
      !voidTags.has(tag) &&
      !token.includes(`</${tag}>`)
    ) {
      indent += 1;
    }
  }
  return lines.join("\n");
}

export const run: ToolRun<Settings> = (ctx): ToolResult => ({
  render: "text",
  text: formatHtml(ctx.input.text),
});

export default run;
