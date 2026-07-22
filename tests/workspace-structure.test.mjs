import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

test("SmartTools workspace contains the agreed applications", async () => {
  const expectedPackages = {
    "apps/platform/package.json": "@smarttools/platform",
    "apps/paperwork/package.json": "@smarttools/paperwork",
    "apps/devtools/package.json": "@smarttools/devtools",
    "apps/media/package.json": "@smarttools/media",
    "apps/auth/package.json": "@smarttools/auth-app",
  };

  for (const [path, name] of Object.entries(expectedPackages)) {
    const packageJson = await readJson(path);
    assert.equal(packageJson.name, name);
    assert.equal(packageJson.private, true);
  }
});

test("pnpm discovers apps, packages, and services", async () => {
  const workspace = await readFile(new URL("pnpm-workspace.yaml", root), "utf8");

  for (const pattern of ['"apps/*"', '"packages/*"', '"services/*"']) {
    assert.match(workspace, new RegExp(`- ${pattern.replace("*", "\\*")}`));
  }
});

test("public tools use server-resolved dynamic slugs", async () => {
  const [
    paperworkCatalog,
    paperworkTool,
    devtoolsCatalog,
    devtoolsTool,
    mediaCatalog,
    mediaTool,
  ] =
    await Promise.all([
      readFile(new URL("apps/paperwork/src/app/page.tsx", root), "utf8"),
      readFile(
        new URL("apps/paperwork/src/app/[slug]/page.tsx", root),
        "utf8",
      ),
      readFile(new URL("apps/devtools/src/app/page.tsx", root), "utf8"),
      readFile(
        new URL("apps/devtools/src/app/[slug]/page.tsx", root),
        "utf8",
      ),
      readFile(new URL("apps/media/app/page.tsx", root), "utf8"),
      readFile(new URL("apps/media/app/[slug]/page.tsx", root), "utf8"),
    ]);

  assert.match(paperworkCatalog, /getAvailableTools\(["']paperwork["']\)/);
  assert.match(paperworkTool, /getAvailableToolBySlug\(["']paperwork["']/);
  assert.match(paperworkTool, /notFound\(\)/);
  assert.match(paperworkTool, /componentKey/);
  assert.match(devtoolsCatalog, /getAvailableTools\(["']devtools["']\)/);
  assert.doesNotMatch(devtoolsCatalog, /redirect\(/);
  assert.match(devtoolsTool, /getAvailableToolBySlug\(["']devtools["']/);
  assert.match(devtoolsTool, /notFound\(\)/);
  assert.match(mediaCatalog, /getAvailableTools\(["']media["']\)/);
  assert.match(mediaTool, /getAvailableToolBySlug\(["']media["']/);
  assert.match(mediaTool, /notFound\(\)/);

  for (const path of [
    "apps/paperwork/src/app/receipt-generator/page.tsx",
    "apps/paperwork/src/app/expense-report/page.tsx",
    "apps/paperwork/src/app/mileage-log/page.tsx",
    "apps/paperwork/src/app/quarterly-tax-estimator/page.tsx",
    "apps/paperwork/src/app/w9-request/page.tsx",
    "apps/paperwork/src/app/1099-nec-tracker/page.tsx",
    "apps/devtools/src/app/json-formatter/page.tsx",
  ]) {
    await assert.rejects(readFile(new URL(path, root), "utf8"), {
      code: "ENOENT",
    });
  }
});

test("root scripts expose the Media application", async () => {
  const packageJson = await readJson("package.json");

  assert.equal(
    packageJson.scripts["dev:media"],
    "pnpm --filter @smarttools/media dev",
  );
  assert.equal(
    packageJson.scripts["test:media"],
    "pnpm --filter @smarttools/media test",
  );
});

test("paperwork page navigation does not use URL hashes", async () => {
  const navigationFiles = [
    "apps/paperwork/src/App.tsx",
    "apps/paperwork/src/components/RelatedTools.tsx",
  ];
  const source = (
    await Promise.all(
      navigationFiles.map((path) => readFile(new URL(path, root), "utf8")),
    )
  ).join("\n");

  assert.doesNotMatch(
    source,
    /window\.location\.hash|hashchange|href\s*=\s*["']#|\bhash:\s*["']#/,
  );
});

test("Paperwork footer destinations are real application routes", async () => {
  const app = await readFile(
    new URL("apps/paperwork/src/App.tsx", root),
    "utf8",
  );

  for (const slug of ["about", "privacy", "terms", "contact"]) {
    const page = await readFile(
      new URL(`apps/paperwork/src/app/${slug}/page.tsx`, root),
      "utf8",
    );
    assert.match(app, new RegExp(`href=["']/${slug}["']`));
    assert.match(page, /InformationPage/);
  }
});

test("paperwork routes components from managed tool props", async () => {
  const source = await readFile(
    new URL("apps/paperwork/src/App.tsx", root),
    "utf8",
  );

  assert.match(source, /componentKey/);
  assert.match(source, /tools/);
  assert.match(source, /templates/);
  assert.doesNotMatch(source, /usePathname|useRouter/);
  assert.doesNotMatch(source, /\/admin|AdminAuthGate|TemplateService/);
});

test("legacy Paperwork template administration is removed", async () => {
  for (const path of [
    "apps/paperwork/src/app/admin/[[...route]]/page.tsx",
    "apps/paperwork/src/app/api/admin/verify/route.ts",
    "apps/paperwork/src/components/admin/AdminAuthGate.tsx",
    "apps/paperwork/src/components/admin/FormGroups.tsx",
    "apps/paperwork/src/components/admin/FullPagePreviewer.tsx",
    "apps/paperwork/src/components/admin/TemplateEditor.tsx",
    "apps/paperwork/src/components/admin/TemplateListTable.tsx",
    "apps/paperwork/src/lib/admin/session.ts",
    "apps/paperwork/src/lib/templates/templateService.ts",
  ]) {
    await assert.rejects(readFile(new URL(path, root), "utf8"), {
      code: "ENOENT",
    });
  }

  const [environment, bootstrap, schema] = await Promise.all([
    readFile(new URL("apps/paperwork/.env.example", root), "utf8"),
    readFile(new URL("apps/paperwork/src/db/bootstrap.ts", root), "utf8"),
    readFile(new URL("apps/paperwork/src/db/schema.ts", root), "utf8"),
  ]);
  assert.doesNotMatch(environment, /ADMIN_PASSCODE/);
  assert.doesNotMatch(bootstrap, /admin_passcode|ADMIN_PASSCODE|invoice_templates/);
  assert.doesNotMatch(schema, /appConfigTable|invoiceTemplatesTable/);
});

test("Paperwork exposes published templates through a guarded read-only API", async () => {
  const route = await readFile(
    new URL("apps/paperwork/src/app/api/templates/route.ts", root),
    "utf8",
  );

  assert.match(route, /getPublishedTemplates/);
  assert.match(route, /getAvailableToolBySlug/);
  assert.match(route, /export\s+async\s+function\s+GET/);
  assert.doesNotMatch(route, /export\s+async\s+function\s+POST/);
  assert.doesNotMatch(route, /localStorage|invoiceTemplatesTable/);
});

test("Paperwork server persistence checks the owning tool", async () => {
  const [access, storage, storedKey, vendors] = await Promise.all([
    readFile(new URL("apps/paperwork/src/lib/toolAccess.ts", root), "utf8"),
    readFile(new URL("apps/paperwork/src/app/api/storage/route.ts", root), "utf8"),
    readFile(
      new URL("apps/paperwork/src/app/api/storage/[key]/route.ts", root),
      "utf8",
    ),
    readFile(new URL("apps/paperwork/src/app/api/vendors/route.ts", root), "utf8"),
  ]);

  assert.match(access, /getAvailableToolBySlug/);
  assert.match(storage, /requireAvailableToolForStorageKey/);
  assert.match(storedKey, /requireAvailableToolForStorageKey/);
  assert.match(vendors, /requireAnyAvailablePaperworkTool/);
});

test("admin and Media ordering use the shared accessible drag-and-drop list", async () => {
  const [editor, toolList, mediaWorkbench, orderableList] = await Promise.all([
    readFile(
      new URL(
        "apps/admin/src/app/(admin)/templates/[id]/_components/TemplateEditor.tsx",
        root,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "apps/admin/src/app/(admin)/tools/_components/ToolList.tsx",
        root,
      ),
      "utf8",
    ),
    readFile(
      new URL("apps/media/components/MediaWorkbench.tsx", root),
      "utf8",
    ),
    readFile(
      new URL("packages/ui/src/components/OrderableList.tsx", root),
      "utf8",
    ),
  ]);

  assert.match(editor, /<OrderableList/);
  assert.match(editor, /GripVertical/);
  assert.doesNotMatch(editor, /moveSection|ArrowUp|ArrowDown/);
  assert.match(toolList, /@smarttools\/ui\/components\/OrderableList/);
  assert.match(mediaWorkbench, /@smarttools\/ui\/components\/OrderableList/);
  assert.match(mediaWorkbench, /<OrderableList/);
  assert.doesNotMatch(
    mediaWorkbench,
    /<ArrowUp|<ArrowDown|function moveFile|function movePage/,
  );
  assert.match(orderableList, /KeyboardSensor/);
  assert.match(orderableList, /PointerSensor/);
  assert.match(orderableList, /sortableKeyboardCoordinates/);
});
