import type { ToolSpec } from "../../lib/tool-framework/spec";

export default {
  toolId: "devtools.csv-to-json",
  app: "devtools",
  category: "csv-data-tools",
  keywords: [
    "csv",
    "json",
    "convert",
    "parse",
    "spreadsheet",
    "delimiter",
    "records",
  ],
  name: "CSV to JSON",
  description: "Convert delimited rows to a formatted JSON array.",
  input: {
    kind: "text",
    label: "CSV input",
    placeholder: "name,role,active\nMaya,Engineer,true\nNoah,Designer,false",
    maxLength: 2_000_000,
  },
  settings: {
    fields: {
      delimiter: {
        kind: "select",
        label: "Delimiter",
        help: "Separates fields in the source data.",
        default: ",",
        choices: [
          { label: "Comma", value: "," },
          { label: "Semicolon", value: ";" },
          { label: "Tab", value: "\t" },
          { label: "Pipe", value: "|" },
        ],
      },
    },
  },
  trigger: { mode: "manual", actionLabel: "Convert to JSON" },
  capabilities: { copy: true, download: true },
  layout: "stacked",
  workbenchMark: { text: "C>J" },
  labels: {
    empty: "Paste CSV with a header row to convert it to JSON.",
    ready: "JSON is ready.",
    running: "Converting CSV to JSON…",
  },
  content: {
    howToUse: [
      "Paste CSV or other supported delimited text. The first non-blank row supplies the property names.",
      "Choose the delimiter used by the source, then convert. Quoted fields may contain delimiters, escaped double quotes, and line breaks.",
      "Review the formatted array, check the row and column counts, then copy it or download data.json.",
    ],
    limitations: [
      "Every column needs a non-empty, unique header, and every data row must contain exactly the same number of fields as the header.",
      "Cell values remain strings, including numbers, booleans, dates, and empty values. The converter does not infer data types.",
      "The result is always an array of flat objects. Dotted header names remain literal keys and are not expanded into nested objects.",
      "Blank rows are ignored, header whitespace is trimmed, and input is limited to 2,000,000 characters.",
    ],
    faq: [
      {
        q: "Can quoted fields contain commas or line breaks?",
        a: "Yes. Select the correct delimiter and wrap the field in double quotes. Represent a literal double quote inside it as two double quotes.",
      },
      {
        q: "Why is true written as \"true\" in the JSON?",
        a: "CSV has no standard type metadata, so every cell is preserved as text instead of guessing whether it is a boolean, number, date, or identifier.",
      },
      {
        q: "Does it handle a UTF-8 BOM?",
        a: "Yes. A BOM at the start of the first header is removed.",
      },
      {
        q: "Is the CSV uploaded?",
        a: "No. Conversion runs locally in your browser.",
      },
    ],
    examples: [
      {
        label: "People and roles",
        text: "name,role\nMaya,Engineer\nNoah,Designer",
      },
      {
        label: "Quoted value",
        text: 'name,note\nMaya,"Hello, world"',
      },
    ],
  },
} as const satisfies ToolSpec;
