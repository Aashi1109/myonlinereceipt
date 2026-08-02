/**
 * Moved verbatim from the `javascript-minifier` case and
 * `stripCodeCommentsAndWhitespace` in `lib/devtools/format-json.ts`. The
 * stripper has one consumer, so it stays in this folder.
 */

import { requireUtilityInput } from "../../lib/devtools/shared/options.ts";
import { ToolError, type ToolRun } from "../../lib/tool-framework/run.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import type { SettingsOf } from "../../lib/tool-framework/settings.ts";

type Settings = SettingsOf<typeof import("./definition.ts").default.settings>;

function stripCodeCommentsAndWhitespace(input: string): string {
  let output = "";
  let quote = "";
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    const next = input[index + 1];
    if (lineComment) {
      if (character === "\n") {
        lineComment = false;
        output += " ";
      }
      continue;
    }
    if (blockComment) {
      if (character === "*" && next === "/") {
        blockComment = false;
        index += 1;
        output += " ";
      }
      continue;
    }
    if (quote) {
      output += character;
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = "";
      continue;
    }
    if (character === '"' || character === "'" || character === "`") {
      quote = character;
      output += character;
    } else if (character === "/" && next === "/") {
      lineComment = true;
      index += 1;
    } else if (character === "/" && next === "*") {
      blockComment = true;
      index += 1;
    } else output += character;
  }
  if (quote || blockComment) {
    throw new ToolError(
      "unterminated",
      "Source contains an unfinished string or comment.",
      "Close the open string or block comment and try again.",
    );
  }
  return output
    .replace(/\s+/g, " ")
    .replace(/\s*([{}()[\],;:+*%=<>?])\s*/g, "$1")
    .trim();
}

export const run: ToolRun<Settings> = (ctx): ToolResult => ({
  render: "text",
  text: stripCodeCommentsAndWhitespace(requireUtilityInput(ctx.input.text, "JavaScript input")),
});

export default run;
