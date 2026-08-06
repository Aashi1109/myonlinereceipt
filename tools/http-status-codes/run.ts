/**
 * Moved verbatim from the `http-status-codes` case and `HTTP_STATUSES` in
 * `lib/devtools/format-json.ts`. The table has one consumer, so it stays in
 * this folder. The captured fixture was checked rather than assumed: a bare
 * code query returns the single "<code> <phrase>" line, not a description.
 */

import { ToolError, type ToolRun } from "../../lib/tool-framework/run.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import type { SettingsOf } from "../../lib/tool-framework/settings.ts";

type Settings = SettingsOf<typeof import("./definition.ts").default.settings>;

const HTTP_STATUSES: Readonly<Record<number, string>> = {
  100: "Continue",
  101: "Switching Protocols",
  200: "OK",
  201: "Created",
  202: "Accepted",
  204: "No Content",
  206: "Partial Content",
  301: "Moved Permanently",
  302: "Found",
  304: "Not Modified",
  307: "Temporary Redirect",
  308: "Permanent Redirect",
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  408: "Request Timeout",
  409: "Conflict",
  410: "Gone",
  413: "Content Too Large",
  415: "Unsupported Media Type",
  418: "I'm a Teapot",
  422: "Unprocessable Content",
  429: "Too Many Requests",
  500: "Internal Server Error",
  501: "Not Implemented",
  502: "Bad Gateway",
  503: "Service Unavailable",
  504: "Gateway Timeout",
};

export const run: ToolRun<Settings> = (ctx): ToolResult => {
  const query = ctx.input.text.trim().toLocaleLowerCase();
  const category = ctx.settings.category ?? "all";
  const searchMode = ctx.settings.searchMode ?? "code-and-phrase";
  const matches = Object.entries(HTTP_STATUSES).filter(([code, phrase]) => {
    if (category !== "all" && !code.startsWith(category.charAt(0))) return false;
    if (!query) return true;
    return (
      (searchMode !== "phrase-only" && code.includes(query)) ||
      (searchMode !== "code-only" && phrase.toLocaleLowerCase().includes(query))
    );
  });
  if (!matches.length) {
    throw new ToolError(
      "no-match",
      "No matching HTTP status code was found.",
      "Try a shorter query, or clear the box to browse every code.",
    );
  }
  return {
    render: "text",
    text: matches.map(([code, phrase]) => `${code} ${phrase}`).join("\n"),
  };
};

export default run;
