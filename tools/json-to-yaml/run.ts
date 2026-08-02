import { parseUtilityJson } from "../../lib/devtools/shared/json-input.ts";
import type { ToolRun } from "../../lib/tool-framework/run.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import type { SettingsOf } from "../../lib/tool-framework/settings.ts";

type Settings = SettingsOf<typeof import("./definition.ts").default.settings>;

export const run: ToolRun<Settings> = async (ctx): Promise<ToolResult> => {
  const value = parseUtilityJson(ctx.input.text, { repairMode: ctx.settings.repairMode });
  // Dynamic so js-yaml stays out of the initial bundle.
  const { dump } = await import("js-yaml");
  ctx.signal.throwIfAborted();
  return { render: "text", text: dump(value, { noRefs: true, sortKeys: false }) };
};

export default run;
