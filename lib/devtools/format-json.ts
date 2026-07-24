import bcrypt from "bcryptjs";
import { dump as dumpYaml, load as loadYaml } from "js-yaml";
import { marked } from "marked";
import md5 from "md5";
import QRCode from "qrcode";

export const MAX_JSON_INPUT_CHARS = 2_000_000;

export type JsonIndentation = 2 | 4 | "tab";
export type JsonTransformMode = "format" | "minify";
export type JsonRepairMode = "remove" | "null" | "off";
export type CsvDelimiter = "," | ";" | "\t" | "|";

export type UtilityOptionDefinition = {
  key: string;
  label: string;
  kind: "select" | "checkbox" | "number" | "text";
  defaultValue: string | number | boolean;
  choices?: readonly { label: string; value: string }[];
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
};

export type UtilityToolDefinition = {
  name: string;
  description: string;
  category: string;
  mode: "single" | "dual" | "generator";
  primaryLabel?: string;
  primaryPlaceholder?: string;
  primaryExample?: string;
  secondaryLabel?: string;
  secondaryPlaceholder?: string;
  secondaryExample?: string;
  options: readonly UtilityOptionDefinition[];
  outputKind: "text" | "html" | "image";
  runLabel: string;
  live: boolean;
};

export type UtilityToolResult = {
  output: string;
  outputKind: "text" | "html" | "image";
  downloadName?: string;
};

type JsonTransformError = {
  kind: "empty" | "syntax" | "too-large";
  message: string;
  line?: number;
  column?: number;
};

export type JsonTransformResult =
  | { ok: true; output: string; value: unknown }
  | { ok: false; error: JsonTransformError };

export type JsonRepairResult =
  | { ok: true; output: string; value: unknown; repaired: boolean }
  | { ok: false; error: JsonTransformError };

type JsonToCsvError = {
  kind: "empty" | "syntax" | "shape" | "too-large" | "configuration";
  message: string;
};

export type JsonToCsvResult =
  | {
      ok: true;
      columns: string[];
      output: string;
      repaired: boolean;
      rowCount: number;
    }
  | { ok: false; error: JsonToCsvError };

export type CsvToJsonResult =
  | { ok: true; columns: string[]; output: string; rowCount: number }
  | { ok: false; error: JsonToCsvError };

export type JsonSummary = {
  arrayCount: number;
  byteSize: number;
  depth: number;
  keyCount: number;
  lineCount: number;
};

export type JsonNodeMetadata = {
  preview: Array<{ key: string; value: string }>;
  selectedKey: string;
  selectedType: string;
};

type TransformOptions = {
  mode: JsonTransformMode;
  indentation: JsonIndentation;
};

function getErrorLocation(message: string, input: string) {
  const lineAndColumn = message.match(/line\s+(\d+)\s+column\s+(\d+)/i);

  if (lineAndColumn) {
    return {
      line: Number(lineAndColumn[1]),
      column: Number(lineAndColumn[2]),
    };
  }

  const position = message.match(/position\s+(\d+)/i);

  if (!position) {
    return undefined;
  }

  const prefix = input.slice(0, Number(position[1]));
  const lines = prefix.split(/\r\n|\r|\n/);

  return {
    line: lines.length,
    column: (lines.at(-1)?.length ?? 0) + 1,
  };
}

export function transformJson(
  input: string,
  { mode, indentation }: TransformOptions,
): JsonTransformResult {
  if (!input.trim()) {
    return {
      ok: false,
      error: {
        kind: "empty",
        message: "Paste JSON or open a .json file to get started.",
      },
    };
  }

  if (input.length > MAX_JSON_INPUT_CHARS) {
    return {
      ok: false,
      error: {
        kind: "too-large",
        message: `JSON must be ${MAX_JSON_INPUT_CHARS.toLocaleString("en-US")} characters or fewer.`,
      },
    };
  }

  try {
    const value: unknown = JSON.parse(input);
    const spacing = indentation === "tab" ? "\t" : indentation;
    const output = JSON.stringify(value, null, mode === "minify" ? 0 : spacing);

    return { ok: true, output, value };
  } catch (error) {
    const location = getErrorLocation(
      error instanceof Error ? error.message : "",
      input,
    );
    const near = location
      ? ` near line ${location.line}, column ${location.column}`
      : "";

    return {
      ok: false,
      error: {
        kind: "syntax",
        message: `JSON isn't valid${near}. Check commas, quotes, and brackets.`,
        ...location,
      },
    };
  }
}

const MISSING_VALUE = "__SMARTTOOLS_MISSING_JSON_VALUE__";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function repairMissingPropertyValues(
  input: string,
): { input: string; repaired: boolean } {
  let repaired = false;
  const nextInput = input.replace(
    /("(?:\\.|[^"\\])*")\s*:\s*(?=[,}])/g,
    (match, key: string) => {
      repaired = true;
      return `${key}:"${MISSING_VALUE}"`;
    },
  );
  return { input: nextInput, repaired };
}

function resolveMissingValues(
  value: unknown,
  repairMode: Exclude<JsonRepairMode, "off">,
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) =>
      item === MISSING_VALUE ? null : resolveMissingValues(item, repairMode),
    );
  }
  if (!isRecord(value)) return value;

  return Object.fromEntries(
    Object.entries(value).flatMap(([key, child]) => {
      if (child === MISSING_VALUE) {
        return repairMode === "remove" ? [] : [[key, null] as const];
      }
      return [[key, resolveMissingValues(child, repairMode)] as const];
    }),
  );
}

function normalizeJsonLikeText(
  input: string,
): { ok: true; output: string; repaired: boolean } | { ok: false } {
  let output = "";
  let repaired = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    const next = input[index + 1];

    if (character === '"') {
      const start = index;
      index += 1;
      while (index < input.length) {
        if (input[index] === "\\") index += 1;
        else if (input[index] === '"') break;
        index += 1;
      }
      if (index >= input.length) return { ok: false };
      output += input.slice(start, index + 1);
      continue;
    }

    if (character === "'") {
      let value = "";
      let closed = false;
      for (index += 1; index < input.length; index += 1) {
        const current = input[index];
        if (current === "'") {
          closed = true;
          break;
        }
        if (current !== "\\") {
          value += current;
          continue;
        }

        const escaped = input[index + 1];
        const escapes: Record<string, string> = {
          b: "\b",
          f: "\f",
          n: "\n",
          r: "\r",
          t: "\t",
        };
        if (escaped === "u" && /^[\da-f]{4}$/i.test(input.slice(index + 2, index + 6))) {
          value += String.fromCharCode(Number.parseInt(input.slice(index + 2, index + 6), 16));
          index += 5;
        } else {
          value += escapes[escaped] ?? escaped;
          index += 1;
        }
      }
      if (!closed) return { ok: false };
      output += JSON.stringify(value);
      repaired = true;
      continue;
    }

    if (character === "/" && next === "/") {
      index += 2;
      while (index < input.length && input[index] !== "\n" && input[index] !== "\r") {
        index += 1;
      }
      output += input[index] ?? "";
      repaired = true;
      continue;
    }

    if (character === "/" && next === "*") {
      const end = input.indexOf("*/", index + 2);
      if (end === -1) return { ok: false };
      output += " ";
      index = end + 1;
      repaired = true;
      continue;
    }

    output += character;
  }

  let normalized = "";
  for (let index = 0; index < output.length; index += 1) {
    const character = output[index];

    if (character === '"') {
      const start = index;
      index += 1;
      while (index < output.length) {
        if (output[index] === "\\") index += 1;
        else if (output[index] === '"') break;
        index += 1;
      }
      if (index >= output.length) return { ok: false };
      normalized += output.slice(start, index + 1);
      continue;
    }

    if (character === ",") {
      let nextIndex = index + 1;
      while (/\s/.test(output[nextIndex] ?? "")) nextIndex += 1;
      if (output[nextIndex] === "}" || output[nextIndex] === "]") {
        normalized += output.slice(index + 1, nextIndex);
        index = nextIndex - 1;
        repaired = true;
        continue;
      }
    }

    normalized += character;
    if (character !== "{" && character !== ",") continue;

    let keyStart = index + 1;
    while (/\s/.test(output[keyStart] ?? "")) keyStart += 1;
    if (!/[A-Za-z_$]/.test(output[keyStart] ?? "")) continue;
    let keyEnd = keyStart + 1;
    while (/[\w$-]/.test(output[keyEnd] ?? "")) keyEnd += 1;
    let colon = keyEnd;
    while (/\s/.test(output[colon] ?? "")) colon += 1;
    if (output[colon] !== ":") continue;

    normalized += output.slice(index + 1, keyStart);
    normalized += JSON.stringify(output.slice(keyStart, keyEnd));
    normalized += output.slice(keyEnd, colon + 1);
    index = colon;
    repaired = true;
  }

  return { ok: true, output: normalized, repaired };
}

export function repairJson(
  input: string,
  repairMode: Exclude<JsonRepairMode, "off">,
): JsonRepairResult {
  if (!input.trim()) {
    return {
      ok: false,
      error: { kind: "empty", message: "Paste JSON to repair it." },
    };
  }
  if (input.length > MAX_JSON_INPUT_CHARS) {
    return {
      ok: false,
      error: {
        kind: "too-large",
        message: `JSON must be ${MAX_JSON_INPUT_CHARS.toLocaleString("en-US")} characters or fewer.`,
      },
    };
  }

  try {
    const value: unknown = JSON.parse(input);
    return { ok: true, output: JSON.stringify(value, null, 2), value, repaired: false };
  } catch {
    const normalized = normalizeJsonLikeText(input);
    if (!normalized.ok) {
      return {
        ok: false,
        error: { kind: "syntax", message: "JSON could not be repaired safely." },
      };
    }

    const missing = repairMissingPropertyValues(normalized.output);
    try {
      const value = resolveMissingValues(JSON.parse(missing.input), repairMode);
      return {
        ok: true,
        output: JSON.stringify(value, null, 2),
        value,
        repaired: normalized.repaired || missing.repaired,
      };
    } catch {
      return {
        ok: false,
        error: { kind: "syntax", message: "JSON could not be repaired safely." },
      };
    }
  }
}

function flattenRecord(
  value: Record<string, unknown>,
  prefix = "",
  flattened: Record<string, unknown> = {},
): Record<string, unknown> {
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (isRecord(child) && Object.keys(child).length) {
      flattenRecord(child, path, flattened);
    } else {
      flattened[path] = child;
    }
  }
  return flattened;
}

function csvCell(value: unknown, delimiter: CsvDelimiter): string {
  if (value === null || value === undefined) return "";
  const text =
    typeof value === "string"
      ? value
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);

  return text.includes(delimiter) || /["\r\n]/.test(text)
    ? `"${text.replaceAll('"', '""')}"`
    : text;
}

export function convertJsonToCsv(
  input: string,
  {
    delimiter = ",",
    repairMode = "remove",
  }: { delimiter?: CsvDelimiter; repairMode?: JsonRepairMode } = {},
): JsonToCsvResult {
  if (!input.trim()) {
    return {
      ok: false,
      error: { kind: "empty", message: "Paste JSON to convert it to CSV." },
    };
  }
  if (input.length > MAX_JSON_INPUT_CHARS) {
    return {
      ok: false,
      error: {
        kind: "too-large",
        message: `JSON must be ${MAX_JSON_INPUT_CHARS.toLocaleString("en-US")} characters or fewer.`,
      },
    };
  }
  if (
    delimiter !== "," &&
    delimiter !== ";" &&
    delimiter !== "\t" &&
    delimiter !== "|"
  ) {
    return {
      ok: false,
      error: { kind: "configuration", message: "Choose a valid CSV delimiter." },
    };
  }

  let value: unknown;
  let repaired = false;
  try {
    value = JSON.parse(input);
  } catch {
    if (repairMode === "off") {
      return {
        ok: false,
        error: { kind: "syntax", message: "JSON is not valid." },
      };
    }
    const repair = repairMissingPropertyValues(input);
    if (!repair.repaired) {
      return {
        ok: false,
        error: { kind: "syntax", message: "JSON is not valid." },
      };
    }
    try {
      value = resolveMissingValues(JSON.parse(repair.input), repairMode);
      repaired = true;
    } catch {
      return {
        ok: false,
        error: { kind: "syntax", message: "JSON could not be repaired safely." },
      };
    }
  }

  const rows = Array.isArray(value) ? value : [value];
  if (!rows.every(isRecord)) {
    return {
      ok: false,
      error: {
        kind: "shape",
        message: "Use a JSON object or an array of JSON objects.",
      },
    };
  }

  const flattenedRows = rows.map((row) => flattenRecord(row));
  const columns = [
    ...new Set(flattenedRows.flatMap((row) => Object.keys(row))),
  ];
  const output = columns.length
    ? [
        columns.map((column) => csvCell(column, delimiter)).join(delimiter),
        ...flattenedRows.map((row) =>
          columns.map((column) => csvCell(row[column], delimiter)).join(delimiter),
        ),
      ].join("\n")
    : "";

  return {
    ok: true,
    columns,
    output,
    repaired,
    rowCount: flattenedRows.length,
  };
}

function parseDelimitedRows(
  input: string,
  delimiter: CsvDelimiter,
): { ok: true; rows: string[][] } | { ok: false; message: string } {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];

    if (quoted) {
      if (character === '"') {
        if (input[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      if (field) return { ok: false, message: "A quoted field must start after a delimiter." };
      quoted = true;
    } else if (character === delimiter) {
      row.push(field);
      field = "";
    } else if (character === "\n" || character === "\r") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      if (character === "\r" && input[index + 1] === "\n") index += 1;
    } else {
      field += character;
    }
  }

  if (quoted) return { ok: false, message: "A quoted CSV field is not closed." };
  row.push(field);
  rows.push(row);
  return { ok: true, rows: rows.filter((values) => values.some(Boolean)) };
}

export function convertCsvToJson(
  input: string,
  { delimiter = "," }: { delimiter?: CsvDelimiter } = {},
): CsvToJsonResult {
  if (!input.trim()) {
    return {
      ok: false,
      error: { kind: "empty", message: "Paste CSV to convert it to JSON." },
    };
  }
  if (input.length > MAX_JSON_INPUT_CHARS) {
    return {
      ok: false,
      error: {
        kind: "too-large",
        message: `CSV must be ${MAX_JSON_INPUT_CHARS.toLocaleString("en-US")} characters or fewer.`,
      },
    };
  }
  if (![",", ";", "\t", "|"].includes(delimiter)) {
    return {
      ok: false,
      error: { kind: "configuration", message: "Choose a valid CSV delimiter." },
    };
  }

  const parsed = parseDelimitedRows(input, delimiter);
  if (!parsed.ok) {
    return { ok: false, error: { kind: "syntax", message: parsed.message } };
  }

  const [headerRow, ...dataRows] = parsed.rows;
  const columns = (headerRow ?? []).map((column, index) =>
    (index === 0 ? column.replace(/^\uFEFF/, "") : column).trim(),
  );
  if (!columns.length || columns.some((column) => !column)) {
    return {
      ok: false,
      error: { kind: "shape", message: "Every CSV column needs a header." },
    };
  }
  if (new Set(columns).size !== columns.length) {
    return {
      ok: false,
      error: { kind: "shape", message: "CSV headers must be unique." },
    };
  }
  if (dataRows.some((values) => values.length !== columns.length)) {
    return {
      ok: false,
      error: {
        kind: "shape",
        message: "Every CSV row must have the same number of fields as the header.",
      },
    };
  }

  const value = dataRows.map((values) =>
    Object.fromEntries(columns.map((column, index) => [column, values[index]])),
  );
  return {
    ok: true,
    columns,
    output: JSON.stringify(value, null, 2),
    rowCount: value.length,
  };
}

export function summarizeJson(value: unknown, output: string): JsonSummary {
  let arrayCount = 0;
  let depth = 0;
  let keyCount = 0;

  function visit(current: unknown, currentDepth: number) {
    if (Array.isArray(current)) {
      arrayCount += 1;
      depth = Math.max(depth, currentDepth);
      current.forEach((child) => visit(child, currentDepth + 1));
      return;
    }

    if (typeof current === "object" && current !== null) {
      depth = Math.max(depth, currentDepth);
      Object.values(current).forEach((child) => {
        keyCount += 1;
        visit(child, currentDepth + 1);
      });
    }
  }

  visit(value, 0);

  return {
    arrayCount,
    byteSize: new TextEncoder().encode(output).length,
    depth,
    keyCount,
    lineCount: output.split("\n").length,
  };
}

function previewJsonNodeValue(value: unknown): string {
  if (Array.isArray(value)) return "[…]";
  if (value !== null && typeof value === "object") return "{…}";
  return JSON.stringify(value) ?? String(value);
}

export function getJsonNodeMetadata(
  selectedKey: string,
  value: unknown,
  previewLimit = 2,
): JsonNodeMetadata {
  const limit = Math.max(0, Math.trunc(previewLimit));
  const preview = Array.isArray(value)
    ? value.slice(0, limit).map((item, index) => ({
        key: String(index),
        value: previewJsonNodeValue(item),
      }))
    : value !== null && typeof value === "object"
      ? Object.entries(value).slice(0, limit).map(([key, item]) => ({
          key,
          value: previewJsonNodeValue(item),
        }))
      : [{ key: "value", value: previewJsonNodeValue(value) }];

  return {
    preview,
    selectedKey,
    selectedType: Array.isArray(value)
      ? `Array [${value.length}]`
      : value === null
        ? "Null"
        : typeof value === "object"
          ? `Object {${Object.keys(value).length}}`
          : typeof value,
  };
}

type DefinitionOverrides = Partial<
  Pick<UtilityToolDefinition, "outputKind" | "runLabel" | "live">
>;

const JSON_CATEGORY = "JSON Tools";
const CSV_CATEGORY = "CSV & Data Tools";
const TEXT_CATEGORY = "Text Tools";
const ENCODING_CATEGORY = "Encoding & Decoding";
const CRYPTO_CATEGORY = "Hashing & Crypto";
const API_CATEGORY = "JWT & API Tools";
const DOCUMENT_CATEGORY = "Web & Markup Tools";
const COLOR_CATEGORY = "Color & Design Tools";
const DATE_CATEGORY = "Date & Time Tools";
const GENERATOR_CATEGORY = "Developer Generators";
const DIAGRAM_CATEGORY = "Diagram Tools";
const SEO_CATEGORY = "SEO & Domain Tools";

function option(
  key: string,
  label: string,
  kind: UtilityOptionDefinition["kind"],
  defaultValue: string | number | boolean,
  details: Omit<
    UtilityOptionDefinition,
    "key" | "label" | "kind" | "defaultValue"
  > = {},
): UtilityOptionDefinition {
  return { key, label, kind, defaultValue, ...details };
}

function singleTool(
  name: string,
  description: string,
  category: string,
  primaryLabel: string,
  primaryExample: string,
  options: readonly UtilityOptionDefinition[] = [],
  overrides: DefinitionOverrides = {},
): UtilityToolDefinition {
  return {
    name,
    description,
    category,
    mode: "single",
    primaryLabel,
    primaryPlaceholder: `Enter or paste ${primaryLabel.toLowerCase()}…`,
    primaryExample,
    options,
    outputKind: "text",
    runLabel: "Run tool",
    live: false,
    ...overrides,
  };
}

function dualTool(
  name: string,
  description: string,
  category: string,
  primaryLabel: string,
  primaryExample: string,
  secondaryLabel: string,
  secondaryExample: string,
  options: readonly UtilityOptionDefinition[] = [],
  overrides: DefinitionOverrides = {},
): UtilityToolDefinition {
  return {
    ...singleTool(
      name,
      description,
      category,
      primaryLabel,
      primaryExample,
      options,
      overrides,
    ),
    mode: "dual",
    secondaryLabel,
    secondaryPlaceholder: `Enter or paste ${secondaryLabel.toLowerCase()}…`,
    secondaryExample,
  };
}

function generatorTool(
  name: string,
  description: string,
  category: string,
  options: readonly UtilityOptionDefinition[],
  overrides: DefinitionOverrides = {},
): UtilityToolDefinition {
  return {
    name,
    description,
    category,
    mode: "generator",
    options,
    outputKind: "text",
    runLabel: "Generate",
    live: false,
    ...overrides,
  };
}

const JSON_REPAIR_OPTION = option("repairMode", "Auto-fix broken JSON", "select", "remove", {
  choices: [
    { label: "Remove broken parts", value: "remove" },
    { label: "Set broken values to null", value: "null" },
    { label: "Off (strict)", value: "off" },
  ],
});
const INDENT_OPTION = option("indent", "Indent", "select", "2", {
  choices: [
    { label: "2 spaces", value: "2" },
    { label: "4 spaces", value: "4" },
  ],
});
const DELIMITER_OPTION = option("delimiter", "Delimiter", "select", ",", {
  choices: [
    { label: "Comma", value: "," },
    { label: "Semicolon", value: ";" },
    { label: "Tab", value: "\t" },
    { label: "Pipe", value: "|" },
  ],
});

export const utilityToolDefinitions: Record<string, UtilityToolDefinition> = {
  "json-validator": singleTool(
    "JSON Validator",
    "Validate JSON syntax and report its root type.",
    JSON_CATEGORY,
    "JSON input",
    '{"valid":true}',
    [],
    { runLabel: "Validate" },
  ),
  "json-to-typescript": singleTool(
    "JSON to TypeScript",
    "Generate TypeScript interfaces from sample JSON.",
    JSON_CATEGORY,
    "JSON input",
    '{"name":"Ada","active":true,"tags":["admin"]}',
    [JSON_REPAIR_OPTION],
    { runLabel: "Generate types" },
  ),
  "json-minifier": singleTool(
    "JSON Minifier",
    "Remove insignificant whitespace from JSON.",
    JSON_CATEGORY,
    "JSON input",
    '{\n  "name": "Ada",\n  "active": true\n}',
    [JSON_REPAIR_OPTION],
    { runLabel: "Minify" },
  ),
  "yaml-to-json": singleTool(
    "YAML to JSON",
    "Convert YAML documents to formatted JSON.",
    JSON_CATEGORY,
    "YAML input",
    "name: Ada\nactive: true",
    [],
    { runLabel: "Convert to JSON" },
  ),
  "json-to-yaml": singleTool(
    "JSON to YAML",
    "Convert JSON values to YAML.",
    JSON_CATEGORY,
    "JSON input",
    '{"name":"Ada","active":true}',
    [JSON_REPAIR_OPTION],
    { runLabel: "Convert to YAML" },
  ),
  "json-diff": dualTool(
    "JSON Diff",
    "Compare two JSON values by path.",
    JSON_CATEGORY,
    "JSON A",
    '{"name":"Ada","active":true}',
    "JSON B",
    '{"name":"Ada","active":false,"role":"admin"}',
    [JSON_REPAIR_OPTION],
    { runLabel: "Compare JSON" },
  ),
  "json-schema-generator": singleTool(
    "JSON Schema Generator",
    "Infer a JSON Schema from sample data.",
    JSON_CATEGORY,
    "Sample JSON",
    '{"id":1,"name":"Ada","tags":["admin"]}',
    [JSON_REPAIR_OPTION],
    { runLabel: "Generate schema" },
  ),
  "json-editor": singleTool(
    "JSON Editor",
    "Repair and consistently format editable JSON.",
    JSON_CATEGORY,
    "JSON input",
    "{ name: 'Ada', active: true, }",
    [JSON_REPAIR_OPTION, INDENT_OPTION],
    { runLabel: "Apply changes", live: true },
  ),
  "xml-to-json": singleTool(
    "XML to JSON",
    "Convert XML elements and attributes to JSON.",
    JSON_CATEGORY,
    "XML input",
    '<user id="1"><name>Ada</name><active>true</active></user>',
    [],
    { runLabel: "Convert to JSON" },
  ),
  "json-path-tester": singleTool(
    "JSON Path Tester",
    "Resolve dot, bracket, index, and wildcard JSON paths.",
    JSON_CATEGORY,
    "JSON input",
    '{"store":{"book":[{"title":"Codex"}]}}',
    [
      JSON_REPAIR_OPTION,
      option("path", "JSONPath", "text", "$.store.book[0].title", {
        placeholder: "$.store.book[0].title",
      }),
    ],
    { runLabel: "Evaluate path" },
  ),
  "json-to-xml": singleTool(
    "JSON to XML",
    "Convert JSON values to XML.",
    JSON_CATEGORY,
    "JSON input",
    '{"user":{"name":"Ada","active":true}}',
    [JSON_REPAIR_OPTION],
    { runLabel: "Convert to XML" },
  ),
  "json-schema-validator": dualTool(
    "JSON Schema Validator",
    "Validate JSON against common JSON Schema constraints.",
    JSON_CATEGORY,
    "JSON data",
    '{"name":"Ada","age":36}',
    "JSON schema",
    '{"type":"object","required":["name"],"properties":{"name":{"type":"string"},"age":{"type":"number"}}}',
    [],
    { runLabel: "Validate against schema" },
  ),
  "json-array-to-table": singleTool(
    "JSON Array to Table",
    "Render an array of JSON objects as an HTML table.",
    JSON_CATEGORY,
    "JSON array",
    '[{"name":"Ada","role":"Admin"},{"name":"Lin","role":"Editor"}]',
    [JSON_REPAIR_OPTION],
    { outputKind: "html", runLabel: "Build table" },
  ),
  "json-escape": singleTool(
    "JSON Escape",
    "Escape a raw string for use inside JSON.",
    JSON_CATEGORY,
    "Raw string",
    'He said "hello".\nNext line.',
    [],
    { runLabel: "Escape" },
  ),
  "json-unescape": singleTool(
    "JSON Unescape",
    "Decode JSON string escape sequences.",
    JSON_CATEGORY,
    "Escaped string",
    'He said \\"hello\\".\\nNext line.',
    [],
    { runLabel: "Unescape" },
  ),
  "json-key-extractor": singleTool(
    "JSON Key Extractor",
    "List every object key path in JSON.",
    JSON_CATEGORY,
    "JSON input",
    '{"user":{"name":"Ada","roles":[{"name":"Admin"}]}}',
    [JSON_REPAIR_OPTION],
    { runLabel: "Extract keys" },
  ),
  "json-sorter": singleTool(
    "JSON Sorter",
    "Sort object keys recursively.",
    JSON_CATEGORY,
    "JSON input",
    '{"z":1,"a":{"d":4,"b":2}}',
    [JSON_REPAIR_OPTION, INDENT_OPTION],
    { runLabel: "Sort keys" },
  ),
  "csv-viewer": singleTool(
    "CSV Viewer",
    "Render delimited data as an HTML table.",
    CSV_CATEGORY,
    "CSV input",
    "name,role\nAda,Admin\nLin,Editor",
    [DELIMITER_OPTION],
    { outputKind: "html", runLabel: "View table", live: true },
  ),
  "csv-to-markdown-table": singleTool(
    "CSV to Markdown Table",
    "Convert CSV rows to a Markdown table.",
    CSV_CATEGORY,
    "CSV input",
    "name,age\nAda,36",
    [DELIMITER_OPTION],
    { runLabel: "Convert to Markdown" },
  ),
  "csv-to-tsv": singleTool(
    "CSV to TSV",
    "Convert comma-separated values to tab-separated values.",
    CSV_CATEGORY,
    "CSV input",
    'name,note\nAda,"Hello, world"',
    [],
    { runLabel: "Convert to TSV" },
  ),
  "tsv-to-csv": singleTool(
    "TSV to CSV",
    "Convert tab-separated values to CSV.",
    CSV_CATEGORY,
    "TSV input",
    "name\tage\nAda\t36",
    [],
    { runLabel: "Convert to CSV" },
  ),
  "csv-formatter": singleTool(
    "CSV Formatter",
    "Normalize CSV quoting and row structure.",
    CSV_CATEGORY,
    "CSV input",
    'name,note\n Ada ,"Hello, world"',
    [DELIMITER_OPTION],
    { runLabel: "Format CSV" },
  ),
  "csv-to-table": singleTool(
    "CSV to Table",
    "Convert CSV to an accessible HTML table.",
    CSV_CATEGORY,
    "CSV input",
    "name,role\nAda,Admin",
    [DELIMITER_OPTION],
    { outputKind: "html", runLabel: "Build table" },
  ),
  "csv-sorter": singleTool(
    "CSV Sorter",
    "Sort CSV rows by a named or numbered column.",
    CSV_CATEGORY,
    "CSV input",
    "name,age\nLin,29\nAda,36",
    [
      DELIMITER_OPTION,
      option("column", "Sort by column", "text", "1"),
      option("order", "Order", "select", "asc", {
        choices: [
          { label: "Ascending", value: "asc" },
          { label: "Descending", value: "desc" },
        ],
      }),
    ],
    { runLabel: "Sort rows" },
  ),
  "csv-validator": singleTool(
    "CSV Validator",
    "Validate CSV quoting, headers, and row widths.",
    CSV_CATEGORY,
    "CSV input",
    "name,age\nAda,36",
    [DELIMITER_OPTION],
    { runLabel: "Validate CSV" },
  ),
  "csv-duplicate-remover": singleTool(
    "CSV Duplicate Row Remover",
    "Remove repeated CSV data rows.",
    CSV_CATEGORY,
    "CSV input",
    "name,age\nAda,36\nLin,29\nAda,36",
    [DELIMITER_OPTION],
    { runLabel: "Remove duplicates" },
  ),
  "csv-filter": singleTool(
    "CSV Filter",
    "Keep rows containing text, optionally in one column.",
    CSV_CATEGORY,
    "CSV input",
    "name,role\nAda,Admin\nLin,Editor",
    [
      DELIMITER_OPTION,
      option("query", "Contains text", "text", "Admin"),
      option("column", "In column (optional)", "text", ""),
    ],
    { runLabel: "Filter rows" },
  ),
  "csv-delimiter-converter": singleTool(
    "CSV Delimiter Converter",
    "Change delimiters without corrupting quoted values.",
    CSV_CATEGORY,
    "Delimited input",
    "name,age\nAda,36",
    [
      option("from", "From", "select", ",", { choices: DELIMITER_OPTION.choices }),
      option("to", "To", "select", ";", { choices: DELIMITER_OPTION.choices }),
    ],
    { runLabel: "Convert delimiter" },
  ),
  "csv-column-extractor": singleTool(
    "CSV Column Extractor",
    "Extract one CSV column by name or one-based number.",
    CSV_CATEGORY,
    "CSV input",
    "name,age\nAda,36\nLin,29",
    [DELIMITER_OPTION, option("column", "Column", "text", "name")],
    { runLabel: "Extract column" },
  ),
  "password-generator": generatorTool(
    "Password Generator",
    "Generate passwords with cryptographically secure randomness.",
    TEXT_CATEGORY,
    [
      option("length", "Length", "number", 16, { min: 4, max: 256 }),
      option("count", "How many", "number", 5, { min: 1, max: 100 }),
      option("upper", "A-Z", "checkbox", true),
      option("lower", "a-z", "checkbox", true),
      option("numbers", "0-9", "checkbox", true),
      option("symbols", "Symbols", "checkbox", true),
    ],
  ),
  "word-counter": singleTool(
    "Word Counter",
    "Count words, characters, sentences, paragraphs, lines, and reading time.",
    TEXT_CATEGORY,
    "Text",
    "Smart tools make repeated work faster. They should remain easy to trust.",
    [],
    { runLabel: "Count", live: true },
  ),
  "character-counter": singleTool(
    "Character Counter",
    "Count characters, bytes, words, and lines.",
    TEXT_CATEGORY,
    "Text",
    "Hello 👋",
    [],
    { runLabel: "Count", live: true },
  ),
  "lorem-ipsum-generator": generatorTool(
    "Lorem Ipsum Generator",
    "Generate placeholder paragraphs.",
    TEXT_CATEGORY,
    [option("paragraphs", "Paragraphs", "number", 3, { min: 1, max: 50 })],
  ),
  "text-diff-checker": dualTool(
    "Text Diff Checker",
    "Compare two texts line by line.",
    TEXT_CATEGORY,
    "Original text",
    "alpha\nbeta\ngamma",
    "Changed text",
    "alpha\nbeta updated\ngamma",
    [],
    { runLabel: "Compare text" },
  ),
  "text-case-converter": singleTool(
    "Text Case Converter",
    "Convert text between common naming and prose cases.",
    TEXT_CATEGORY,
    "Text input",
    "hello smart tools",
    [
      option("target", "Convert to", "select", "title", {
        choices: [
          { label: "UPPERCASE", value: "upper" },
          { label: "lowercase", value: "lower" },
          { label: "Title Case", value: "title" },
          { label: "Sentence case", value: "sentence" },
          { label: "camelCase", value: "camel" },
          { label: "PascalCase", value: "pascal" },
          { label: "snake_case", value: "snake" },
          { label: "kebab-case", value: "kebab" },
          { label: "CONSTANT_CASE", value: "constant" },
        ],
      }),
    ],
    { runLabel: "Convert case", live: true },
  ),
  "slug-generator": singleTool(
    "Slug Generator",
    "Create lowercase URL-safe slugs.",
    TEXT_CATEGORY,
    "Text or titles",
    "Hello, Smart Tools!",
    [],
    { runLabel: "Generate slugs" },
  ),
  "duplicate-line-remover": singleTool(
    "Duplicate Line Remover",
    "Remove repeated lines while preserving order.",
    TEXT_CATEGORY,
    "Text input",
    "Alpha\nBeta\nalpha\nGamma",
    [
      option("ci", "Case-insensitive", "checkbox", false),
      option("trim", "Trim lines", "checkbox", true),
    ],
    { runLabel: "Remove duplicates" },
  ),
  "find-and-replace": singleTool(
    "Find and Replace",
    "Replace literal text or regular-expression matches.",
    TEXT_CATEGORY,
    "Text input",
    "red green red",
    [
      option("find", "Find", "text", "red"),
      option("replace", "Replace", "text", "blue"),
      option("regex", "Regex", "checkbox", false),
      option("ci", "Ignore case", "checkbox", false),
    ],
    { runLabel: "Replace" },
  ),
  "random-string-generator": generatorTool(
    "Random String Generator",
    "Generate random strings from a selected character set.",
    TEXT_CATEGORY,
    [
      option("length", "Length", "number", 24, { min: 1, max: 1024 }),
      option("count", "How many", "number", 5, { min: 1, max: 100 }),
      option("charset", "Character set", "select", "alnum", {
        choices: [
          { label: "Alphanumeric", value: "alnum" },
          { label: "Letters", value: "letters" },
          { label: "Numbers", value: "numbers" },
          { label: "Hex", value: "hex" },
          { label: "All + symbols", value: "all" },
        ],
      }),
    ],
  ),
  "text-sorter": singleTool(
    "Text Sorter",
    "Sort lines ascending or descending.",
    TEXT_CATEGORY,
    "Lines of text",
    "Banana\napple\nCherry",
    [
      option("order", "Order", "select", "asc", {
        choices: [
          { label: "A → Z", value: "asc" },
          { label: "Z → A", value: "desc" },
        ],
      }),
      option("ci", "Case-insensitive", "checkbox", true),
    ],
    { runLabel: "Sort lines" },
  ),
  "whitespace-remover": singleTool(
    "Whitespace Remover",
    "Remove selected kinds of whitespace.",
    TEXT_CATEGORY,
    "Text input",
    "  Hello    smart tools  \n\n  Next line.  ",
    [
      option("mode", "Mode", "select", "extra", {
        choices: [
          { label: "Extra spaces", value: "extra" },
          { label: "All whitespace", value: "all" },
          { label: "Leading", value: "leading" },
          { label: "Trailing", value: "trailing" },
          { label: "Blank lines", value: "blank" },
        ],
      }),
    ],
    { runLabel: "Remove whitespace" },
  ),
  "text-reverser": singleTool(
    "Text Reverser",
    "Reverse characters, words, or lines.",
    TEXT_CATEGORY,
    "Text input",
    "one two three",
    [
      option("mode", "Reverse by", "select", "chars", {
        choices: [
          { label: "Characters", value: "chars" },
          { label: "Words", value: "words" },
          { label: "Lines", value: "lines" },
        ],
      }),
    ],
    { runLabel: "Reverse" },
  ),
  "duplicate-word-remover": singleTool(
    "Duplicate Word Remover",
    "Remove repeated words while preserving first occurrences.",
    TEXT_CATEGORY,
    "Text input",
    "smart tools make tools simple and smart",
    [],
    { runLabel: "Remove duplicates" },
  ),
  "jwt-decoder": singleTool(
    "JWT Decoder",
    "Decode JWT header and payload without verifying the signature.",
    ENCODING_CATEGORY,
    "JWT token",
    "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxMjMiLCJleHAiOjQxMDI0NDQ4MDB9.",
    [],
    { runLabel: "Decode JWT" },
  ),
  "base64-decoder": singleTool(
    "Base64 Decoder",
    "Decode Base64 text as UTF-8.",
    ENCODING_CATEGORY,
    "Base64 input",
    "SGVsbG8g8J+Riw==",
    [],
    { runLabel: "Decode" },
  ),
  "base64-encoder": singleTool(
    "Base64 Encoder",
    "Encode UTF-8 text as Base64.",
    ENCODING_CATEGORY,
    "Text input",
    "Hello 👋",
    [option("urlSafe", "URL-safe", "checkbox", false)],
    { runLabel: "Encode" },
  ),
  "qr-code-generator": singleTool(
    "QR Code Generator",
    "Generate a downloadable QR code PNG.",
    ENCODING_CATEGORY,
    "Text or URL",
    "https://example.com",
    [
      option("size", "Size", "number", 320, { min: 100, max: 1000 }),
      option("errorCorrection", "Error correction", "select", "M", {
        choices: ["L", "M", "Q", "H"].map((value) => ({ label: value, value })),
      }),
      option("dark", "Foreground color", "text", "#111827"),
      option("light", "Background color", "text", "#ffffff"),
    ],
    { outputKind: "image", runLabel: "Generate QR code" },
  ),
  "url-decoder": singleTool(
    "URL Decoder",
    "Decode percent-encoded URL text.",
    ENCODING_CATEGORY,
    "Encoded input",
    "hello%20smart%20tools%3Factive%3Dtrue",
    [],
    { runLabel: "Decode" },
  ),
  "url-encoder": singleTool(
    "URL Encoder",
    "Percent-encode a URL or URL component.",
    ENCODING_CATEGORY,
    "Text or URL",
    "hello smart tools?active=true",
    [option("component", "Encode component", "checkbox", true)],
    { runLabel: "Encode" },
  ),
  "binary-to-text": singleTool(
    "Binary to Text",
    "Decode eight-bit binary bytes as UTF-8.",
    ENCODING_CATEGORY,
    "Binary input",
    "01001000 01101001",
    [],
    { runLabel: "Decode binary" },
  ),
  "html-encoder": singleTool(
    "HTML Encoder",
    "Encode reserved HTML characters as entities.",
    ENCODING_CATEGORY,
    "HTML or text",
    '<button title="Save & close">Save</button>',
    [],
    { runLabel: "Encode entities" },
  ),
  "html-decoder": singleTool(
    "HTML Decoder",
    "Decode named and numeric HTML entities.",
    ENCODING_CATEGORY,
    "Encoded entities",
    "&lt;strong&gt;Tom &amp; Ada&lt;/strong&gt;",
    [],
    { runLabel: "Decode entities" },
  ),
  "text-to-binary": singleTool(
    "Text to Binary",
    "Encode UTF-8 text as binary bytes.",
    ENCODING_CATEGORY,
    "Text input",
    "Hello 👋",
    [],
    { runLabel: "Encode as binary" },
  ),
  "hex-to-text": singleTool(
    "Hex to Text",
    "Decode hexadecimal bytes as UTF-8.",
    ENCODING_CATEGORY,
    "Hex input",
    "48656c6c6f20f09f918b",
    [],
    { runLabel: "Decode hex" },
  ),
  "text-to-hex": singleTool(
    "Text to Hex",
    "Encode UTF-8 text as hexadecimal bytes.",
    ENCODING_CATEGORY,
    "Text input",
    "Hello 👋",
    [],
    { runLabel: "Encode as hex" },
  ),
  "unicode-decoder": singleTool(
    "Unicode Decoder",
    "Decode JavaScript-style Unicode escape sequences.",
    ENCODING_CATEGORY,
    "Unicode escapes",
    "Hello \\u{1F44B}",
    [],
    { runLabel: "Decode Unicode" },
  ),
  "unicode-encoder": singleTool(
    "Unicode Encoder",
    "Encode text as Unicode code-point escapes.",
    ENCODING_CATEGORY,
    "Text input",
    "Hello 👋",
    [],
    { runLabel: "Encode Unicode" },
  ),
  "uuid-generator": generatorTool(
    "UUID Generator",
    "Generate random UUID v4 or time-ordered UUID v7 values.",
    CRYPTO_CATEGORY,
    [
      option("version", "UUID version", "select", "v4", {
        choices: [
          { label: "UUID v4 — random", value: "v4" },
          { label: "UUID v7 — time-ordered", value: "v7" },
        ],
      }),
      option("count", "How many", "number", 5, { min: 1, max: 100 }),
      option("hyphens", "Hyphens", "checkbox", true),
      option("upper", "Uppercase", "checkbox", false),
    ],
  ),
  "bcrypt-generator": singleTool(
    "Bcrypt Hash Generator",
    "Hash a password or text using bcrypt.",
    CRYPTO_CATEGORY,
    "Password or text",
    "correct horse battery staple",
    [option("rounds", "Cost rounds", "number", 4, { min: 4, max: 14 })],
    { runLabel: "Generate bcrypt hash" },
  ),
  "sha256-generator": singleTool(
    "SHA256 Generator",
    "Generate a SHA-256 digest.",
    CRYPTO_CATEGORY,
    "Text input",
    "abc",
    [],
    { runLabel: "Generate SHA-256" },
  ),
  "md5-generator": singleTool(
    "MD5 Generator",
    "Generate a legacy MD5 digest for compatibility checks.",
    CRYPTO_CATEGORY,
    "Text input",
    "abc",
    [],
    { runLabel: "Generate MD5" },
  ),
  "sha1-generator": singleTool(
    "SHA1 Generator",
    "Generate a legacy SHA-1 digest.",
    CRYPTO_CATEGORY,
    "Text input",
    "abc",
    [],
    { runLabel: "Generate SHA-1" },
  ),
  "bcrypt-compare": dualTool(
    "Bcrypt Compare",
    "Check plain text against a bcrypt hash.",
    CRYPTO_CATEGORY,
    "Plain password",
    "password",
    "Bcrypt hash",
    "$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.",
    [],
    { runLabel: "Compare" },
  ),
  "sha512-generator": singleTool(
    "SHA512 Generator",
    "Generate a SHA-512 digest.",
    CRYPTO_CATEGORY,
    "Text input",
    "abc",
    [],
    { runLabel: "Generate SHA-512" },
  ),
  "hmac-generator": singleTool(
    "HMAC Generator",
    "Generate an HMAC signature using a secret key.",
    CRYPTO_CATEGORY,
    "Message",
    "message to sign",
    [
      option("key", "Secret key", "text", "secret"),
      option("algo", "Algorithm", "select", "sha256", {
        choices: [
          { label: "HMAC-SHA1", value: "sha1" },
          { label: "HMAC-SHA256", value: "sha256" },
          { label: "HMAC-SHA512", value: "sha512" },
        ],
      }),
    ],
    { runLabel: "Generate HMAC" },
  ),
  "nanoid-generator": generatorTool(
    "Nano ID Generator",
    "Generate URL-safe random identifiers.",
    CRYPTO_CATEGORY,
    [
      option("count", "How many", "number", 5, { min: 1, max: 100 }),
      option("size", "Size", "number", 21, { min: 1, max: 256 }),
    ],
  ),
  "checksum-generator": singleTool(
    "Checksum Generator",
    "Generate MD5, SHA-1, SHA-256, and SHA-512 text checksums.",
    CRYPTO_CATEGORY,
    "Text input",
    "checksum me",
    [],
    { runLabel: "Generate checksums" },
  ),
  "hash-compare": dualTool(
    "Hash Compare",
    "Compare two hashes without early exit.",
    CRYPTO_CATEGORY,
    "Value A",
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    "Value B",
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    [],
    { runLabel: "Compare hashes" },
  ),
  "http-status-codes": singleTool(
    "HTTP Status Code Lookup",
    "Look up common HTTP status codes by code or phrase.",
    API_CATEGORY,
    "Status code or phrase",
    "404",
    [],
    { runLabel: "Look up status", live: true },
  ),
  "utm-builder": generatorTool(
    "UTM Builder",
    "Build a URL with UTM campaign parameters.",
    API_CATEGORY,
    [
      option("url", "Destination URL", "text", "https://example.com"),
      option("source", "utm_source", "text", "newsletter"),
      option("medium", "utm_medium", "text", "email"),
      option("campaign", "utm_campaign", "text", "launch"),
      option("term", "utm_term", "text", ""),
      option("content", "utm_content", "text", ""),
    ],
    { runLabel: "Build URL" },
  ),
  "curl-to-fetch": singleTool(
    "cURL to Fetch",
    "Convert a common cURL request to browser fetch code.",
    API_CATEGORY,
    "cURL command",
    "curl -X POST https://api.example.com/users -H 'Content-Type: application/json' -d '{\"name\":\"Ada\"}'",
    [],
    { runLabel: "Convert to fetch" },
  ),
  "curl-to-axios": singleTool(
    "cURL to Axios",
    "Convert a common cURL request to Axios code.",
    API_CATEGORY,
    "cURL command",
    "curl https://api.example.com/users -H 'Authorization: Bearer token'",
    [],
    { runLabel: "Convert to Axios" },
  ),
  "basic-auth-generator": dualTool(
    "Basic Auth Generator",
    "Generate an HTTP Basic Authorization header.",
    API_CATEGORY,
    "Username",
    "Ada",
    "Password",
    "secret",
    [],
    { runLabel: "Generate header" },
  ),
  "jwt-expiration-checker": singleTool(
    "JWT Expiration Checker",
    "Inspect issued-at, not-before, and expiration claims.",
    API_CATEGORY,
    "JWT token",
    "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxMjMiLCJleHAiOjQxMDI0NDQ4MDB9.",
    [],
    { runLabel: "Check expiration" },
  ),
  "url-query-parser": singleTool(
    "URL Query Parser",
    "Parse URL query parameters into JSON.",
    API_CATEGORY,
    "URL or query string",
    "https://example.com/search?q=smart+tools&tag=dev&tag=web",
    [],
    { runLabel: "Parse query" },
  ),
  "url-query-builder": dualTool(
    "URL Query Builder",
    "Append key/value query rows to a base URL.",
    API_CATEGORY,
    "Base URL",
    "https://example.com/search",
    "Query rows",
    "q=smart tools\ntag=dev\ntag=web",
    [],
    { runLabel: "Build URL" },
  ),
  "bearer-token-parser": singleTool(
    "Bearer Token Parser",
    "Extract a Bearer token and decode it when it is a JWT.",
    API_CATEGORY,
    "Authorization header or token",
    "Bearer eyJhbGciOiJub25lIn0.eyJzdWIiOiIxMjMifQ.",
    [],
    { runLabel: "Parse token" },
  ),
  "markdown-to-html": singleTool(
    "Markdown to HTML",
    "Convert Markdown source to HTML.",
    DOCUMENT_CATEGORY,
    "Markdown input",
    "# Hello\n\n**Smart tools** stay focused.",
    [],
    { outputKind: "html", runLabel: "Convert to HTML" },
  ),
  "javascript-formatter": singleTool(
    "JavaScript Formatter",
    "Apply readable indentation to JavaScript source.",
    DOCUMENT_CATEGORY,
    "JavaScript input",
    "function greet(name){if(name){return `Hello ${name}`;}return 'Hello';}",
    [],
    { runLabel: "Format JavaScript" },
  ),
  "css-formatter": singleTool(
    "CSS Formatter",
    "Apply readable indentation to CSS.",
    DOCUMENT_CATEGORY,
    "CSS input",
    "body{color:#111;background:#fff}a:hover{text-decoration:underline}",
    [],
    { runLabel: "Format CSS" },
  ),
  "html-formatter": singleTool(
    "HTML Formatter",
    "Apply readable indentation to HTML.",
    DOCUMENT_CATEGORY,
    "HTML input",
    "<main><h1>Hello</h1><p>Smart tools</p></main>",
    [],
    { runLabel: "Format HTML" },
  ),
  "javascript-minifier": singleTool(
    "JavaScript Minifier",
    "Remove comments and safe redundant whitespace from JavaScript.",
    DOCUMENT_CATEGORY,
    "JavaScript input",
    "// greeting\nfunction greet(name) { return 'Hello ' + name; }",
    [],
    { runLabel: "Minify JavaScript" },
  ),
  "css-minifier": singleTool(
    "CSS Minifier",
    "Remove CSS comments and redundant whitespace.",
    DOCUMENT_CATEGORY,
    "CSS input",
    "/* theme */\nbody { color: #111; background: #fff; }",
    [],
    { runLabel: "Minify CSS" },
  ),
  "markdown-previewer": singleTool(
    "Markdown Previewer",
    "Render Markdown for a sandboxed preview.",
    DOCUMENT_CATEGORY,
    "Markdown",
    "# Preview\n\n- Fast\n- Private",
    [],
    { outputKind: "html", runLabel: "Preview Markdown", live: true },
  ),
  "html-viewer": singleTool(
    "HTML Viewer",
    "Return HTML for display inside a sandboxed preview.",
    DOCUMENT_CATEGORY,
    "HTML source",
    "<article><h1>Hello</h1><p>Sandboxed preview.</p></article>",
    [],
    { outputKind: "html", runLabel: "Preview HTML", live: true },
  ),
  "hex-to-rgb": singleTool(
    "HEX to RGB",
    "Convert HEX colors to RGB or RGBA.",
    COLOR_CATEGORY,
    "HEX color",
    "#3366ff",
    [],
    { runLabel: "Convert to RGB", live: true },
  ),
  "rgb-to-hex": singleTool(
    "RGB to HEX",
    "Convert RGB or RGBA colors to HEX.",
    COLOR_CATEGORY,
    "RGB color",
    "rgb(51, 102, 255)",
    [],
    { runLabel: "Convert to HEX", live: true },
  ),
  "color-picker": singleTool(
    "Color Picker",
    "Show HEX, RGB, and HSL forms for a color.",
    COLOR_CATEGORY,
    "HEX color",
    "#3366ff",
    [],
    { runLabel: "Convert color", live: true },
  ),
  "gradient-generator": dualTool(
    "Gradient Generator",
    "Generate linear or radial CSS gradients.",
    COLOR_CATEGORY,
    "Start color",
    "#2563eb",
    "End color",
    "#7c3aed",
    [
      option("type", "Type", "select", "linear", {
        choices: [
          { label: "Linear", value: "linear" },
          { label: "Radial", value: "radial" },
        ],
      }),
      option("angle", "Angle", "number", 135, { min: 0, max: 360 }),
    ],
    { runLabel: "Generate gradient", live: true },
  ),
  "css-box-shadow": singleTool(
    "CSS Box Shadow Generator",
    "Generate a CSS box-shadow declaration.",
    COLOR_CATEGORY,
    "Shadow color",
    "#0f172a",
    [
      option("x", "X offset", "number", 0, { min: -100, max: 100 }),
      option("y", "Y offset", "number", 12, { min: -100, max: 100 }),
      option("blur", "Blur", "number", 30, { min: 0, max: 200 }),
      option("spread", "Spread", "number", -8, { min: -100, max: 100 }),
      option("inset", "Inset", "checkbox", false),
    ],
    { runLabel: "Generate shadow", live: true },
  ),
  "border-radius-generator": generatorTool(
    "Border Radius Generator",
    "Generate four-corner border-radius CSS.",
    COLOR_CATEGORY,
    [
      option("topLeft", "Top-left", "number", 16, { min: 0, max: 500 }),
      option("topRight", "Top-right", "number", 16, { min: 0, max: 500 }),
      option("bottomRight", "Bottom-right", "number", 16, { min: 0, max: 500 }),
      option("bottomLeft", "Bottom-left", "number", 16, { min: 0, max: 500 }),
    ],
    { runLabel: "Generate radius", live: true },
  ),
  "css-unit-converter": singleTool(
    "CSS Unit Converter",
    "Convert px, rem, em, pt, and percentage values.",
    COLOR_CATEGORY,
    "Value",
    "32",
    [
      option("from", "From", "select", "px", {
        choices: ["px", "rem", "em", "pt", "%"].map((value) => ({ label: value, value })),
      }),
      option("to", "To", "select", "rem", {
        choices: ["px", "rem", "em", "pt", "%"].map((value) => ({ label: value, value })),
      }),
      option("base", "Base (px)", "number", 16, { min: 0.01, max: 10000 }),
    ],
    { runLabel: "Convert units", live: true },
  ),
  "hex-to-hsl": singleTool(
    "HEX to HSL",
    "Convert HEX colors to HSL.",
    COLOR_CATEGORY,
    "HEX color",
    "#3366ff",
    [],
    { runLabel: "Convert to HSL", live: true },
  ),
  "timestamp-converter": singleTool(
    "Timestamp Converter",
    "Convert Unix timestamps or date text to standard formats.",
    DATE_CATEGORY,
    "Unix timestamp or date",
    "1704067200",
    [],
    { runLabel: "Convert timestamp", live: true },
  ),
  "date-difference": dualTool(
    "Date Difference Calculator",
    "Calculate elapsed time between two dates.",
    DATE_CATEGORY,
    "Start date",
    "2026-01-01T00:00:00Z",
    "End date",
    "2026-01-03T00:00:00Z",
    [],
    { runLabel: "Calculate difference", live: true },
  ),
  "cron-builder": dualTool(
    "Cron Expression Builder",
    "Build a standard five-field cron expression.",
    DATE_CATEGORY,
    "Minute",
    "0",
    "Hour",
    "9",
    [
      option("dayOfMonth", "Day of month", "text", "*"),
      option("month", "Month", "text", "*"),
      option("dayOfWeek", "Day of week", "text", "1-5"),
    ],
    { runLabel: "Build cron", live: true },
  ),
  "cron-parser": singleTool(
    "Cron Expression Parser",
    "Validate and explain a five-field cron expression.",
    DATE_CATEGORY,
    "Cron expression",
    "0 9 * * 1-5",
    [],
    { runLabel: "Parse cron" },
  ),
  "iso-date-converter": singleTool(
    "ISO Date Converter",
    "Normalize date input and show ISO, UTC, local, and Unix values.",
    DATE_CATEGORY,
    "Date input",
    "2026-07-22T12:30:00+05:30",
    [],
    { runLabel: "Convert date", live: true },
  ),
  "regex-tester": dualTool(
    "Regex Tester",
    "Test a JavaScript regular expression and list matches.",
    GENERATOR_CATEGORY,
    "Regex pattern",
    "\\b[A-Z][a-z]+\\b",
    "Test string",
    "Ada and Lin build Smart Tools.",
    [option("flags", "Flags", "text", "g")],
    { runLabel: "Test regex", live: true },
  ),
  "random-number-generator": generatorTool(
    "Random Number Generator",
    "Generate cryptographically secure integers in a range.",
    GENERATOR_CATEGORY,
    [
      option("min", "Min", "number", 1, { min: -1_000_000_000, max: 1_000_000_000 }),
      option("max", "Max", "number", 100, { min: -1_000_000_000, max: 1_000_000_000 }),
      option("count", "How many", "number", 10, { min: 1, max: 1000 }),
    ],
  ),
  "meta-tag-generator": dualTool(
    "Meta Tag Generator",
    "Generate common search and social meta tags.",
    GENERATOR_CATEGORY,
    "Page title",
    "Smart Tools",
    "Meta description",
    "Fast private utilities for everyday work.",
    [
      option("keywords", "Keywords", "text", "developer tools, utilities"),
      option("author", "Author", "text", "SmartTools"),
      option("canonical", "Canonical URL", "text", "https://example.com/tools"),
      option("image", "Open Graph image URL", "text", "https://example.com/og.png"),
    ],
    { runLabel: "Generate meta tags" },
  ),
  "open-graph-preview": dualTool(
    "Open Graph Preview",
    "Generate Open Graph tags and a sandboxable preview card.",
    GENERATOR_CATEGORY,
    "Title",
    "Smart Tools",
    "Description",
    "Fast private utilities for everyday work.",
    [
      option("url", "URL", "text", "https://example.com/tools"),
      option("siteName", "Site name", "text", "SmartTools"),
      option("image", "Image URL", "text", "https://example.com/og.png"),
    ],
    { outputKind: "html", runLabel: "Build preview", live: true },
  ),
  "robots-txt-generator": singleTool(
    "Robots.txt Generator",
    "Generate robots.txt directives and an optional sitemap line.",
    GENERATOR_CATEGORY,
    "Disallow paths",
    "/admin\n/private",
    [
      option("allowAll", "Allow all", "checkbox", false),
      option("sitemap", "Sitemap URL", "text", "https://example.com/sitemap.xml"),
      option("crawlDelay", "Crawl delay", "number", 0, { min: 0, max: 86400 }),
    ],
    { runLabel: "Generate robots.txt" },
  ),
  "api-key-generator": generatorTool(
    "API Key Generator",
    "Generate prefixed cryptographically secure API keys.",
    GENERATOR_CATEGORY,
    [
      option("prefix", "Prefix", "text", "sk"),
      option("length", "Length", "number", 32, { min: 8, max: 256 }),
      option("count", "How many", "number", 3, { min: 1, max: 100 }),
    ],
  ),
  "regex-generator": generatorTool(
    "Regex Generator",
    "Generate common regular-expression patterns.",
    GENERATOR_CATEGORY,
    [
      option("preset", "Pattern preset", "select", "email", {
        choices: [
          { label: "Email", value: "email" },
          { label: "URL", value: "url" },
          { label: "IPv4", value: "ipv4" },
          { label: "UUID", value: "uuid" },
          { label: "Hex color", value: "hex-color" },
          { label: "Strong password", value: "password" },
        ],
      }),
      option("language", "Language", "select", "javascript", {
        choices: [
          { label: "JavaScript", value: "javascript" },
          { label: "Python", value: "python" },
          { label: "PHP", value: "php" },
        ],
      }),
    ],
  ),
  "sitemap-generator": singleTool(
    "Sitemap Generator",
    "Generate an XML sitemap from one URL per line.",
    GENERATOR_CATEGORY,
    "URLs",
    "https://example.com/\nhttps://example.com/about",
    [],
    { runLabel: "Generate sitemap" },
  ),
  "diagram-generator": singleTool(
    "Diagram Generator",
    "Render Mermaid diagram code in the browser.",
    DIAGRAM_CATEGORY,
    "Mermaid diagram code",
    "flowchart LR\n  A[Input] --> B[Transform] --> C[Output]",
    [],
    { outputKind: "html", runLabel: "Render diagram", live: true },
  ),
  "domain-rating-checker": singleTool(
    "Domain Rating Checker",
    "Query a configured provider for domain-rating data.",
    SEO_CATEGORY,
    "Domain",
    "example.com",
    [],
    { runLabel: "Check domain rating" },
  ),
  "domain-age-checker": singleTool(
    "Domain Age & WHOIS Checker",
    "Query public RDAP data for domain registration details.",
    SEO_CATEGORY,
    "Domain",
    "example.com",
    [],
    { runLabel: "Check domain age" },
  ),
  "dns-checker": singleTool(
    "DNS & Email Records Checker",
    "Query public DNS-over-HTTPS records.",
    SEO_CATEGORY,
    "Domain",
    "example.com",
    [option("types", "Record types", "text", "A,AAAA,MX,TXT,NS,CNAME")],
    { runLabel: "Check DNS" },
  ),
};

export async function runUtilityTool(
  componentKey: string,
  primary: string,
  secondary: string,
  options: Record<string, string | number | boolean>,
): Promise<UtilityToolResult> {
  const definition = utilityToolDefinitions[componentKey];
  if (!definition) throw new Error(`Unknown utility: ${componentKey}`);

  return executeUtilityTool(componentKey, primary, secondary, options, definition);
}

async function executeUtilityTool(
  componentKey: string,
  primary: string,
  secondary: string,
  options: Record<string, string | number | boolean>,
  definition: UtilityToolDefinition,
): Promise<UtilityToolResult> {
  if (primary.length > MAX_JSON_INPUT_CHARS || secondary.length > MAX_JSON_INPUT_CHARS) {
    throw new Error(`Input must be ${MAX_JSON_INPUT_CHARS.toLocaleString("en-US")} characters or fewer.`);
  }
  const resolved = normalizeUtilityOptions(definition, options);
  const done = (output: string, downloadName?: string) =>
    utilityResult(definition, output, downloadName);

  switch (componentKey) {
    case "json-validator": {
      const value = parseStrictJson(primary, "JSON input");
      return done(`Valid JSON\nRoot type: ${jsonType(value)}`);
    }
    case "json-to-typescript":
      return done(jsonToTypeScript(parseUtilityJson(primary, resolved)));
    case "json-minifier":
      return done(JSON.stringify(parseUtilityJson(primary, resolved)));
    case "yaml-to-json": {
      requireUtilityInput(primary, "YAML input");
      try {
        return done(JSON.stringify(loadYaml(primary), null, 2));
      } catch (error) {
        throw new Error(`YAML is invalid: ${error instanceof Error ? error.message : "unknown error"}`);
      }
    }
    case "json-to-yaml":
      return done(dumpYaml(parseUtilityJson(primary, resolved), { noRefs: true, sortKeys: false }));
    case "json-diff": {
      const differences = diffJson(
        parseUtilityJson(primary, resolved, "JSON A"),
        parseUtilityJson(secondary, resolved, "JSON B"),
      );
      return done(differences.length ? differences.join("\n") : "No differences.");
    }
    case "json-schema-generator":
      return done(JSON.stringify(inferJsonSchema(parseUtilityJson(primary, resolved)), null, 2));
    case "json-editor": {
      const indentation = stringOption(resolved, "indent") === "4" ? 4 : 2;
      return done(JSON.stringify(parseUtilityJson(primary, resolved), null, indentation));
    }
    case "xml-to-json":
      return done(JSON.stringify(xmlToJson(requireUtilityInput(primary, "XML input")), null, 2));
    case "json-path-tester":
      return done(
        JSON.stringify(
          resolveJsonPath(parseUtilityJson(primary, resolved), stringOption(resolved, "path")),
          null,
          2,
        ),
      );
    case "json-to-xml":
      return done(`<?xml version="1.0" encoding="UTF-8"?>\n${jsonToXml(parseUtilityJson(primary, resolved))}`);
    case "json-schema-validator": {
      const errors = validateJsonSchema(
        parseStrictJson(primary, "JSON data"),
        parseStrictJson(secondary, "JSON schema"),
      );
      return done(errors.length ? `Invalid\n${errors.map((error) => `- ${error}`).join("\n")}` : "Valid against schema.");
    }
    case "json-array-to-table": {
      const value = parseUtilityJson(primary, resolved);
      if (!Array.isArray(value) || !value.every(isRecord)) {
        throw new Error("JSON input must be an array of objects.");
      }
      const rows = value.map((row) => flattenRecord(row));
      const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
      if (!columns.length) throw new Error("JSON array objects need at least one field.");
      return done(
        tableToHtml([
          columns,
          ...rows.map((row) => columns.map((column) => String(row[column] ?? ""))),
        ]),
      );
    }
    case "json-escape":
      return done(JSON.stringify(primary).slice(1, -1));
    case "json-unescape":
      try {
        return done(JSON.parse(`"${primary}"`) as string);
      } catch {
        throw new Error("Escaped string is not valid JSON string content.");
      }
    case "json-key-extractor":
      return done(collectJsonKeys(parseUtilityJson(primary, resolved)).join("\n"));
    case "json-sorter": {
      const indentation = stringOption(resolved, "indent") === "4" ? 4 : 2;
      return done(JSON.stringify(sortJsonKeys(parseUtilityJson(primary, resolved)), null, indentation));
    }
    case "csv-viewer":
    case "csv-to-table": {
      const delimiter = utilityDelimiter(stringOption(resolved, "delimiter"));
      return done(tableToHtml(parseUtilityTable(primary, delimiter)));
    }
    case "csv-to-markdown-table": {
      const rows = parseUtilityTable(primary, utilityDelimiter(stringOption(resolved, "delimiter")));
      const markdownCell = (cell: string) => cell.replaceAll("\\", "\\\\").replaceAll("|", "\\|").replace(/\r?\n/g, "<br>");
      return done([
        `| ${rows[0].map(markdownCell).join(" | ")} |`,
        `| ${rows[0].map(() => "---").join(" | ")} |`,
        ...rows.slice(1).map((row) => `| ${row.map(markdownCell).join(" | ")} |`),
      ].join("\n"));
    }
    case "csv-to-tsv":
      return done(serializeTable(parseUtilityTable(primary, ","), "\t"));
    case "tsv-to-csv":
      return done(serializeTable(parseUtilityTable(primary, "\t"), ","));
    case "csv-formatter": {
      const delimiter = utilityDelimiter(stringOption(resolved, "delimiter"));
      const rows = parseUtilityTable(primary, delimiter).map((row) => row.map((cell) => cell.trim()));
      return done(serializeTable(rows, delimiter));
    }
    case "csv-sorter": {
      const delimiter = utilityDelimiter(stringOption(resolved, "delimiter"));
      const [header, ...rows] = parseUtilityTable(primary, delimiter);
      const requested = stringOption(resolved, "column").trim();
      const column = /^\d+$/.test(requested) ? Number(requested) - 1 : header.indexOf(requested);
      if (column < 0 || column >= header.length) throw new Error("Sort column was not found.");
      const direction = stringOption(resolved, "order") === "desc" ? -1 : 1;
      rows.sort((left, right) =>
        left[column].localeCompare(right[column], undefined, { numeric: true, sensitivity: "base" }) * direction,
      );
      return done(serializeTable([header, ...rows], delimiter));
    }
    case "csv-validator": {
      const rows = parseUtilityTable(primary, utilityDelimiter(stringOption(resolved, "delimiter")));
      const headers = rows[0].map((header) => header.trim());
      if (headers.some((header) => !header)) throw new Error("Every CSV column needs a header.");
      if (new Set(headers).size !== headers.length) throw new Error("CSV headers must be unique.");
      return done(`Valid CSV\nColumns: ${headers.length}\nData rows: ${rows.length - 1}`);
    }
    case "csv-duplicate-remover": {
      const delimiter = utilityDelimiter(stringOption(resolved, "delimiter"));
      const [header, ...rows] = parseUtilityTable(primary, delimiter);
      const seen = new Set<string>();
      const unique = rows.filter((row) => {
        const key = JSON.stringify(row);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return done(serializeTable([header, ...unique], delimiter));
    }
    case "csv-filter": {
      const delimiter = utilityDelimiter(stringOption(resolved, "delimiter"));
      const [header, ...rows] = parseUtilityTable(primary, delimiter);
      const query = stringOption(resolved, "query").toLocaleLowerCase();
      if (!query) throw new Error("Filter text is required.");
      const requested = stringOption(resolved, "column").trim();
      const column = requested
        ? /^\d+$/.test(requested)
          ? Number(requested) - 1
          : header.indexOf(requested)
        : -1;
      if (requested && (column < 0 || column >= header.length)) throw new Error("Filter column was not found.");
      const filtered = rows.filter((row) =>
        (column >= 0 ? [row[column]] : row).some((cell) => cell.toLocaleLowerCase().includes(query)),
      );
      return done(serializeTable([header, ...filtered], delimiter));
    }
    case "csv-delimiter-converter": {
      const from = utilityDelimiter(stringOption(resolved, "from"));
      const to = utilityDelimiter(stringOption(resolved, "to"));
      if (from === to) throw new Error("Choose different source and target delimiters.");
      return done(serializeTable(parseUtilityTable(primary, from), to));
    }
    case "csv-column-extractor": {
      const delimiter = utilityDelimiter(stringOption(resolved, "delimiter"));
      const rows = parseUtilityTable(primary, delimiter);
      const requested = stringOption(resolved, "column").trim();
      const column = /^\d+$/.test(requested) ? Number(requested) - 1 : rows[0].indexOf(requested);
      if (column < 0 || column >= rows[0].length) throw new Error("Column was not found.");
      return done(rows.map((row) => csvCell(row[column], delimiter)).join("\n"));
    }
    case "password-generator": {
      const alphabet = [
        booleanOption(resolved, "upper") ? "ABCDEFGHIJKLMNOPQRSTUVWXYZ" : "",
        booleanOption(resolved, "lower") ? "abcdefghijklmnopqrstuvwxyz" : "",
        booleanOption(resolved, "numbers") ? "0123456789" : "",
        booleanOption(resolved, "symbols") ? "!@#$%^&*()-_=+[]{}" : "",
      ].join("");
      return done(
        Array.from({ length: numberOption(resolved, "count") }, () =>
          randomString(numberOption(resolved, "length"), alphabet),
        ).join("\n"),
      );
    }
    case "word-counter": {
      const metrics = textMetrics(primary);
      const minutes = metrics.words ? Math.max(1, Math.ceil(metrics.words / 200)) : 0;
      return done(
        `Words: ${metrics.words}\nCharacters: ${metrics.characters}\nCharacters without spaces: ${metrics.charactersWithoutSpaces}\nSentences: ${metrics.sentences}\nParagraphs: ${metrics.paragraphs}\nLines: ${metrics.lines}\nReading time: ${minutes} minute${minutes === 1 ? "" : "s"}`,
      );
    }
    case "character-counter": {
      const metrics = textMetrics(primary);
      return done(
        `Characters: ${metrics.characters}\nCharacters without spaces: ${metrics.charactersWithoutSpaces}\nWords: ${metrics.words}\nLines: ${metrics.lines}\nUTF-8 bytes: ${metrics.bytes}`,
      );
    }
    case "lorem-ipsum-generator":
      return done(
        Array.from({ length: numberOption(resolved, "paragraphs") }, (_, index) =>
          Array.from({ length: 3 }, (__, offset) => LOREM_SENTENCES[(index + offset) % LOREM_SENTENCES.length]).join(" "),
        ).join("\n\n"),
      );
    case "text-diff-checker":
      return done(textDiff(primary, secondary));
    case "text-case-converter":
      return done(convertTextCase(primary, stringOption(resolved, "target")));
    case "slug-generator":
      return done(
        primary
          .split(/\r\n|\r|\n/)
          .map((line) => words(line).map((word) => word.toLocaleLowerCase()).join("-"))
          .filter(Boolean)
          .join("\n"),
      );
    case "duplicate-line-remover": {
      const seen = new Set<string>();
      const trim = booleanOption(resolved, "trim");
      const insensitive = booleanOption(resolved, "ci");
      return done(
        primary
          .split(/\r\n|\r|\n/)
          .map((line) => (trim ? line.trim() : line))
          .filter((line) => {
            const key = insensitive ? line.toLocaleLowerCase() : line;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          })
          .join("\n"),
      );
    }
    case "find-and-replace": {
      const find = stringOption(resolved, "find");
      if (!find) throw new Error("Find text is required.");
      const replacement = stringOption(resolved, "replace");
      if (booleanOption(resolved, "regex")) {
        try {
          return done(primary.replace(new RegExp(find, booleanOption(resolved, "ci") ? "giu" : "gu"), replacement));
        } catch {
          throw new Error("Find pattern is not a valid regular expression.");
        }
      }
      return done(
        booleanOption(resolved, "ci")
          ? primary.replace(new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "giu"), replacement)
          : primary.replaceAll(find, replacement),
      );
    }
    case "random-string-generator": {
      const alphabets: Record<string, string> = {
        alnum: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
        letters: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
        numbers: "0123456789",
        hex: "0123456789abcdef",
        all: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+",
      };
      const alphabet = alphabets[stringOption(resolved, "charset")];
      return done(
        Array.from({ length: numberOption(resolved, "count") }, () =>
          randomString(numberOption(resolved, "length"), alphabet),
        ).join("\n"),
      );
    }
    case "text-sorter": {
      const sensitivity = booleanOption(resolved, "ci") ? "base" : "variant";
      const direction = stringOption(resolved, "order") === "desc" ? -1 : 1;
      return done(
        primary
          .split(/\r\n|\r|\n/)
          .sort((left, right) => left.localeCompare(right, undefined, { sensitivity }) * direction)
          .join("\n"),
      );
    }
    case "whitespace-remover": {
      const mode = stringOption(resolved, "mode");
      const output =
        mode === "all"
          ? primary.replace(/\s/gu, "")
          : mode === "leading"
            ? primary.replace(/^\s+/gmu, "")
            : mode === "trailing"
              ? primary.replace(/\s+$/gmu, "")
              : mode === "blank"
                ? primary.replace(/^(?:\s*\r?\n)+/gmu, "")
                : primary.replace(/[ \t]+/g, " ").replace(/^ | $/gmu, "");
      return done(output);
    }
    case "text-reverser": {
      const mode = stringOption(resolved, "mode");
      return done(
        mode === "words"
          ? primary.trim().split(/\s+/u).reverse().join(" ")
          : mode === "lines"
            ? primary.split(/\r\n|\r|\n/u).reverse().join("\n")
            : Array.from(primary).reverse().join(""),
      );
    }
    case "duplicate-word-remover": {
      const seen = new Set<string>();
      return done(
        primary
          .split(/(\s+)/u)
          .filter((part) => {
            if (/^\s+$/u.test(part)) return true;
            const key = part.toLocaleLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          })
          .join("")
          .replace(/\s{2,}/g, " "),
      );
    }
    case "jwt-decoder": {
      const decoded = decodeJwt(primary);
      const timestamps = Object.fromEntries(
        ["iat", "nbf", "exp"].flatMap((key) =>
          typeof decoded.payload[key] === "number"
            ? [[key, new Date(decoded.payload[key] * 1000).toISOString()] as const]
            : [],
        ),
      );
      return done(
        JSON.stringify(
          { header: decoded.header, payload: decoded.payload, timestamps, signature: decoded.signature },
          null,
          2,
        ),
      );
    }
    case "base64-decoder":
      return done(decodeBase64(requireUtilityInput(primary, "Base64 input")));
    case "base64-encoder":
      return done(encodeBase64(primary, booleanOption(resolved, "urlSafe")));
    case "qr-code-generator": {
      requireUtilityInput(primary, "Text or URL");
      const errorCorrectionLevel = stringOption(resolved, "errorCorrection") as
        | "L"
        | "M"
        | "Q"
        | "H";
      const output = await QRCode.toDataURL(primary, {
        width: numberOption(resolved, "size"),
        errorCorrectionLevel,
        color: {
          dark: stringOption(resolved, "dark"),
          light: stringOption(resolved, "light"),
        },
      });
      return done(output, "qr-code.png");
    }
    case "url-decoder":
      try {
        return done(decodeURIComponent(requireUtilityInput(primary, "Encoded input")));
      } catch {
        throw new Error("URL input contains an invalid percent escape.");
      }
    case "url-encoder":
      return done(
        booleanOption(resolved, "component") ? encodeURIComponent(primary) : encodeURI(primary),
      );
    case "binary-to-text": {
      const chunks = primary.trim().split(/\s+/);
      if (!chunks.length || chunks.some((chunk) => !/^[01]{8}$/.test(chunk))) {
        throw new Error("Binary input must contain eight-bit bytes separated by spaces.");
      }
      try {
        return done(
          new TextDecoder("utf-8", { fatal: true }).decode(
            Uint8Array.from(chunks, (chunk) => Number.parseInt(chunk, 2)),
          ),
        );
      } catch {
        throw new Error("Binary input does not contain valid UTF-8 text.");
      }
    }
    case "html-encoder":
      return done(escapeHtml(primary));
    case "html-decoder":
      return done(decodeHtmlEntities(primary));
    case "text-to-binary":
      return done([...new TextEncoder().encode(primary)].map((byte) => byte.toString(2).padStart(8, "0")).join(" "));
    case "hex-to-text":
      try {
        return done(new TextDecoder("utf-8", { fatal: true }).decode(hexToBytes(primary)));
      } catch (error) {
        if (error instanceof Error && /Hex input/.test(error.message)) throw error;
        throw new Error("Hex input does not contain valid UTF-8 text.");
      }
    case "text-to-hex":
      return done(bytesToHex(new TextEncoder().encode(primary)));
    case "unicode-decoder":
      return done(decodeUnicodeEscapes(primary));
    case "unicode-encoder":
      return done(
        Array.from(primary, (character) => {
          const point = character.codePointAt(0)!;
          return point <= 0x7f ? character : point <= 0xffff ? `\\u${point.toString(16).padStart(4, "0")}` : `\\u{${point.toString(16)}}`;
        }).join(""),
      );
    case "uuid-generator": {
      const version = stringOption(resolved, "version");
      const values = Array.from({ length: numberOption(resolved, "count") }, () =>
        version === "v7" ? uuidV7() : getCrypto().randomUUID(),
      ).map((value) => {
        const withoutHyphens = booleanOption(resolved, "hyphens") ? value : value.replaceAll("-", "");
        return booleanOption(resolved, "upper") ? withoutHyphens.toUpperCase() : withoutHyphens;
      });
      return done(values.join("\n"));
    }
    case "bcrypt-generator":
      return done(await bcrypt.hash(requireUtilityInput(primary, "Password or text"), numberOption(resolved, "rounds")));
    case "sha256-generator":
      return done(await digestText(primary, "SHA-256"));
    case "md5-generator":
      return done(md5(primary));
    case "sha1-generator":
      return done(await digestText(primary, "SHA-1"));
    case "bcrypt-compare": {
      requireUtilityInput(primary, "Plain password");
      requireUtilityInput(secondary, "Bcrypt hash");
      try {
        return done((await bcrypt.compare(primary, secondary)) ? "Match" : "No match");
      } catch {
        throw new Error("Bcrypt hash is invalid.");
      }
    }
    case "sha512-generator":
      return done(await digestText(primary, "SHA-512"));
    case "hmac-generator":
      return done(
        await hmacText(primary, stringOption(resolved, "key"), stringOption(resolved, "algo")),
      );
    case "nanoid-generator":
      return done(
        Array.from({ length: numberOption(resolved, "count") }, () =>
          randomString(
            numberOption(resolved, "size"),
            "_-0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
          ),
        ).join("\n"),
      );
    case "checksum-generator": {
      const [sha1, sha256, sha512] = await Promise.all([
        digestText(primary, "SHA-1"),
        digestText(primary, "SHA-256"),
        digestText(primary, "SHA-512"),
      ]);
      return done(`MD5    ${md5(primary)}\nSHA-1  ${sha1}\nSHA-256 ${sha256}\nSHA-512 ${sha512}`);
    }
    case "hash-compare":
      return done(constantTimeEqual(primary, secondary) ? "Match" : "No match");
    case "http-status-codes": {
      const query = primary.trim().toLocaleLowerCase();
      const matches = Object.entries(HTTP_STATUSES).filter(
        ([code, phrase]) => !query || code.includes(query) || phrase.toLocaleLowerCase().includes(query),
      );
      if (!matches.length) throw new Error("No matching HTTP status code was found.");
      return done(matches.map(([code, phrase]) => `${code} ${phrase}`).join("\n"));
    }
    case "utm-builder": {
      const url = safeUrl(stringOption(resolved, "url"), "Destination URL");
      for (const [key, optionKey] of [
        ["utm_source", "source"],
        ["utm_medium", "medium"],
        ["utm_campaign", "campaign"],
        ["utm_term", "term"],
        ["utm_content", "content"],
      ] as const) {
        const value = stringOption(resolved, optionKey).trim();
        if (value) url.searchParams.set(key, value);
      }
      for (const required of ["utm_source", "utm_medium", "utm_campaign"]) {
        if (!url.searchParams.get(required)) throw new Error(`${required} is required.`);
      }
      return done(url.toString());
    }
    case "curl-to-fetch":
      return done(curlAsFetch(primary));
    case "curl-to-axios":
      return done(curlAsAxios(primary));
    case "basic-auth-generator":
      return done(
        `Authorization: Basic ${encodeBase64(`${requireUtilityInput(primary, "Username")}:${secondary}`)}`,
      );
    case "jwt-expiration-checker": {
      const { payload } = decodeJwt(primary);
      const now = Date.now() / 1000;
      const expiration = typeof payload.exp === "number" ? payload.exp : undefined;
      const notBefore = typeof payload.nbf === "number" ? payload.nbf : undefined;
      const state = expiration === undefined
        ? "No expiration claim"
        : expiration <= now
          ? "Expired"
          : notBefore !== undefined && notBefore > now
            ? "Not active yet"
            : "Active";
      return done(
        [
          `Status: ${state}`,
          expiration === undefined ? "Expires: not specified" : `Expires: ${new Date(expiration * 1000).toISOString()}`,
          typeof payload.iat === "number" ? `Issued: ${new Date(payload.iat * 1000).toISOString()}` : "Issued: not specified",
        ].join("\n"),
      );
    }
    case "url-query-parser": {
      const input = requireUtilityInput(primary, "URL or query string").trim();
      let parameters: URLSearchParams;
      try {
        parameters = input.includes("?") || /^[a-z][a-z\d+.-]*:/i.test(input)
          ? new URL(input).searchParams
          : new URLSearchParams(input.replace(/^\?/, ""));
      } catch {
        throw new Error("URL or query string is invalid.");
      }
      const value: Record<string, string | string[]> = {};
      for (const [key, item] of parameters) {
        const current = value[key];
        value[key] = current === undefined ? item : Array.isArray(current) ? [...current, item] : [current, item];
      }
      return done(JSON.stringify(value, null, 2));
    }
    case "url-query-builder": {
      const url = safeUrl(requireUtilityInput(primary, "Base URL"), "Base URL");
      for (const line of secondary.split(/\r\n|\r|\n/)) {
        if (!line.trim()) continue;
        const separator = line.indexOf("=");
        if (separator < 1) throw new Error("Each query row must use key=value format.");
        url.searchParams.append(line.slice(0, separator).trim(), line.slice(separator + 1).trim());
      }
      return done(url.toString());
    }
    case "bearer-token-parser": {
      const token = requireUtilityInput(primary, "Authorization header or token")
        .trim()
        .replace(/^Bearer\s+/i, "");
      if (!token) throw new Error("Bearer token is required.");
      if (token.split(".").length === 3) {
        const decoded = decodeJwt(token);
        return done(JSON.stringify({ token, header: decoded.header, payload: decoded.payload }, null, 2));
      }
      return done(`Token: ${token}\nLength: ${token.length}`);
    }
    case "markdown-to-html":
    case "markdown-previewer":
      return done(String(await marked.parse(requireUtilityInput(primary, "Markdown input"))));
    case "javascript-formatter":
      return done(formatDelimitedCode(primary, "javascript"));
    case "css-formatter":
      return done(formatDelimitedCode(primary, "css"));
    case "html-formatter":
      return done(formatHtml(primary));
    case "javascript-minifier":
      return done(stripCodeCommentsAndWhitespace(requireUtilityInput(primary, "JavaScript input")));
    case "css-minifier":
      return done(
        requireUtilityInput(primary, "CSS input")
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .replace(/\s+/g, " ")
          .replace(/\s*([{}:;,>+~])\s*/g, "$1")
          .replace(/;}/g, "}")
          .trim(),
      );
    case "html-viewer":
      return done(requireUtilityInput(primary, "HTML source"));
    case "hex-to-rgb": {
      const color = parseHexColor(primary);
      return done(
        color.alpha < 1
          ? `rgba(${color.red}, ${color.green}, ${color.blue}, ${Number(color.alpha.toFixed(3))})`
          : `rgb(${color.red}, ${color.green}, ${color.blue})`,
      );
    }
    case "rgb-to-hex":
      return done(rgbToHex(parseRgbColor(primary)));
    case "color-picker": {
      const color = parseHexColor(primary);
      return done(
        `HEX: ${rgbToHex(color)}\nRGB: ${color.alpha < 1 ? `rgba(${color.red}, ${color.green}, ${color.blue}, ${Number(color.alpha.toFixed(3))})` : `rgb(${color.red}, ${color.green}, ${color.blue})`}\nHSL: ${rgbToHsl(color)}`,
      );
    }
    case "gradient-generator": {
      parseHexColor(primary);
      parseHexColor(secondary);
      const type = stringOption(resolved, "type");
      return done(
        type === "radial"
          ? `background: radial-gradient(circle, ${primary.trim()}, ${secondary.trim()});`
          : `background: linear-gradient(${numberOption(resolved, "angle")}deg, ${primary.trim()}, ${secondary.trim()});`,
      );
    }
    case "css-box-shadow": {
      parseHexColor(primary);
      const inset = booleanOption(resolved, "inset") ? " inset" : "";
      return done(
        `box-shadow: ${numberOption(resolved, "x")}px ${numberOption(resolved, "y")}px ${numberOption(resolved, "blur")}px ${numberOption(resolved, "spread")}px ${primary.trim()}${inset};`,
      );
    }
    case "border-radius-generator":
      return done(
        `border-radius: ${numberOption(resolved, "topLeft")}px ${numberOption(resolved, "topRight")}px ${numberOption(resolved, "bottomRight")}px ${numberOption(resolved, "bottomLeft")}px;`,
      );
    case "css-unit-converter": {
      const value = Number(primary.trim());
      if (!Number.isFinite(value)) throw new Error("Value must be a number.");
      const base = numberOption(resolved, "base");
      const from = stringOption(resolved, "from");
      const to = stringOption(resolved, "to");
      const toPixels: Record<string, number> = { px: 1, rem: base, em: base, pt: 96 / 72, "%": base / 100 };
      const result = (value * toPixels[from]) / toPixels[to];
      return done(`${Number(result.toFixed(6))}${to}`);
    }
    case "hex-to-hsl":
      return done(rgbToHsl(parseHexColor(primary)));
    case "timestamp-converter": {
      const date = parseDate(primary, "Timestamp or date");
      return done(
        `ISO: ${date.toISOString()}\nUTC: ${date.toUTCString()}\nLocal: ${date.toLocaleString()}\nUnix seconds: ${Math.floor(date.getTime() / 1000)}\nUnix milliseconds: ${date.getTime()}`,
      );
    }
    case "date-difference": {
      const start = parseDate(primary, "Start date");
      const end = parseDate(secondary, "End date");
      const milliseconds = end.getTime() - start.getTime();
      const direction = milliseconds < 0 ? "-" : "";
      const hours = Math.abs(milliseconds) / 3_600_000;
      const days = hours / 24;
      return done(`${direction}${Number(days.toFixed(3))} days (${direction}${Number(hours.toFixed(3))} hours)`);
    }
    case "cron-builder": {
      const expression = `${primary.trim()} ${secondary.trim()} ${stringOption(resolved, "dayOfMonth")} ${stringOption(resolved, "month")} ${stringOption(resolved, "dayOfWeek")}`;
      return done(`${expression}\n${describeCron(expression)}`);
    }
    case "cron-parser": {
      const expression = requireUtilityInput(primary, "Cron expression").trim();
      return done(`${expression}\n${describeCron(expression)}`);
    }
    case "iso-date-converter": {
      const date = parseDate(primary, "Date input");
      return done(
        `ISO: ${date.toISOString()}\nUTC: ${date.toUTCString()}\nLocal: ${date.toLocaleString()}\nUnix: ${Math.floor(date.getTime() / 1000)}`,
      );
    }
    case "regex-tester": {
      const flags = stringOption(resolved, "flags");
      if (!/^[dgimsuvy]*$/.test(flags) || new Set(flags).size !== flags.length) {
        throw new Error("Regex flags are invalid.");
      }
      if (flags.includes("u") && flags.includes("v")) {
        throw new Error("Regex flags u and v cannot be combined.");
      }
      let expression: RegExp;
      try {
        expression = new RegExp(requireUtilityInput(primary, "Regex pattern"), flags.includes("g") ? flags : `${flags}g`);
      } catch (error) {
        throw new Error(`Regex pattern is invalid: ${error instanceof Error ? error.message : "unknown error"}`);
      }
      const matches: Array<{ index: number; match: string; groups: Record<string, string> | null }> = [];
      let match: RegExpExecArray | null;
      while ((match = expression.exec(secondary)) && matches.length < 10_000) {
        matches.push({ index: match.index, match: match[0], groups: match.groups ? { ...match.groups } : null });
        if (!match[0]) expression.lastIndex += 1;
      }
      if (matches.length === 10_000) throw new Error("Regex produced too many matches; narrow the pattern.");
      return done(JSON.stringify({ count: matches.length, matches }, null, 2));
    }
    case "random-number-generator": {
      const min = numberOption(resolved, "min");
      const max = numberOption(resolved, "max");
      if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max)) {
        throw new Error("Min and max must be integers.");
      }
      if (min > max) throw new Error("Min cannot be greater than max.");
      return done(
        Array.from(
          { length: numberOption(resolved, "count") },
          () => min + secureRandomInt(max - min + 1),
        ).join("\n"),
      );
    }
    case "meta-tag-generator": {
      const title = escapeHtml(requireUtilityInput(primary, "Page title"));
      const description = escapeHtml(requireUtilityInput(secondary, "Meta description"));
      const keywords = stringOption(resolved, "keywords").trim();
      const author = stringOption(resolved, "author").trim();
      const canonical = stringOption(resolved, "canonical").trim();
      const image = stringOption(resolved, "image").trim();
      if (canonical) safeUrl(canonical, "Canonical URL");
      if (image) safeUrl(image, "Open Graph image URL");
      return done(
        [
          `<title>${title}</title>`,
          `<meta name="description" content="${description}">`,
          ...(keywords ? [`<meta name="keywords" content="${escapeHtml(keywords)}">`] : []),
          ...(author ? [`<meta name="author" content="${escapeHtml(author)}">`] : []),
          ...(canonical ? [`<link rel="canonical" href="${escapeHtml(canonical)}">`] : []),
          `<meta property="og:title" content="${title}">`,
          `<meta property="og:description" content="${description}">`,
          ...(canonical ? [`<meta property="og:url" content="${escapeHtml(canonical)}">`] : []),
          ...(image ? [`<meta property="og:image" content="${escapeHtml(image)}">`] : []),
        ].join("\n"),
        "meta-tags.html",
      );
    }
    case "open-graph-preview": {
      const title = escapeHtml(requireUtilityInput(primary, "Title"));
      const description = escapeHtml(requireUtilityInput(secondary, "Description"));
      const url = stringOption(resolved, "url").trim();
      const siteName = escapeHtml(stringOption(resolved, "siteName").trim());
      const image = stringOption(resolved, "image").trim();
      if (url) safeUrl(url, "URL");
      if (image) safeUrl(image, "Image URL");
      const escapedUrl = escapeHtml(url);
      const escapedImage = escapeHtml(image);
      const tags = [
        `<meta property="og:title" content="${title}">`,
        `<meta property="og:description" content="${description}">`,
        ...(url ? [`<meta property="og:url" content="${escapedUrl}">`] : []),
        ...(siteName ? [`<meta property="og:site_name" content="${siteName}">`] : []),
        ...(image ? [`<meta property="og:image" content="${escapedImage}">`] : []),
      ];
      return done(
        `<article style="max-width:600px;border:1px solid #d1d5db;border-radius:12px;overflow:hidden;font-family:system-ui,sans-serif">${
          image
            ? `<img src="${escapedImage}" alt="" style="display:block;width:100%;max-height:315px;object-fit:cover">`
            : ""
        }<div style="padding:16px"><small>${siteName || escapedUrl}</small><h2>${title}</h2><p>${description}</p></div></article>\n<!-- Generated tags\n${tags.join("\n")}\n-->`,
      );
    }
    case "robots-txt-generator": {
      const allowAll = booleanOption(resolved, "allowAll");
      const paths = primary.split(/\r\n|\r|\n/).map((line) => line.trim()).filter(Boolean);
      if (!allowAll && paths.some((path) => !path.startsWith("/"))) {
        throw new Error("Every disallowed path must start with /." );
      }
      const sitemap = stringOption(resolved, "sitemap").trim();
      if (sitemap) safeUrl(sitemap, "Sitemap URL");
      const crawlDelay = numberOption(resolved, "crawlDelay");
      return done(
        [
          "User-agent: *",
          ...(allowAll || !paths.length ? ["Disallow:"] : paths.map((path) => `Disallow: ${path}`)),
          ...(crawlDelay ? [`Crawl-delay: ${crawlDelay}`] : []),
          ...(sitemap ? [`Sitemap: ${sitemap}`] : []),
        ].join("\n"),
        "robots.txt",
      );
    }
    case "api-key-generator": {
      const prefix = stringOption(resolved, "prefix").trim();
      if (prefix && !/^[A-Za-z\d_-]{1,32}$/.test(prefix)) {
        throw new Error("Prefix may contain only letters, numbers, underscores, and hyphens.");
      }
      return done(
        Array.from({ length: numberOption(resolved, "count") }, () => {
          const body = randomString(
            numberOption(resolved, "length"),
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_",
          );
          return prefix ? `${prefix}_${body}` : body;
        }).join("\n"),
      );
    }
    case "regex-generator": {
      const patterns: Record<string, string> = {
        email: "[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\\.[A-Za-z0-9-]+)+",
        url: "https?://(?:www\\.)?[-A-Za-z0-9@:%._+~#=]{1,256}\\.[A-Za-z0-9()]{1,63}\\b(?:[-A-Za-z0-9()@:%_+.~#?&/=]*)",
        ipv4: "(?:(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)",
        uuid: "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}",
        "hex-color": "#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\\b",
        password: "(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{12,}",
      };
      const pattern = patterns[stringOption(resolved, "preset")];
      if (!pattern) throw new Error("Regex preset is invalid.");
      const language = stringOption(resolved, "language");
      return done(
        language === "javascript"
          ? `/${pattern.replace(/\//g, "\\/")}/`
          : language === "python"
            ? `r"${pattern}"`
            : `~${pattern.replace(/~/g, "\\~")}~`,
      );
    }
    case "sitemap-generator": {
      const lines = requireUtilityInput(primary, "URLs")
        .split(/\r\n|\r|\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      if (lines.length > 50_000) throw new Error("Sitemap cannot exceed 50,000 URLs.");
      const urls = [...new Set(lines)].map((value) => safeUrl(value, "Sitemap URL").toString());
      return done(
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
          .map((url) => `  <url><loc>${escapeHtml(url)}</loc></url>`)
          .join("\n")}\n</urlset>`,
        "sitemap.xml",
      );
    }
    case "diagram-generator": {
      const source = requireUtilityInput(primary, "Mermaid diagram code");
      if (source.length > 200_000) throw new Error("Mermaid diagram code is too large.");
      if (typeof document === "undefined") {
        throw new Error("Mermaid diagram rendering requires a browser.");
      }
      const { default: mermaid } = await import("mermaid");
      mermaid.initialize({ securityLevel: "strict", startOnLoad: false });
      try {
        const { svg } = await mermaid.render(
          `smarttools-diagram-${bytesToHex(getCrypto().getRandomValues(new Uint8Array(8)))}`,
          source,
        );
        return done(svg, "diagram.svg");
      } catch (error) {
        throw new Error(
          `Mermaid diagram is invalid: ${error instanceof Error ? error.message : "render failed"}`,
        );
      }
    }
    case "domain-rating-checker":
      normalizeDomain(primary);
      throw new Error("Domain Rating Checker requires a configured domain-rating service.");
    case "domain-age-checker": {
      const domain = normalizeDomain(primary);
      let response: Response;
      try {
        response = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, {
          headers: { accept: "application/rdap+json, application/json" },
          signal: AbortSignal.timeout(10_000),
        });
      } catch {
        throw new Error("Domain Age Checker could not reach the public RDAP service.");
      }
      if (!response.ok) throw new Error(`RDAP lookup failed (${response.status}).`);
      const data: unknown = await response.json();
      if (!isRecord(data)) throw new Error("RDAP service returned an invalid response.");
      const events = Array.isArray(data.events) ? data.events.filter(isRecord) : [];
      const event = (action: string) =>
        events.find((candidate) => candidate.eventAction === action)?.eventDate ?? null;
      return done(
        JSON.stringify(
          {
            domain: data.ldhName ?? domain,
            registered: event("registration"),
            expires: event("expiration"),
            updated: event("last changed"),
            status: data.status ?? [],
            nameservers: Array.isArray(data.nameservers)
              ? data.nameservers.flatMap((server) =>
                  isRecord(server) && typeof server.ldhName === "string" ? [server.ldhName] : [],
                )
              : [],
          },
          null,
          2,
        ),
      );
    }
    case "dns-checker": {
      const domain = normalizeDomain(primary);
      const allowed = new Set(["A", "AAAA", "MX", "TXT", "NS", "CNAME"]);
      const types = [
        ...new Set(
          stringOption(resolved, "types")
            .split(",")
            .map((type) => type.trim().toUpperCase())
            .filter(Boolean),
        ),
      ];
      if (!types.length || types.some((type) => !allowed.has(type))) {
        throw new Error("DNS record types may only include A, AAAA, MX, TXT, NS, and CNAME.");
      }
      const records = await Promise.all(
        types.map(async (type) => {
          let response: Response;
          try {
            response = await fetch(
              `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${type}`,
              { headers: { accept: "application/dns-json" }, signal: AbortSignal.timeout(10_000) },
            );
          } catch {
            throw new Error("DNS Checker could not reach the public DNS service.");
          }
          if (!response.ok) throw new Error(`DNS lookup failed (${response.status}).`);
          const data: unknown = await response.json();
          if (!isRecord(data)) throw new Error("DNS service returned an invalid response.");
          return [type, data.Answer ?? []] as const;
        }),
      );
      return done(JSON.stringify(Object.fromEntries(records), null, 2));
    }
    default:
      throw new Error(`Utility operation is not implemented: ${componentKey}`);
  }
}

function normalizeUtilityOptions(
  definition: UtilityToolDefinition,
  provided: Record<string, string | number | boolean>,
): Record<string, string | number | boolean> {
  return Object.fromEntries(
    definition.options.map((definitionOption) => {
      const raw = provided[definitionOption.key] ?? definitionOption.defaultValue;
      let value: string | number | boolean;

      if (definitionOption.kind === "checkbox") {
        if (typeof raw === "boolean") value = raw;
        else if (raw === "true" || raw === "false") value = raw === "true";
        else throw new Error(`${definitionOption.label} must be on or off.`);
      } else if (definitionOption.kind === "number") {
        value = typeof raw === "number" ? raw : Number(raw);
        if (!Number.isFinite(value)) throw new Error(`${definitionOption.label} must be a number.`);
        if (definitionOption.min !== undefined && value < definitionOption.min) {
          throw new Error(`${definitionOption.label} must be at least ${definitionOption.min}.`);
        }
        if (definitionOption.max !== undefined && value > definitionOption.max) {
          throw new Error(`${definitionOption.label} must be at most ${definitionOption.max}.`);
        }
      } else {
        value = String(raw);
        if (
          definitionOption.kind === "select" &&
          definitionOption.choices &&
          !definitionOption.choices.some((choice) => choice.value === value)
        ) {
          throw new Error(`Choose a valid ${definitionOption.label.toLowerCase()}.`);
        }
      }
      return [definitionOption.key, value] as const;
    }),
  );
}

function stringOption(
  options: Record<string, string | number | boolean>,
  key: string,
): string {
  return String(options[key] ?? "");
}

function numberOption(
  options: Record<string, string | number | boolean>,
  key: string,
): number {
  return Number(options[key]);
}

function booleanOption(
  options: Record<string, string | number | boolean>,
  key: string,
): boolean {
  return options[key] === true;
}

function requireUtilityInput(value: string, label: string): string {
  if (!value.trim()) throw new Error(`${label} is required.`);
  return value;
}

function utilityResult(
  definition: UtilityToolDefinition,
  output: string,
  downloadName?: string,
): UtilityToolResult {
  return {
    output,
    outputKind: definition.outputKind,
    ...(downloadName ? { downloadName } : {}),
  };
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function repairModeFromOptions(
  options: Record<string, string | number | boolean>,
): JsonRepairMode {
  const mode = stringOption(options, "repairMode") || "remove";
  if (mode === "remove" || mode === "null" || mode === "off") return mode;
  throw new Error("Choose a valid JSON repair mode.");
}

function parseUtilityJson(
  input: string,
  options: Record<string, string | number | boolean>,
  label = "JSON input",
): unknown {
  requireUtilityInput(input, label);
  const repairMode = repairModeFromOptions(options);
  if (repairMode === "off") {
    try {
      return JSON.parse(input) as unknown;
    } catch {
      throw new Error(`${label} is not valid JSON.`);
    }
  }
  const repaired = repairJson(input, repairMode);
  if (!repaired.ok) throw new Error(repaired.error.message);
  return repaired.value;
}

function parseStrictJson(input: string, label: string): unknown {
  requireUtilityInput(input, label);
  try {
    return JSON.parse(input) as unknown;
  } catch {
    throw new Error(`${label} is not valid JSON.`);
  }
}

function jsonType(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function toPascalCase(value: string): string {
  const words = value.replace(/([a-z\d])([A-Z])/g, "$1 $2").match(/[\p{L}\p{N}]+/gu) ?? [];
  const joined = words.map((word) => word[0].toUpperCase() + word.slice(1)).join("");
  return /^\d/.test(joined) ? `Type${joined}` : joined || "Value";
}

function jsonToTypeScript(value: unknown): string {
  const interfaces: string[] = [];

  function infer(current: unknown, name: string): string {
    if (current === null) return "null";
    if (Array.isArray(current)) {
      const types = [...new Set(current.map((item) => infer(item, `${name}Item`)))];
      return `${types.length ? types.join(" | ") : "unknown"}[]`;
    }
    if (!isRecord(current)) return typeof current;

    const interfaceName = toPascalCase(name);
    const fields = Object.entries(current).map(([key, child]) => {
      const property = /^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key);
      return `  ${property}: ${infer(child, key)};`;
    });
    interfaces.unshift(`export interface ${interfaceName} {\n${fields.join("\n")}\n}`);
    return interfaceName;
  }

  const rootType = infer(value, "Root");
  if (isRecord(value)) return interfaces.join("\n\n");
  return `${interfaces.join("\n\n")}${interfaces.length ? "\n\n" : ""}export type Root = ${rootType};`;
}

function diffJson(left: unknown, right: unknown, path = "$"): string[] {
  if (Object.is(left, right)) return [];
  if (Array.isArray(left) && Array.isArray(right)) {
    return Array.from({ length: Math.max(left.length, right.length) }, (_, index) => index)
      .flatMap((index) =>
        index >= left.length
          ? [`+ ${path}[${index}]: ${JSON.stringify(right[index])}`]
          : index >= right.length
            ? [`- ${path}[${index}]: ${JSON.stringify(left[index])}`]
            : diffJson(left[index], right[index], `${path}[${index}]`),
      );
  }
  if (isRecord(left) && isRecord(right)) {
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
    return [...keys].flatMap((key) =>
      !(key in left)
        ? [`+ ${path}.${key}: ${JSON.stringify(right[key])}`]
        : !(key in right)
          ? [`- ${path}.${key}: ${JSON.stringify(left[key])}`]
          : diffJson(left[key], right[key], `${path}.${key}`),
    );
  }
  return [`~ ${path}: ${JSON.stringify(left)} → ${JSON.stringify(right)}`];
}

function inferJsonSchema(value: unknown): Record<string, unknown> {
  if (value === null) return { type: "null" };
  if (Array.isArray(value)) {
    const schemas = value.map(inferJsonSchema);
    const unique = [...new Map(schemas.map((schema) => [JSON.stringify(schema), schema])).values()];
    return { type: "array", items: unique.length === 1 ? unique[0] : { anyOf: unique } };
  }
  if (isRecord(value)) {
    return {
      type: "object",
      properties: Object.fromEntries(
        Object.entries(value).map(([key, child]) => [key, inferJsonSchema(child)]),
      ),
      required: Object.keys(value),
      additionalProperties: false,
    };
  }
  return { type: typeof value === "number" && Number.isInteger(value) ? "integer" : typeof value };
}

function resolveJsonPath(value: unknown, path: string): unknown {
  if (!path.startsWith("$")) throw new Error("JSONPath must start with $." );
  const tokens = path
    .slice(1)
    .replace(/\[['"]([^'"]+)['"]\]/g, ".$1")
    .match(/(?:\.([\w$-]+)|\[(\d+|\*)\])/g) ?? [];
  if (`$${tokens.join("")}`.replace(/\[['"]([^'"]+)['"]\]/g, ".$1") !== path.replace(/\[['"]([^'"]+)['"]\]/g, ".$1")) {
    throw new Error("JSONPath contains unsupported syntax.");
  }

  let current: unknown[] = [value];
  for (const token of tokens) {
    const property = token.startsWith(".") ? token.slice(1) : token.slice(1, -1);
    current = current.flatMap((item) => {
      if (property === "*") {
        return Array.isArray(item) ? item : isRecord(item) ? Object.values(item) : [];
      }
      if (Array.isArray(item) && /^\d+$/.test(property)) return [item[Number(property)]];
      if (isRecord(item) && property in item) return [item[property]];
      return [];
    });
  }
  if (!current.length) throw new Error("JSONPath did not match any value.");
  return current.length === 1 ? current[0] : current;
}

function jsonToXml(value: unknown, name = "root"): string {
  const tag = /^[A-Za-z_][\w.-]*$/.test(name) ? name : "item";
  if (value === null || value === undefined) return `<${tag}/>`;
  if (Array.isArray(value)) return value.map((item) => jsonToXml(item, tag)).join("");
  if (isRecord(value)) {
    return `<${tag}>${Object.entries(value)
      .map(([key, child]) => jsonToXml(child, key))
      .join("")}</${tag}>`;
  }
  return `<${tag}>${escapeHtml(value)}</${tag}>`;
}

type SimpleXmlNode = {
  name: string;
  attributes: Record<string, string>;
  children: SimpleXmlNode[];
  text: string;
};

function xmlToJson(input: string): unknown {
  const tokens = input.match(/<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<[^>]+>|[^<]+/g) ?? [];
  const stack: SimpleXmlNode[] = [];
  let root: SimpleXmlNode | undefined;

  for (const token of tokens) {
    if (token.startsWith("<!--") || token.startsWith("<?")) continue;
    if (token.startsWith("</")) {
      const name = token.slice(2, -1).trim();
      const closed = stack.pop();
      if (!closed || closed.name !== name) throw new Error("XML closing tags do not match.");
      continue;
    }
    if (token.startsWith("<")) {
      if (token.startsWith("<!")) continue;
      const selfClosing = /\/\s*>$/.test(token);
      const body = token.slice(1, selfClosing ? token.lastIndexOf("/") : -1).trim();
      const name = body.match(/^[^\s/>]+/)?.[0];
      if (!name) throw new Error("XML contains an invalid tag.");
      const attributes = Object.fromEntries(
        [...body.matchAll(/([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(
          (match) => [match[1], match[2] ?? match[3] ?? ""],
        ),
      );
      const node: SimpleXmlNode = { name, attributes, children: [], text: "" };
      if (stack.length) stack.at(-1)!.children.push(node);
      else if (root) throw new Error("XML must have one root element.");
      else root = node;
      if (!selfClosing) stack.push(node);
      continue;
    }
    if (stack.length) stack.at(-1)!.text += token;
  }
  if (!root || stack.length) throw new Error("XML is incomplete or empty.");

  function convert(node: SimpleXmlNode): unknown {
    const text = node.text.trim();
    if (!node.children.length && !Object.keys(node.attributes).length) return text;
    const result: Record<string, unknown> = Object.fromEntries(
      Object.entries(node.attributes).map(([key, value]) => [`@${key}`, value]),
    );
    for (const child of node.children) {
      const childValue = convert(child);
      if (!(child.name in result)) result[child.name] = childValue;
      else if (Array.isArray(result[child.name])) (result[child.name] as unknown[]).push(childValue);
      else result[child.name] = [result[child.name], childValue];
    }
    if (text) result["#text"] = text;
    return result;
  }
  return { [root.name]: convert(root) };
}

function validateJsonSchema(value: unknown, schema: unknown, path = "$"): string[] {
  if (!isRecord(schema)) return [`${path}: schema must be an object`];
  const errors: string[] = [];
  const expected = schema.type;
  const actual = jsonType(value);
  const matchesType =
    expected === undefined ||
    expected === actual ||
    (expected === "integer" && typeof value === "number" && Number.isInteger(value));
  if (!matchesType) return [`${path}: expected ${String(expected)}, received ${actual}`];
  if (Array.isArray(schema.enum) && !schema.enum.some((item) => Object.is(item, value))) {
    errors.push(`${path}: value is not in enum`);
  }
  if (isRecord(value)) {
    if (Array.isArray(schema.required)) {
      for (const key of schema.required) {
        if (typeof key === "string" && !(key in value)) errors.push(`${path}.${key}: is required`);
      }
    }
    if (isRecord(schema.properties)) {
      for (const [key, childSchema] of Object.entries(schema.properties)) {
        if (key in value) errors.push(...validateJsonSchema(value[key], childSchema, `${path}.${key}`));
      }
    }
  }
  if (Array.isArray(value) && schema.items !== undefined) {
    value.forEach((item, index) => {
      errors.push(...validateJsonSchema(item, schema.items, `${path}[${index}]`));
    });
  }
  if (typeof value === "string") {
    if (typeof schema.minLength === "number" && value.length < schema.minLength) {
      errors.push(`${path}: must contain at least ${schema.minLength} characters`);
    }
    if (typeof schema.maxLength === "number" && value.length > schema.maxLength) {
      errors.push(`${path}: must contain at most ${schema.maxLength} characters`);
    }
    if (typeof schema.pattern === "string") {
      try {
        if (!new RegExp(schema.pattern).test(value)) errors.push(`${path}: does not match pattern`);
      } catch {
        errors.push(`${path}: schema pattern is invalid`);
      }
    }
  }
  return errors;
}

function collectJsonKeys(value: unknown, path = "", keys: string[] = []): string[] {
  if (Array.isArray(value)) {
    value.forEach((item) => collectJsonKeys(item, path ? `${path}[]` : "[]", keys));
  } else if (isRecord(value)) {
    for (const [key, child] of Object.entries(value)) {
      const childPath = path ? `${path}.${key}` : key;
      if (!keys.includes(childPath)) keys.push(childPath);
      collectJsonKeys(child, childPath, keys);
    }
  }
  return keys;
}

function sortJsonKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJsonKeys);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort((left, right) => left.localeCompare(right))
      .map((key) => [key, sortJsonKeys(value[key])]),
  );
}

function utilityDelimiter(value: string): CsvDelimiter {
  if (value === "," || value === ";" || value === "\t" || value === "|") return value;
  throw new Error("Choose a valid delimiter.");
}

function parseUtilityTable(input: string, delimiter: CsvDelimiter): string[][] {
  requireUtilityInput(input, "Delimited input");
  const parsed = parseDelimitedRows(input, delimiter);
  if (!parsed.ok) throw new Error(parsed.message);
  if (!parsed.rows.length) throw new Error("Delimited input has no rows.");
  const width = parsed.rows[0].length;
  if (!width || parsed.rows.some((row) => row.length !== width)) {
    throw new Error("Every row must have the same number of fields.");
  }
  return parsed.rows;
}

function serializeTable(rows: readonly string[][], delimiter: CsvDelimiter): string {
  return rows
    .map((row) => row.map((cell) => csvCell(cell, delimiter)).join(delimiter))
    .join("\n");
}

function tableToHtml(rows: readonly string[][]): string {
  const [headers, ...data] = rows;
  return `<table><thead><tr>${headers.map((cell) => `<th>${escapeHtml(cell)}</th>`).join("")}</tr></thead><tbody>${data
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;
}

function words(value: string): string[] {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .match(/[\p{L}\p{N}]+/gu) ?? [];
}

function convertTextCase(value: string, target: string): string {
  const parts = words(value);
  const lower = parts.map((part) => part.toLocaleLowerCase());
  const capitalize = (part: string) =>
    part ? part[0].toLocaleUpperCase() + part.slice(1).toLocaleLowerCase() : part;

  switch (target) {
    case "upper":
      return value.toLocaleUpperCase();
    case "lower":
      return value.toLocaleLowerCase();
    case "title":
      return parts.map(capitalize).join(" ");
    case "sentence":
      return lower.length ? capitalize(lower.join(" ")) : "";
    case "camel":
      return lower.map((part, index) => (index ? capitalize(part) : part)).join("");
    case "pascal":
      return lower.map(capitalize).join("");
    case "snake":
      return lower.join("_");
    case "kebab":
      return lower.join("-");
    case "constant":
      return lower.join("_").toLocaleUpperCase();
    default:
      throw new Error("Choose a valid text case.");
  }
}

function textMetrics(value: string): {
  words: number;
  characters: number;
  charactersWithoutSpaces: number;
  sentences: number;
  paragraphs: number;
  lines: number;
  bytes: number;
} {
  const wordCount = value.trim() ? value.trim().split(/\s+/u).length : 0;
  return {
    words: wordCount,
    characters: Array.from(value).length,
    charactersWithoutSpaces: Array.from(value.replace(/\s/gu, "")).length,
    sentences: (value.match(/[^.!?]+[.!?]+(?:\s|$)/gu) ?? []).length,
    paragraphs: value.trim() ? value.trim().split(/(?:\r?\n){2,}/u).length : 0,
    lines: value ? value.split(/\r\n|\r|\n/u).length : 0,
    bytes: new TextEncoder().encode(value).length,
  };
}

const LOREM_SENTENCES = [
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
  "Integer feugiat nibh sed velit luctus, vitae facilisis justo luctus.",
  "Praesent commodo sem at augue posuere, non suscipit ipsum viverra.",
  "Donec vitae lectus sed neque efficitur consequat.",
];

function textDiff(left: string, right: string): string {
  const leftLines = left.split(/\r\n|\r|\n/u);
  const rightLines = right.split(/\r\n|\r|\n/u);
  const output: string[] = [];
  const length = Math.max(leftLines.length, rightLines.length);
  for (let index = 0; index < length; index += 1) {
    if (leftLines[index] === rightLines[index]) output.push(`  ${leftLines[index] ?? ""}`);
    else {
      if (index < leftLines.length) output.push(`- ${leftLines[index]}`);
      if (index < rightLines.length) output.push(`+ ${rightLines[index]}`);
    }
  }
  return output.join("\n");
}

function getCrypto(): Crypto {
  if (!globalThis.crypto) throw new Error("Secure browser cryptography is unavailable.");
  return globalThis.crypto;
}

function secureRandomInt(maxExclusive: number): number {
  if (!Number.isSafeInteger(maxExclusive) || maxExclusive <= 0 || maxExclusive > 0x1_0000_0000) {
    throw new Error("Random range is too large.");
  }
  const limit = Math.floor(0x1_0000_0000 / maxExclusive) * maxExclusive;
  const values = new Uint32Array(1);
  do getCrypto().getRandomValues(values);
  while (values[0] >= limit);
  return values[0] % maxExclusive;
}

function randomString(length: number, alphabet: string): string {
  if (!alphabet) throw new Error("Choose at least one character group.");
  return Array.from({ length }, () => alphabet[secureRandomInt(alphabet.length)]).join("");
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/").replace(/\s/g, "");
  if (!/^[A-Za-z\d+/]*={0,2}$/.test(normalized) || normalized.length % 4 === 1) {
    throw new Error("Base64 input is invalid.");
  }
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  try {
    return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
  } catch {
    throw new Error("Base64 input is invalid.");
  }
}

function encodeBase64(value: string, urlSafe = false): string {
  const encoded = bytesToBase64(new TextEncoder().encode(value));
  return urlSafe ? encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") : encoded;
}

function decodeBase64(value: string): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(base64ToBytes(value));
  } catch (error) {
    if (error instanceof Error && /Base64/.test(error.message)) throw error;
    throw new Error("Base64 does not contain valid UTF-8 text.");
  }
}

function decodeJwt(token: string): {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
} {
  const parts = token.trim().split(".");
  if (parts.length !== 3 || !parts[0] || !parts[1]) throw new Error("JWT must contain three dot-separated parts.");
  try {
    const header = JSON.parse(decodeBase64(parts[0])) as unknown;
    const payload = JSON.parse(decodeBase64(parts[1])) as unknown;
    if (!isRecord(header) || !isRecord(payload)) throw new Error();
    return { header, payload, signature: parts[2] };
  } catch {
    throw new Error("JWT header or payload is not valid Base64URL JSON.");
  }
}

function decodeHtmlEntities(value: string): string {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: "\u00a0",
    quot: '"',
  };
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, body: string) => {
    if (body.startsWith("#x") || body.startsWith("#X")) {
      const point = Number.parseInt(body.slice(2), 16);
      return Number.isSafeInteger(point) && point <= 0x10ffff ? String.fromCodePoint(point) : entity;
    }
    if (body.startsWith("#")) {
      const point = Number.parseInt(body.slice(1), 10);
      return Number.isSafeInteger(point) && point <= 0x10ffff ? String.fromCodePoint(point) : entity;
    }
    return named[body.toLowerCase()] ?? entity;
  });
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(value: string): Uint8Array {
  const normalized = value.replace(/(?:0x|[\s:_-])/gi, "");
  if (!normalized || normalized.length % 2 || !/^[\da-f]+$/i.test(normalized)) {
    throw new Error("Hex input must contain complete hexadecimal bytes.");
  }
  return Uint8Array.from(normalized.match(/.{2}/g)!, (byte) => Number.parseInt(byte, 16));
}

function decodeUnicodeEscapes(value: string): string {
  return value
    .replace(/\\u\{([\da-f]{1,6})\}/gi, (match, code: string) => {
      const point = Number.parseInt(code, 16);
      if (point > 0x10ffff) throw new Error("Unicode code point is out of range.");
      return String.fromCodePoint(point);
    })
    .replace(/\\u([\da-f]{4})/gi, (_match, code: string) =>
      String.fromCharCode(Number.parseInt(code, 16)),
    );
}

function uuidV7(): string {
  const bytes = getCrypto().getRandomValues(new Uint8Array(16));
  let timestamp = Date.now();
  for (let index = 5; index >= 0; index -= 1) {
    bytes[index] = timestamp & 0xff;
    timestamp = Math.floor(timestamp / 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytesToHex(bytes);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function digestText(value: string, algorithm: "SHA-1" | "SHA-256" | "SHA-512"): Promise<string> {
  const digest = await getCrypto().subtle.digest(algorithm, new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(digest));
}

async function hmacText(value: string, key: string, algorithm: string): Promise<string> {
  if (!key) throw new Error("Secret key is required.");
  const hash = algorithm === "sha1" ? "SHA-1" : algorithm === "sha512" ? "SHA-512" : "SHA-256";
  const cryptoKey = await getCrypto().subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash },
    false,
    ["sign"],
  );
  const signature = await getCrypto().subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(signature));
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBytes = new TextEncoder().encode(left.trim().toLowerCase());
  const rightBytes = new TextEncoder().encode(right.trim().toLowerCase());
  let difference = leftBytes.length ^ rightBytes.length;
  const length = Math.max(leftBytes.length, rightBytes.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }
  return difference === 0;
}

const HTTP_STATUSES: Readonly<Record<number, string>> = {
  100: "Continue",
  101: "Switching Protocols",
  200: "OK",
  201: "Created",
  202: "Accepted",
  204: "No Content",
  206: "Partial Content",
  301: "Moved Permanently",
  302: "Found",
  304: "Not Modified",
  307: "Temporary Redirect",
  308: "Permanent Redirect",
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  408: "Request Timeout",
  409: "Conflict",
  410: "Gone",
  413: "Content Too Large",
  415: "Unsupported Media Type",
  418: "I'm a Teapot",
  422: "Unprocessable Content",
  429: "Too Many Requests",
  500: "Internal Server Error",
  501: "Not Implemented",
  502: "Bad Gateway",
  503: "Service Unavailable",
  504: "Gateway Timeout",
};

function shellTokens(command: string): string[] {
  const tokens: string[] = [];
  let token = "";
  let quote = "";
  let escaped = false;
  for (const character of command.trim()) {
    if (escaped) {
      token += character;
      escaped = false;
    } else if (character === "\\" && quote !== "'") {
      escaped = true;
    } else if (quote) {
      if (character === quote) quote = "";
      else token += character;
    } else if (character === '"' || character === "'") quote = character;
    else if (/\s/.test(character)) {
      if (token) tokens.push(token);
      token = "";
    } else token += character;
  }
  if (escaped || quote) throw new Error("cURL command contains an unfinished quote or escape.");
  if (token) tokens.push(token);
  return tokens;
}

function parseCurl(command: string): {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
} {
  const tokens = shellTokens(requireUtilityInput(command, "cURL command"));
  if (tokens[0]?.toLowerCase() !== "curl") throw new Error("Command must start with curl.");
  let method = "GET";
  let url = "";
  let body: string | undefined;
  const headers: Record<string, string> = {};
  for (let index = 1; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === "-X" || token === "--request") method = (tokens[++index] ?? "").toUpperCase();
    else if (token === "-H" || token === "--header") {
      const header = tokens[++index] ?? "";
      const separator = header.indexOf(":");
      if (separator < 1) throw new Error("Every cURL header needs a name and value.");
      headers[header.slice(0, separator).trim()] = header.slice(separator + 1).trim();
    } else if (["-d", "--data", "--data-raw", "--data-binary"].includes(token)) {
      body = tokens[++index] ?? "";
      if (method === "GET") method = "POST";
    } else if (token === "-u" || token === "--user") {
      const credentials = tokens[++index] ?? "";
      headers.Authorization = `Basic ${encodeBase64(credentials)}`;
    } else if (!token.startsWith("-") && !url) url = token;
  }
  try {
    url = new URL(url).toString();
  } catch {
    throw new Error("cURL command needs an absolute http or https URL.");
  }
  if (!/^https?:/i.test(url)) throw new Error("cURL URL must use http or https.");
  return { url, method: method || "GET", headers, ...(body !== undefined ? { body } : {}) };
}

function curlAsFetch(command: string): string {
  const request = parseCurl(command);
  const init: Record<string, unknown> = {};
  if (request.method !== "GET") init.method = request.method;
  if (Object.keys(request.headers).length) init.headers = request.headers;
  if (request.body !== undefined) init.body = request.body;
  return `const response = await fetch(${JSON.stringify(request.url)}, ${JSON.stringify(init, null, 2)});\nif (!response.ok) throw new Error(\`HTTP \${response.status}\`);\nconst data = await response.json();`;
}

function curlAsAxios(command: string): string {
  const request = parseCurl(command);
  const config: Record<string, unknown> = {
    method: request.method.toLowerCase(),
    url: request.url,
  };
  if (Object.keys(request.headers).length) config.headers = request.headers;
  if (request.body !== undefined) {
    try {
      config.data = JSON.parse(request.body) as unknown;
    } catch {
      config.data = request.body;
    }
  }
  return `const { data } = await axios(${JSON.stringify(config, null, 2)});`;
}

function stripCodeCommentsAndWhitespace(input: string): string {
  let output = "";
  let quote = "";
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    const next = input[index + 1];
    if (lineComment) {
      if (character === "\n") {
        lineComment = false;
        output += " ";
      }
      continue;
    }
    if (blockComment) {
      if (character === "*" && next === "/") {
        blockComment = false;
        index += 1;
        output += " ";
      }
      continue;
    }
    if (quote) {
      output += character;
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = "";
      continue;
    }
    if (character === '"' || character === "'" || character === "`") {
      quote = character;
      output += character;
    } else if (character === "/" && next === "/") {
      lineComment = true;
      index += 1;
    } else if (character === "/" && next === "*") {
      blockComment = true;
      index += 1;
    } else output += character;
  }
  if (quote || blockComment) throw new Error("Source contains an unfinished string or comment.");
  return output
    .replace(/\s+/g, " ")
    .replace(/\s*([{}()[\],;:+*%=<>?])\s*/g, "$1")
    .trim();
}

function formatDelimitedCode(input: string, language: "javascript" | "css"): string {
  requireUtilityInput(input, `${language === "css" ? "CSS" : "JavaScript"} input`);
  const source = language === "css" ? input.replace(/\/\*[\s\S]*?\*\//g, "") : input;
  let output = "";
  let indent = 0;
  let quote = "";
  let escaped = false;
  const newline = () => {
    output = output.trimEnd() + `\n${"  ".repeat(indent)}`;
  };
  for (const character of source.trim()) {
    if (quote) {
      output += character;
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = "";
      continue;
    }
    if (character === '"' || character === "'" || character === "`") {
      quote = character;
      output += character;
    } else if (character === "{") {
      output = output.trimEnd() + " {";
      indent += 1;
      newline();
    } else if (character === "}") {
      indent = Math.max(0, indent - 1);
      output = output.trimEnd() + `\n${"  ".repeat(indent)}}`;
      newline();
    } else if (character === ";") {
      output = output.trimEnd() + ";";
      newline();
    } else if (/\s/.test(character)) {
      if (output && !/\s/.test(output.at(-1)!)) output += " ";
    } else output += character;
  }
  if (quote) throw new Error("Source contains an unfinished string.");
  return output.trim().replace(/\n{3,}/g, "\n\n");
}

function formatHtml(input: string): string {
  requireUtilityInput(input, "HTML input");
  const voidTags = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
  const tokens = input.replace(/>\s*</g, "><").match(/<!--[\s\S]*?-->|<![^>]*>|<[^>]+>|[^<]+/g) ?? [];
  const lines: string[] = [];
  let indent = 0;
  for (const raw of tokens) {
    const token = raw.trim();
    if (!token) continue;
    const closing = /^<\//.test(token);
    if (closing) indent = Math.max(0, indent - 1);
    lines.push(`${"  ".repeat(indent)}${token}`);
    const tag = token.match(/^<([A-Za-z][\w:-]*)/)?.[1].toLowerCase();
    if (tag && !closing && !token.endsWith("/>") && !voidTags.has(tag) && !token.includes(`</${tag}>`)) indent += 1;
  }
  return lines.join("\n");
}

type RgbColor = { red: number; green: number; blue: number; alpha: number };

function parseHexColor(input: string): RgbColor {
  const value = input.trim().replace(/^#/, "");
  if (![3, 4, 6, 8].includes(value.length) || !/^[\da-f]+$/i.test(value)) {
    throw new Error("HEX color must use #RGB, #RGBA, #RRGGBB, or #RRGGBBAA.");
  }
  const expanded = value.length <= 4 ? [...value].map((character) => character.repeat(2)).join("") : value;
  return {
    red: Number.parseInt(expanded.slice(0, 2), 16),
    green: Number.parseInt(expanded.slice(2, 4), 16),
    blue: Number.parseInt(expanded.slice(4, 6), 16),
    alpha: expanded.length === 8 ? Number.parseInt(expanded.slice(6, 8), 16) / 255 : 1,
  };
}

function parseRgbColor(input: string): RgbColor {
  const match = input.trim().match(/^rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)(?:\s*,\s*(\d*\.?\d+))?\s*\)$/i);
  if (!match) throw new Error("RGB color must look like rgb(51, 102, 255)." );
  const values = match.slice(1, 4).map(Number);
  const alpha = match[4] === undefined ? 1 : Number(match[4]);
  if (values.some((value) => value < 0 || value > 255) || alpha < 0 || alpha > 1) {
    throw new Error("RGB channels must be 0–255 and alpha must be 0–1.");
  }
  return { red: Math.round(values[0]), green: Math.round(values[1]), blue: Math.round(values[2]), alpha };
}

function rgbToHex(color: RgbColor): string {
  const channels = [color.red, color.green, color.blue];
  if (color.alpha < 1) channels.push(Math.round(color.alpha * 255));
  return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

function rgbToHsl({ red, green, blue, alpha }: RgbColor): string {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const delta = max - min;
  let hue = 0;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  if (delta) {
    if (max === r) hue = 60 * (((g - b) / delta) % 6);
    else if (max === g) hue = 60 * ((b - r) / delta + 2);
    else hue = 60 * ((r - g) / delta + 4);
  }
  if (hue < 0) hue += 360;
  const prefix = alpha < 1 ? "hsla" : "hsl";
  const suffix = alpha < 1 ? `, ${Number(alpha.toFixed(3))}` : "";
  return `${prefix}(${Math.round(hue)}, ${Math.round(saturation * 100)}%, ${Math.round(lightness * 100)}%${suffix})`;
}

function parseDate(input: string, label: string): Date {
  requireUtilityInput(input, label);
  let date: Date;
  if (/^-?\d+(?:\.\d+)?$/.test(input.trim())) {
    const number = Number(input);
    date = new Date(Math.abs(number) < 1e11 ? number * 1000 : number);
  } else date = new Date(input);
  if (Number.isNaN(date.getTime())) throw new Error(`${label} is not a valid date or timestamp.`);
  return date;
}

function describeCron(expression: string): string {
  const fields = expression.trim().split(/\s+/);
  if (fields.length !== 5) throw new Error("Cron expression must contain minute, hour, day, month, and weekday fields.");
  const patterns = [
    /^(?:\*|\d{1,2}|\*\/\d{1,2}|\d{1,2}(?:-\d{1,2})?(?:,\d{1,2})*)$/,
    /^(?:\*|\d{1,2}|\*\/\d{1,2}|\d{1,2}(?:-\d{1,2})?(?:,\d{1,2})*)$/,
    /^(?:\*|\d{1,2}|\*\/\d{1,2}|\d{1,2}(?:-\d{1,2})?(?:,\d{1,2})*)$/,
    /^(?:\*|\d{1,2}|\*\/\d{1,2}|\d{1,2}(?:-\d{1,2})?(?:,\d{1,2})*)$/,
    /^(?:\*|\d|\*\/\d|\d(?:-\d)?(?:,\d)*)$/,
  ];
  if (fields.some((field, index) => !patterns[index].test(field))) {
    throw new Error("Cron expression contains unsupported or invalid field syntax.");
  }
  const [minute, hour, day, month, weekday] = fields;
  const timing = minute === "*" && hour === "*" ? "every minute" : `at minute ${minute} of hour ${hour}`;
  return `${timing}; day ${day}; month ${month}; weekday ${weekday}`;
}

function normalizeDomain(input: string): string {
  const raw = input.trim().toLowerCase();
  if (!raw) throw new Error("Domain is required.");
  let hostname: string;
  try {
    hostname = new URL(raw.includes("://") ? raw : `https://${raw}`).hostname;
  } catch {
    throw new Error("Enter a valid domain name.");
  }
  if (!hostname.includes(".") || !/^[a-z\d.-]+$/i.test(hostname)) {
    throw new Error("Enter a valid domain name.");
  }
  return hostname.replace(/^www\./, "");
}

function safeUrl(input: string, label: string): URL {
  try {
    const url = new URL(input);
    if (!/^https?:$/.test(url.protocol)) throw new Error();
    return url;
  } catch {
    throw new Error(`${label} must be an absolute http or https URL.`);
  }
}
