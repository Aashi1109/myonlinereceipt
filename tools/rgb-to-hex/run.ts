/**
 * Moved verbatim from the `rgb-to-hex` case and `parseRgbColor` in
 * `lib/devtools/format-json.ts`. `parseRgbColor` has one consumer and stays
 * here; `rgbToHex` and `RgbColor` are shared and imported.
 */

import { rgbToHex, type RgbColor } from "../../lib/devtools/shared/color.ts";
import { ToolError, type ToolRun } from "../../lib/tool-framework/run.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import type { SettingsOf } from "../../lib/tool-framework/settings.ts";

type Settings = SettingsOf<typeof import("./definition.ts").default.settings>;

const RGB_PATTERN =
  /^rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)(?:\s*,\s*(\d*\.?\d+))?\s*\)$/i;

function parseRgbColor(input: string): RgbColor {
  const match = RGB_PATTERN.exec(input.trim());
  if (!match) throw new ToolError("syntax", "RGB color must look like rgb(51, 102, 255).");
  const values = match.slice(1, 4).map(Number);
  const alpha = match[4] === undefined ? 1 : Number(match[4]);
  if (values.some((value) => value < 0 || value > 255) || alpha < 0 || alpha > 1) {
    throw new ToolError("range", "RGB channels must be 0–255 and alpha must be 0–1.");
  }
  return {
    red: Math.round(values[0]),
    green: Math.round(values[1]),
    blue: Math.round(values[2]),
    alpha,
  };
}

export const run: ToolRun<Settings> = (ctx): ToolResult => ({
  render: "text",
  text: rgbToHex(parseRgbColor(ctx.input.text)),
});

export default run;
