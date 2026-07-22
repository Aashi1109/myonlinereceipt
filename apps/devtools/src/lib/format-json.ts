export const MAX_JSON_INPUT_CHARS = 2_000_000;

export type JsonIndentation = 2 | 4 | "tab";
export type JsonTransformMode = "format" | "minify";

type JsonTransformError = {
  kind: "empty" | "syntax" | "too-large";
  message: string;
  line?: number;
  column?: number;
};

export type JsonTransformResult =
  | { ok: true; output: string; value: unknown }
  | { ok: false; error: JsonTransformError };

export type JsonSummary = {
  arrayCount: number;
  byteSize: number;
  depth: number;
  keyCount: number;
  lineCount: number;
  preview: string[];
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

export function summarizeJson(value: unknown, output: string): JsonSummary {
  let arrayCount = 0;
  let depth = 0;
  let keyCount = 0;
  let selected: { key: string; value: unknown[] } | undefined;

  function visit(current: unknown, currentDepth: number, key = "root") {
    if (Array.isArray(current)) {
      arrayCount += 1;
      depth = Math.max(depth, currentDepth);
      selected ??= { key, value: current };
      current.forEach((child) => visit(child, currentDepth + 1));
      return;
    }

    if (typeof current === "object" && current !== null) {
      depth = Math.max(depth, currentDepth);
      Object.entries(current).forEach(([childKey, child]) => {
        keyCount += 1;
        visit(child, currentDepth + 1, childKey);
      });
    }
  }

  visit(value, 0);
  const selectedValue = selected?.value ?? value;
  const selectedType = Array.isArray(selectedValue)
    ? `Array [${selectedValue.length}]`
    : typeof selectedValue === "object" && selectedValue !== null
      ? `Object {${Object.keys(selectedValue).length}}`
      : selectedValue === null
        ? "Null"
        : typeof selectedValue;
  const preview = Array.isArray(selectedValue)
    ? selectedValue.slice(0, 2).map((item) =>
        Array.isArray(item)
          ? "[…]"
          : typeof item === "object" && item !== null
            ? "{…}"
            : JSON.stringify(item),
      )
    : [];

  return {
    arrayCount,
    byteSize: new TextEncoder().encode(output).length,
    depth,
    keyCount,
    lineCount: output.split("\n").length,
    preview,
    selectedKey: selected?.key ?? "root",
    selectedType,
  };
}
