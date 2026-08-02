/**
 * Pre-run hooks. Pure, React-free, no heavy dependencies — see the note in
 * `../compress-pdf/hooks.ts` for why they may not live beside `run`.
 *
 * `partitionInputs` is NOT reused from `run.worker.ts`: importing the run file
 * would pull the whole media graph onto the main thread. It splits documents
 * from watermarks by asking `detectMediaKind` whether a file is a PDF, and the
 * only thing this hook needs is that same yes/no, so the five-byte `%PDF-`
 * signature it decides on is inlined instead.
 */

import type {
  ToolPagesInspected,
  ToolRunFile,
  ToolValidate,
} from "../../lib/tool-framework/run.ts";
import type { SettingsOf } from "../../lib/tool-framework/settings.ts";

type Settings = SettingsOf<typeof import("./definition.ts").default.settings>;

/** The `pdf` arm of `detectMediaKind` (`media/validation.ts`): `%PDF-`. */
const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d] as const;

function isPdf(file: ToolRunFile): boolean {
  const bytes = new Uint8Array(file.data);
  return PDF_SIGNATURE.every((byte, index) => bytes[index] === byte);
}

/**
 * Replaces the `definition.slug === "watermark-pdf"` guard at
 * `MediaWorkbench.tsx:814-821`, with the same message. The old check asked
 * whether a `watermarkFile` had been picked through a bespoke second input;
 * the equivalent question here is whether the file list contains a non-PDF.
 */
export const validate: ToolValidate<Settings> = (settings, files) => {
  if (settings.watermarkKind !== "image") return null;
  return files.some((file) => !isPdf(file))
    ? null
    : "Choose a JPG or PNG watermark image.";
};

/** Replaces the `watermark-pdf` arm of `applyPdfInspection` (`MediaWorkbench.tsx:726-731`). */
export const onPagesInspected: ToolPagesInspected<Settings> = () => ({
  pages: "all",
});
