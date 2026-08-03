import type { ToolSpec } from "../../lib/tool-framework/spec";

export default {
  toolId: "devtools.random-number-generator",
  app: "devtools",
  category: "developer-generators",
  keywords: [
    "random",
    "number",
    "integer",
    "secure",
    "csprng",
    "range",
    "dice",
  ],
  name: "Random Number Generator",
  description: "Generate cryptographically secure integers in a range.",
  input: { kind: "none" },
  settings: {
    fields: {
      min: {
        kind: "number",
        label: "Min",
        default: 1,
        min: -1_000_000_000,
        max: 1_000_000_000,
      },
      max: {
        kind: "number",
        label: "Max",
        default: 100,
        min: -1_000_000_000,
        max: 1_000_000_000,
      },
      count: { kind: "number", label: "How many", default: 10, min: 1, max: 1000 },
    },
  },
  trigger: { mode: "manual", actionLabel: "Generate" },
  capabilities: { copy: true, download: true },
  workbenchMark: { text: "#?", tone: "accent" },
  labels: {
    empty: "Choose a minimum, maximum, and quantity to generate.",
    ready: "Numbers are ready.",
    running: "Generating…",
  },
  content: {
    howToUse: [
      "Set the minimum and maximum. Both ends are inclusive, and both may be negative.",
      "Choose how many numbers you want, up to 1000. Each is drawn independently, so duplicates are expected and are not a defect.",
      "Generate. Values come from the platform CSPRNG through rejection sampling, so the distribution is uniform with no modulo bias.",
    ],
    limitations: [
      "Integers only, and both bounds must be safe integers — decimals are rejected.",
      "The span between min and max cannot exceed 2^32 values.",
      "Draws are independent, so this cannot produce a shuffle or a sample without replacement.",
    ],
    faq: [
      {
        q: "Is this good enough for a security token?",
        a: "The randomness is, but the shape is not — a numeric range makes a weak secret. Use an API key or random string generator for credentials.",
      },
      {
        q: "Why did the same number appear twice?",
        a: "Each draw is independent. In a range of 100, ten draws collide more often than not — that is what uniform randomness looks like.",
      },
      {
        q: "What does \"no modulo bias\" mean?",
        a: "A naive random % n makes the low values slightly more likely. This generator discards and redraws the values that would cause that skew.",
      },
    ],
  },
} as const satisfies ToolSpec;
