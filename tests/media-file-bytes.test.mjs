import assert from "node:assert/strict";
import test from "node:test";

import { readToolFile } from "../lib/tool-framework/media/fileBytes.ts";

test("readToolFile releases a completed full-file read instead of caching it", async () => {
  let reads = 0;
  const source = {
    async arrayBuffer() {
      reads += 1;
      return Uint8Array.of(reads).buffer;
    },
  };
  const file = {
    id: "input",
    name: "input.bin",
    mime: "application/octet-stream",
    size: 1,
    source,
  };

  assert.deepEqual(new Uint8Array(await readToolFile(file)), Uint8Array.of(1));
  assert.deepEqual(new Uint8Array(await readToolFile(file)), Uint8Array.of(2));
  assert.equal(reads, 2);
});
