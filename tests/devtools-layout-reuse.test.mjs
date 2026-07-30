import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { utilityToolDefinitions } from "../lib/devtools/format-json.ts";
import { toolManifest } from "../packages/tool-catalog/src/index.ts";

const root = new URL("../", import.meta.url);

async function readText(path) {
  return readFile(new URL(path, root), "utf8");
}

test("all tool pages reuse a viewport-safe shared workbench shell", async () => {
  const [
    workbench,
    jsonViewerWorkspace,
    universalWorkbench,
    mediaWorkbench,
    sharedWorkbench,
    sharedPatterns,
    ui,
  ] = await Promise.all([
    readText("app/devtools/json-formatter/json-workbench.tsx"),
    readText("tools/json-viewer/workspace.tsx"),
    readText("components/tool-workbench/UniversalWorkbench.tsx"),
    readText("app/media/components/MediaWorkbench.tsx"),
    readText("packages/ui/src/components/design-system-components.tsx"),
    readText("packages/ui/src/components/patterns.tsx"),
    readText("packages/ui/src/index.tsx"),
  ]);

  assert.match(ui, /export function ToolPageShell\(/);
  assert.match(workbench, /<ToolPageShell/);
  assert.match(workbench, /<WorkbenchShell/);
  assert.match(universalWorkbench, /<ToolPageShell/);
  assert.match(universalWorkbench, /data-testid="tool-workspace"/);
  assert.match(universalWorkbench, /h-\[calc\(100dvh-72px\)\]/);
  assert.doesNotMatch(universalWorkbench, /max-\[64rem\]:h-auto/);
  assert.doesNotMatch(universalWorkbench, /workspaceClassName="pt-0/);
  assert.doesNotMatch(universalWorkbench, /tool-workbench-rail/);
  assert.doesNotMatch(universalWorkbench, /min-h-20[^"]*border-y/);
  assert.match(mediaWorkbench, /<WorkbenchShell/);
  assert.match(sharedWorkbench, /max-h-\[calc\(100dvh-2rem\)\]/);
  assert.match(sharedWorkbench, /max-\[54rem\]:max-h-none/);
  assert.match(sharedPatterns, /function ToolSupportSections\(/);
  assert.match(ui, /ToolSupportSections/);
  assert.match(ui, /compact \? "min-h-\[72px\]" : "min-h-\[88px\]"/);
  assert.match(ui, /max-w-\[1440px\] px-4 pt-\[18px\] pb-8/);
  assert.match(ui, /\?category=\$\{encodeURIComponent\(category\)\}/);
  assert.match(sharedPatterns, /text-\[26px\]/);
  assert.match(workbench, /w-\[560px\]/);
  assert.equal((workbench.match(/label="FROM"/g) ?? []).length, 2);
  assert.match(workbench, /function ConversionFormatSelector\(/);
  assert.match(workbench, /ArrowLeftRight/);
  for (const label of [
    "Count hyphenated words as one word",
    "Ignore standalone numbers",
    "Exclude email-like strings",
  ]) {
    assert.ok(
      Object.values(utilityToolDefinitions["word-counter"].options).some((option) => option.label === label),
      `Word Counter should retain the designed ${label} option`,
    );
  }
  assert.match(workbench, /options=\{definition.options.length/);
  assert.match(workbench, /h-\[46px\].*border-b border-border/);
  assert.match(workbench, /className=\{`hidden min-w-0 shrink-0 flex-col/);
  assert.match(mediaWorkbench, /lg:grid-cols-\[minmax\(0,1fr\)_380px\]/);
  assert.match(mediaWorkbench, /className="h-\[210px\]"/);
  assert.doesNotMatch(workbench, /function WorkbenchFamilyHeader\(/);
  for (const variant of ["json", "conversion", "utility"]) {
    assert.match(
      workbench,
      new RegExp(`variant="${variant}"`),
      `the ${variant} layout family should declare its shared shell variant`,
    );
  }
  assert.equal(
    (workbench.match(/<JsonResultRenderer/g) ?? []).length +
      (jsonViewerWorkspace.match(/<JsonResultRenderer/g) ?? []).length,
    4,
    "formatter, viewer, and JSON-aware utility outputs should share one renderer while conversion panes keep the simpler designed output surface",
  );
  for (const action of [
    "Load example",
    "Reset",
    "Copy output",
    "Download",
    'data-testid="run-tool"',
  ]) {
    assert.match(workbench, new RegExp(action), `shared pages must retain the ${action} action`);
  }
});

test("every registered Devtools route resolves to a redesigned workbench family", () => {
  const dedicatedWorkbenches = new Set([
    "csv-to-json",
    "json-formatter",
    "json-to-csv",
    "json-viewer",
  ]);
  const devtools = toolManifest.filter((tool) => tool.app === "devtools");
  const missing = devtools
    .filter(
      (tool) =>
        !dedicatedWorkbenches.has(tool.componentKey) &&
        !Object.hasOwn(utilityToolDefinitions, tool.componentKey),
    )
    .map((tool) => tool.componentKey);

  assert.equal(devtools.length, 114);
  assert.deepEqual(missing, []);
});
