import type { ToolSpec } from "../../lib/tool-framework/spec";

export default {
  toolId: "devtools.csv-validator",
  app: "devtools",
  category: "csv-data-tools",
  keywords: [
    "csv",
    "validate",
    "headers",
    "quoting",
    "rows",
    "lint",
  ],
  name: "CSV Validator",
  description: "Validate CSV quoting, headers, and row widths.",
  input: {
    kind: "text",
    label: "CSV input",
    placeholder: "Enter or paste csv input…",
  },
  settings: {
    fields: {
      delimiter: {
        kind: "select",
        label: "Delimiter",
        default: ",",
        choices: [
          {
            label: "Comma",
            value: ",",
          },
          {
            label: "Semicolon",
            value: ";",
          },
          {
            label: "Tab",
            value: "\t",
          },
          {
            label: "Pipe",
            value: "|",
          },
        ],
      },
    },
  },
  trigger: {
    mode: "manual",
    actionLabel: "Validate CSV",
  },
  layout: "source-result",
  capabilities: {
    copy: true,
  },
  labels: {
    empty: "Paste CSV to check its headers and row widths.",
    ready: "CSV is well formed.",
    running: "Validating CSV…",
  },
  content: {
    howToUse: [
      "Paste the CSV and pick the delimiter it actually uses — a semicolon file checked as comma-separated will look like one giant column.",
      "Validate. The check covers quoting, a non-empty unique header row, and a consistent field count on every row.",
      "A pass reports the column count and the number of data rows, which is a quick sanity check against what you expected to export.",
    ],
    limitations: [
      "Only structure is validated. Column types, value ranges, and required fields are not checked.",
      "The first row is always treated as the header. A headerless file will report its first data row as headers.",
      "Header uniqueness is compared after trimming, so \"name\" and \"name \" count as a duplicate.",
    ],
    faq: [
      {
        q: "What counts as an invalid row?",
        a: "Any row whose field count differs from the header row, or an unterminated quoted field.",
      },
      {
        q: "Does it check for a trailing newline?",
        a: "No. A trailing newline is normal and does not create an extra empty row.",
      },
    ],
    examples: [
      {
        label: "Two columns",
        text: "name,age\nAda,36",
      },
    ],
  },
} as const satisfies ToolSpec;
