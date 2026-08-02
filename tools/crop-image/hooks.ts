/**
 * Pre-run hooks. Pure, React-free, no heavy dependencies — see the note in
 * `../compress-pdf/hooks.ts` for why they may not live beside `run`.
 *
 * `detectMediaKind` is NOT imported: it lives in
 * `lib/tool-framework/media/validation.ts`, and nothing under `media/` may be
 * reachable from a main-thread import graph. Only the HEIC answer is needed
 * here, so the ISO-BMFF `ftyp` brand read that produces it is inlined below.
 * The other signatures `detectMediaKind` recognises (PDF, JPEG, PNG, WebP)
 * cannot also carry `ftyp` at offset 4, so the narrowed check agrees with it
 * on every input.
 */

import type { ToolValidate } from "../../lib/tool-framework/run.ts";
import type { SettingsOf } from "../../lib/tool-framework/settings.ts";

type Settings = SettingsOf<typeof import("./definition.ts").default.settings>;

/** `HEIC_SINGLE_BRANDS` + `HEIC_SEQUENCE_BRANDS` from `media/validation.ts`. */
const HEIC_BRANDS = new Set([
  "heic",
  "heix",
  "heif",
  "mif1",
  "hevc",
  "hevx",
  "heim",
  "heis",
  "hevm",
  "hevs",
  "msf1",
]);

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  let value = "";
  for (let index = offset; index < offset + length && index < bytes.length; index += 1) {
    value += String.fromCharCode(bytes[index] ?? 0);
  }
  return value;
}

/**
 * Reads only the leading `ftyp` box, whose length the box header declares, so
 * the scan is bounded by that header and not by the file — safe per keystroke.
 */
function isHeic(bytes: Uint8Array): boolean {
  if (bytes.length < 16 || ascii(bytes, 4, 4) !== "ftyp") return false;
  const declaredSize = new DataView(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength,
  ).getUint32(0);
  const end = Math.min(bytes.length, declaredSize >= 16 ? declaredSize : bytes.length);
  if (HEIC_BRANDS.has(ascii(bytes, 8, 4))) return true;
  for (let offset = 16; offset + 4 <= end; offset += 4) {
    if (HEIC_BRANDS.has(ascii(bytes, offset, 4))) return true;
  }
  return false;
}

/**
 * Replaces two `MediaWorkbench` branches:
 *  - the HEIC rejection at `MediaWorkbench.tsx:474-480`, which sniffed the file
 *    header rather than trusting the declared MIME, and
 *  - the `crop-image` arm of `cropBoxReady` at `MediaWorkbench.tsx:980-982`,
 *    whose message came from `processFiles` (`MediaWorkbench.tsx:800-805`).
 *
 * Reading the first bytes of an already-in-memory buffer is O(16), so this stays
 * safe to call on every keystroke.
 */
export const validate: ToolValidate<Settings> = (settings, files) => {
  for (const file of files) {
    if (isHeic(new Uint8Array(file.data))) {
      return "HEIC crop previews are not supported. Convert the image to JPEG or PNG first.";
    }
  }
  return settings.cropWidth <= 0 || settings.cropHeight <= 0
    ? "Enter a valid crop area before processing."
    : null;
};
