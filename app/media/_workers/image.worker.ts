import {
  calculateResizeDimensions,
  fitRect,
  normalizeCropRect,
  readExifOrientation,
  rotatedDimensions,
  type QuarterTurn,
} from "../_lib/geometry";
import {
  IMAGE_TO_PDF_QUALITY_PRESETS,
  PNG_COMPRESSION_PRESETS,
  SOCIAL_IMAGE_PRESETS,
} from "../_lib/tools";
import {
  createOutputFilename,
  sanitizeFileName,
  validateDecodedImageDimensions,
  validateImageSelection,
  validateMediaSignature,
  type MediaKind,
} from "../_lib/validation";
import {
  getOutputTransferables,
  type CompleteWorkerMessage,
  type ProgressWorkerMessage,
  type StartWorkerMessage,
  type WorkerInputFile,
  type WorkerRequestMessage,
  type WorkerResponseMessage,
} from "../_lib/workerProtocol";
import {
  isImageWorkerOperation,
  type ImageWorkerOperation,
} from "./operations";
import {
  clipEndOperators,
  clipStartOperators,
  getPdfContentBox,
  hasTransparentPixels,
} from "./workerRules";

type ImageStartMessage = {
  [Operation in ImageWorkerOperation]: StartWorkerMessage<Operation>;
}[ImageWorkerOperation];

type OutputImageFormat = "jpeg" | "png" | "webp";

type DecodedImage = {
  image: ImageData;
  kind: Exclude<MediaKind, "pdf">;
};

type WorkerScope = {
  addEventListener(
    type: "message",
    listener: (event: MessageEvent<WorkerRequestMessage>) => void,
  ): void;
  postMessage(message: WorkerResponseMessage, transfer?: Transferable[]): void;
};

const scope = globalThis as unknown as WorkerScope;
let canceledJobId: string | null = null;

scope.addEventListener("message", (event) => {
  const message = event.data;
  if (message.type === "cancel") {
    canceledJobId = message.jobId;
    return;
  }
  if (message.type === "inspect-pdf") {
    scope.postMessage({
      type: "failure",
      jobId: message.jobId,
      code: "unsupported-operation",
      message: "PDF inspection is not available in the image worker.",
    });
    return;
  }
  void run(message);
});

async function run(message: StartWorkerMessage) {
  canceledJobId = null;
  try {
    if (!isImageWorkerOperation(message.operation)) {
      throw new MediaWorkerError("unsupported-operation", "This image operation is not available.");
    }
    const selection = validateImageSelection(message.files.map(({ metadata }) => metadata));
    if (!selection.ok) throw new MediaWorkerError(selection.code, selection.message);
    const outputs =
      message.operation === "image-to-pdf"
        ? [await createPdfFromImages(message as StartWorkerMessage<"image-to-pdf">)]
        : message.operation === "combine-images"
          ? [await combineImages(message as StartWorkerMessage<"combine-images">)]
        : await processImages(message as ImageStartMessage);
    checkCanceled(message.jobId);
    const complete: CompleteWorkerMessage = {
      type: "complete",
      jobId: message.jobId,
      outputs,
      inputBytes: message.files.reduce((total, file) => total + file.metadata.size, 0),
      outputBytes: outputs.reduce((total, output) => total + output.size, 0),
    };
    scope.postMessage(complete, getOutputTransferables(complete));
  } catch (error) {
    const failure = safeFailure(error, message.jobId);
    if (failure) scope.postMessage(failure);
  }
}

async function processImages(message: ImageStartMessage) {
  const outputs = [];
  for (let index = 0; index < message.files.length; index += 1) {
    checkCanceled(message.jobId);
    progress(message, index + 1, index, "Decoding image");
    const input = message.files[index];
    let { image, kind } = await decodeImage(input, allowedKinds(message.operation));
    let format: OutputImageFormat = originalOutputFormat(kind);
    let quality = optionQuality(message.options);
    let background = optionString(message.options, "background", "#ffffff");
    let suffix = "converted";
    let pngEffort = 6;

    switch (message.operation) {
      case "jpg-to-png":
      case "webp-to-png":
      case "heic-to-png":
        format = "png";
        break;
      case "png-to-jpg":
      case "webp-to-jpg":
      case "heic-to-jpg":
        format = "jpeg";
        break;
      case "jpg-to-webp":
      case "png-to-webp":
        format = "webp";
        break;
      case "compress-image": {
        suffix = "compressed";
        const preset = message.options.preset;
        quality =
          message.options.quality ??
          (preset === "best" ? 0.9 : preset === "smallest" ? 0.6 : 0.8);
        pngEffort = PNG_COMPRESSION_PRESETS[preset as keyof typeof PNG_COMPRESSION_PRESETS]?.effort ?? 6;
        break;
      }
      case "resize-image": {
        suffix = "resized";
        format = resolveOutputFormat(message.options.outputFormat, kind);
        quality = message.options.quality ?? 0.8;
        image = await resizeForOptions(image, message.options, background);
        break;
      }
      case "crop-image": {
        suffix = "cropped";
        format = resolveOutputFormat(message.options.outputFormat, kind);
        quality = message.options.quality ?? 0.8;
        image = cropImage(image, message.options.crop);
        break;
      }
      case "rotate-image":
        suffix = "rotated";
        format = resolveOutputFormat(message.options.outputFormat, kind);
        quality = message.options.quality ?? 0.8;
        image = rotateImage(image, message.options.degrees);
        break;
      case "flip-image":
        suffix = "flipped";
        format = resolveOutputFormat(message.options.outputFormat, kind);
        quality = message.options.quality ?? 0.8;
        image = flipImage(image, message.options.axis);
        break;
      case "remove-image-metadata":
        suffix = "metadata-removed";
        break;
      case "social-media-image-resizer": {
        suffix = message.options.preset;
        const preset = SOCIAL_IMAGE_PRESETS[message.options.preset];
        format = message.options.outputFormat;
        quality = message.options.quality ?? 0.8;
        background = message.options.background;
        image = await fitImage(
          image,
          { width: preset.width, height: preset.height },
          message.options.fit,
          background,
        );
        break;
      }
      default:
        break;
    }

    progress(message, index + 1, index, "Encoding image");
    const buffer = await encodeImage(image, format, quality, background, pngEffort);
    const filename = createOutputFilename(input.metadata.name, extensionFor(format), suffix);
    outputs.push({
      buffer,
      filename,
      mime: mimeFor(format),
      size: buffer.byteLength,
    });
    progress(message, index + 1, index + 1, "Image complete");
  }
  return outputs;
}

async function combineImages(message: StartWorkerMessage<"combine-images">) {
  const ordered = message.options.order.map((id) => {
    const file = message.files.find((candidate) => candidate.id === id);
    if (!file) throw new MediaWorkerError("invalid-order", "The selected image order is invalid.");
    return file;
  });
  const dimensions: { height: number; width: number }[] = [];
  for (let index = 0; index < ordered.length; index += 1) {
    progress(message, index + 1, index, "Reading image dimensions");
    const decoded = await decodeImage(ordered[index], ["jpeg", "png", "webp", "heic"]);
    dimensions.push({ width: decoded.image.width, height: decoded.image.height });
  }
  const gap = Math.max(0, Math.round(message.options.gap));
  const columns = Math.min(Math.max(1, Math.round(message.options.columns ?? 2)), dimensions.length);
  const rows = Math.ceil(dimensions.length / columns);
  const cellWidth = Math.max(...dimensions.map(({ width }) => width));
  const cellHeight = Math.max(...dimensions.map(({ height }) => height));
  const width =
    message.options.layout === "horizontal"
      ? dimensions.reduce((sum, image) => sum + image.width, 0) + gap * (dimensions.length - 1)
      : message.options.layout === "vertical"
        ? cellWidth
        : cellWidth * columns + gap * (columns - 1);
  const height =
    message.options.layout === "vertical"
      ? dimensions.reduce((sum, image) => sum + image.height, 0) + gap * (dimensions.length - 1)
      : message.options.layout === "horizontal"
        ? cellHeight
        : cellHeight * rows + gap * (rows - 1);
  assertCanvasSize(width, height);
  const canvas = new OffscreenCanvas(width, height);
  const context = context2d(canvas);
  context.fillStyle = safeColor(message.options.background);
  context.fillRect(0, 0, width, height);
  let offset = 0;
  for (let index = 0; index < ordered.length; index += 1) {
    checkCanceled(message.jobId);
    progress(message, index + 1, index, "Compositing image");
    const image = (await decodeImage(ordered[index], ["jpeg", "png", "webp", "heic"])).image;
    const source = canvasFromImage(image);
    const x =
      message.options.layout === "horizontal"
        ? offset
        : message.options.layout === "vertical"
          ? (cellWidth - image.width) / 2
          : (index % columns) * (cellWidth + gap) + (cellWidth - image.width) / 2;
    const y =
      message.options.layout === "vertical"
        ? offset
        : message.options.layout === "horizontal"
          ? (cellHeight - image.height) / 2
          : Math.floor(index / columns) * (cellHeight + gap) + (cellHeight - image.height) / 2;
    context.drawImage(source, x, y);
    offset += (message.options.layout === "horizontal" ? image.width : image.height) + gap;
    source.width = 1;
    source.height = 1;
  }
  const image = imageFromCanvas(canvas);
  canvas.width = 1;
  canvas.height = 1;
  const buffer = await encodeImage(
    image,
    message.options.outputFormat,
    message.options.quality ?? 0.8,
    message.options.background,
  );
  return {
    buffer,
    filename: createOutputFilename(ordered[0].metadata.name, extensionFor(message.options.outputFormat), "combined"),
    mime: mimeFor(message.options.outputFormat),
    size: buffer.byteLength,
  };
}

async function createPdfFromImages(message: StartWorkerMessage<"image-to-pdf">) {
  const pdfLib = await import("pdf-lib");
  const { PDFDocument } = pdfLib;
  const pdf = await PDFDocument.create();
  const inputs = message.options.items.map((item) => {
    const file = message.files.find(({ id }) => id === item.id);
    if (!file) throw new MediaWorkerError("invalid-order", "The selected image order is invalid.");
    return { file, rotation: item.rotation };
  });
  const quality = IMAGE_TO_PDF_QUALITY_PRESETS[message.options.quality];
  const margin = { none: 0, small: 18, normal: 36 }[message.options.margin];

  for (let index = 0; index < inputs.length; index += 1) {
    checkCanceled(message.jobId);
    progress(message, index + 1, index, "Adding image to PDF");
    const { file, rotation } = inputs[index];
    const decoded = await decodeImage(file, ["jpeg", "png", "webp", "heic"]);
    const image = rotation ? rotateImage(decoded.image, rotation) : decoded.image;
    const hasExifOrientation =
      decoded.kind === "jpeg" && readExifOrientation(new Uint8Array(file.data)) !== 1;
    const flattenOriginalPng =
      decoded.kind === "png" &&
      !quality.reencode &&
      !rotation &&
      hasTransparentPixels(image.data);
    const embeddedBytes =
      flattenOriginalPng
        ? await encodeImage(
            flattenImage(image, message.options.background),
            "png",
            1,
            message.options.background,
          )
        : quality.reencode ||
            rotation ||
            hasExifOrientation ||
            !["jpeg", "png"].includes(decoded.kind)
          ? await encodeImage(image, "jpeg", quality.quality, message.options.background)
          : file.data;
    const embedded =
      !quality.reencode && !rotation && !hasExifOrientation && decoded.kind === "png"
        ? await pdf.embedPng(embeddedBytes)
        : await pdf.embedJpg(embeddedBytes);
    const pageSize = pdfPageSize(
      message.options.page,
      message.options.orientation,
      image.width,
      image.height,
      margin,
    );
    const page = pdf.addPage([pageSize.width, pageSize.height]);
    const inner = getPdfContentBox(pageSize.width, pageSize.height, margin);
    const placement = fitRect(
      { width: image.width, height: image.height },
      inner,
      message.options.fit === "fill" ? "cover" : "contain",
    );
    if (message.options.fit === "fill") {
      page.pushOperators(...clipStartOperators(inner, pdfLib));
    }
    page.drawImage(embedded, {
      x: inner.x + placement.x,
      y: inner.y + placement.y,
      width: placement.width,
      height: placement.height,
    });
    if (message.options.fit === "fill") {
      page.pushOperators(...clipEndOperators(pdfLib));
    }
    progress(message, index + 1, index + 1, "Page complete");
  }

  const saved = await pdf.save();
  const buffer = saved.buffer.slice(saved.byteOffset, saved.byteOffset + saved.byteLength) as ArrayBuffer;
  const requestedName = sanitizeFileName(message.options.filename, "converted-images.pdf");
  const filename = requestedName.toLowerCase().endsWith(".pdf")
    ? requestedName
    : `${requestedName}.pdf`;
  return { buffer, filename, mime: "application/pdf", size: buffer.byteLength };
}

async function decodeImage(
  input: WorkerInputFile,
  allowed: readonly Exclude<MediaKind, "pdf">[],
): Promise<DecodedImage> {
  const bytes = new Uint8Array(input.data);
  const signature = validateMediaSignature(bytes, input.metadata.mime, allowed);
  if (!signature.ok) throw new MediaWorkerError(signature.code, signature.message);
  if (signature.kind === "pdf") {
    throw new MediaWorkerError("unsupported-type", "Choose a supported image file.");
  }
  let image: ImageData;
  if (signature.kind === "jpeg") {
    const { decode } = await import("@jsquash/jpeg");
    image = await decode(input.data, { preserveOrientation: true });
  } else if (signature.kind === "png") {
    const { decode } = await import("@jsquash/png");
    image = await decode(input.data);
  } else if (signature.kind === "webp") {
    const { decode } = await import("@jsquash/webp");
    image = await decode(input.data);
  } else {
    const { heicTo } = await import("heic-to/csp");
    const bitmap = await heicTo({
      blob: new Blob([input.data], { type: input.metadata.mime }),
      type: "bitmap",
    });
    if (!(bitmap instanceof ImageBitmap)) {
      throw new MediaWorkerError("image-sequence", "Multi-image HEIC sequences are not supported.");
    }
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    context2d(canvas).drawImage(bitmap, 0, 0);
    bitmap.close();
    image = imageFromCanvas(canvas);
    canvas.width = 1;
    canvas.height = 1;
  }
  const dimensions = validateDecodedImageDimensions(image.width, image.height);
  if (!dimensions.ok) throw new MediaWorkerError(dimensions.code, dimensions.message);
  return { image, kind: signature.kind };
}

async function encodeImage(
  image: ImageData,
  format: OutputImageFormat,
  quality = 0.8,
  background = "#ffffff",
  pngEffort = 6,
) {
  if (format === "jpeg") {
    const { encode } = await import("@jsquash/jpeg");
    return encode(flattenImage(image, background), {
      quality: Math.round(clamp(quality, 0.01, 1) * 100),
    });
  }
  if (format === "webp") {
    const { encode } = await import("@jsquash/webp");
    return encode(image, { quality: Math.round(clamp(quality, 0.01, 1) * 100) });
  }
  const [{ encode }, { optimise }] = await Promise.all([
    import("@jsquash/png"),
    import("@jsquash/oxipng"),
  ]);
  const encoded = await encode(image);
  return optimise(encoded, {
    level: Math.min(6, Math.max(1, Math.round((pngEffort * 2) / 3))),
    interlace: false,
    optimiseAlpha: true,
  });
}

async function resizeForOptions(
  image: ImageData,
  options: StartWorkerMessage<"resize-image">["options"],
  background: string,
) {
  const calculated = calculateResizeDimensions(image, {
    width: options.width,
    height: options.height,
    percentage: options.percentage,
    lockAspectRatio: options.lockAspectRatio,
    noUpscale: options.noUpscale,
  });
  const hasBox = options.width !== undefined && options.height !== undefined;
  if (hasBox && options.fit !== "stretch") {
    const target = {
      width: options.noUpscale ? Math.min(options.width!, image.width) : options.width!,
      height: options.noUpscale ? Math.min(options.height!, image.height) : options.height!,
    };
    return fitImage(image, target, options.fit, background);
  }
  const { default: resize } = await import("@jsquash/resize");
  return resize(image, {
    width: calculated.width,
    height: calculated.height,
    method: "lanczos3",
    fitMethod: "stretch",
  });
}

async function fitImage(
  image: ImageData,
  target: { width: number; height: number },
  mode: "contain" | "cover" | "stretch",
  background: string,
) {
  assertCanvasSize(target.width, target.height);
  const placement = fitRect(image, target, mode);
  const { default: resize } = await import("@jsquash/resize");
  const resized = await resize(image, {
    width: Math.max(1, Math.round(placement.width)),
    height: Math.max(1, Math.round(placement.height)),
    method: "lanczos3",
    fitMethod: "stretch",
  });
  const canvas = new OffscreenCanvas(target.width, target.height);
  const context = context2d(canvas);
  context.fillStyle = safeColor(background);
  context.fillRect(0, 0, target.width, target.height);
  const resizedCanvas = canvasFromImage(resized);
  context.drawImage(resizedCanvas, Math.round(placement.x), Math.round(placement.y));
  resizedCanvas.width = 1;
  resizedCanvas.height = 1;
  const output = imageFromCanvas(canvas);
  canvas.width = 1;
  canvas.height = 1;
  return output;
}

function cropImage(
  image: ImageData,
  requested: { x: number; y: number; width: number; height: number },
) {
  const x = Math.max(0, Math.round(requested.x));
  const y = Math.max(0, Math.round(requested.y));
  const crop = normalizeCropRect(
    {
      x,
      y,
      width: Math.max(1, Math.round(requested.width || image.width - x)),
      height: Math.max(1, Math.round(requested.height || image.height - y)),
    },
    image,
  );
  const canvas = new OffscreenCanvas(crop.width, crop.height);
  const source = canvasFromImage(image);
  context2d(canvas).drawImage(
    source,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height,
  );
  source.width = 1;
  source.height = 1;
  const output = imageFromCanvas(canvas);
  canvas.width = 1;
  canvas.height = 1;
  return output;
}

function rotateImage(image: ImageData, degrees: QuarterTurn) {
  const dimensions = rotatedDimensions(image.width, image.height, degrees);
  const source = canvasFromImage(image);
  const canvas = new OffscreenCanvas(dimensions.width, dimensions.height);
  const context = context2d(canvas);
  context.translate(dimensions.width / 2, dimensions.height / 2);
  context.rotate((degrees * Math.PI) / 180);
  context.drawImage(source, -image.width / 2, -image.height / 2);
  source.width = 1;
  source.height = 1;
  const output = imageFromCanvas(canvas);
  canvas.width = 1;
  canvas.height = 1;
  return output;
}

function flipImage(image: ImageData, axis: "horizontal" | "vertical") {
  const source = canvasFromImage(image);
  const canvas = new OffscreenCanvas(image.width, image.height);
  const context = context2d(canvas);
  context.translate(axis === "horizontal" ? image.width : 0, axis === "vertical" ? image.height : 0);
  context.scale(axis === "horizontal" ? -1 : 1, axis === "vertical" ? -1 : 1);
  context.drawImage(source, 0, 0);
  source.width = 1;
  source.height = 1;
  const output = imageFromCanvas(canvas);
  canvas.width = 1;
  canvas.height = 1;
  return output;
}

function flattenImage(image: ImageData, background: string) {
  const source = canvasFromImage(image);
  const canvas = new OffscreenCanvas(image.width, image.height);
  const context = context2d(canvas);
  context.fillStyle = safeColor(background);
  context.fillRect(0, 0, image.width, image.height);
  context.drawImage(source, 0, 0);
  source.width = 1;
  source.height = 1;
  const output = imageFromCanvas(canvas);
  canvas.width = 1;
  canvas.height = 1;
  return output;
}

function canvasFromImage(image: ImageData) {
  const canvas = new OffscreenCanvas(image.width, image.height);
  context2d(canvas).putImageData(image, 0, 0);
  return canvas;
}

function imageFromCanvas(canvas: OffscreenCanvas) {
  return context2d(canvas).getImageData(0, 0, canvas.width, canvas.height);
}

function context2d(canvas: OffscreenCanvas) {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new MediaWorkerError("canvas-unavailable", "This browser cannot create an image canvas.");
  return context;
}

function pdfPageSize(
  page: "auto" | "a4" | "letter",
  orientation: "auto" | "portrait" | "landscape",
  imageWidth: number,
  imageHeight: number,
  margin: number,
) {
  let width = page === "a4" ? 595.28 : page === "letter" ? 612 : imageWidth * 0.75 + margin * 2;
  let height = page === "a4" ? 841.89 : page === "letter" ? 792 : imageHeight * 0.75 + margin * 2;
  const desired = orientation === "auto" ? (imageWidth > imageHeight ? "landscape" : "portrait") : orientation;
  if ((desired === "landscape") !== (width > height)) [width, height] = [height, width];
  return { width, height };
}

function allowedKinds(operation: ImageWorkerOperation): readonly Exclude<MediaKind, "pdf">[] {
  if (operation === "crop-image") return ["jpeg", "png", "webp"];
  if (operation.startsWith("jpg-")) return ["jpeg"];
  if (operation.startsWith("png-")) return ["png"];
  if (operation.startsWith("webp-")) return ["webp"];
  if (operation.startsWith("heic-")) return ["heic"];
  return ["jpeg", "png", "webp", "heic"];
}

function resolveOutputFormat(
  requested: "original" | OutputImageFormat,
  original: Exclude<MediaKind, "pdf">,
): OutputImageFormat {
  return requested === "original" ? originalOutputFormat(original) : requested;
}

function originalOutputFormat(kind: Exclude<MediaKind, "pdf">): OutputImageFormat {
  return kind === "heic" ? "jpeg" : kind;
}

function extensionFor(format: OutputImageFormat) {
  return format === "jpeg" ? "jpg" : format;
}

function mimeFor(format: OutputImageFormat) {
  return `image/${format}`;
}

function optionQuality(options: object) {
  const value = Reflect.get(options, "quality");
  return typeof value === "number" ? value : 0.8;
}

function optionString(options: object, key: string, fallback: string) {
  const value = Reflect.get(options, key);
  return typeof value === "string" ? value : fallback;
}

function progress(
  message: StartWorkerMessage,
  current: number,
  completed: number,
  stage: string,
) {
  checkCanceled(message.jobId);
  const update: ProgressWorkerMessage = {
    type: "progress",
    jobId: message.jobId,
    current,
    completed,
    total: message.files.length,
    stage,
  };
  scope.postMessage(update);
}

function checkCanceled(jobId: string) {
  if (canceledJobId === jobId) throw new MediaWorkerError("canceled", "Processing was canceled.");
}

function safeFailure(error: unknown, jobId: string) {
  if (error instanceof MediaWorkerError && error.code === "canceled") return null;
  if (error instanceof MediaWorkerError) {
    return { type: "failure", jobId, code: error.code, message: error.message } as const;
  }
  const allocationFailure =
    error instanceof RangeError ||
    (error instanceof Error && /memory|alloc|canvas|bitmap/i.test(error.message));
  return {
    type: "failure",
    jobId,
    code: allocationFailure ? "memory-limit" : "processing-failed",
    message: allocationFailure
      ? "The browser ran out of working memory. Try fewer or smaller images."
      : "The image could not be processed. It may be malformed or unsupported.",
  } as const;
}

function assertCanvasSize(width: number, height: number) {
  const result = validateDecodedImageDimensions(Math.round(width), Math.round(height));
  if (!result.ok) throw new MediaWorkerError(result.code, result.message);
}

function safeColor(value: string) {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : "#ffffff";
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

class MediaWorkerError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
