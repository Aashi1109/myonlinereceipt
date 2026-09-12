import assert from "node:assert/strict";
import test from "node:test";
import { startCase } from "../utils/strings.ts";

test("startCase formats labels while preserving acronyms", () => {
  for (const [input, expected] of [
    ["admin", "Admin"],
    ["assignRoles", "Assign Roles"],
    ["XMLParser", "XML Parser"],
    ["pdf-to_jpg", "Pdf To Jpg"],
    ["  already   readable  ", "Already Readable"],
    ["déjàVu", "Déjà Vu"],
    ["", ""],
    ["---", ""],
  ]) {
    assert.equal(startCase(input), expected, input);
  }
});
