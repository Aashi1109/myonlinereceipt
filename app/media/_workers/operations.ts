import type { MediaToolSlug } from "../_lib/tools";

export const IMAGE_WORKER_OPERATIONS = [
  "image-to-pdf",
  "jpg-to-png",
  "png-to-jpg",
  "jpg-to-webp",
  "png-to-webp",
  "webp-to-jpg",
  "webp-to-png",
  "heic-to-jpg",
  "heic-to-png",
  "compress-image",
  "resize-image",
  "crop-image",
  "rotate-image",
  "flip-image",
  "combine-images",
  "remove-image-metadata",
  "social-media-image-resizer",
] as const satisfies readonly MediaToolSlug[];

export const PDF_WORKER_OPERATIONS = [
  "pdf-to-jpg",
  "pdf-to-png",
  "merge-pdf",
  "split-pdf",
  "extract-pdf-pages",
  "reorder-pdf-pages",
  "rotate-pdf-pages",
  "delete-pdf-pages",
  "crop-pdf",
  "resize-pdf-pages",
  "compress-pdf",
  "watermark-pdf",
  "add-page-numbers",
] as const satisfies readonly MediaToolSlug[];

export type ImageWorkerOperation = (typeof IMAGE_WORKER_OPERATIONS)[number];
export type PdfWorkerOperation = (typeof PDF_WORKER_OPERATIONS)[number];

export const MEDIA_WORKER_OPERATIONS: ReadonlySet<MediaToolSlug> = new Set([
  ...IMAGE_WORKER_OPERATIONS,
  ...PDF_WORKER_OPERATIONS,
]);

export function isImageWorkerOperation(
  operation: MediaToolSlug,
): operation is ImageWorkerOperation {
  return IMAGE_WORKER_OPERATIONS.some((candidate) => candidate === operation);
}

export function isPdfWorkerOperation(
  operation: MediaToolSlug,
): operation is PdfWorkerOperation {
  return PDF_WORKER_OPERATIONS.some((candidate) => candidate === operation);
}
