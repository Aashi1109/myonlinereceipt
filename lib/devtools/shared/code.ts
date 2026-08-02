// Brace-delimited source formatting.
// Verbatim extraction from lib/devtools/format-json.ts (region 4).

import { ToolError } from "../../tool-framework/run.ts";
import { requireUtilityInput } from "./options.ts";

export function formatDelimitedCode(input: string, language: "javascript" | "css"): string {
  requireUtilityInput(input, `${language === "css" ? "CSS" : "JavaScript"} input`);
  const source = language === "css" ? input.replace(/\/\*[\s\S]*?\*\//g, "") : input;
  let output = "";
  let indent = 0;
  let quote = "";
  let escaped = false;
  const newline = () => {
    output = output.trimEnd() + `\n${"  ".repeat(indent)}`;
  };
  for (const character of source.trim()) {
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
    } else if (character === "{") {
      output = output.trimEnd() + " {";
      indent += 1;
      newline();
    } else if (character === "}") {
      indent = Math.max(0, indent - 1);
      output = output.trimEnd() + `\n${"  ".repeat(indent)}}`;
      newline();
    } else if (character === ";") {
      output = output.trimEnd() + ";";
      newline();
    } else if (/\s/.test(character)) {
      if (output && !/\s/.test(output.at(-1)!)) output += " ";
    } else output += character;
  }
  if (quote) throw new ToolError("invalid-source", "Source contains an unfinished string.");
  return output.trim().replace(/\n{3,}/g, "\n\n");
}
