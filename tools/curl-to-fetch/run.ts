/**
 * Moved verbatim from the `curl-to-fetch` case in
 * `lib/devtools/format-json.ts` (arm at line 2627) together with its
 * single-consumer helper `curlAsFetch` (format-json.ts:3882-3889).
 *
 * `parseCurl` and `shellTokens` are shared with the sibling `curl-to-axios`
 * tool and live in `lib/devtools/shared/curl.ts`; they are imported here rather
 * than inlined, so both tools keep parsing curl identically.
 */

import type { ToolRun } from "../../lib/tool-framework/run.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import type { SettingsOf } from "../../lib/tool-framework/settings.ts";
import { parseCurl } from "../../lib/devtools/shared/curl.ts";

type Settings = SettingsOf<typeof import("./definition.ts").default.settings>;

function curlAsFetch(command: string): string {
  const request = parseCurl(command);
  const init: Record<string, unknown> = {};
  if (request.method !== "GET") init.method = request.method;
  if (Object.keys(request.headers).length) init.headers = request.headers;
  if (request.body !== undefined) init.body = request.body;
  return `const response = await fetch(${JSON.stringify(request.url)}, ${JSON.stringify(init, null, 2)});\nif (!response.ok) throw new Error(\`HTTP \${response.status}\`);\nconst data = await response.json();`;
}

export const run: ToolRun<Settings> = (ctx): ToolResult => ({
  render: "text",
  text: curlAsFetch(ctx.input.text),
});

export default run;
