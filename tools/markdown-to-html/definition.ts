import type { ToolSpec } from "../../lib/tool-framework/spec";

export default {
  toolId: "devtools.markdown-to-html",
  app: "devtools",
  category: "web-markup-tools",
  keywords: [
    "markdown",
    "html",
    "convert",
    "md",
    "render",
    "commonmark",
    "gfm",
  ],
  name: "Markdown to HTML",
  description: "Convert Markdown source to HTML.",
  input: {
    kind: "text",
    label: "Markdown input",
    placeholder: "Enter or paste markdown input…",
  },
  settings: {
    fields: {},
  },
  trigger: {
    mode: "manual",
    actionLabel: "Convert to HTML",
  },
  layout: "source-result",
  capabilities: {
    copy: true,
    download: true,
  },
  labels: {
    empty: "Paste Markdown to convert it to HTML.",
    ready: "HTML is ready.",
    running: "Converting Markdown…",
  },
  content: {
    howToUse: [
      "Paste your Markdown — a README, release notes, or a docs page.",
      "Convert. Headings, emphasis, lists, links, tables, and fenced code blocks are all supported.",
      "Copy the HTML fragment into your template. No wrapper document, stylesheet, or script is added.",
    ],
    limitations: [
      "The output is a fragment, not a full page — there is no doctype, head, or styling.",
      "Raw HTML in the source is passed straight through and the result is NOT sanitised. Never render Markdown you did not write without running it through a sanitiser first.",
      "Front matter is not stripped; a YAML block at the top is rendered as content.",
      "Extensions such as footnotes, definition lists, and math are not enabled.",
    ],
    faq: [
      {
        q: "Is the HTML safe to render?",
        a: "Only if you trust the Markdown. Raw HTML and javascript: links survive the conversion — sanitise before rendering third-party input.",
      },
      {
        q: "Which flavour of Markdown is this?",
        a: "CommonMark with GitHub-flavoured extensions such as tables and strikethrough.",
      },
    ],
    examples: [
      {
        label: "Heading and bold text",
        text: "# Hello\n\n**Smart tools** stay focused.",
      },
    ],
  },
} as const satisfies ToolSpec;
