/**
 * Moved verbatim from the `markdown-previewer` case in
 * `lib/devtools/format-json.ts`: the same `marked.parse` call and the same
 * required-input guard. The renderer is not reimplemented here.
 *
 * The import is dynamic so `marked` stays out of the initial bundle.
 */

import { requireUtilityInput } from "../../lib/devtools/shared/options.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import type { ToolRun } from "../../lib/tool-framework/run.ts";
import type { SettingsOf } from "../../lib/tool-framework/settings.ts";

type Settings = SettingsOf<typeof import("./definition.ts").default.settings>;

export const run: ToolRun<Settings> = async (ctx): Promise<ToolResult> => {
  const source = requireUtilityInput(ctx.input.text, "Markdown input");
  const { marked } = await import("marked");
  ctx.signal.throwIfAborted();
  return {
    render: "html",
    html: String(await marked.parse(source)),
    downloadName: "preview.html",
  };
};

export default run;
