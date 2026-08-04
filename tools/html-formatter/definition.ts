import type { ToolSpec } from "../../lib/tool-framework/spec";

export default {
  toolId: "devtools.html-formatter",
  app: "devtools",
  category: "web-markup-tools",
  keywords: ["html", "format", "beautify", "indent", "pretty print", "markup"],
  name: "HTML Formatter",
  description: "Apply readable indentation to HTML.",
  layout: "stacked",
  input: {
    kind: "text",
    label: "HTML input",
    placeholder: "<main><h1>Hello</h1><p>Smart tools</p></main>",
  },
  settings: { fields: {} },
  trigger: { mode: "manual", actionLabel: "Format HTML" },
  capabilities: { copy: true, download: true },
  workbenchMark: { text: "</>", tone: "contrast" },
  labels: {
    empty: "Paste HTML to indent it.",
    ready: "Formatted HTML is ready.",
    running: "Formatting HTML…",
  },
  content: {
    howToUse: [
      "Paste minified or badly indented HTML — a rendered page source, an email template, a fragment from a build output.",
      "Format. Each tag, comment, doctype, and text run goes on its own line, indented two spaces per nesting level.",
      "Read the structure, find the unclosed tag, then copy the result back into your editor.",
    ],
    limitations: [
      "This is an indenter, not a parser. It does not validate the markup, does not repair mismatched tags, and does not rewrite attributes.",
      "Whitespace between tags is collapsed before indenting, which changes rendering wherever whitespace was significant — inline elements, <pre>, and <textarea> in particular.",
      "Script and style bodies are treated as opaque text and are not reformatted.",
      "Text content is emitted verbatim. Nothing is escaped or sanitised, so treat formatted untrusted markup as exactly as dangerous as the input.",
    ],
    faq: [
      {
        q: "Will formatting change how my page renders?",
        a: "It can. Whitespace between inline elements is meaningful in HTML, and it is collapsed here. Do not run this over production markup you are not going to re-check.",
      },
      {
        q: "Why is my self-closing tag not indented as a block?",
        a: "Void elements — br, img, input, meta, and the rest — never open a level, and neither does a tag written with a trailing slash.",
      },
    ],
    examples: [
      {
        label: "Minified fragment",
        text: "<main><h1>Hello</h1><p>Smart tools</p></main>",
      },
    ],
  },
} as const satisfies ToolSpec;
