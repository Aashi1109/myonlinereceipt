/**
 * Moved verbatim from the `yaml-to-json` case in `lib/devtools/format-json.ts`.
 * Same `js-yaml` `load`, same `JSON.stringify(…, null, 2)`, same error text.
 * The import is dynamic so `js-yaml` stays out of the initial bundle.
 */

import { ToolError, type ToolRun } from "../../lib/tool-framework/run.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import type { SettingsOf } from "../../lib/tool-framework/settings.ts";
import { requireUtilityInput } from "../../lib/devtools/shared/options.ts";

type Settings = SettingsOf<typeof import("./definition.ts").default.settings>;

export const run: ToolRun<Settings> = async (ctx): Promise<ToolResult> => {
  requireUtilityInput(ctx.input.text, "YAML input");
  const { load } = await import("js-yaml");
  ctx.signal.throwIfAborted();
  try {
    return { render: "text", text: JSON.stringify(load(ctx.input.text), null, 2) };
  } catch (error) {
    throw new ToolError(
      "yaml-invalid",
      `YAML is invalid: ${error instanceof Error ? error.message : "unknown error"}`,
      "Check the indentation — YAML does not allow tab characters for indentation.",
    );
  }
};

export default run;
