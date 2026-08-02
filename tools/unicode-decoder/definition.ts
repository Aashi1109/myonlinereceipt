import type { ToolSpec } from "../../lib/tool-framework/spec";

export default {
  toolId: "devtools.unicode-decoder",
  app: "devtools",
  category: "encoding-decoding",
  keywords: [
    "unicode",
    "decode",
    "escape",
    "\\\\u",
    "codepoint",
    "javascript",
    "emoji",
  ],
  name: "Unicode Decoder",
  description: "Decode JavaScript-style Unicode escape sequences.",
  input: {
    kind: "text",
    label: "Unicode escapes",
    placeholder: "Enter or paste unicode escapes…",
  },
  settings: {
    fields: {},
  },
  trigger: {
    mode: "manual",
    actionLabel: "Decode Unicode",
  },
  layout: "source-result",
  capabilities: {
    copy: true,
  },
  labels: {
    empty: "Paste \\u escapes to decode them.",
    ready: "Escapes decoded.",
    running: "Decoding escapes…",
  },
  content: {
    howToUse: [
      "Paste text containing JavaScript-style escapes — the form you get from a JSON string, a stack trace, or a log line that ASCII-escaped its output.",
      "Decode. Both the four-hex-digit form (\\u00e9) and the braced code-point form (\\u{1F44B}) are supported.",
      "Text without escapes passes through unchanged, so it is safe to run over a whole file.",
    ],
    limitations: [
      "Only \\u escapes are handled. \\x, \\0, \\n, and other backslash escapes are left alone.",
      "Surrogate pairs written as two \\uD83D\\uDC4B escapes decode correctly because they are recombined by the string itself, but a lone unpaired surrogate stays lone.",
      "A braced code point above U+10FFFF is rejected rather than silently clamped.",
    ],
    faq: [
      {
        q: "What is the difference between \\u00e9 and \\u{e9}?",
        a: "Nothing, for values below U+10000. The braced form is the only one that can express a code point above U+FFFF in a single escape.",
      },
      {
        q: "Why is my \\n still a backslash and an n?",
        a: "Only Unicode escapes are decoded. Other backslash escapes are left untouched on purpose.",
      },
    ],
    examples: [
      {
        label: "Emoji code point",
        text: "Hello \\\\u{1F44B}",
      },
    ],
  },
} as const satisfies ToolSpec;
