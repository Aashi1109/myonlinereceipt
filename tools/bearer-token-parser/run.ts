/**
 * Moved verbatim from the `bearer-token-parser` case in
 * `lib/devtools/format-json.ts`: the same case-insensitive `Bearer ` strip, the
 * same three-part test, and the same shared `decodeJwt`.
 *
 * The token is echoed in the result because that is the tool's output contract
 * — it is never written to a log, and no error message contains it.
 */

import { ToolError, type ToolRun } from "../../lib/tool-framework/run.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import type { SettingsOf } from "../../lib/tool-framework/settings.ts";
import { decodeJwt } from "../../lib/devtools/shared/jwt.ts";
import { requireUtilityInput } from "../../lib/devtools/shared/options.ts";

type Settings = SettingsOf<typeof import("./definition.ts").default.settings>;

export const run: ToolRun<Settings> = (ctx): ToolResult => {
  const token = requireUtilityInput(ctx.input.text, "Authorization header or token")
    .trim()
    .replace(/^Bearer\s+/i, "");
  if (!token) {
    throw new ToolError(
      "token-required",
      "Bearer token is required.",
      "Paste the token itself, not just the Bearer prefix.",
    );
  }
  if (token.split(".").length === 3) {
    const decoded = decodeJwt(token);
    return {
      render: "text",
      text: JSON.stringify(
        { token, header: decoded.header, payload: decoded.payload },
        null,
        2,
      ),
    };
  }
  return { render: "text", text: `Token: ${token}\nLength: ${token.length}` };
};

export default run;
