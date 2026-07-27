import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("shared UI exposes the exact design-system foundation tokens", async () => {
  const css = await source("packages/ui/src/theme.css");

  for (const token of [
    "--background: #f6f7f9",
    "--foreground: #1a1a1a",
    "--card: #ffffff",
    "--primary: #0066ff",
    "--accent: #e8f0ff",
    "--success: #12a150",
    "--surface-ink: #111214",
    "--on-ink-muted: #a7adb5",
    "--border: #eaecef",
    "--input: #d6d9de",
    "--shadow-sm: 0 1px 2px #0000000d",
    "--shadow-lg: 0 2px 4px #00000008, 0 12px 32px #0000000f",
  ]) {
    assert.match(css, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("shared controls retain design-system dimensions and states", async () => {
  const [button, checkbox, input, switchSource, tabs] = await Promise.all([
    source("packages/ui/src/components/button.tsx"),
    source("packages/ui/src/components/checkbox.tsx"),
    source("packages/ui/src/components/input.tsx"),
    source("packages/ui/src/components/switch.tsx"),
    source("packages/ui/src/components/tabs.tsx"),
  ]);

  assert.match(button, /h-\[46px\].*rounded-full.*px-\[26px\].*text-\[15px\]/);
  assert.match(button, /hover:bg-\[#0052CC\].*active:bg-\[#003D99\]/);
  assert.match(checkbox, /size-5.*rounded-\[4px\]/);
  assert.match(input, /h-11.*rounded-lg.*border-input.*px-\[13px\]/);
  assert.match(switchSource, /h-\[26px\].*w-11/);
  assert.match(tabs, /segmented: "rounded-lg bg-muted p-1"/);
});

test("reusable tool patterns cover the design-system component set", async () => {
  const patterns = await source("packages/ui/src/components/patterns.tsx");

  for (const component of [
    "IconTile",
    "MetricCard",
    "SidebarNavItem",
    "ToolPageIntro",
    "FileUploadZone",
    "FileQueueItem",
    "ProcessingStatus",
    "DownloadResult",
    "ToolOptionsPanel",
    "HowItWorks",
    "CompactAction",
    "InlineGuidance",
    "RightPanelProcessing",
    "RightPanelResult",
    "UniversalProductHeader",
    "InlineProductHeader",
    "ProductFooter",
  ]) {
    assert.match(patterns, new RegExp(`function ${component}\\b`));
  }
});

test("every reusable design.pen component has a named code implementation", async () => {
  const [manifest, compatibilityComponents, index] = await Promise.all([
    source("packages/ui/src/design-system-manifest.ts"),
    source("packages/ui/src/components/design-system-components.tsx"),
    source("packages/ui/src/index.tsx"),
  ]);
  const designIds = [...manifest.matchAll(/designId: "([^"]+)"/g)].map((match) => match[1]);

  assert.equal(designIds.length, 47);
  assert.equal(new Set(designIds).size, 47);

  for (const designId of [
    "wm1rh", "o5XSq", "v7W41", "buMbq", "vqrFa", "vfXW1", "KhiTv",
    "TjqJu", "p8sMCK", "LYbwR", "n0hbD", "U33OrB", "XX92d", "ANemK",
    "KYa0C", "rUGqU", "NcoS9", "wsb4b", "zfYOu", "J0wTF9", "dV2U8",
    "rAWA1", "Z22Y1n", "dvTGe", "p6bKLP", "hZUnl", "vTel8", "WNQ3F",
    "s7j05", "DHoar", "b55XX", "xWzlR", "x9bDiO", "g9TdB", "NnxxQ",
    "vMbTZ", "A3D8lv", "kfEw4", "wFMb0", "QQ11z", "eAeak", "ODEcI",
    "e8vqr", "ngC1X", "Mncoc", "hGI6k", "bWOKG",
  ]) {
    assert.ok(designIds.includes(designId), `missing design component ${designId}`);
  }

  for (const component of [
    "SegmentedControl",
    "Tag",
    "Toast",
    "WorkbenchShell",
    "JsonFormatterWorkbench",
    "DataConversionWorkbench",
    "UtilityWorkbench",
    "ToolPageSystemControls",
  ]) {
    assert.match(compatibilityComponents, new RegExp(`function ${component}\\b`));
  }
  assert.match(index, /function AuthField\b/);
  assert.match(index, /function ToolCard\b/);
});

test("tool routes share the design-system page shell", async () => {
  const [index, devtoolsWorkbench, mediaToolPage] = await Promise.all([
    source("packages/ui/src/index.tsx"),
    source("app/devtools/json-formatter/json-workbench.tsx"),
    source("app/media/[slug]/page.tsx"),
  ]);

  assert.match(index, /function ToolPageShell\b/);
  assert.match(index, /<ProductHeader/);
  assert.match(index, /<ToolPageIntro/);
  assert.match(index, /systemControls/);
  assert.match(devtoolsWorkbench, /<ToolPageShell/);
  assert.match(mediaToolPage, /<ToolPageShell/);
  assert.doesNotMatch(mediaToolPage, /function ToolBreadcrumb\b/);
});
