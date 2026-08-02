/**
 * Packages several produced files into one archive, for tools whose natural
 * output is a set rather than a single download.
 */

import { exactBuffer, type MediaOutputFile } from "./pdfDocument.ts";

/** Deflate level 6 — the balance the media runtime has always shipped. */
const ZIP_LEVEL = 6;

export async function zipOutputs(
  files: readonly MediaOutputFile[],
  filename: string,
): Promise<MediaOutputFile> {
  const { zipSync } = await import("fflate");
  const entries = Object.fromEntries(
    files.map((file) => [file.filename, new Uint8Array(file.buffer)]),
  );
  const archive = zipSync(entries, { level: ZIP_LEVEL });
  const buffer = exactBuffer(archive);
  return {
    buffer,
    filename,
    mime: "application/zip",
    size: buffer.byteLength,
  };
}
