import { ToolError, type ToolRun } from "../../lib/tool-framework/run.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import type { SettingsOf } from "../../lib/tool-framework/settings.ts";

type Settings = SettingsOf<typeof import("./definition.ts").default.settings>;

export const run: ToolRun<Settings> = (ctx): ToolResult => {
  const value = Number(ctx.input.text.trim());
  if (!Number.isFinite(value)) {
    throw new ToolError("not-a-number", "Value must be a number.", "Enter the number on its own, without a unit suffix.");
  }
  const base = ctx.settings.base;
  const from = ctx.settings.from;
  const to = ctx.settings.to;
  const toPixels: Record<string, number> = { px: 1, rem: base, em: base, pt: 96 / 72, "%": base / 100 };
  const result = (value * toPixels[from]) / toPixels[to];
  return { render: "text", text: `${Number(result.toFixed(6))}${to}` };
};

export default run;
