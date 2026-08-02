/**
 * Moved from `combineImages` in `app/media/_workers/image.worker.ts:209-281`,
 * with the shared preflight from `run` (`image.worker.ts:88-89`).
 *
 * `options.order` was the UI's file-id list built in `buildJobOptions`
 * (`MediaWorkbench.tsx:1692`); it is now `ctx.input.items`, which falls back to
 * the file order when the layout does not supply per-item state. `quality` was
 * `number(raw.quality, 80) / 100` in the same place; the percentage is now the
 * setting and the division stays at the encode call.
 */

import {
  assertCanvasSize,
  canvasFromImage,
  context2d,
  decodeImage,
  encodeImage,
  extensionFor,
  imageFromCanvas,
  mimeFor,
  safeColor,
  type DecodableImageKind,
  type OutputImageFormat,
} from "../../lib/tool-framework/media/imageCodec.ts";
import type { MediaOutputFile } from "../../lib/tool-framework/media/pdfDocument.ts";
import {
  createOutputFilename,
  validateImageSelection,
} from "../../lib/tool-framework/media/validation.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import { ToolError, type ToolRun, type ToolRunFile } from "../../lib/tool-framework/run.ts";
import type { SettingsOf } from "../../lib/tool-framework/settings.ts";

type Settings = SettingsOf<typeof import("./definition.ts").default.settings>;

const ALLOWED: readonly DecodableImageKind[] = ["jpeg", "png", "webp", "heic"];

function outputFormat(value: string): OutputImageFormat {
  if (value === "jpeg") return "jpeg";
  if (value === "webp") return "webp";
  return "png";
}

export const run: ToolRun<Settings> = async (ctx): Promise<ToolResult> => {
  const selection = validateImageSelection(
    ctx.input.files.map((file) => ({ size: file.data.byteLength })),
  );
  if (!selection.ok) throw new ToolError(selection.code, selection.message);

  const ordered: readonly ToolRunFile[] = ctx.input.items
    ? ctx.input.items.map((item) => {
        const file = ctx.input.files.find((candidate) => candidate.id === item.id);
        if (!file) throw new ToolError("invalid-order", "The selected image order is invalid.");
        return file;
      })
    : ctx.input.files;

  const total = ordered.length;
  const format = outputFormat(ctx.settings.outputFormat);
  const background = ctx.settings.background;
  const dimensions: { height: number; width: number }[] = [];
  for (let index = 0; index < ordered.length; index += 1) {
    ctx.progress({ completed: index, total, stage: "Reading image dimensions" });
    const decoded = await decodeImage(ordered[index], ALLOWED);
    dimensions.push({ width: decoded.image.width, height: decoded.image.height });
  }
  const gap = Math.max(0, Math.round(ctx.settings.gap));
  const columns = Math.min(Math.max(1, Math.round(ctx.settings.columns)), dimensions.length);
  const rows = Math.ceil(dimensions.length / columns);
  const cellWidth = Math.max(...dimensions.map(({ width }) => width));
  const cellHeight = Math.max(...dimensions.map(({ height }) => height));
  const width =
    ctx.settings.layout === "horizontal"
      ? dimensions.reduce((sum, image) => sum + image.width, 0) + gap * (dimensions.length - 1)
      : ctx.settings.layout === "vertical"
        ? cellWidth
        : cellWidth * columns + gap * (columns - 1);
  const height =
    ctx.settings.layout === "vertical"
      ? dimensions.reduce((sum, image) => sum + image.height, 0) + gap * (dimensions.length - 1)
      : ctx.settings.layout === "horizontal"
        ? cellHeight
        : cellHeight * rows + gap * (rows - 1);
  assertCanvasSize(width, height);
  const canvas = new OffscreenCanvas(width, height);
  const context = context2d(canvas);
  context.fillStyle = safeColor(background);
  context.fillRect(0, 0, width, height);
  let offset = 0;
  for (let index = 0; index < ordered.length; index += 1) {
    ctx.signal.throwIfAborted();
    ctx.progress({ completed: index, total, stage: "Compositing image" });
    const image = (await decodeImage(ordered[index], ALLOWED)).image;
    const source = canvasFromImage(image);
    const x =
      ctx.settings.layout === "horizontal"
        ? offset
        : ctx.settings.layout === "vertical"
          ? (cellWidth - image.width) / 2
          : (index % columns) * (cellWidth + gap) + (cellWidth - image.width) / 2;
    const y =
      ctx.settings.layout === "vertical"
        ? offset
        : ctx.settings.layout === "horizontal"
          ? (cellHeight - image.height) / 2
          : Math.floor(index / columns) * (cellHeight + gap) + (cellHeight - image.height) / 2;
    context.drawImage(source, x, y);
    offset += (ctx.settings.layout === "horizontal" ? image.width : image.height) + gap;
    source.width = 1;
    source.height = 1;
  }
  const image = imageFromCanvas(canvas);
  canvas.width = 1;
  canvas.height = 1;
  const buffer = await encodeImage(image, format, ctx.settings.quality / 100, background);
  const output: MediaOutputFile = {
    buffer,
    filename: createOutputFilename(ordered[0].name, extensionFor(format), "combined"),
    mime: mimeFor(format),
    size: buffer.byteLength,
  };
  ctx.progress({ completed: total, total, stage: "Image complete" });

  return {
    render: "files",
    files: [output],
    inputBytes: ctx.input.files.reduce((sum, file) => sum + file.data.byteLength, 0),
    outputBytes: output.size,
  };
};

export default run;
