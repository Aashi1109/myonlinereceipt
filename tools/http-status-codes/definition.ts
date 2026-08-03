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
    kind: "fields",
    label: "Status Code or Phrase",
    fields: [
      {
        channel: "text",
        label: "Status code or phrase",
        placeholder: "404",
        required: true,
        multiline: false,
      },
    ],
  },
  settings: {
    fields: {},
  },
  trigger: {
    mode: "live",
  },
  capabilities: {
    copy: true,
  },
  workbenchMark: { text: "404", tone: "contrast" },
  labels: {
    empty: "Type a status code or phrase to search.",
    ready: "HTTP status matches are ready.",
    running: "Searching HTTP status codes…",
  },
  content: {
    howToUse: [
      "Type a number (404), a partial number (40 matches the whole 4xx family listed here), or part of a phrase (gateway).",
      "Results filter as you type and show every match as \"<code> <reason phrase>\".",
      "Use a shorter query when you want to broaden the result list.",
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
