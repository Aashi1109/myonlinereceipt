/**
 * Moved from the `jpg-to-webp` arm of `processImages` in
 * `app/media/_workers/image.worker.ts:111-207`.
 *
 * The input allowlist (`allowedKinds`, image.worker.ts:604) and the WebP output
 * format that the operation name used to imply are both stated here now.
 * `quality` was `number(raw.quality, 80) / 100` in `buildJobOptions`
 * (`MediaWorkbench.tsx:1601`); the percentage is now the setting and the
 * division stays at the encode call.
 */

import {
  decodeImage,
  encodeImage,
  type DecodableImageKind,
} from "../../lib/tool-framework/media/imageCodec.ts";
import type { MediaOutputFile } from "../../lib/tool-framework/media/pdfDocument.ts";
import {
  createOutputFilename,
  validateImageSelection,
} from "../../lib/tool-framework/media/validation.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import { ToolError, type ToolRun } from "../../lib/tool-framework/run.ts";
import type { SettingsOf } from "../../lib/tool-framework/settings.ts";

type Settings = SettingsOf<typeof import("./definition.ts").default.settings>;

const ALLOWED: readonly DecodableImageKind[] = ["jpeg"];

export const run: ToolRun<Settings> = async (ctx): Promise<ToolResult> => {
  const selection = validateImageSelection(
    ctx.input.files.map((file) => ({ size: file.data.byteLength })),
  );
  if (!selection.ok) throw new ToolError(selection.code, selection.message);

  const quality = ctx.settings.quality / 100;
  const total = ctx.input.files.length;
  const outputs: MediaOutputFile[] = [];
  for (let index = 0; index < total; index += 1) {
    ctx.signal.throwIfAborted();
    ctx.progress({ completed: index, total, stage: "Decoding image" });
    const input = ctx.input.files[index];
    const { image } = await decodeImage(input, ALLOWED);
    ctx.progress({ completed: index, total, stage: "Encoding image" });
    const buffer = await encodeImage(image, "webp", quality);
    outputs.push({
      buffer,
      filename: createOutputFilename(input.name, "webp", "converted"),
      mime: "image/webp",
      size: buffer.byteLength,
    });
    ctx.progress({ completed: index + 1, total, stage: "Image complete" });
  }

  return {
    render: "files",
    files: outputs,
    inputBytes: ctx.input.files.reduce((sum, file) => sum + file.data.byteLength, 0),
    outputBytes: outputs.reduce((sum, output) => sum + output.size, 0),
  };
};

export default run;
