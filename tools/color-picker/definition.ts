import type { ToolSpec } from "../../lib/tool-framework/spec";

export default {
  toolId: "devtools.color-picker",
  app: "devtools",
  category: "color-design-tools",
  keywords: [
    "color",
    "picker",
    "hex",
    "rgb",
    "hsl",
    "convert",
    "alpha",
  ],
  name: "Color Picker",
  description: "Show HEX, RGB, and HSL forms for a color.",
  input: {
    kind: "fields",
    label: "HEX Color",
    fields: [
      {
        channel: "text",
        label: "HEX color",
        placeholder: "#2563eb",
        required: true,
        multiline: false,
      },
    ],
  },
  settings: { fields: {} },
  trigger: { mode: "live", debounceMs: 150 },
  capabilities: { copy: true },
  labels: {
    empty: "Enter a HEX color to view its HEX, RGB, and HSL forms.",
    ready: "Color values are ready.",
    running: "Converting HEX color…",
  },
  content: {
    howToUse: [
      "Type or paste a HEX value. The `#` is optional, and `#RGB`, `#RGBA`, `#RRGGBB`, and `#RRGGBBAA` are all accepted.",
      "The three forms update as you type — HEX for design handoff, `rgb()` for canvas and image work, `hsl()` for making a lighter or darker variant by hand.",
      "Include an alpha channel (`#RRGGBBAA`) and the output switches to `rgba()` and `hsla()` automatically.",
      "Copy whichever form your target needs; all three describe exactly the same colour.",
    ],
    limitations: [
      "Input is HEX only. `rgb()`, `hsl()`, and CSS colour names are not accepted here.",
      "HEX output is uppercase and cannot be switched to lowercase.",
      "Hue, saturation, and lightness are rounded to whole numbers, so converting HSL back to HEX may land a step away from where you started.",
      "This is sRGB arithmetic with no colour management — no P3, no OKLCH, and no perceptual lightness. Two colours with the same HSL lightness will not look equally bright.",
      "Alpha is reported to three decimal places.",
    ],
    faq: [
      {
        q: "Can I enter an `rgb()` or a colour name?",
        a: "No — this tool takes HEX. Use the RGB to HEX tool for the other direction.",
      },
      {
        q: "Why is the HSL lightness misleading?",
        a: "HSL lightness is a geometric average of the RGB channels, not perceived brightness. Pure yellow and pure blue are both 50% lightness but look nothing alike.",
      },
      {
        q: "How is transparency handled?",
        a: "An 8-digit (or 4-digit) HEX carries alpha, and the output switches to `rgba()` and `hsla()`. Anything shorter is fully opaque.",
      },
    ],
    examples: [
      { label: "Six-digit HEX", text: "#3366ff" },
      { label: "With alpha", text: "#3366ff80" },
      { label: "Shorthand", text: "#f0c" },
    ],
  },
} as const satisfies ToolSpec;
