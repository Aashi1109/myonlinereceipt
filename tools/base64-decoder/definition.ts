import type { ToolSpec } from "../../lib/tool-framework/spec";

export default {
  toolId: "devtools.base64-decoder",
  app: "devtools",
  category: "encoding-decoding",
  keywords: [
    "base64",
    "decode",
    "base64url",
    "utf-8",
    "atob",
    "data uri",
  ],
  name: "Base64 Decoder",
  description: "Decode Base64 text as UTF-8.",
  input: {
    kind: "text",
    label: "Base64 input",
    placeholder: "Enter or paste base64 input…",
  },
  settings: { fields: {} },
  trigger: { mode: "manual", actionLabel: "Decode" },
  layout: "source-result",
  capabilities: { copy: true, download: true },
  labels: {
    empty: "Paste Base64 to decode it.",
    ready: "Decoded text is ready.",
    running: "Decoding…",
  },
  content: {
    howToUse: [
      "Paste the Base64 string. Standard and URL-safe alphabets both work, and missing `=` padding is added for you.",
      "Whitespace and line breaks inside the value are ignored, so a wrapped PEM-style block or a value copied across several lines decodes fine.",
      "Decode, then copy the plain text.",
    ],
    limitations: [
      "The result is decoded as UTF-8 text. Binary payloads — an image, a zip, a protobuf — are rejected rather than shown as mojibake.",
      "Strip the `data:...;base64,` prefix from a data URI first; only the encoded body belongs here.",
      "A JWT is three Base64url segments joined by dots. Paste one segment, or use the JWT Decoder for the whole token.",
      "Invalid characters or a length that cannot be padded to a multiple of four are rejected with 'Base64 input is invalid.'",
    ],
    faq: [
      {
        q: "Do I need to convert Base64url to standard Base64 first?",
        a: "No. `-` and `_` are translated automatically and the padding is restored, so Base64url values decode as-is.",
      },
      {
        q: "Why does it say the input is not valid UTF-8?",
        a: "The bytes decoded fine but are not text — most often an image or another binary blob. This tool only produces text.",
      },
      {
        q: "Is my data uploaded?",
        a: "No. Decoding happens entirely in this browser tab.",
      },
    ],
    examples: [{ label: "Text with an emoji", text: "SGVsbG8g8J+Riw==" }],
  },
} as const satisfies ToolSpec;
