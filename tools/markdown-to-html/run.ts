import { requireUtilityInput } from "../../lib/devtools/shared/options.ts";
import type { ToolRun } from "../../lib/tool-framework/run.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import type { SettingsOf } from "../../lib/tool-framework/settings.ts";

type Settings = SettingsOf<typeof import("./definition.ts").default.settings>;

export const run: ToolRun<Settings> = async (ctx): Promise<ToolResult> => {
  const source = requireUtilityInput(ctx.input.text, "Markdown input");
  // Dynamic so marked stays out of the initial bundle.
  const { marked } = await import("marked");
  const html = String(await marked.parse(source));
  ctx.signal.throwIfAborted();
  return { render: "html", html, downloadName: "converted.html" };
};

export default run;
