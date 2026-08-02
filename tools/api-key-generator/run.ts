/**
 * Moved verbatim from the `api-key-generator` case in
 * `lib/devtools/format-json.ts` (line 2910): the same prefix validation, the
 * same URL-safe 64-character alphabet, and the same `randomString` helper,
 * which draws from the Web Crypto API with rejection sampling so the
 * distribution over the alphabet stays uniform.
 */

import { ToolError, type ToolRun } from "../../lib/tool-framework/run.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import type { SettingsOf } from "../../lib/tool-framework/settings.ts";
import { randomString } from "../../lib/devtools/shared/crypto.ts";

type Settings = SettingsOf<typeof import("./definition.ts").default.settings>;

const ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

export const run: ToolRun<Settings> = (ctx): ToolResult => {
  const prefix = ctx.settings.prefix.trim();
  if (prefix && !/^[A-Za-z\d_-]{1,32}$/.test(prefix)) {
    throw new ToolError(
      "invalid-prefix",
      "Prefix may contain only letters, numbers, underscores, and hyphens.",
      "Use something short such as sk or pk_live, up to 32 characters.",
    );
  }
  return {
    render: "text",
    text: Array.from({ length: ctx.settings.count }, () => {
      const body = randomString(ctx.settings.length, ALPHABET);
      return prefix ? `${prefix}_${body}` : body;
    }).join("\n"),
  };
};

export default run;
