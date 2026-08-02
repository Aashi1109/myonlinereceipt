import type { ToolSpec } from "../../lib/tool-framework/spec";

export default {
  toolId: "devtools.css-box-shadow",
  // `slugFromName("CSS Box Shadow Generator")` is "css-box-shadow-generator",
  // but the live indexed URL is /devtools/css-box-shadow and a slug is frozen
  // at first insert — so it is declared explicitly rather than derived.
  slug: "css-box-shadow",
  app: "devtools",
  category: "color-design-tools",
  keywords: [
    "box-shadow",
    "css",
    "shadow",
    "elevation",
    "inset",
    "blur",
    "spread",
    "generator",
  ],
  name: "CSS Box Shadow Generator",
  description: "Generate a CSS box-shadow declaration.",
  input: {
    kind: "text",
    label: "Shadow color",
    placeholder: "Enter or paste shadow color…",
  },
  settings: {
    fields: {
      x: {
        kind: "number",
        label: "X offset",
        help: "Horizontal distance in pixels. Positive moves the shadow right.",
        default: 0,
        min: -100,
        max: 100,
        suffix: "px",
      },
      y: {
        kind: "number",
        label: "Y offset",
        help: "Vertical distance in pixels. Positive moves the shadow down.",
        default: 12,
        min: -100,
        max: 100,
        suffix: "px",
      },
      blur: {
        kind: "number",
        label: "Blur",
        help: "Larger values give a softer, more diffuse edge.",
        default: 30,
        min: 0,
        max: 200,
        suffix: "px",
      },
      spread: {
        kind: "number",
        label: "Spread",
        help: "Grows or shrinks the shadow before blurring. Negative values pull it in under the element.",
        default: -8,
        min: -100,
        max: 100,
        suffix: "px",
      },
      inset: {
        kind: "toggle",
        label: "Inset",
        help: "Draws the shadow inside the element instead of behind it.",
        default: false,
      },
    },
  },
  trigger: { mode: "live", debounceMs: 120 },
  layout: "visual-editor",
  capabilities: { copy: true },
  labels: {
    empty: "Enter a shadow color to build a box-shadow.",
    ready: "box-shadow declaration is ready.",
    running: "Building shadow…",
  },
  content: {
    howToUse: [
      "Enter the shadow colour as a hex value. `#RRGGBBAA` gives you a translucent shadow, which is almost always what you want — a fully opaque shadow reads as a hard outline.",
      "Adjust the offsets, blur, and spread; the declaration updates live.",
      "A believable elevation usually means a small Y offset, a blur two to three times that offset, and a slightly negative spread. Copy the declaration when it looks right.",
    ],
    limitations: [
      "One shadow per run. Layered shadows are a comma-separated list, so generate each layer and join them by hand.",
      "Lengths are pixels only — no rem, em, or percentage units.",
      "The colour must be hex (`#RGB`, `#RGBA`, `#RRGGBB`, or `#RRGGBBAA`). Named colours, `rgb()`, `hsl()`, and `var(--token)` are rejected.",
      "The colour is validated and then re-emitted exactly as you typed it, so the output keeps your original casing and shorthand.",
      "This produces `box-shadow`, not `filter: drop-shadow()` — the two differ on transparent PNGs and non-rectangular shapes.",
    ],
    faq: [
      {
        q: "What is the difference between blur and spread?",
        a: "Spread resizes the shadow's shape before it is blurred; blur softens its edge. A negative spread with a large blur is the usual recipe for a soft, grounded elevation.",
      },
      {
        q: "How do I stack two shadows?",
        a: "Generate each one, then join the two values with a comma in a single declaration: `box-shadow: <first>, <second>;`.",
      },
      {
        q: "Why does inset look like nothing happened?",
        a: "An inset shadow draws inside the padding box, so it is hidden if the element has no background or if the offsets are too small to clear the edge. Increase the offset or blur.",
      },
      {
        q: "Can I use a CSS variable for the colour?",
        a: "Not as input — it has to be a hex value so it can be validated. Swap the literal for `var(--shadow-color)` in the generated declaration afterwards.",
      },
    ],
    examples: [{ label: "Slate elevation", text: "#0f172a" }],
  },
} as const satisfies ToolSpec;
