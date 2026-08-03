import type { ToolSpec } from "../../lib/tool-framework/spec";

export default {
  toolId: "devtools.markdown-previewer",
  app: "devtools",
  category: "web-markup-tools",
  keywords: [
    "markdown",
    "preview",
    "md",
    "html",
    "readme",
    "render",
    "commonmark",
  ],
  name: "Markdown Previewer",
  description: "Render Markdown for a sandboxed preview.",
  input: {
    kind: "text",
    label: "Markdown document",
    placeholder: "# Preview\n\n- Fast\n- Private",
  },
  settings: { fields: {} },
  trigger: { mode: "live", debounceMs: 160 },
  capabilities: { copy: true, download: true },
  workbenchMark: { text: "MDV", tone: "accent" },
  labels: {
    empty: "Write Markdown or load an example to preview it.",
    ready: "Rendered preview is current.",
    running: "Rendering Markdown…",
  },
  content: {
    howToUse: [
      "Paste or type Markdown on the left. The preview re-renders as you stop typing — there is no button to press.",
      "Use it to check a README, a changelog entry, or a comment before you commit it, especially the parts that are easy to get wrong: nested lists, tables, and fenced code blocks.",
      "Copy the generated HTML if you need to paste the rendered form into a CMS or an email template.",
      "Remember that the preview shows structure, not your target site's theme — headings and code blocks will be styled differently once published.",
    ],
    limitations: [
      "The renderer follows GitHub-flavoured Markdown. Site-specific extensions — admonition blocks, front matter, shortcodes, Mermaid fences — are passed through as ordinary text.",
      "The preview is rendered in a sandbox, so scripts, forms, and remote content embedded in raw HTML do not execute.",
      "Relative links and relative image paths cannot resolve here; they will only work once the document is published at its real location.",
      "No syntax highlighting is applied inside fenced code blocks — the fence and the language tag are preserved, but the colours come from your publishing platform.",
    ],
    faq: [
      {
        q: "Is my document uploaded anywhere?",
        a: "No. Rendering happens entirely in this browser tab; the Markdown never leaves your machine.",
      },
      {
        q: "Is raw HTML inside my Markdown rendered?",
        a: "It is rendered as markup, but inside a sandbox that blocks scripts and remote loads, so an embedded script tag does nothing.",
      },
      {
        q: "Why do my tables not look right?",
        a: "GitHub-flavoured tables need a header row and a separator row of dashes, and every row needs the same number of pipe-separated cells.",
      },
      {
        q: "Can I export the HTML?",
        a: "Yes. The rendered HTML is what the copy and download actions produce.",
      },
    ],
    examples: [
      { label: "Headings and a list", text: "# Preview\n\n- Fast\n- Private" },
    ],
  },
} as const satisfies ToolSpec;
