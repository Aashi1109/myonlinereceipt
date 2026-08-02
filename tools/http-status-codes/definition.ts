import type { ToolSpec } from "../../lib/tool-framework/spec";

export default {
  toolId: "devtools.http-status-codes",
  app: "devtools",
  slug: "http-status-codes",
  category: "jwt-api-tools",
  keywords: [
    "http",
    "status code",
    "404",
    "500",
    "reference",
    "lookup",
    "response",
  ],
  name: "HTTP Status Code Lookup",
  description: "Look up common HTTP status codes by code or phrase.",
  input: {
    kind: "text",
    label: "Status code or phrase",
    placeholder: "Enter or paste status code or phrase…",
  },
  settings: {
    fields: {},
  },
  trigger: {
    mode: "live",
  },
  layout: "source-result",
  capabilities: {
    copy: true,
  },
  labels: {
    empty: "Type a status code or phrase to search.",
    ready: "Matches found.",
    running: "Searching…",
  },
  content: {
    howToUse: [
      "Type a number (404), a partial number (40 matches the whole 4xx family listed here), or part of a phrase (gateway).",
      "Results filter as you type and show every match as \"<code> <reason phrase>\".",
      "Leave the box empty to browse the full list.",
    ],
    limitations: [
      "This is a curated list of the codes that appear in everyday work, not the complete IANA registry. WebDAV, extension, and vendor-specific codes are not included.",
      "Only the code and its reason phrase are shown — there is no description of when to use each one.",
      "Matching is a substring search over both the code and the phrase, so short queries match broadly.",
    ],
    faq: [
      {
        q: "Why is a code I expected missing?",
        a: "The list covers the commonly used codes. Rarely seen and vendor-specific codes are deliberately left out to keep results scannable.",
      },
      {
        q: "Can I search by phrase?",
        a: "Yes. Typing \"timeout\" returns both 408 Request Timeout and 504 Gateway Timeout.",
      },
    ],
    examples: [
      {
        label: "By code",
        text: "404",
      },
    ],
  },
} as const satisfies ToolSpec;
