import { fitRect, readExifOrientation } from "../lib/geometry";
import { STRONG_PDF_COMPRESSION_PRESETS } from "../lib/tools";
import {
  createOutputFilename,
  createPageArchiveFilename,
  createPageOutputFilename,
  validateDecodedImageDimensions,
  validateImageSelection,
  validateMediaSignature,
  validatePdfSelection,
} from "../lib/validation";
import {
  getOutputTransferables,
  getPdfInspectionTransferables,
  type CompleteWorkerMessage,
  type InspectPdfWorkerMessage,
  type PdfInspectionWorkerMessage,
  type ProgressWorkerMessage,
  type StartWorkerMessage,
  type WatermarkPosition,
  type WorkerInputFile,
  type WorkerRequestMessage,
  type WorkerResponseMessage,
} from "../lib/workerProtocol";
import {
  isPdfWorkerOperation,
  type PdfWorkerOperation,
} from "./operations";
import { preservePdfWithQpdf, QpdfAdapterError } from "./qpdfAdapter";
import {
  PdfPreflightError,
  getPdfContentBox,
  inspectPdfBeforeStructuralRewrite,
  processStructuralPages,
  wrapPageContentsWithClip,
} from "./workerRules";

type PdfStartMessage = {
  [Operation in PdfWorkerOperation]: StartWorkerMessage<Operation>;
}[PdfWorkerOperation];

type WorkerScope = {
  addEventListener(
    type: "message",
    listener: (event: MessageEvent<WorkerRequestMessage>) => void,
  ): void;
  postMessage(message: WorkerResponseMessage, transfer?: Transferable[]): void;
};

type LoadedPdf = Awaited<ReturnType<typeof loadPdf>>;
type PdfPage = ReturnType<LoadedPdf["getPage"]>;

const scope = globalThis as unknown as WorkerScope;
let canceledJobId: string | null = null;

scope.addEventListener("message", (event) => {
  const message = event.data;
  if (message.type === "cancel") {
    canceledJobId = message.jobId;
    return;
  }
  if (message.type === "inspect-pdf") {
    void inspectPdf(message);
    return;
  }
  void run(message);
});

async function run(message: StartWorkerMessage) {
  canceledJobId = null;
  try {
    if (!isPdfWorkerOperation(message.operation)) {
      throw new PdfWorkerError("unsupported-operation", "This PDF operation is not available.");
    }
    const outputs = await processPdf(message as PdfStartMessage);
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

async function processPdf(message: PdfStartMessage) {
  const pdfInputs = getPdfInputs(message);
  const selection = validatePdfSelection(
    pdfInputs.map(({ metadata }) => metadata),
    { merge: message.operation === "merge-pdf" },
  );
  if (!selection.ok) throw new PdfWorkerError(selection.code, selection.message);
  for (const input of pdfInputs) validatePdfInput(input);

  switch (message.operation) {
    case "pdf-to-jpg":
    case "pdf-to-png":
      return convertPdfToImages(message);
    case "merge-pdf":
      return [await mergePdfs(message)];
    case "split-pdf":
      return splitPdf(message);
    case "extract-pdf-pages":
      return [await extractPdfPages(message)];
    case "reorder-pdf-pages":
      return [await reorderPdfPages(message)];
    case "rotate-pdf-pages":
      return [await rotatePdfPages(message)];
    case "delete-pdf-pages":
      return [await deletePdfPages(message)];
    case "crop-pdf":
      return [await cropPdf(message)];
    case "resize-pdf-pages":
      return [await resizePdfPages(message)];
    case "compress-pdf":
      return [
        message.options.mode === "preserve"
          ? await preserveCompressPdf(message)
          : await strongCompressPdf(message),
      ];
    case "watermark-pdf":
      return [await watermarkPdf(message)];
    case "add-page-numbers":
      return [await addPageNumbers(message)];
  }
}

async function convertPdfToImages(
  message: StartWorkerMessage<"pdf-to-jpg" | "pdf-to-png">,
) {
  const input = message.files[0];
  const extension = message.operation === "pdf-to-jpg" ? "jpg" : "png";
  const mime = message.operation === "pdf-to-jpg" ? "image/jpeg" : "image/png";
  const outputs: {
    buffer: ArrayBuffer;
    filename: string;
    mime: string;
    size: number;
  }[] = [];
  await forEachRenderedPdfPage(
    input,
    message.options.pages,
    message.options.dpi,
    message.operation === "pdf-to-jpg" ? "white" : message.options.background,
    message.jobId,
    "original",
    async (page, index, total) => {
      progress(message, page.pageNumber, index, total, "Encoding page");
      const buffer = await encodeCanvas(
        page.canvas,
        extension,
        message.operation === "pdf-to-jpg" ? message.options.quality ?? 0.85 : 1,
      );
      outputs.push({
        buffer,
        filename: createPageOutputFilename(
          input.metadata.name,
          page.pageNumber,
          page.pageCount,
          extension,
        ),
        mime,
        size: buffer.byteLength,
      });
      progress(message, page.pageNumber, index + 1, total, "Page complete");
    },
  );
  if (outputs.length <= 1) return outputs;

  const { zipSync } = await import("fflate");
  const entries = Object.fromEntries(
    outputs.map((output) => [output.filename, new Uint8Array(output.buffer)]),
  );
  const archive = zipSync(entries, { level: 6 });
  const buffer = exactBuffer(archive);
  return [
    {
      buffer,
      filename: createPageArchiveFilename(input.metadata.name),
      mime: "application/zip",
      size: buffer.byteLength,
    },
  ];
}

async function mergePdfs(message: StartWorkerMessage<"merge-pdf">) {
  const { PDFDocument } = await import("pdf-lib");
  const output = await PDFDocument.create();
  const ordered = message.options.order.map((id) => {
    const input = message.files.find((file) => file.id === id);
    if (!input) throw new PdfWorkerError("invalid-order", "The selected PDF order is invalid.");
    return input;
  });
  let totalPages = 0;
  for (let index = 0; index < ordered.length; index += 1) {
    progress(message, index + 1, index, ordered.length, "Copying PDF pages");
    const source = await loadPdf(ordered[index]);
    totalPages += source.getPageCount();
    enforcePageLimit(ordered[index], totalPages, false);
    await addCopiedPagesWithProgress(
      message,
      output,
      source,
      source.getPageIndices(),
      "Copying PDF page",
    );
  }
  return pdfOutput(
    await output.save(),
    createOutputFilename(ordered[0].metadata.name, "pdf", "merged"),
  );
}

async function splitPdf(message: StartWorkerMessage<"split-pdf">) {
  const { PDFDocument } = await import("pdf-lib");
  const input = message.files[0];
  const source = await loadPdf(input);
  const count = source.getPageCount();
  enforcePageLimit(input, count, false);
  let groups: number[][];
  if (message.options.mode === "every-page") {
    groups = Array.from({ length: count }, (_, index) => [index + 1]);
  } else if (message.options.mode === "interval") {
    if (!Number.isInteger(message.options.interval) || message.options.interval < 1) {
      throw new PdfWorkerError("invalid-interval", "Pages per file must be a positive whole number.");
    }
    groups = [];
    for (let page = 1; page <= count; page += message.options.interval) {
      groups.push(
        Array.from(
          { length: Math.min(message.options.interval, count - page + 1) },
          (_, index) => page + index,
        ),
      );
    }
  } else {
    groups = message.options.ranges.map((range) => [...range]);
  }
  if (!groups.length) throw new PdfWorkerError("empty-range", "Choose at least one page range.");

  const outputs = [];
  for (let index = 0; index < groups.length; index += 1) {
    const pages = checkedPages(groups[index], count);
    const document = await PDFDocument.create();
    await addCopiedPagesWithProgress(
      message,
      document,
      source,
      pages,
      "Creating split PDF",
    );
    outputs.push(
      pdfOutput(
        await document.save(),
        createOutputFilename(
          input.metadata.name,
          "pdf",
          `part-${String(index + 1).padStart(2, "0")}`,
        ),
      ),
    );
  }
  return outputs;
}

async function extractPdfPages(message: StartWorkerMessage<"extract-pdf-pages">) {
  const { PDFDocument } = await import("pdf-lib");
  const input = message.files[0];
  const source = await loadPdf(input);
  enforcePageLimit(input, source.getPageCount(), false);
  const pages = checkedPages(message.options.pages, source.getPageCount());
  const output = await PDFDocument.create();
  await addCopiedPagesWithProgress(
    message,
    output,
    source,
    pages,
    "Extracting PDF page",
  );
  return pdfOutput(
    await output.save(),
    createOutputFilename(input.metadata.name, "pdf", "extracted"),
  );
}

async function reorderPdfPages(message: StartWorkerMessage<"reorder-pdf-pages">) {
  const { PDFDocument } = await import("pdf-lib");
  const input = message.files[0];
  const source = await loadPdf(input);
  const count = source.getPageCount();
  enforcePageLimit(input, count, false);
  const pages = checkedPages(message.options.pages, count, false);
  if (pages.length !== count || new Set(pages).size !== count) {
    throw new PdfWorkerError("incomplete-order", "Include every PDF page exactly once in the new order.");
  }
  const output = await PDFDocument.create();
  await addCopiedPagesWithProgress(
    message,
    output,
    source,
    pages,
    "Reordering PDF page",
  );
  return pdfOutput(
    await output.save(),
    createOutputFilename(input.metadata.name, "pdf", "reordered"),
  );
}

async function rotatePdfPages(message: StartWorkerMessage<"rotate-pdf-pages">) {
  const { degrees } = await import("pdf-lib");
  const input = message.files[0];
  const pdf = await loadPdf(input);
  enforcePageLimit(input, pdf.getPageCount(), false);
  const selected = resolvePageSelection(message.options.pages, pdf.getPageCount());
  await processStructuralPages(
    selected,
    (index) => index + 1,
    "Rotating PDF page",
    reportStructuralProgress(message),
    (index) => {
      const page = pdf.getPage(index);
      page.setRotation(degrees((page.getRotation().angle + message.options.degrees) % 360));
    },
  );
  return pdfOutput(
    await pdf.save(),
    createOutputFilename(input.metadata.name, "pdf", "rotated"),
  );
}

async function deletePdfPages(message: StartWorkerMessage<"delete-pdf-pages">) {
  const input = message.files[0];
  const pdf = await loadPdf(input);
  const count = pdf.getPageCount();
  enforcePageLimit(input, count, false);
  const pages = checkedPages(message.options.pages, count);
  if (pages.length >= count) {
    throw new PdfWorkerError("empty-document", "At least one PDF page must remain.");
  }
  const descending = [...pages].sort((a, b) => b - a);
  await processStructuralPages(
    descending,
    (index) => index + 1,
    "Deleting PDF page",
    reportStructuralProgress(message),
    (index) => pdf.removePage(index),
  );
  return pdfOutput(
    await pdf.save(),
    createOutputFilename(input.metadata.name, "pdf", "pages-deleted"),
  );
}

async function cropPdf(message: StartWorkerMessage<"crop-pdf">) {
  const input = message.files[0];
  const pdf = await loadPdf(input);
  enforcePageLimit(input, pdf.getPageCount(), false);
  const pages = resolvePageSelection(message.options.pages, pdf.getPageCount());
  await processStructuralPages(
    pages,
    (index) => index + 1,
    "Cropping PDF page",
    reportStructuralProgress(message),
    (index) => {
      const page = pdf.getPage(index);
      const x = Math.max(0, message.options.box.x);
      const y = Math.max(0, message.options.box.y);
      const width = message.options.box.width || page.getWidth() - x;
      const height = message.options.box.height || page.getHeight() - y;
      if (width <= 0 || height <= 0 || x + width > page.getWidth() || y + height > page.getHeight()) {
        throw new PdfWorkerError("invalid-crop", "The crop box must stay within every selected page.");
      }
      page.setCropBox(x, y, width, height);
    },
  );
  return pdfOutput(
    await pdf.save(),
    createOutputFilename(input.metadata.name, "pdf", "cropped"),
  );
}

async function resizePdfPages(message: StartWorkerMessage<"resize-pdf-pages">) {
  const pdfLib = await import("pdf-lib");
  const { PDFArray, PDFDict, PDFName, PDFNumber } = pdfLib;
  const input = message.files[0];
  const pdf = await loadPdf(input);
  enforcePageLimit(input, pdf.getPageCount(), false);
  const pages = resolvePageSelection(message.options.pages, pdf.getPageCount());
  await processStructuralPages(
    pages,
    (index) => index + 1,
    "Resizing PDF page",
    reportStructuralProgress(message),
    (index) => {
    const page = pdf.getPage(index);
    const requested =
      message.options.pageSize === "auto"
        ? { width: page.getWidth(), height: page.getHeight() }
        : pdfSize(
            message.options.pageSize,
            message.options.width,
            message.options.height,
          );
    const target =
      message.options.orientation === "landscape" && requested.width < requested.height
        ? { width: requested.height, height: requested.width }
        : message.options.orientation === "portrait" && requested.width > requested.height
          ? { width: requested.height, height: requested.width }
          : requested;
    const inner = getPdfContentBox(
      target.width,
      target.height,
      message.options.margin,
    );
    const placement = fitRect(
      { width: page.getWidth(), height: page.getHeight() },
      inner,
      message.options.fit,
    );
    page.scaleContent(placement.scaleX, placement.scaleY);
    page.scaleAnnotations(placement.scaleX, placement.scaleY);
    const translateX = inner.x + placement.x;
    const translateY = inner.y + placement.y;
    page.translateContent(translateX, translateY);
    const annotations = page.node.Annots();
    if (annotations) {
      for (let annotationIndex = 0; annotationIndex < annotations.size(); annotationIndex += 1) {
        const annotation = annotations.lookupMaybe(annotationIndex, PDFDict);
        const rect = annotation?.lookupMaybe(PDFName.of("Rect"), PDFArray);
        if (!rect || rect.size() < 4) continue;
        const x1 = rect.lookupMaybe(0, PDFNumber);
        const y1 = rect.lookupMaybe(1, PDFNumber);
        const x2 = rect.lookupMaybe(2, PDFNumber);
        const y2 = rect.lookupMaybe(3, PDFNumber);
        if (!x1 || !y1 || !x2 || !y2) continue;
        rect.set(0, PDFNumber.of(x1.asNumber() + translateX));
        rect.set(1, PDFNumber.of(y1.asNumber() + translateY));
        rect.set(2, PDFNumber.of(x2.asNumber() + translateX));
        rect.set(3, PDFNumber.of(y2.asNumber() + translateY));
      }
    }
    page.setSize(target.width, target.height);
    if (message.options.fit === "cover") {
      wrapPageContentsWithClip(pdf, page, inner, pdfLib);
    }
    },
  );
  return pdfOutput(
    await pdf.save(),
    createOutputFilename(input.metadata.name, "pdf", "resized"),
  );
}

async function preserveCompressPdf(message: StartWorkerMessage<"compress-pdf">) {
  if (message.options.mode !== "preserve") {
    throw new PdfWorkerError("invalid-mode", "Choose Preserve Document compression.");
  }
  const input = message.files[0];
  try {
    progress(message, 1, 0, 1, "Inspecting PDF");
    await inspectPdfBeforeStructuralRewrite(input.data);
    progress(message, 1, 0, 1, "Loading qpdf");
    const buffer = await preservePdfWithQpdf(input.data, {
      jobId: message.jobId,
      removeMetadata: message.options.removeMetadata,
    });
    progress(message, 1, 1, 1, "Compression complete");
    return {
      buffer,
      filename: createOutputFilename(input.metadata.name, "pdf", "compressed"),
      mime: "application/pdf",
      size: buffer.byteLength,
    };
  } catch (error) {
    if (error instanceof PdfPreflightError) {
      throw new PdfWorkerError(error.code, error.message);
    }
    if (error instanceof QpdfAdapterError) {
      throw new PdfWorkerError(error.code, error.message);
    }
    throw error;
  }
}

async function strongCompressPdf(message: StartWorkerMessage<"compress-pdf">) {
  if (message.options.mode !== "strong" || message.options.confirmed !== true) {
    throw new PdfWorkerError("confirmation-required", "Confirm Strong Compression before processing.");
  }
  const { PDFDocument } = await import("pdf-lib");
  const input = message.files[0];
  const preset = STRONG_PDF_COMPRESSION_PRESETS[message.options.preset];
  const output = await PDFDocument.create();
  await forEachRenderedPdfPage(
    input,
    "all",
    preset.dpi,
    "white",
    message.jobId,
    message.options.color,
    async (renderedPage, index, total) => {
      progress(message, index + 1, index, total, "Rebuilding flattened page");
      const jpeg = await encodeCanvas(renderedPage.canvas, "jpg", preset.quality);
      const embedded = await output.embedJpg(jpeg);
      const page = output.addPage([renderedPage.pointWidth, renderedPage.pointHeight]);
      page.drawImage(embedded, {
        x: 0,
        y: 0,
        width: renderedPage.pointWidth,
        height: renderedPage.pointHeight,
      });
      progress(message, index + 1, index + 1, total, "Page complete");
    },
  );
  return pdfOutput(
    await output.save(),
    createOutputFilename(input.metadata.name, "pdf", "strong-compressed"),
  );
}

async function watermarkPdf(message: StartWorkerMessage<"watermark-pdf">) {
  const { StandardFonts, degrees, rgb } = await import("pdf-lib");
  const input = message.files[0];
  const pdf = await loadPdf(input);
  enforcePageLimit(input, pdf.getPageCount(), false);
  const selected = resolvePageSelection(message.options.pages, pdf.getPageCount());
  const options = message.options;
  if (options.kind === "text") {
    if (!options.text.trim()) {
      throw new PdfWorkerError("empty-watermark", "Enter watermark text.");
    }
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    try {
      font.encodeText(options.text);
    } catch {
      throw new PdfWorkerError(
        "unsupported-text",
        "This text cannot be encoded by the standard PDF font. Use an image watermark for this text.",
      );
    }
    selected.forEach((index) => {
      const page = pdf.getPage(index);
      const width = font.widthOfTextAtSize(options.text, options.size);
      const height = options.size;
      const position = positionedBox(page, width, height, options.position);
      page.drawText(options.text, {
        ...position,
        color: rgb(0.35, 0.35, 0.35),
        font,
        opacity: clamp(options.opacity, 0.05, 1),
        rotate: degrees(options.rotation),
        size: options.size,
      });
    });
  } else {
    const watermarkInput = message.files.find(({ id }) => id === options.imageInputId);
    if (!watermarkInput) throw new PdfWorkerError("missing-watermark", "Choose a watermark image.");
    const signature = validateMediaSignature(
      new Uint8Array(watermarkInput.data),
      watermarkInput.metadata.mime,
      ["jpeg", "png"],
    );
    if (!signature.ok) throw new PdfWorkerError(signature.code, signature.message);
    const watermarkSelection = validateImageSelection([watermarkInput.metadata]);
    if (!watermarkSelection.ok) {
      throw new PdfWorkerError(watermarkSelection.code, watermarkSelection.message);
    }
    const decoded =
      signature.kind === "jpeg"
        ? await (await import("@jsquash/jpeg")).decode(watermarkInput.data, {
            preserveOrientation: true,
          })
        : await (await import("@jsquash/png")).decode(watermarkInput.data);
    const dimensions = validateDecodedImageDimensions(decoded.width, decoded.height);
    if (!dimensions.ok) throw new PdfWorkerError(dimensions.code, dimensions.message);
    const orientedJpeg =
      signature.kind === "jpeg" &&
      readExifOrientation(new Uint8Array(watermarkInput.data)) !== 1;
    const embeddedBytes = orientedJpeg
      ? await (await import("@jsquash/jpeg")).encode(decoded, { quality: 92 })
      : watermarkInput.data;
    const image =
      signature.kind === "jpeg"
        ? await pdf.embedJpg(embeddedBytes)
        : await pdf.embedPng(embeddedBytes);
    selected.forEach((index) => {
      const page = pdf.getPage(index);
      const width = (page.getWidth() * clamp(options.size, 1, 100)) / 100;
      const height = width * (image.height / image.width);
      const position = positionedBox(page, width, height, options.position);
      page.drawImage(image, {
        ...position,
        width,
        height,
        opacity: clamp(options.opacity, 0.05, 1),
        rotate: degrees(options.rotation),
      });
    });
  }
  return pdfOutput(
    await pdf.save(),
    createOutputFilename(input.metadata.name, "pdf", "watermarked"),
  );
}

async function addPageNumbers(message: StartWorkerMessage<"add-page-numbers">) {
  const { StandardFonts, rgb } = await import("pdf-lib");
  const input = message.files[0];
  const pdf = await loadPdf(input);
  enforcePageLimit(input, pdf.getPageCount(), false);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const total = pdf.getPageCount();
  pdf.getPages().forEach((page, index) => {
    const number = message.options.start + index;
    const value =
      message.options.format === "page-number"
        ? `Page ${number}`
        : message.options.format === "number-of-total"
          ? `${number} / ${message.options.start + total - 1}`
          : String(number);
    const width = font.widthOfTextAtSize(value, message.options.fontSize);
    page.drawText(value, {
      ...positionedBox(page, width, message.options.fontSize, message.options.position),
      color: rgb(0.1, 0.1, 0.1),
      font,
      size: message.options.fontSize,
    });
  });
  return pdfOutput(
    await pdf.save(),
    createOutputFilename(input.metadata.name, "pdf", "numbered"),
  );
}

type RenderedPdfPage = {
  canvas: OffscreenCanvas;
  pageCount: number;
  pageNumber: number;
  pointHeight: number;
  pointWidth: number;
};

async function forEachRenderedPdfPage(
  input: WorkerInputFile,
  selection: "all" | readonly number[],
  dpi: number,
  background: "white" | "transparent",
  jobId: string,
  color: "original" | "grayscale" | "black-and-white" = "original",
  onPage: (
    page: RenderedPdfPage,
    index: number,
    total: number,
  ) => Promise<void>,
  rasterLimit = true,
) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.mjs",
    import.meta.url,
  ).toString();
  let loadingTask: ReturnType<typeof pdfjs.getDocument> | null = null;
  try {
    const documentOptions = {
      data: new Uint8Array(input.data),
      isEvalSupported: false,
      maxImageSize: 100_000_000,
      stopAtErrors: true,
      useWorkerFetch: false,
    } as unknown as Parameters<typeof pdfjs.getDocument>[0];
    loadingTask = pdfjs.getDocument(documentOptions);
    const document = await loadingTask.promise;
    const pages = resolvePageNumbers(selection, document.numPages);
    enforcePageLimit(input, pages.length, rasterLimit);
    for (let index = 0; index < pages.length; index += 1) {
      checkCanceled(jobId);
      const pageNumber = pages[index];
      const page = await document.getPage(pageNumber);
      const pointViewport = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: dpi / 72 });
      const width = Math.max(1, Math.ceil(viewport.width));
      const height = Math.max(1, Math.ceil(viewport.height));
      if (width * height > 100_000_000) {
        throw new PdfWorkerError("too-many-pixels", "A rendered PDF page exceeds 100 megapixels.");
      }
      const canvas = new OffscreenCanvas(width, height);
      const context = context2d(canvas);
      if (background === "white") {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);
      }
      progressRaw(jobId, pageNumber, index, pages.length, "Rendering PDF page");
      await page.render({
        background: background === "white" ? "#ffffff" : "rgba(0,0,0,0)",
        canvas: null,
        canvasContext: context as unknown as CanvasRenderingContext2D,
        viewport,
      }).promise;
      if (color !== "original") applyColorMode(context, width, height, color);
      try {
        await onPage(
          {
            canvas,
            pageCount: document.numPages,
            pageNumber,
            pointHeight: pointViewport.height,
            pointWidth: pointViewport.width,
          },
          index,
          pages.length,
        );
      } finally {
        canvas.width = 1;
        canvas.height = 1;
        page.cleanup();
      }
    }
    return { pageCount: document.numPages };
  } catch (error) {
    if (isPasswordError(error)) {
      throw new PdfWorkerError(
        "encrypted-pdf",
        "Encrypted or password-protected PDFs are not supported.",
      );
    }
    throw error;
  } finally {
    if (loadingTask) {
      try {
        await loadingTask.destroy();
      } catch {
        // The document may already be torn down after a parse failure.
      }
    }
  }
}

async function inspectPdf(message: InspectPdfWorkerMessage) {
  canceledJobId = null;
  try {
    validatePdfInput(message.input);
    const selection = validatePdfSelection([message.input.metadata]);
    if (!selection.ok) throw new PdfWorkerError(selection.code, selection.message);
    const thumbnails: PdfInspectionWorkerMessage["thumbnails"][number][] = [];
    const inspection = await forEachRenderedPdfPage(
      message.input,
      "all",
      36,
      "white",
      message.jobId,
      "original",
      async (page) => {
        const scale = Math.min(1, message.thumbnailWidth / page.canvas.width);
        const width = Math.max(1, Math.round(page.canvas.width * scale));
        const height = Math.max(1, Math.round(page.canvas.height * scale));
        const canvas = new OffscreenCanvas(width, height);
        const context = context2d(canvas);
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);
        context.drawImage(page.canvas, 0, 0, width, height);
        const buffer = await encodeCanvas(canvas, "jpg", 0.72);
        canvas.width = 1;
        canvas.height = 1;
        thumbnails.push({
          pageNumber: page.pageNumber,
          width,
          height,
          buffer,
          mime: "image/jpeg",
        });
      },
      false,
    );
    const response: PdfInspectionWorkerMessage = {
      type: "pdf-inspection",
      jobId: message.jobId,
      pageCount: inspection.pageCount,
      thumbnails,
    };
    scope.postMessage(response, getPdfInspectionTransferables(response));
  } catch (error) {
    const failure = safeFailure(error, message.jobId);
    if (failure) scope.postMessage(failure);
  }
}

async function encodeCanvas(
  canvas: OffscreenCanvas,
  extension: "jpg" | "png",
  quality: number,
) {
  const image = context2d(canvas).getImageData(0, 0, canvas.width, canvas.height);
  if (extension === "jpg") {
    const { encode } = await import("@jsquash/jpeg");
    return encode(image, { quality: Math.round(clamp(quality, 0.01, 1) * 100) });
  }
  const { encode } = await import("@jsquash/png");
  return encode(image);
}

async function loadPdf(input: WorkerInputFile) {
  const { PDFDocument } = await import("pdf-lib");
  try {
    const pdf = await PDFDocument.load(input.data, {
      ignoreEncryption: false,
      updateMetadata: false,
    });
    if (pdf.isEncrypted) {
      throw new PdfWorkerError(
        "encrypted-pdf",
        "Encrypted or password-protected PDFs are not supported.",
      );
    }
    return pdf;
  } catch (error) {
    if (error instanceof PdfWorkerError) throw error;
    if (isPasswordError(error)) {
      throw new PdfWorkerError(
        "encrypted-pdf",
        "Encrypted or password-protected PDFs are not supported.",
      );
    }
    throw new PdfWorkerError("malformed-pdf", "The PDF is malformed or unsupported.");
  }
}

function validatePdfInput(input: WorkerInputFile) {
  const result = validateMediaSignature(
    new Uint8Array(input.data),
    input.metadata.mime,
    ["pdf"],
  );
  if (!result.ok) throw new PdfWorkerError(result.code, result.message);
}

function getPdfInputs(message: PdfStartMessage) {
  if (message.operation === "watermark-pdf") {
    const options = (message as StartWorkerMessage<"watermark-pdf">).options;
    if (options.kind === "image") {
      return message.files.filter(({ id }) => id !== options.imageInputId);
    }
  }
  return message.files;
}

function checkedPages(
  pages: readonly number[],
  pageCount: number,
  rejectDuplicates = true,
) {
  if (!pages.length) throw new PdfWorkerError("empty-range", "Choose at least one page.");
  const indexes = pages.map((page) => {
    if (!Number.isInteger(page) || page < 1 || page > pageCount) {
      throw new PdfWorkerError("page-out-of-range", `Choose pages between 1 and ${pageCount}.`);
    }
    return page - 1;
  });
  if (rejectDuplicates && new Set(indexes).size !== indexes.length) {
    throw new PdfWorkerError("duplicate-page", "Each selected page may appear only once.");
  }
  return indexes;
}

function resolvePageSelection(selection: "all" | readonly number[], pageCount: number) {
  return selection === "all"
    ? Array.from({ length: pageCount }, (_, index) => index)
    : checkedPages(selection, pageCount);
}

function resolvePageNumbers(selection: "all" | readonly number[], pageCount: number) {
  return resolvePageSelection(selection, pageCount).map((index) => index + 1);
}

function enforcePageLimit(input: WorkerInputFile, pageCount: number, raster: boolean) {
  const result = validatePdfSelection([input.metadata], { pageCount, raster });
  if (!result.ok) throw new PdfWorkerError(result.code, result.message);
}

function positionedBox(
  page: PdfPage,
  width: number,
  height: number,
  position: WatermarkPosition,
) {
  const [vertical, horizontal] = position.split("-") as [string, string];
  const margin = 24;
  const x =
    horizontal === "left"
      ? margin
      : horizontal === "right"
        ? page.getWidth() - width - margin
        : (page.getWidth() - width) / 2;
  const y =
    vertical === "top"
      ? page.getHeight() - height - margin
      : vertical === "bottom"
        ? margin
        : (page.getHeight() - height) / 2;
  return { x: Math.max(0, x), y: Math.max(0, y) };
}

function pdfSize(
  size: "auto" | "a4" | "letter" | "legal" | "custom",
  width?: number,
  height?: number,
) {
  if (size === "a4") return { width: 595.28, height: 841.89 };
  if (size === "letter") return { width: 612, height: 792 };
  if (size === "legal") return { width: 612, height: 1008 };
  if (size === "custom" && width && height && width > 0 && height > 0) {
    return { width, height };
  }
  throw new PdfWorkerError("invalid-page-size", "Choose valid custom PDF page dimensions.");
}

async function addCopiedPagesWithProgress(
  message: StartWorkerMessage,
  output: LoadedPdf,
  source: LoadedPdf,
  pages: readonly number[],
  stage: string,
) {
  const copies = await output.copyPages(source, [...pages]);
  await processStructuralPages(
    pages,
    (page) => page + 1,
    stage,
    reportStructuralProgress(message),
    (_page, index) => {
      output.addPage(copies[index]);
    },
  );
}

function reportStructuralProgress(message: StartWorkerMessage) {
  return (current: number, completed: number, total: number, stage: string) => {
    progress(message, current, completed, total, stage);
  };
}

function pdfOutput(bytes: Uint8Array, filename: string) {
  const buffer = exactBuffer(bytes);
  return { buffer, filename, mime: "application/pdf", size: buffer.byteLength };
}

function exactBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function context2d(canvas: OffscreenCanvas) {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new PdfWorkerError("canvas-unavailable", "This browser cannot create a PDF page canvas.");
  return context;
}

function applyColorMode(
  context: OffscreenCanvasRenderingContext2D,
  width: number,
  height: number,
  mode: "grayscale" | "black-and-white",
) {
  const image = context.getImageData(0, 0, width, height);
  for (let index = 0; index < image.data.length; index += 4) {
    const luminance = Math.round(
      image.data[index] * 0.2126 +
        image.data[index + 1] * 0.7152 +
        image.data[index + 2] * 0.0722,
    );
    const value = mode === "black-and-white" ? (luminance >= 128 ? 255 : 0) : luminance;
    image.data[index] = value;
    image.data[index + 1] = value;
    image.data[index + 2] = value;
  }
  context.putImageData(image, 0, 0);
}

function progress(
  message: StartWorkerMessage,
  current: number,
  completed: number,
  total: number,
  stage: string,
) {
  progressRaw(message.jobId, current, completed, total, stage);
}

function progressRaw(
  jobId: string,
  current: number,
  completed: number,
  total: number,
  stage: string,
) {
  checkCanceled(jobId);
  const update: ProgressWorkerMessage = {
    type: "progress",
    jobId,
    current,
    completed,
    total,
    stage,
  };
  scope.postMessage(update);
}

function checkCanceled(jobId: string) {
  if (canceledJobId === jobId) throw new PdfWorkerError("canceled", "Processing was canceled.");
}

function safeFailure(error: unknown, jobId: string) {
  if (error instanceof PdfWorkerError && error.code === "canceled") return null;
  if (error instanceof PdfWorkerError) {
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
      ? "The browser ran out of working memory. Try fewer pages or a lower DPI."
      : "The PDF could not be processed. It may be malformed, encrypted, or unsupported.",
  } as const;
}

function isPasswordError(error: unknown) {
  return (
    error instanceof Error &&
    /password|encrypted|encryption/i.test(`${error.name} ${error.message}`)
  );
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

class PdfWorkerError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
