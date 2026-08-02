/**
 * Moved from `splitPdf` in `app/media/_workers/pdf.worker.ts:219-269`, plus the
 * shared preflight from `processPdf` (`pdf.worker.ts:91-98`).
 *
 * `buildJobOptions` used to split the `ranges` text on `;` and run each part
 * through `parsePageRange` before the job started (`MediaWorkbench.tsx:1626`,
 * `1702-1706`). That parse now happens here, in `rangeGroups`, throwing the
 * rule's own code and message.
 */

import {
  addCopiedPagesWithProgress,
  checkedPages,
  enforcePageLimit,
  loadPdf,
  pdfOutput,
  validatePdfInput,
  type MediaOutputFile,
} from "../../lib/tool-framework/media/pdfDocument.ts";
import {
  createOutputFilename,
  parsePageRange,
  validatePdfSelection,
  MEDIA_LIMITS,
} from "../../lib/tool-framework/media/validation.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import { ToolError, type ToolRun } from "../../lib/tool-framework/run.ts";
import type { SettingsOf } from "../../lib/tool-framework/settings.ts";

type Settings = SettingsOf<typeof import("./definition.ts").default.settings>;

function rangeGroups(ranges: string): number[][] {
  return ranges.split(";").map((range) => {
    const result = parsePageRange(range, MEDIA_LIMITS.pdfs.maxStructuralPages);
    if (!result.ok) throw new ToolError(result.code, result.message);
    return result.pages;
  });
}

export const run: ToolRun<Settings> = async (ctx): Promise<ToolResult> => {
  const selection = validatePdfSelection(
    ctx.input.files.map((file) => ({ size: file.data.byteLength })),
  );
  if (!selection.ok) throw new ToolError(selection.code, selection.message);
  for (const file of ctx.input.files) validatePdfInput(file);

  const { PDFDocument } = await import("pdf-lib");
  const input = ctx.input.files[0];
  const source = await loadPdf(input);
  const count = source.getPageCount();
  enforcePageLimit(input, count, false);
  let groups: number[][];
  if (ctx.settings.mode === "every-page") {
    groups = Array.from({ length: count }, (_, index) => [index + 1]);
  } else if (ctx.settings.mode === "interval") {
    const interval = ctx.settings.interval;
    if (!Number.isInteger(interval) || interval < 1) {
      throw new ToolError(
        "invalid-interval",
        "Pages per file must be a positive whole number.",
      );
    }
    groups = [];
    for (let page = 1; page <= count; page += interval) {
      groups.push(
        Array.from({ length: Math.min(interval, count - page + 1) }, (_, index) => page + index),
      );
    }
  } else {
    groups = rangeGroups(ctx.settings.ranges);
  }
  if (!groups.length) throw new ToolError("empty-range", "Choose at least one page range.");

  const outputs: MediaOutputFile[] = [];
  for (let index = 0; index < groups.length; index += 1) {
    ctx.signal.throwIfAborted();
    const pages = checkedPages(groups[index], count);
    const document = await PDFDocument.create();
    await addCopiedPagesWithProgress(
      document,
      source,
      pages,
      "Creating split PDF",
      ctx.progress,
    );
    outputs.push(
      pdfOutput(
        await document.save(),
        createOutputFilename(
          input.name,
          "pdf",
          `part-${String(index + 1).padStart(2, "0")}`,
        ),
      ),
    );
  }

  return {
    render: "files",
    files: outputs,
    inputBytes: input.data.byteLength,
    outputBytes: outputs.reduce((sum, output) => sum + output.size, 0),
  };
};

export default run;
