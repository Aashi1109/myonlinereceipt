import type { ToolSpec } from "../../lib/tool-framework/spec";

/**
 * `maxLength` is the literal 2,000,000 rather than an import of
 * `MAX_JSON_INPUT_CHARS`: this file must load under a plain `fs` walk with no
 * bundler, so it carries type-only imports and nothing else.
 */
export default {
  toolId: "devtools.json-viewer",
  app: "devtools",
  category: "json-tools",
  keywords: [
    "json",
    "viewer",
    "tree",
    "explore",
    "inspect",
    "repair",
    "pretty print",
  ],
  name: "JSON Viewer",
  description:
    "Explore nested JSON in a searchable tree without uploading your data.",
  input: {
    kind: "text",
    label: "JSON input",
    placeholder: '{"name":"CodeUtilityKit","version":2}',
    maxLength: 2_000_000,
  },
  settings: {
    fields: {
      repairMode: {
        kind: "select",
        label: "Repair strategy",
        help: "Used only when Repair & clean is requested.",
        default: "remove",
        choices: [
          { label: "Remove broken properties", value: "remove" },
          { label: "Set broken values to null", value: "null" },
        ],
      },
    },
  },
  trigger: { mode: "live", debounceMs: 120 },
  layout: "source-result",
  capabilities: { copy: true, download: true },
  labels: {
    empty: "Paste JSON or load an example to begin.",
    ready: "Interactive tree ready.",
    running: "Parsing JSON…",
  },
  content: {
    howToUse: [
      "Paste JSON on the left. It parses as you type, so a syntax error is reported with the line and column while you are still looking at it.",
      "Explore the tree on the right — expand and collapse branches to find the shape of a payload without scrolling through a wall of text.",
      "If the input will not parse, choose a repair strategy and run Repair & clean. Removing broken properties drops them; setting them to null keeps the key so the surrounding structure survives.",
      "Copy or download the cleaned JSON once the tree looks right.",
    ],
    limitations: [
      "Input is capped at 2,000,000 characters. Larger documents are rejected rather than allowed to lock up the tab.",
      "Parsing is strict JSON. Comments, trailing commas, and single-quoted strings are errors, though the repair pass can often recover from them.",
      "Numbers go through JavaScript's number type, so integers beyond 2^53 and high-precision decimals lose exactness on the round trip.",
      "Repair is a best-effort structural fix, not a schema validator. Always compare the repaired output against the original before using it.",
    ],
    faq: [
      {
        q: "Is my JSON uploaded anywhere?",
        a: "No. Parsing, repair, and the tree all run in this browser tab. Nothing is sent to a server.",
      },
      {
        q: "Which repair strategy should I pick?",
        a: "Remove when a broken property is noise you can drop. Null when downstream code expects the key to exist and can handle a null.",
      },
      {
        q: "Why does my large integer come back changed?",
        a: "JSON numbers are parsed as IEEE-754 doubles. Anything past 9,007,199,254,740,991 is rounded — transport such values as strings.",
      },
      {
        q: "Does the tree preserve key order?",
        a: "Yes for ordinary string keys. Keys that look like array indices are reordered first, which is a JavaScript object rule rather than a choice made here.",
      },
    ],
    examples: [
      {
        label: "Nested object",
        text: '{"name":"CodeUtilityKit","version":2,"active":true,"tags":["json","viewer"]}',
      },
    ],
  },
} as const satisfies ToolSpec;
