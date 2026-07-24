import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("admin audit history shows readable users without losing deleted-user events", async () => {
  const [data, page] = await Promise.all([
    readFile(new URL("lib/admin/data.ts", root), "utf8"),
    readFile(
      new URL("app/admin/(protected)/audit/page.tsx", root),
      "utf8",
    ),
  ]);

  assert.match(
    data,
    /\.leftJoin\(\s*auditActor,\s*eq\(auditActor\.id,\s*auditEventsTable\.actorUserId\),?\s*\)/s,
  );
  assert.match(
    data,
    /\.leftJoin\(\s*auditTargetUser,[\s\S]*eq\(auditEventsTable\.targetType,\s*["']user["']\)[\s\S]*eq\(auditTargetUser\.id,\s*auditEventsTable\.targetId\)/,
  );
  assert.match(data, /actorName:\s*auditActor\.name/);
  assert.match(data, /actorEmail:\s*auditActor\.email/);
  assert.match(data, /targetUserName:\s*auditTargetUser\.name/);
  assert.match(data, /targetUserEmail:\s*auditTargetUser\.email/);

  assert.match(page, /event\.actorName\s*\?\?\s*["']Deleted user["']/);
  assert.match(page, /event\.actorEmail\s*\?\?\s*event\.actorUserId/);
  assert.match(page, /event\.targetType\s*===\s*["']user["']/);
  assert.match(page, /event\.targetUserName\s*\?\?\s*["']Deleted user["']/);
  assert.match(page, /event\.targetUserEmail\s*\?\?\s*event\.targetId/);
});
