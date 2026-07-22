import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "../packages/database/drizzle/0001_auth_control_plane.sql",
  import.meta.url,
);
const migrationRunnerUrl = new URL(
  "../packages/database/scripts/migrate.mjs",
  import.meta.url,
);

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
