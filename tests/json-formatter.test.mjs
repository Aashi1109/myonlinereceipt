import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

import {
  MAX_JSON_INPUT_CHARS,
  summarizeJson,
  transformJson,
} from "../apps/devtools/src/lib/format-json.ts";

const requireFromDevtools = createRequire(
  new URL("../apps/devtools/package.json", import.meta.url),
);

test("formats valid JSON with the selected indentation", () => {
  assert.deepEqual(
    transformJson('{"name":"Ada","active":true}', {
      mode: "format",
      indentation: 2,
    }),
    {
      ok: true,
      output: '{\n  "name": "Ada",\n  "active": true\n}',
      value: { name: "Ada", active: true },
    },
  );
});

test("supports tab indentation and Unicode values", () => {
  assert.deepEqual(
    transformJson('{"message":"Hello 👋"}', {
      mode: "format",
      indentation: "tab",
    }),
    {
      ok: true,
      output: '{\n\t"message": "Hello 👋"\n}',
      value: { message: "Hello 👋" },
    },
  );
});

test("minifies valid JSON without changing its value", () => {
  assert.deepEqual(
    transformJson('[1, { "ready": true }]', {
      mode: "minify",
      indentation: 4,
    }),
    {
      ok: true,
      output: '[1,{"ready":true}]',
      value: [1, { ready: true }],
    },
  );
});

test("returns a useful location for malformed JSON", () => {
  assert.deepEqual(
    transformJson('{\n  "name": "Ada",\n}', {
      mode: "format",
      indentation: 2,
    }),
    {
      ok: false,
      error: {
        kind: "syntax",
        message:
          "JSON isn't valid near line 3, column 1. Check commas, quotes, and brackets.",
        line: 3,
        column: 1,
      },
    },
  );
});

test("handles empty and oversized input before parsing", () => {
  assert.deepEqual(
    [
      transformJson("  \n", { mode: "format", indentation: 2 }),
      transformJson("x".repeat(MAX_JSON_INPUT_CHARS + 1), {
        mode: "format",
        indentation: 2,
      }),
    ],
    [
      {
        ok: false,
        error: {
          kind: "empty",
          message: "Paste JSON or open a .json file to get started.",
        },
      },
      {
        ok: false,
        error: {
          kind: "too-large",
          message: "JSON must be 2,000,000 characters or fewer.",
        },
      },
    ],
  );
});

test("the editor stack understands JSON and its automatic closing pairs", () => {
  const { EditorState, basicSetup } = requireFromDevtools(
    "@uiw/react-codemirror",
  );
  const { json, jsonLanguage } = requireFromDevtools("@codemirror/lang-json");
  const state = EditorState.create({
    doc: '{"ready":true}',
    extensions: [basicSetup({ closeBrackets: true }), json()],
  });

  assert.match(
    jsonLanguage.parser.parse(state.doc.toString()).toString(),
    /PropertyName.*True/,
  );
  assert.deepEqual(state.languageDataAt("closeBrackets", 1), [
    { brackets: ["[", "{", '"'] },
  ]);
});

test("summarizes formatted JSON for the reader inspector", () => {
  const value = {
    id: "12345",
    name: "Project Apollo",
    status: "active",
    details: {
      tasks: [
        { id: 1, title: "Design System", completed: true },
        { id: 2, title: "API Integration", completed: false },
      ],
      metadata: '{"created":"2024-01-01"}',
    },
  };
  const output = JSON.stringify(value, null, 2);

  assert.deepEqual(summarizeJson(value, output), {
    arrayCount: 1,
    byteSize: 348,
    depth: 3,
    keyCount: 12,
    lineCount: 20,
    selectedKey: "tasks",
    selectedType: "Array [2]",
    preview: ["{…}", "{…}"],
  });
});
