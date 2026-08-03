/**
 * PDF rasterisation. This module is the ONLY place in the codebase that may
 * import `pdfjs-dist`, and the only place that sets `GlobalWorkerOptions
 * .workerSrc`. It allocates `OffscreenCanvas`, so it is worker-only and must
 * never be reachable from a main-thread import graph.
 */

import { ToolError, type ToolRunFile, type ToolRunProgress } from "../run.ts";
import { clamp, context2d } from "./imageCodec.ts";
import {
  enforcePageLimit,
  isPasswordError,
  resolvePageNumbers,
  validatePdfInput,
  type PdfPageSelection,
} from "./pdfDocument.ts";
import { validatePdfSelection } from "./validation.ts";

/** 100 megapixels — the same ceiling `validation.ts` applies to raster images. */
const MAX_RENDERED_PIXELS = 100_000_000;

export type PdfColorMode = "original" | "grayscale" | "black-and-white";

export type RenderedPdfPage = {
  readonly canvas: OffscreenCanvas;
  readonly pageCount: number;
  readonly pageNumber: number;
  readonly pointHeight: number;
  readonly pointWidth: number;
};

export type RenderPdfRequest = {
  readonly file: ToolRunFile;
  readonly selection: PdfPageSelection;
  readonly dpi: number;
  readonly background: "white" | "transparent";
  readonly signal: AbortSignal;
  readonly color?: PdfColorMode;
  readonly progress?: (progress: ToolRunProgress) => void;
  /** Raster page ceilings are lower than structural ones; off for previews. */
  readonly rasterLimit?: boolean;
};

export type PdfPageThumbnail = {
  readonly pageNumber: number;
  readonly pageWidth: number;
  readonly pageHeight: number;
  readonly width: number;
  readonly height: number;
  readonly buffer: ArrayBuffer;
  readonly mime: "image/jpeg";
};

export type PdfInspection = {
  readonly pageCount: number;
  readonly thumbnails: readonly PdfPageThumbnail[];
};

export async function forEachRenderedPdfPage(
  request: RenderPdfRequest,
  onPage: (page: RenderedPdfPage, index: number, total: number) => Promise<void>,
): Promise<{ pageCount: number }> {
  const {
    file,
    selection,
    dpi,
    background,
    signal,
    color = "original",
    progress,
    rasterLimit = true,
  } = request;
  const renderScheduler = {
    requestAnimationFrame: (callback: FrameRequestCallback) =>
      setTimeout(() => callback(performance.now()), 0),
    cancelAnimationFrame: (handle: number) => clearTimeout(handle),
  };
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "../../../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
    import.meta.url,
  ).toString();
  let loadingTask: ReturnType<typeof pdfjs.getDocument> | null = null;
  try {
    const documentOptions = {
      data: new Uint8Array(file.data),
      isEvalSupported: false,
      maxImageSize: MAX_RENDERED_PIXELS,
      stopAtErrors: true,
      useWorkerFetch: false,
    } as unknown as Parameters<typeof pdfjs.getDocument>[0];
    loadingTask = pdfjs.getDocument(documentOptions);
    const document = await loadingTask.promise;
    const pages = resolvePageNumbers(selection, document.numPages);
    enforcePageLimit(file, pages.length, rasterLimit);
    for (let index = 0; index < pages.length; index += 1) {
      signal.throwIfAborted();
      const pageNumber = pages[index];
      const page = await document.getPage(pageNumber);
      const pointViewport = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: dpi / 72 });
      const width = Math.max(1, Math.ceil(viewport.width));
      const height = Math.max(1, Math.ceil(viewport.height));
      if (width * height > MAX_RENDERED_PIXELS) {
        throw new ToolError("too-many-pixels", "A rendered PDF page exceeds 100 megapixels.");
      }
      const canvas = new OffscreenCanvas(width, height);
      const context = context2d(canvas);
      if (background === "white") {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);
      }
      progress?.({ completed: index, total: pages.length, stage: "Rendering PDF page" });
      Object.assign(globalThis, { window: renderScheduler });
      try {
        await page.render({
          background: background === "white" ? "#ffffff" : "rgba(0,0,0,0)",
          canvas: null,
          canvasContext: context as unknown as CanvasRenderingContext2D,
          viewport,
        }).promise;
      } finally {
        Reflect.deleteProperty(globalThis, "window");
      }
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
      throw new ToolError(
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

/** Renders every page down to a JPEG thumbnail, for page-picker surfaces. */
export async function inspectPdf(
  file: ToolRunFile,
  thumbnailWidth: number,
  signal: AbortSignal,
): Promise<PdfInspection> {
  validatePdfInput(file);
  const selection = validatePdfSelection([{ size: file.data.byteLength }]);
  if (!selection.ok) throw new ToolError(selection.code, selection.message);
  const thumbnails: PdfPageThumbnail[] = [];
  const inspection = await forEachRenderedPdfPage(
    {
      file,
      selection: "all",
      dpi: 36,
      background: "white",
      signal,
      rasterLimit: false,
    },
    async (page) => {
      const scale = Math.min(1, thumbnailWidth / page.canvas.width);
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
        pageWidth: Math.max(1, Math.round(page.canvas.width * 2)),
        pageHeight: Math.max(1, Math.round(page.canvas.height * 2)),
        width,
        height,
        buffer,
        mime: "image/jpeg",
      });
    },
  );
  return { pageCount: inspection.pageCount, thumbnails };
}

export async function encodeCanvas(
  canvas: OffscreenCanvas,
  extension: "jpg" | "png",
  quality: number,
): Promise<ArrayBuffer> {
  const image = context2d(canvas).getImageData(0, 0, canvas.width, canvas.height);
  if (extension === "jpg") {
    const { encode } = await import("@jsquash/jpeg");
    return encode(image, { quality: Math.round(clamp(quality, 0.01, 1) * 100) });
  }
  const { encode } = await import("@jsquash/png");
  return encode(image);
}

export function applyColorMode(
  context: OffscreenCanvasRenderingContext2D,
  width: number,
  height: number,
  mode: "grayscale" | "black-and-white",
): void {
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
