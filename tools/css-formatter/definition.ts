import type { ToolSpec } from "../../lib/tool-framework/spec";

export default {
  toolId: "devtools.css-formatter",
  app: "devtools",
  category: "web-markup-tools",
  keywords: [
    "css",
    "format",
    "beautify",
    "prettify",
    "indent",
    "stylesheet",
    "unminify",
  ],
  name: "CSS Formatter",
  description: "Apply readable indentation to CSS.",
  input: {
    kind: "text",
    label: "CSS input",
    placeholder: ".card{color:#2563eb;padding:1rem;}",
  },
  settings: { fields: {} },
  trigger: { mode: "manual", actionLabel: "Format CSS" },
  capabilities: { copy: true, download: true },
  labels: {
    empty: "Paste CSS to format its indentation.",
    ready: "Formatted CSS is ready.",
    running: "Formatting CSS…",
  },
  content: {
    howToUse: [
      "Paste minified or badly indented CSS. Blocks are broken onto their own lines and indented two spaces per nesting level.",
      "Nested at-rules such as `@media` and `@supports` indent their contents, so a compressed stylesheet becomes readable enough to diff.",
      "Format, then copy the result back into your editor.",
    ],
    limitations: [
      "Comments are stripped, not reflowed. If you need them, format a copy.",
      "This is a brace-and-semicolon formatter, not a CSS parser. It does not validate properties, sort declarations, add missing semicolons, or normalise colours and units.",
      "Whitespace inside a declaration is collapsed to single spaces, so `color:#111` stays without a space after the colon — the input's spacing inside a value is preserved rather than canonicalised.",
      "There is no indent-width or brace-style setting; the output is always two spaces with the opening brace on the selector line.",
      "An unterminated string is rejected with 'Source contains an unfinished string.' — quotes are tracked so that braces inside a string are not treated as blocks.",
    ],
    faq: [
      {
        q: "Where did my comments go?",
        a: "They are removed before formatting. That is deliberate — a comment can sit anywhere, including mid-declaration, and reflowing one safely needs a full parser.",
      },
      {
        q: "Can I choose four-space indentation?",
        a: "Not here. The output is fixed at two spaces; re-indent in your editor if your project uses four.",
      },
      {
        q: "Will it fix broken CSS?",
        a: "No. It reindents whatever you give it. Unbalanced braces produce unbalanced output rather than an error.",
      },
    ],
    examples: [
      {
        label: "Minified rules",
        text: "body{color:#111;background:#fff}a:hover{text-decoration:underline}",
      },
    ],
  },
} as const satisfies ToolSpec;
