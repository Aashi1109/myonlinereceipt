import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

import {
  MAX_JSON_INPUT_CHARS,
  convertCsvToJson,
  convertJsonToCsv,
  getJsonNodeMetadata,
  repairJson,
  runUtilityTool,
  summarizeJson,
  transformJson,
  utilityToolDefinitions,
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

test("summarizes document-level JSON facts without selected node state", () => {
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
  });
});

test("describes object and array nodes with key/value preview rows", () => {
  assert.deepEqual(
    getJsonNodeMetadata(
      "details",
      { tasks: [{ id: 1 }], active: true },
      2,
    ),
    {
      selectedKey: "details",
      selectedType: "Object {2}",
      preview: [
        { key: "tasks", value: "[…]" },
        { key: "active", value: "true" },
      ],
    },
  );
  assert.deepEqual(
    getJsonNodeMetadata("tasks", [{ id: 1 }, "done", null], 2),
    {
      selectedKey: "tasks",
      selectedType: "Array [3]",
      preview: [
        { key: "0", value: "{…}" },
        { key: "1", value: '"done"' },
      ],
    },
  );
});

test("describes primitive and null nodes with their exact value", () => {
  assert.deepEqual(getJsonNodeMetadata("title", "Design System"), {
    selectedKey: "title",
    selectedType: "string",
    preview: [{ key: "value", value: '"Design System"' }],
  });
  assert.deepEqual(getJsonNodeMetadata("completed", true), {
    selectedKey: "completed",
    selectedType: "boolean",
    preview: [{ key: "value", value: "true" }],
  });
  assert.deepEqual(getJsonNodeMetadata("missing", null), {
    selectedKey: "missing",
    selectedType: "Null",
    preview: [{ key: "value", value: "null" }],
  });
});

test("limits node metadata previews without changing the selected node", () => {
  assert.deepEqual(getJsonNodeMetadata("root", { a: 1, b: 2, c: 3 }, 2), {
    selectedKey: "root",
    selectedType: "Object {3}",
    preview: [
      { key: "a", value: "1" },
      { key: "b", value: "2" },
    ],
  });
});

test("converts JSON objects to CSV with a stable union of columns", () => {
  assert.deepEqual(
    convertJsonToCsv('[{"id":1,"name":"Alice"},{"id":2,"active":true}]'),
    {
      ok: true,
      columns: ["id", "name", "active"],
      output: "id,name,active\n1,Alice,\n2,,true",
      repaired: false,
      rowCount: 2,
    },
  );
});

test("flattens nested objects and safely quotes arrays, delimiters, and quotes", () => {
  const result = convertJsonToCsv(
    JSON.stringify([
      {
        id: 1,
        profile: { city: "Pune" },
        tags: ["a", "b"],
        note: 'A, "quoted" value',
      },
    ]),
  );

  assert.equal(result.ok, true);
  assert.equal(
    result.output,
    'id,profile.city,tags,note\n1,Pune,"[""a"",""b""]","A, ""quoted"" value"',
  );
});

test("repairs missing property values by removing them or setting them to null", () => {
  const broken = '[{"id":1,"age":}]';

  assert.deepEqual(convertJsonToCsv(broken, { repairMode: "remove" }), {
    ok: true,
    columns: ["id"],
    output: "id\n1",
    repaired: true,
    rowCount: 1,
  });
  assert.deepEqual(convertJsonToCsv(broken, { repairMode: "null" }), {
    ok: true,
    columns: ["id", "age"],
    output: "id,age\n1,",
    repaired: true,
    rowCount: 1,
  });
  assert.equal(convertJsonToCsv(broken, { repairMode: "off" }).ok, false);
});

test("rejects empty, oversized, and non-object JSON inputs", () => {
  for (const input of [
    " ",
    "x".repeat(MAX_JSON_INPUT_CHARS + 1),
    "[1,2]",
    '"value"',
  ]) {
    assert.equal(convertJsonToCsv(input).ok, false);
  }
});

test("converts CSV headers and rows to a formatted JSON array", () => {
  assert.deepEqual(convertCsvToJson("id,name\n1,Alice\n2,Bob"), {
    ok: true,
    columns: ["id", "name"],
    output:
      '[\n  {\n    "id": "1",\n    "name": "Alice"\n  },\n  {\n    "id": "2",\n    "name": "Bob"\n  }\n]',
    rowCount: 2,
  });
});

test("CSV parsing handles quoted delimiters, escaped quotes, and line breaks", () => {
  const result = convertCsvToJson(
    'id,note\n1,"A, ""quoted"" value"\n2,"line one\nline two"',
  );

  assert.equal(result.ok, true);
  assert.deepEqual(JSON.parse(result.output), [
    { id: "1", note: 'A, "quoted" value' },
    { id: "2", note: "line one\nline two" },
  ]);
  assert.equal(convertCsvToJson('id,name\n1,"Alice').ok, false);
  assert.equal(convertCsvToJson("id,id\n1,2").ok, false);
  assert.equal(convertCsvToJson("id,name\n1").ok, false);
});

test("repairs common broken JSON without evaluating input", () => {
  assert.deepEqual(
    repairJson("{/* note */ name: 'Ada', active: true, age:,}", "remove"),
    {
      ok: true,
      output: '{\n  "name": "Ada",\n  "active": true\n}',
      value: { name: "Ada", active: true },
      repaired: true,
    },
  );
  assert.deepEqual(
    repairJson('{"name":"Ada","age":}', "null"),
    {
      ok: true,
      output: '{\n  "name": "Ada",\n  "age": null\n}',
      value: { name: "Ada", age: null },
      repaired: true,
    },
  );
});

test("JSON repair rejects empty, oversized, and unrecoverable input", () => {
  assert.equal(repairJson("", "remove").ok, false);
  assert.equal(
    repairJson("x".repeat(MAX_JSON_INPUT_CHARS + 1), "remove").ok,
    false,
  );
  assert.equal(repairJson("{still broken", "remove").ok, false);
});

const NON_SPECIAL_UTILITY_SLUGS = [
  "json-validator",
  "json-to-typescript",
  "json-minifier",
  "yaml-to-json",
  "json-to-yaml",
  "json-diff",
  "json-schema-generator",
  "json-editor",
  "xml-to-json",
  "json-path-tester",
  "json-to-xml",
  "json-schema-validator",
  "json-array-to-table",
  "json-escape",
  "json-unescape",
  "json-key-extractor",
  "json-sorter",
  "csv-viewer",
  "csv-to-markdown-table",
  "csv-to-tsv",
  "tsv-to-csv",
  "csv-formatter",
  "csv-to-table",
  "csv-sorter",
  "csv-validator",
  "csv-duplicate-remover",
  "csv-filter",
  "csv-delimiter-converter",
  "csv-column-extractor",
  "password-generator",
  "word-counter",
  "character-counter",
  "lorem-ipsum-generator",
  "text-diff-checker",
  "text-case-converter",
  "slug-generator",
  "duplicate-line-remover",
  "find-and-replace",
  "random-string-generator",
  "text-sorter",
  "whitespace-remover",
  "text-reverser",
  "duplicate-word-remover",
  "jwt-decoder",
  "base64-decoder",
  "base64-encoder",
  "qr-code-generator",
  "url-decoder",
  "url-encoder",
  "binary-to-text",
  "html-encoder",
  "html-decoder",
  "text-to-binary",
  "hex-to-text",
  "text-to-hex",
  "unicode-decoder",
  "unicode-encoder",
  "uuid-generator",
  "bcrypt-generator",
  "sha256-generator",
  "md5-generator",
  "sha1-generator",
  "bcrypt-compare",
  "sha512-generator",
  "hmac-generator",
  "nanoid-generator",
  "checksum-generator",
  "hash-compare",
  "http-status-codes",
  "utm-builder",
  "curl-to-fetch",
  "curl-to-axios",
  "basic-auth-generator",
  "jwt-expiration-checker",
  "url-query-parser",
  "url-query-builder",
  "bearer-token-parser",
  "markdown-to-html",
  "javascript-formatter",
  "css-formatter",
  "html-formatter",
  "javascript-minifier",
  "css-minifier",
  "markdown-previewer",
  "html-viewer",
  "hex-to-rgb",
  "rgb-to-hex",
  "color-picker",
  "gradient-generator",
  "css-box-shadow",
  "border-radius-generator",
  "css-unit-converter",
  "hex-to-hsl",
  "timestamp-converter",
  "date-difference",
  "cron-builder",
  "cron-parser",
  "iso-date-converter",
  "regex-tester",
  "random-number-generator",
  "meta-tag-generator",
  "open-graph-preview",
  "robots-txt-generator",
  "api-key-generator",
  "regex-generator",
  "sitemap-generator",
  "diagram-generator",
  "domain-rating-checker",
  "domain-age-checker",
  "dns-checker",
];

test("generic utility definitions cover every non-special inventory tool", () => {
  assert.deepEqual(
    Object.keys(utilityToolDefinitions).sort(),
    [...NON_SPECIAL_UTILITY_SLUGS].sort(),
  );

  for (const definition of Object.values(utilityToolDefinitions)) {
    assert.match(definition.name, /\S/);
    assert.match(definition.description, /\S/);
    assert.match(definition.category, /\S/);
    assert.ok(["single", "dual", "generator"].includes(definition.mode));
    assert.ok(["text", "html", "image"].includes(definition.outputKind));
    assert.match(definition.runLabel, /\S/);
    assert.equal(typeof definition.live, "boolean");
    assert.ok(Array.isArray(definition.options));
  }
});

test("runs representative JSON and CSV data operations", async () => {
  const types = await runUtilityTool(
    "json-to-typescript",
    '{"name":"Ada","active":true,"tags":["admin"]}',
    "",
    {},
  );
  assert.match(types.output, /interface Root/);
  assert.match(types.output, /name: string/);
  assert.match(types.output, /tags: string\[\]/);

  const markdown = await runUtilityTool(
    "csv-to-markdown-table",
    "name,age\nAda,36",
    "",
    {},
  );
  assert.equal(markdown.output, "| name | age |\n| --- | --- |\n| Ada | 36 |");
});

test("runs representative text and encoding operations with Unicode", async () => {
  assert.equal(
    (
      await runUtilityTool("text-case-converter", "hello smart tools", "", {
        target: "camel",
      })
    ).output,
    "helloSmartTools",
  );

  const encoded = await runUtilityTool("base64-encoder", "Hello 👋", "", {});
  assert.equal(encoded.output, "SGVsbG8g8J+Riw==");
  assert.equal(
    (await runUtilityTool("base64-decoder", encoded.output, "", {})).output,
    "Hello 👋",
  );
});

test("runs representative crypto and API operations", async () => {
  assert.equal(
    (await runUtilityTool("sha256-generator", "abc", "", {})).output,
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
  assert.equal(
    (await runUtilityTool("basic-auth-generator", "Ada", "secret", {})).output,
    "Authorization: Basic QWRhOnNlY3JldA==",
  );
});

test("runs representative document and color operations", async () => {
  const markdown = await runUtilityTool("markdown-to-html", "**Hello**", "", {});
  assert.equal(markdown.outputKind, "html");
  assert.match(markdown.output, /<strong>Hello<\/strong>/);
  assert.equal(
    (await runUtilityTool("hex-to-rgb", "#ff00aa", "", {})).output,
    "rgb(255, 0, 170)",
  );
});

test("runs representative date and developer-generator operations", async () => {
  assert.equal(
    (
      await runUtilityTool(
        "date-difference",
        "2026-01-01T00:00:00Z",
        "2026-01-03T00:00:00Z",
        {},
      )
    ).output,
    "2 days (48 hours)",
  );

  const sitemap = await runUtilityTool(
    "sitemap-generator",
    "https://example.com/\nhttps://example.com/about",
    "",
    {},
  );
  assert.match(sitemap.output, /<loc>https:\/\/example\.com\/about<\/loc>/);
});

test("diagram and SEO tools fail safely when runtime configuration is unavailable", async () => {
  await assert.rejects(
    runUtilityTool("diagram-generator", "", "", {}),
    /Mermaid diagram code is required/,
  );
  await assert.rejects(
    runUtilityTool("domain-rating-checker", "example.com", "", {}),
    /requires a configured domain-rating service/,
  );
});

test("utility execution rejects unknown tools and invalid boundary input", async () => {
  await assert.rejects(runUtilityTool("missing-tool", "x", "", {}), /Unknown utility/);
  await assert.rejects(runUtilityTool("hex-to-rgb", "not-a-color", "", {}), /HEX color/);
});

test("every locally runnable definition has a working example", async () => {
  const environmentBound = new Set([
    "diagram-generator",
    "domain-rating-checker",
    "domain-age-checker",
    "dns-checker",
  ]);

  for (const [componentKey, definition] of Object.entries(utilityToolDefinitions)) {
    if (environmentBound.has(componentKey)) continue;
    const options = Object.fromEntries(
      definition.options.map((option) => [option.key, option.defaultValue]),
    );
    await assert.doesNotReject(
      runUtilityTool(
        componentKey,
        definition.primaryExample ?? "",
        definition.secondaryExample ?? "",
        options,
      ),
      componentKey,
    );
  }
});
