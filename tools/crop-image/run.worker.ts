/**
 * Moved from the `crop-image` arm of `processImages`
 * (`app/media/_workers/image.worker.ts:111-206`, crop case at 155-161). The
 * loop is single-file here because this tool declares `multiple: false`.
 *
 * `image.worker.ts` derived the accepted kinds from the operation name via
 * `allowedKinds` (`image.worker.ts:604-612`); this tool states them itself, and
 * they match the `accept` list in its spec.
 */

import {
  cropImage,
  decodeImage,
  encodeImage,
  extensionFor,
  mimeFor,
  resolveOutputFormat,
  type OutputImageFormat,
} from "../../lib/tool-framework/media/imageCodec.ts";
import { createOutputFilename } from "../../lib/tool-framework/media/validation.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import { ToolError, type ToolRun } from "../../lib/tool-framework/run.ts";
import type { SettingsOf } from "../../lib/tool-framework/settings.ts";

type Settings = SettingsOf<typeof import("./definition.ts").default.settings>;

const ACCEPTED = ["jpeg", "png", "webp"] as const;

function outputFormat(requested: string): "original" | OutputImageFormat {
  return requested === "jpeg" || requested === "png" || requested === "webp"
    ? requested
    : "original";
}

export const run: ToolRun<Settings> = async (ctx): Promise<ToolResult> => {
  const input = ctx.input.files[0];
  if (!input) throw new ToolError("no-files", "Choose an image to crop.");

  ctx.progress({ completed: 0, total: 1, stage: "Decoding image" });
  const { image, kind } = await decodeImage(input, ACCEPTED);
  ctx.signal.throwIfAborted();

  const format = resolveOutputFormat(outputFormat(ctx.settings.outputFormat), kind);
  const cropped = cropImage(image, {
    x: ctx.settings.cropX,
    y: ctx.settings.cropY,
    width: ctx.settings.cropWidth,
    height: ctx.settings.cropHeight,
  });
  ctx.signal.throwIfAborted();

  ctx.progress({ completed: 0, total: 1, stage: "Encoding image" });
  const buffer = await encodeImage(cropped, format, ctx.settings.quality / 100);
  ctx.signal.throwIfAborted();
  ctx.progress({ completed: 1, total: 1, stage: "Image complete" });

  return {
    render: "files",
    files: [
      {
        buffer,
        filename: createOutputFilename(input.name, extensionFor(format), "cropped"),
        mime: mimeFor(format),
        size: buffer.byteLength,
      },
    ],
    inputBytes: input.data.byteLength,
    outputBytes: buffer.byteLength,
  };
};

export default run;
