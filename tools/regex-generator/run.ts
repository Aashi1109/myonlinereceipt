/**
 * Moved verbatim from the `regex-generator` case in
 * `lib/devtools/format-json.ts`: the same six patterns, character for
 * character, and the same per-language literal wrapping and delimiter escaping.
 */

import { ToolError, type ToolRun } from "../../lib/tool-framework/run.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import type { SettingsOf } from "../../lib/tool-framework/settings.ts";

type Settings = SettingsOf<typeof import("./definition.ts").default.settings>;

const PATTERNS: Readonly<Record<string, string>> = {
  email: "[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\\.[A-Za-z0-9-]+)+",
  url: "https?://(?:www\\.)?[-A-Za-z0-9@:%._+~#=]{1,256}\\.[A-Za-z0-9()]{1,63}\\b(?:[-A-Za-z0-9()@:%_+.~#?&/=]*)",
  ipv4: "(?:(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)",
  uuid: "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}",
  "hex-color": "#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\\b",
  password: "(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{12,}",
};

export const run: ToolRun<Settings> = (ctx): ToolResult => {
  const pattern = PATTERNS[ctx.settings.preset];
  if (!pattern) {
    throw new ToolError(
      "preset-invalid",
      "Regex preset is invalid.",
      "Choose one of the listed presets.",
    );
  }
  const { language } = ctx.settings;
  return {
    render: "text",
    text:
      language === "javascript"
        ? `/${pattern.replace(/\//g, "\\/")}/`
        : language === "python"
          ? `r"${pattern}"`
          : `~${pattern.replace(/~/g, "\\~")}~`,
  };
};

export default run;
