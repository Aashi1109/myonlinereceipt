import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { cn } from "../packages/ui/src/lib/utils.ts";

const root = new URL("../", import.meta.url);

test("shared UI class overrides are conflict-aware", async () => {
  const source = await readFile(
    new URL("packages/ui/src/index.tsx", root),
    "utf8",
  );

  assert.match(source, /import \{ cn \} from ["']\.\/lib\/utils\.ts["']/);
  assert.doesNotMatch(source, /filter\(Boolean\)\.join\(["'] ["']\)/);
  assert.equal(
    cn("h-10 p-6 text-sm", "h-9 p-0 text-xs"),
    "h-9 p-0 text-xs",
  );
});

test("signed-in account navigation is identifiable as a profile link", async () => {
  const source = await readFile(
    new URL("packages/ui/src/index.tsx", root),
    "utf8",
  );

  assert.match(source, /Open profile for/);
  assert.match(source, />\s*Profile\s*</);
});
