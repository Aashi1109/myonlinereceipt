/**
 * Moved verbatim from the `curl-to-axios` case in
 * `lib/devtools/format-json.ts` (line 2629) plus its single-consumer helper
 * `curlAsAxios` (line 3891).
 *
 * `parseCurl` / `shellTokens` are imported from `lib/devtools/shared/curl.ts`
 * and deliberately not inlined: the sibling `curl-to-fetch` tool parses the
 * same commands, and two copies of a shell tokenizer would drift.
 */

import type { ToolRun } from "../../lib/tool-framework/run.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import { parseCurl } from "../../lib/devtools/shared/curl.ts";

function curlAsAxios(command: string): string {
  const request = parseCurl(command);
  const config: Record<string, unknown> = {
    method: request.method.toLowerCase(),
    url: request.url,
  };
  if (Object.keys(request.headers).length) config.headers = request.headers;
  if (request.body !== undefined) {
    try {
      config.data = JSON.parse(request.body) as unknown;
    } catch {
      config.data = request.body;
    }
  }
  return `const { data } = await axios(${JSON.stringify(config, null, 2)});`;
}

export const run: ToolRun<Record<string, never>> = (ctx): ToolResult => ({
  render: "text",
  text: curlAsAxios(ctx.input.text),
});

export default run;
