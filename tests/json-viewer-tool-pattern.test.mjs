import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function exists(path) {
  try {
    await access(new URL(path, root));
    return true;
  } catch {
    return false;
  }
}

async function readText(path) {
  return readFile(new URL(path, root), "utf8");
}

test("JSON Viewer is a flat, tool-owned definition and workspace", async () => {
  const ownedFiles = [
    "tools/json-viewer/definition.ts",
    "tools/json-viewer/execution.ts",
    "tools/json-viewer/workspace.tsx",
  ];

  for (const path of ownedFiles) {
    assert.equal(await exists(path), true, `${path} must be owned by JSON Viewer`);
  }

  const [definition, workspace] = await Promise.all([
    readText(ownedFiles[0]),
    readText(ownedFiles[2]),
  ]);

  assert.match(definition, /definitionKey:\s*["']json-viewer["']/);
  assert.match(definition, /toolId:\s*["']devtools\.json-viewer["']/);
  assert.match(definition, /app:\s*["']devtools["']/);
  assert.doesNotMatch(
    definition,
    /from\s+["']react["']|\.tsx["']/,
    "the server-safe definition must not import the client workspace",
  );

  for (const boundary of [
    "SplitStack",
    "EditorSurface",
    "JsonResultRenderer",
    "useToolRuntime",
  ]) {
    assert.match(
      workspace,
      new RegExp(`\\b${boundary}\\b`),
      `JSON Viewer workspace should compose the ${boundary} boundary`,
    );
  }
  assert.doesNotMatch(
    workspace,
    /from\s+["'][^"']*\/execution["']/,
    "the workspace must use runtime commands instead of importing its executor",
  );
});

test("the Devtools route resolves JSON Viewer through its stable definition key", async () => {
  const route = await readText("app/devtools/[slug]/page.tsx");

  assert.match(route, /\bUniversalWorkbench\b/);
  assert.match(
    route,
    /(?:definitionKey=\{tool\.componentKey\}|ToolDefinition\(tool\.componentKey\))/,
  );
  assert.doesNotMatch(route, /\bJsonViewerWorkbench\b/);
  assert.doesNotMatch(route, /tool\.componentKey\s*===\s*["']json-viewer["']/);
});

test("JSON Viewer retains its source and tree interactions inside its workspace", async () => {
  const [workspace, definition, renderer] = await Promise.all([
    readText("tools/json-viewer/workspace.tsx"),
    readText("tools/json-viewer/definition.ts"),
    readText("app/devtools/components/JsonResultRenderer.tsx"),
  ]);
  const behaviorSource = `${workspace}\n${definition}\n${renderer}`;

  for (const behavior of [
    "JSON input",
    "JSON tree",
    "Load example",
    "Load broken example",
    "Beautify",
    "Minify",
    "Repair & clean",
    "Collapse",
    "Expand",
    "Copy",
    "Clear",
  ]) {
    assert.match(
      behaviorSource,
      new RegExp(behavior.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
      `JSON Viewer should retain its ${behavior} behavior`,
    );
  }

  assert.match(workspace, /Split view · UTF-8/);
  assert.doesNotMatch(workspace, /Viewer layout|classicTab|setLayout/);
  assert.match(workspace, /remove/);
  assert.match(workspace, /null/);
  assert.match(workspace, /grid-cols-\[minmax\(0,520px\)_minmax\(0,1fr\)\]/);
  assert.match(workspace, /lineNumbers/);
  assert.match(workspace, /w-\[15px\]/);
  assert.match(workspace, /pt-\[18px\]/);
  assert.match(workspace, /pl-\[45px\]/);
  assert.match(workspace, /!font-mono/);
  assert.match(workspace, /!text-xs/);
  assert.match(workspace, /!leading-\[1\.55\]/);
  assert.match(workspace, /text-on-ink-muted/);
  assert.doesNotMatch(workspace, /bg-muted\/65|w-11/);
  assert.match(workspace, /persistentSearch/);
  assert.match(workspace, /showNodeCopyActions=\{false\}/);
});

test("JSON Viewer execution parses, formats, minifies, and repairs without UI state", async () => {
  assert.equal(
    await exists("tools/json-viewer/execution.ts"),
    true,
    "JSON Viewer execution must exist before its pure contract can be loaded",
  );

  const {
    describeJsonViewerRepair,
    executeJsonViewer,
    formatJsonViewerInput,
    minifyJsonViewerInput,
    repairJsonViewerInput,
  } = await import("../tools/json-viewer/execution.ts");

  const parsed = executeJsonViewer(
    '{"name":"SmartTools","nested":{"enabled":true}}',
  );
  assert.deepEqual(parsed, {
    ok: true,
    formattedValue:
      '{\n  "name": "SmartTools",\n  "nested": {\n    "enabled": true\n  }\n}',
    value: { name: "SmartTools", nested: { enabled: true } },
  });

  const invalid = executeJsonViewer('{"name":}');
  assert.equal(invalid.ok, false);
  assert.equal(invalid.error.kind, "syntax");
  assert.match(invalid.error.message, /isn't valid/i);

  assert.equal(
    formatJsonViewerInput('{"ready":true}').output,
    '{\n  "ready": true\n}',
  );
  assert.equal(
    minifyJsonViewerInput('{\n  "ready": true\n}').output,
    '{"ready":true}',
  );
  assert.deepEqual(
    repairJsonViewerInput('{"ready":,"kept":true}', "remove"),
    {
      ok: true,
      output: '{\n  "kept": true\n}',
      repaired: true,
      value: { kept: true },
    },
  );
  assert.deepEqual(
    repairJsonViewerInput('{"ready":,"kept":true}', "null"),
    {
      ok: true,
      output: '{\n  "ready": null,\n  "kept": true\n}',
      repaired: true,
      value: { ready: null, kept: true },
    },
  );
  assert.deepEqual(
    describeJsonViewerRepair(
      '[{"id":1,"name":"Alice","age":},{"id":2,"name":"Bob","age":30}]',
      "remove",
    ),
    {
      changedPaths: ["$[0].age"],
      kind: "remove",
      ok: true,
      output:
        '[\n  {\n    "id": 1,\n    "name": "Alice"\n  },\n  {\n    "id": 2,\n    "name": "Bob",\n    "age": 30\n  }\n]',
    },
  );
  assert.deepEqual(
    describeJsonViewerRepair('{"ready":,"kept":true}', "null"),
    {
      changedPaths: ["$.ready"],
      kind: "null",
      ok: true,
      output: '{\n  "ready": null,\n  "kept": true\n}',
    },
  );
});

test("the universal workbench owns recovery and has unique landmarks", async () => {
  const [runtime, workbench] = await Promise.all([
    readText("lib/tool-runtime/useToolRuntime.tsx"),
    readText("components/tool-workbench/UniversalWorkbench.tsx"),
  ]);

  for (const recoveryBoundary of [
    "pendingConfirmation",
    "confirmPendingCommand",
    "cancelPendingCommand",
    "canUndo",
    "undo",
  ]) {
    assert.match(runtime, new RegExp(`\\b${recoveryBoundary}\\b`));
    assert.match(workbench, new RegExp(`\\b${recoveryBoundary}\\b`));
  }

  assert.match(workbench, /workspaceId=["']tool-page-content["']/);
  assert.match(workbench, /Before you continue/);
  assert.match(workbench, /Related tools/);
  assert.doesNotMatch(workbench, /tool-workbench-rail/);
  assert.doesNotMatch(workbench, /<main\b/);
});
