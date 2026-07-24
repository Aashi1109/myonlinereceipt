import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const advancedRoute =
  "apps/admin/src/app/(editor)/templates/[id]/advanced/page.tsx";
const advancedEditor =
  "apps/admin/src/app/(editor)/templates/[id]/advanced/_components/AdvancedTemplateEditor.tsx";
const templatesPage = "apps/admin/src/app/(admin)/templates/page.tsx";
const adminNextConfig = "apps/admin/next.config.ts";

test("advanced templates use a separate immersive route and leave the standard editor isolated", async () => {
  const [route, editor, list, nextConfig] = await Promise.all([
    readFile(advancedRoute, "utf8"),
    readFile(advancedEditor, "utf8"),
    readFile(templatesPage, "utf8"),
    readFile(adminNextConfig, "utf8"),
  ]);

  assert.match(route, /requirePagePermission\("templates", "view"\)/);
  assert.match(route, /layoutFamily !== "advanced"/);
  assert.match(route, /AdvancedTemplateEditor/);

  assert.match(editor, /import\("@pdfme\/ui"\)/);
  assert.match(editor, /import\("@pdfme\/schemas"\)/);
  assert.match(editor, /import\("@pdfme\/generator"\)/);
  assert.match(editor, /onChangeTemplate/);
  assert.match(editor, /\.destroy\(\)/);
  assert.match(editor, /updateTemplateAction/);
  assert.match(editor, /updateAndPublishTemplateAction/);
  assert.match(editor, /resizeAdvancedTemplateConfig/);
  assert.match(editor, /aria-label="Page size"/);
  assert.match(editor, /pageFormat:\s*pageFormat/);
  assert.match(editor, /Preview PDF/);
  assert.match(editor, /propPanel\.defaultSchema/);
  assert.match(editor, /Add elements/);
  assert.match(editor, /Dynamic text/);
  assert.match(editor, /QR code/);
  assert.match(editor, /data-field-inspector-open/);
  assert.match(editor, /pdfme-designer-left-sidebar/);
  assert.match(editor, /pdfme-designer-right-sidebar/);
  assert.match(editor, /pdfme-designer-detail-view/);
  assert.match(editor, /sidebarOpen: false/);
  assert.doesNotMatch(editor, /sidebarOpen: next === "add"/);
  assert.doesNotMatch(editor, /Open design controls/);
  assert.doesNotMatch(editor, /function renderInspector/);
  assert.doesNotMatch(editor, /Position & size/);
  assert.doesNotMatch(editor, /dangerouslySetInnerHTML/);

  assert.match(list, /createAdvancedTemplateAction/);
  assert.match(list, /Advanced designer/);
  assert.match(list, /DOCUMENT_DEFINITIONS\.flatMap/);
  assert.match(list, /definition\.allowedPageFormats\.map/);
  assert.match(list, /RECEIPT_80MM: "80 mm"/);
  assert.match(list, /RECEIPT_58MM: "58 mm"/);
  assert.match(list, /\/advanced/);
  assert.match(nextConfig, /module:\s*\{\s*browser:/);
});
