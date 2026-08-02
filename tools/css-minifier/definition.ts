import type { ToolSpec } from "../../lib/tool-framework/spec";

export default {
  toolId: "devtools.css-minifier",
  app: "devtools",
  category: "web-markup-tools",
  keywords: [
    "css",
    "minify",
    "compress",
    "whitespace",
    "comments",
    "stylesheet",
    "optimize",
  ],
  name: "CSS Minifier",
  description: "Remove CSS comments and redundant whitespace.",
  input: {
    kind: "text",
    label: "CSS input",
    placeholder: "Enter or paste css input…",
  },
  settings: { fields: {} },
  trigger: { mode: "manual", actionLabel: "Minify CSS" },
  layout: "source-result",
  capabilities: { copy: true, download: true },
  labels: {
    empty: "Paste CSS to strip comments and whitespace.",
    ready: "Minified CSS is ready.",
    running: "Minifying…",
  },
  content: {
    howToUse: [
      "Paste the stylesheet. Comments are removed, runs of whitespace collapse, and the spaces around `{`, `}`, `:`, `;`, `,`, `>`, `+`, and `~` are dropped.",
      "Minify, then copy the result into a `<style>` block or a `.css` file.",
      "Test the minified stylesheet in a browser before shipping it — see the limitations for the constructs this pass gets wrong.",
      "For a production build pipeline, use cssnano or Lightning CSS. This is for a quick one-off shrink.",
    ],
    limitations: [
      "This is a regex pass, not a CSS parser. It does not merge rules, shorten colours or units, or remove duplicate declarations.",
      "It does not respect strings or `url()` values, so a comment-like or delimiter-like sequence inside a quoted string or a data URI can be corrupted. Data URIs are the most common casualty.",
      "Preserved `/*! ... */` licence comments are stripped along with everything else.",
      "The final `;` before a `}` is removed, which is safe, but no other structural change is attempted.",
      "There is no source map output.",
    ],
    faq: [
      {
        q: "Will this break my stylesheet?",
        a: "Usually not, but it can if you have quoted strings or `url()` data URIs containing `/*`, `{`, or `;`. Diff the output and test in a browser.",
      },
      {
        q: "Does it preserve licence comments?",
        a: "No. `/*! ... */` is removed like any other comment, so re-add any required attribution by hand.",
      },
      {
        q: "How much smaller will it get?",
        a: "Whitespace and comments only — typically 10-30% on a hand-written stylesheet, and much less on one that was already compact.",
      },
    ],
    examples: [
      {
        label: "Commented rule",
        text: "/* theme */\nbody { color: #111; background: #fff; }",
      },
      {
        label: "Nested selectors",
        text: ".card > .title,\n.card + .title {\n  margin: 0;\n}",
      },
    ],
  },
} as const satisfies ToolSpec;
