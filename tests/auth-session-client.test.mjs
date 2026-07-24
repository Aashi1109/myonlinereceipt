import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../packages/auth/src/session.ts", import.meta.url),
  "utf8",
);

test("session lookup uses Better Auth directly inside the unified application", () => {
  assert.match(source, /import \{ auth \} from ["']\.\/auth\.ts["']/);
  assert.match(
    source,
    /auth\.api\.getSession\(\{\s*headers:\s*requestHeaders\s*\}\)/,
  );
  assert.doesNotMatch(source, /\bfetch\s*\(|getAuthServiceURL|AUTH_URL/);
});

test("session lookup keeps the public shape and optional failure behavior", () => {
  assert.match(source, /if \(!session\) return null/);
  assert.match(source, /session:\s*\{\s*id:\s*session\.session\.id\s*\}/);
  assert.match(
    source,
    /user:\s*\{\s*id:\s*session\.user\.id,\s*name:\s*session\.user\.name\s*\}/,
  );
  assert.match(source, /throw new AuthServiceError\(/);
  assert.match(
    source,
    /if \(error instanceof AuthServiceError\) return null/,
  );
});
