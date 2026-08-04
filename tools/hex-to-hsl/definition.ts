import type { ToolSpec } from "../../lib/tool-framework/spec";

export default {
  toolId: "devtools.hex-to-hsl",
  app: "devtools",
  category: "color-design-tools",
  keywords: [
    "hex",
    "hsl",
    "color",
    "convert",
    "css",
    "hue",
    "saturation",
  ],
  name: "HEX to HSL",
  description: "Convert HEX colors to HSL.",
  layout: "stacked",
  input: {
    kind: "fields",
    label: "HEX Color",
    fields: [
      {
        channel: "text",
        label: "HEX color",
        placeholder: "#3366ff",
        required: true,
        multiline: false,
      },
    ],
  },
  settings: { fields: {} },
  trigger: { mode: "live", debounceMs: 150 },
  capabilities: { copy: true },
  workbenchMark: { text: "HSL", tone: "accent" },
  labels: {
    empty: "Enter a HEX color to convert it to HSL.",
    ready: "HSL value is ready.",
    running: "Converting HEX to HSL…",
  },
  content: {
    howToUse: [
      "Type or paste a HEX value with or without the leading `#`. Shorthand (`#f0c`) and alpha (`#RRGGBBAA`) both work.",
      "The `hsl()` string updates as you type and is ready to paste straight into CSS.",
      "Once you are in HSL, build a palette by changing one channel at a time — same hue with different lightness gives you a tint and shade ramp.",
      "A HEX with an alpha channel produces `hsla()` with the alpha as the fourth value.",
    ],
    limitations: [
      "Hue, saturation, and lightness are rounded to whole numbers, so a round trip back to HEX can land one step off the original.",
      "Only HEX input is accepted — no `rgb()`, no colour names, no `hsl()`.",
      "Output uses the legacy comma-separated `hsl(H, S%, L%)` syntax, not the modern space-separated form.",
      "HSL lightness is not perceived brightness. Do not use it to judge contrast; use a contrast checker against WCAG thresholds.",
    ],
    faq: [
      {
        q: "Why use HSL at all?",
        a: "It makes colour relationships obvious. Holding hue and saturation fixed while varying lightness gives a coherent tint and shade ramp, which is fiddly to do in HEX.",
      },
      {
        q: "Why did my colour shift slightly after converting back?",
        a: "Rounding. The HSL channels are whole numbers, so some HEX values have no exact HSL representation.",
      },
      {
        q: "Is transparency supported?",
        a: "Yes. An 8-digit or 4-digit HEX produces `hsla()` with the alpha preserved.",
      },
    ],
    examples: [
      { label: "Six-digit HEX", text: "#3366ff" },
      { label: "With alpha", text: "#3366ff80" },
    ],
  },
} as const satisfies ToolSpec;
