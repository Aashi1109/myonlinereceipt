import type { ToolSpec } from "../../lib/tool-framework/spec";

export default {
  toolId: "devtools.html-encoder",
  app: "devtools",
  category: "encoding-decoding",
  keywords: ["html", "encode", "entities", "escape", "xss", "sanitize"],
  name: "HTML Encoder",
  description: "Encode reserved HTML characters as entities.",
  input: {
    kind: "text",
    label: "HTML or text",
    placeholder: "Enter or paste html or text…",
  },
  settings: { fields: {} },
  trigger: { mode: "manual", actionLabel: "Encode entities" },
  layout: "source-result",
  capabilities: { copy: true, download: true },
  labels: {
    empty: "Paste markup or text to escape it.",
    ready: "Escaped text is ready.",
    running: "Encoding…",
  },
  content: {
    howToUse: [
      "Paste the markup or text you want rendered literally rather than parsed.",
      "Encode. The five characters that are reserved in HTML — & < > \" ' — become their named or numeric entities.",
      "Paste the result into a template, a code sample, or a documentation snippet where the tags must be visible as text.",
    ],
    limitations: [
      "Exactly five characters are escaped. This is the correct set for HTML text and quoted attribute values, and nothing more is escaped so the output stays readable.",
      "It is not sufficient for unquoted attribute values, for text inside a <script> or <style> block, or for a URL in an href — those contexts need their own escaping.",
      "Non-ASCII characters are left as-is. Serve the page as UTF-8 rather than entity-encoding them.",
    ],
    faq: [
      {
        q: "Is this enough to stop XSS?",
        a: "Only for the HTML text and quoted-attribute contexts. Escaping is context-dependent: use a real sanitiser or a templating engine that escapes automatically for anything user-supplied.",
      },
      {
        q: "Why is ' encoded as &#39; and not &apos;?",
        a: "&#39; is the numeric reference and is understood by every parser, including legacy HTML 4 ones where &apos; is not defined.",
      },
    ],
    examples: [
      {
        label: "A tag with an attribute",
        text: '<button title="Save & close">Save</button>',
      },
    ],
  },
} as const satisfies ToolSpec;
