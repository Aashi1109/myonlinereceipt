/**
 * Moved verbatim from the `bcrypt-compare` case in
 * `lib/devtools/format-json.ts`.
 *
 * The comparison stays `bcrypt.compare`, which is constant time; it is not
 * replaced with `===` and not short-circuited. The plain password is read once
 * and never appears in the result or in an error message. The import is dynamic
 * so `bcryptjs` stays out of the initial bundle.
 */

import { ToolError, type ToolRun } from "../../lib/tool-framework/run.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import type { SettingsOf } from "../../lib/tool-framework/settings.ts";
import { requireUtilityInput } from "../../lib/devtools/shared/options.ts";

type Settings = SettingsOf<typeof import("./definition.ts").default.settings>;

export const run: ToolRun<Settings> = async (ctx): Promise<ToolResult> => {
  const password = requireUtilityInput(ctx.input.text, "Plain password");
  const hash = requireUtilityInput(ctx.input.secondary ?? "", "Bcrypt hash");
  const { default: bcrypt } = await import("bcryptjs");
  ctx.signal.throwIfAborted();
  let matched: boolean;
  try {
    matched = await bcrypt.compare(password, hash);
  } catch {
    throw new ToolError(
      "hash-invalid",
      "Bcrypt hash is invalid.",
      "Paste the whole stored hash, including the $2b$ prefix and cost.",
    );
  }
  return {
    render: "text",
    text: matched ? "Match" : "No match",
    verdict: matched
      ? { level: "ok", label: "Match" }
      : { level: "error", label: "No match" },
  };
};

export default run;
