/**
 * Moved from `convertPdfToImages` in `app/media/_workers/pdf.worker.ts:133-189`,
 * plus the shared preflight from `processPdf` (`pdf.worker.ts:91-98`).
 *
 * `pdf.worker.ts:137-138,157` picked the extension, MIME, and quality from the
 * operation name so one handler could serve both `pdf-to-jpg` and `pdf-to-png`.
 * This tool states all three itself. The `zipSync` block at
 * `pdf.worker.ts:175-188` is now `zipOutputs`.
 */

import type { MediaOutputFile } from "../../lib/tool-framework/media/pdfDocument.ts";
import { validatePdfInput } from "../../lib/tool-framework/media/pdfDocument.ts";
import {
  encodeCanvas,
  forEachRenderedPdfPage,
} from "../../lib/tool-framework/media/pdfRender.ts";
import {
  createPageArchiveFilename,
  createPageOutputFilename,
  validatePdfSelection,
} from "../../lib/tool-framework/media/validation.ts";
import { zipOutputs } from "../../lib/tool-framework/media/zip.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import { ToolError, type ToolRun } from "../../lib/tool-framework/run.ts";
import type { SettingsOf } from "../../lib/tool-framework/settings.ts";

type Settings = SettingsOf<typeof import("./definition.ts").default.settings>;

export const run: ToolRun<Settings> = async (ctx): Promise<ToolResult> => {
  const input = ctx.input.files[0];
  const selection = validatePdfSelection([{ size: input.data.byteLength }]);
  if (!selection.ok) throw new ToolError(selection.code, selection.message);
  validatePdfInput(input);

  const outputs: MediaOutputFile[] = [];
  await forEachRenderedPdfPage(
    {
      file: input,
      selection: ctx.settings.pages,
      dpi: Number(ctx.settings.dpi),
      background: "white",
      signal: ctx.signal,
      progress: ctx.progress,
    },
    async (page, index, total) => {
      ctx.progress({ completed: index, total, stage: "Encoding page" });
      const buffer = await encodeCanvas(page.canvas, "jpg", ctx.settings.quality / 100);
      outputs.push({
        buffer,
        filename: createPageOutputFilename(
          input.name,
          page.pageNumber,
          page.pageCount,
          "jpg",
        ),
        mime: "image/jpeg",
        size: buffer.byteLength,
      });
      ctx.progress({ completed: index + 1, total, stage: "Page complete" });
    },
  );

  const files =
    outputs.length <= 1
      ? outputs
      : [await zipOutputs(outputs, createPageArchiveFilename(input.name))];

  return {
    render: "files",
    files,
    inputBytes: input.data.byteLength,
    outputBytes: files.reduce((sum, output) => sum + output.size, 0),
  };
};

export default run;
