import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { toolManifest } from "../packages/tool-catalog/src/index.ts";

const migrationUrl = new URL(
  "../packages/database/drizzle/0001_auth_control_plane.sql",
  import.meta.url,
);
const migrationRunnerUrl = new URL(
  "../packages/database/scripts/migrate.mjs",
  import.meta.url,
);
const mediaMigrationUrl = new URL(
  "../packages/database/drizzle/0002_media_tools.sql",
  import.meta.url,
);
const documentTemplateMigrationUrl = new URL(
  "../packages/database/drizzle/0003_document_template_kinds.sql",
  import.meta.url,
);
const schemaUrl = new URL("../packages/database/src/schema.ts", import.meta.url);

test("the control-plane migration keeps anonymous users separate from auth accounts", async () => {
  const sql = await readFile(migrationUrl, "utf8");

  for (const table of [
    "auth_users",
    "auth_sessions",
    "auth_accounts",
    "auth_verifications",
    "roles",
    "user_roles",
    "managed_tools",
    "feature_overrides",
    "audit_events",
  ]) {
    assert.match(sql, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\b`, "i"));
  }

  assert.match(sql, /UNIQUE\s*\(app,\s*slug\)/i);
  assert.match(sql, /CREATE UNIQUE INDEX[^;]+invoice_templates[^;]+is_default/is);
  assert.match(sql, /prevent_system_role_changes/i);
  assert.match(sql, /assign_default_user_role/i);
  assert.match(sql, /prevent_saved_tool_slug_change/i);
  assert.match(sql, /prevent_final_admin_assignment_removal/i);
  assert.match(
    sql,
    /prevent_final_admin_assignment_removal[\s\S]+status = 'active'[\s\S]+COUNT\(\*\)[\s\S]+status = 'active'/i,
  );
  assert.match(sql, /prevent_final_active_admin_suspension/i);
  assert.doesNotMatch(sql, /DROP TABLE\s+users\b/i);
});

test("the migration runner seeds invoice templates only for an empty catalog", async () => {
  const runner = await readFile(migrationRunnerUrl, "utf8");

  assert.match(runner, /seedTemplates/);
  assert.match(runner, /COUNT\(\*\)[\s\S]+invoice_templates/i);
  assert.match(runner, /template_count[\s\S]+=== 0/);
  assert.match(runner, /INSERT INTO invoice_templates/i);
});

test("the Media migration expands only managed tool ownership and seeds every tool", async () => {
  const [sql, schema] = await Promise.all([
    readFile(mediaMigrationUrl, "utf8"),
    readFile(schemaUrl, "utf8"),
  ]);
  const mediaTools = toolManifest.filter((tool) => tool.app === "media");

  assert.match(sql, /DROP CONSTRAINT IF EXISTS managed_tools_app_check/i);
  assert.match(
    sql,
    /ADD CONSTRAINT managed_tools_app_check[\s\S]+app IN \('paperwork', 'devtools', 'media'\)/i,
  );
  assert.match(sql, /ON CONFLICT \(tool_id\) DO NOTHING/i);
  assert.equal(mediaTools.length, 30);
  assert.equal((sql.match(/\('media\.[^']+'/g) ?? []).length, 30);
  for (const [order, tool] of mediaTools.entries()) {
    assert.ok(
      sql.includes(
        `('${tool.id}', 'media', '${tool.componentKey}', '${tool.defaultName}', '${tool.defaultDescription}', ${order}, TRUE, FALSE)`,
      ),
      tool.id,
    );
  }

  assert.match(
    schema,
    /managedToolsTable[\s\S]+\$type<"paperwork" \| "devtools" \| "media">\(\)/,
  );
  assert.match(
    schema,
    /featureOverridesTable[\s\S]+\$type<"paperwork" \| "devtools">\(\)/,
  );
});

test("document template kinds are constrained without rewriting existing rows", async () => {
  const [sql, schema] = await Promise.all([
    readFile(documentTemplateMigrationUrl, "utf8"),
    readFile(schemaUrl, "utf8"),
  ]);
  const documentTypes = [
    "invoice",
    "receipt",
    "expense-report",
    "mileage-log",
    "quarterly-tax-estimator",
    "w9-request",
    "1099-nec-tracker",
  ];

  for (const documentType of documentTypes) {
    assert.match(sql, new RegExp(`'${documentType}'`));
    assert.match(schema, new RegExp(`"${documentType}"`));
  }
  assert.match(
    sql,
    /ADD CONSTRAINT invoice_templates_document_type_check[\s\S]+NOT VALID/i,
  );
  assert.match(
    sql,
    /ADD CONSTRAINT invoice_templates_advanced_document_type_check[\s\S]+layout_family = 'advanced'[\s\S]+document_type = 'invoice'[\s\S]+NOT VALID/i,
  );
  assert.match(
    sql,
    /ADD CONSTRAINT invoice_templates_default_published_check[\s\S]+is_default = FALSE[\s\S]+status = 'published'[\s\S]+NOT VALID/i,
  );
  assert.match(sql, /IF EXISTS[\s\S]+FROM invoice_templates/i);
  for (const constraint of [
    "invoice_templates_document_type_check",
    "invoice_templates_advanced_document_type_check",
    "invoice_templates_default_published_check",
  ]) {
    assert.match(
      sql,
      new RegExp(`VALIDATE CONSTRAINT ${constraint}`, "i"),
    );
  }

  const replacementIndex = sql.indexOf(
    "invoice_templates_published_default_by_document_type_unique",
  );
  const oldIndexDrop = sql.indexOf(
    "DROP INDEX IF EXISTS invoice_templates_published_default_unique",
  );
  assert.notEqual(replacementIndex, -1);
  assert.ok(oldIndexDrop > replacementIndex);
  assert.match(
    sql,
    /CREATE UNIQUE INDEX IF NOT EXISTS invoice_templates_published_default_by_document_type_unique[\s\S]+ON invoice_templates\s*\(\s*document_type\s*\)[\s\S]+WHERE is_default = TRUE AND status = 'published'/i,
  );
  assert.match(
    sql,
    /CREATE INDEX IF NOT EXISTS invoice_templates_published_document_type_updated_idx[\s\S]+ON invoice_templates\s*\(\s*document_type\s*,\s*updated_at DESC\s*\)[\s\S]+WHERE status = 'published'/i,
  );
  assert.match(
    schema,
    /uniqueIndex\(\s*"invoice_templates_published_default_by_document_type_unique",?\s*\)[\s\S]+\.on\(table\.documentType\)/,
  );
  assert.match(
    schema,
    /index\("invoice_templates_published_document_type_updated_idx"\)[\s\S]+table\.documentType[\s\S]+table\.updatedAt\.desc\(\)/,
  );
});

test("the migration runner applies 0001, 0002, then 0003 in explicit order", async () => {
  const runner = await readFile(migrationRunnerUrl, "utf8");
  const first = runner.indexOf("0001_auth_control_plane.sql");
  const second = runner.indexOf("0002_media_tools.sql");
  const third = runner.indexOf("0003_document_template_kinds.sql");

  assert.notEqual(first, -1);
  assert.ok(second > first);
  assert.ok(third > second);
  assert.match(runner, /for \(const [^)]*migration[^)]* of migrations\)/);
});
