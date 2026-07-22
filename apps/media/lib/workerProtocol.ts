import { isMediaToolSlug, type MediaToolSlug } from "./tools.ts";
import { sanitizeFileName } from "./validation.ts";

export interface WorkerFileMetadata {
  readonly name: string;
  readonly mime: string;
  readonly size: number;
}

export interface WorkerInputFile {
  readonly id: string;
  readonly data: ArrayBuffer;
  readonly metadata: WorkerFileMetadata;
}

export interface WorkerOutputFile {
  readonly buffer: ArrayBuffer;
  readonly mime: string;
  readonly filename: string;
  readonly size: number;
}

export interface PdfPageThumbnail {
  readonly pageNumber: number;
  readonly width: number;
  readonly height: number;
  readonly buffer: ArrayBuffer;
  readonly mime: "image/jpeg";
}

type EmptyOptions = Record<string, never>;
type PageSelection = "all" | readonly number[];
type ImageFormat = "jpeg" | "png" | "webp";
type Fit = "contain" | "cover" | "stretch";
type PdfPageSize = "auto" | "a4" | "letter" | "legal" | "custom";

export interface ImageToPdfOptions {
  page: "auto" | "a4" | "letter";
  orientation: "auto" | "portrait" | "landscape";
  margin: "none" | "small" | "normal";
  fit: "contain" | "fill";
  quality: "original" | "balanced" | "small";
  background: string;
  filename: string;
  items: readonly { id: string; rotation: 0 | 90 | 180 | 270 }[];
}

export interface PdfToImageOptions {
  pages: PageSelection;
  dpi: 150 | 300;
  background: "white" | "transparent";
  quality?: number;
}

export interface ImageResizeOptions {
  width?: number;
  height?: number;
  percentage?: number;
  lockAspectRatio: boolean;
  noUpscale: boolean;
  fit: Fit;
  outputFormat: "original" | ImageFormat;
  quality?: number;
}

export interface MediaJobOptionsByOperation {
  "image-to-pdf": ImageToPdfOptions;
  "pdf-to-jpg": PdfToImageOptions;
  "pdf-to-png": PdfToImageOptions;
  "merge-pdf": { order: readonly string[] };
  "split-pdf":
    | { mode: "every-page" }
    | { mode: "interval"; interval: number }
    | { mode: "ranges"; ranges: readonly (readonly number[])[] };
  "extract-pdf-pages": { pages: readonly number[] };
  "reorder-pdf-pages": { pages: readonly number[] };
  "rotate-pdf-pages": {
    pages: PageSelection;
    degrees: 90 | 180 | 270;
  };
  "delete-pdf-pages": { pages: readonly number[] };
  "crop-pdf": {
    pages: PageSelection;
    box: { x: number; y: number; width: number; height: number };
  };
  "resize-pdf-pages": {
    pages: PageSelection;
    pageSize: PdfPageSize;
    width?: number;
    height?: number;
    orientation: "portrait" | "landscape";
    fit: Fit;
    margin: number;
  };
  "compress-pdf":
    | { mode: "preserve"; removeMetadata: boolean }
    | {
        mode: "strong";
        preset: "high" | "balanced" | "smallest";
        color: "original" | "grayscale" | "black-and-white";
        confirmed: true;
      };
  "watermark-pdf":
    | {
        kind: "text";
        text: string;
        pages: PageSelection;
        opacity: number;
        size: number;
        rotation: number;
        position: WatermarkPosition;
      }
    | {
        kind: "image";
        imageInputId: string;
        pages: PageSelection;
        opacity: number;
        size: number;
        rotation: number;
        position: WatermarkPosition;
      };
  "add-page-numbers": {
    format: "number" | "page-number" | "number-of-total";
    start: number;
    fontSize: number;
    position: WatermarkPosition;
  };
  "jpg-to-png": EmptyOptions;
  "png-to-jpg": { quality: number; background: string };
  "jpg-to-webp": { quality: number };
  "png-to-webp": { quality: number };
  "webp-to-jpg": { quality: number; background: string };
  "webp-to-png": EmptyOptions;
  "heic-to-jpg": { quality: number; background: string };
  "heic-to-png": EmptyOptions;
  "compress-image": {
    preset: "best" | "balanced" | "smallest" | "fast" | "maximum";
    quality?: number;
  };
  "resize-image": ImageResizeOptions;
  "crop-image": {
    crop: { x: number; y: number; width: number; height: number };
    outputFormat: "original" | ImageFormat;
    quality?: number;
  };
  "rotate-image": {
    degrees: 90 | 180 | 270;
    outputFormat: "original" | ImageFormat;
    quality?: number;
  };
  "flip-image": {
    axis: "horizontal" | "vertical";
    outputFormat: "original" | ImageFormat;
    quality?: number;
  };
  "combine-images": {
    layout: "horizontal" | "vertical" | "grid";
    columns?: number;
    order: readonly string[];
    gap: number;
    background: string;
    outputFormat: ImageFormat;
    quality?: number;
  };
  "remove-image-metadata": EmptyOptions;
  "social-media-image-resizer": {
    preset:
      | "instagram-square"
      | "instagram-portrait"
      | "story-reel"
      | "youtube-thumbnail"
      | "x-landscape"
      | "linkedin-landscape"
      | "facebook-landscape";
    fit: "contain" | "cover";
    background: string;
    outputFormat: ImageFormat;
    quality?: number;
  };
}

export type WatermarkPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "middle-left"
  | "middle-center"
  | "middle-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export interface StartWorkerMessage<O extends MediaToolSlug = MediaToolSlug> {
  readonly type: "start";
  readonly jobId: string;
  readonly operation: O;
  readonly files: readonly WorkerInputFile[];
  readonly options: MediaJobOptionsByOperation[O];
}

export interface ProgressWorkerMessage {
  readonly type: "progress";
  readonly jobId: string;
  readonly current: number;
  readonly completed: number;
  readonly total: number;
  readonly stage: string;
}

export interface CompleteWorkerMessage {
  readonly type: "complete";
  readonly jobId: string;
  readonly outputs: readonly WorkerOutputFile[];
  readonly inputBytes: number;
  readonly outputBytes: number;
}

export interface FailureWorkerMessage {
  readonly type: "failure";
  readonly jobId: string;
  readonly code: string;
  readonly message: string;
}

export interface CancelWorkerMessage {
  readonly type: "cancel";
  readonly jobId: string;
}

export interface InspectPdfWorkerMessage {
  readonly type: "inspect-pdf";
  readonly jobId: string;
  readonly input: WorkerInputFile;
  readonly thumbnailWidth: number;
}

export interface PdfInspectionWorkerMessage {
  readonly type: "pdf-inspection";
  readonly jobId: string;
  readonly pageCount: number;
  readonly thumbnails: readonly PdfPageThumbnail[];
}

export type WorkerRequestMessage =
  | StartWorkerMessage
  | CancelWorkerMessage
  | InspectPdfWorkerMessage;
export type WorkerResponseMessage =
  | ProgressWorkerMessage
  | CompleteWorkerMessage
  | FailureWorkerMessage
  | PdfInspectionWorkerMessage;

export type WorkerJobStatus =
  | "idle"
  | "processing"
  | "completed"
  | "failed"
  | "canceled";

export interface WorkerJobState {
  readonly status: WorkerJobStatus;
  readonly jobId: string | null;
  readonly progress: Omit<ProgressWorkerMessage, "type" | "jobId"> | null;
  readonly outputs: readonly WorkerOutputFile[];
  readonly sizes: { inputBytes: number; outputBytes: number } | null;
  readonly error: { code: string; message: string } | null;
}

export function createWorkerInput(
  id: string,
  data: ArrayBuffer,
  name: string,
  mime: string,
): WorkerInputFile {
  if (!id.trim()) throw new TypeError("Worker input ID is required.");
  if (!(data instanceof ArrayBuffer)) throw new TypeError("Worker input must be an ArrayBuffer.");
  const normalizedMime = mime.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/.test(normalizedMime)) {
    throw new TypeError("Worker input MIME type is invalid.");
  }
  return {
    id: id.trim(),
    data,
    metadata: {
      name: sanitizeFileName(name),
      mime: normalizedMime,
      size: data.byteLength,
    },
  };
}

export function createStartWorkerMessage<O extends MediaToolSlug>(input: {
  jobId: string;
  operation: O;
  files: readonly WorkerInputFile[];
  options: MediaJobOptionsByOperation[O];
}): StartWorkerMessage<O> {
  if (!input.jobId.trim()) throw new TypeError("Worker job ID is required.");
  if (!isMediaToolSlug(input.operation)) {
    throw new TypeError(`Unknown media operation: ${input.operation}`);
  }
  if (input.files.length === 0) throw new TypeError("A worker job needs at least one file.");
  return {
    type: "start",
    jobId: input.jobId.trim(),
    operation: input.operation,
    files: input.files,
    options: input.options,
  };
}

export function createInspectPdfMessage(
  jobId: string,
  input: WorkerInputFile,
  thumbnailWidth = 180,
): InspectPdfWorkerMessage {
  if (!jobId.trim()) throw new TypeError("Worker job ID is required.");
  if (!Number.isInteger(thumbnailWidth) || thumbnailWidth < 1) {
    throw new RangeError("PDF thumbnail width must be a positive integer.");
  }
  return {
    type: "inspect-pdf",
    jobId: jobId.trim(),
    input,
    thumbnailWidth,
  };
}

export function getStartTransferables(message: StartWorkerMessage) {
  return [...new Set(message.files.map(({ data }) => data))];
}

export function getOutputTransferables(message: CompleteWorkerMessage) {
  return [...new Set(message.outputs.map(({ buffer }) => buffer))];
}

export function getPdfInspectionTransferables(message: PdfInspectionWorkerMessage) {
  return [...new Set(message.thumbnails.map(({ buffer }) => buffer))];
}

export function createWorkerJobState(): WorkerJobState {
  return {
    status: "idle",
    jobId: null,
    progress: null,
    outputs: [],
    sizes: null,
    error: null,
  };
}

export function beginWorkerJob(state: WorkerJobState, jobId: string): WorkerJobState {
  if (!jobId.trim()) throw new TypeError("Worker job ID is required.");
  return {
    ...state,
    status: "processing",
    jobId: jobId.trim(),
    progress: null,
    outputs: [],
    sizes: null,
    error: null,
  };
}

export function reduceWorkerJobState(
  state: WorkerJobState,
  message: WorkerResponseMessage,
): WorkerJobState {
  if (state.status !== "processing" || message.jobId !== state.jobId) return state;
  if (message.type === "pdf-inspection") return state;
  if (message.type === "progress") {
    const { current, completed, total, stage } = message;
    return { ...state, progress: { current, completed, total, stage } };
  }
  if (message.type === "failure") {
    return {
      ...state,
      status: "failed",
      error: { code: message.code, message: message.message },
    };
  }
  return {
    ...state,
    status: "completed",
    progress: null,
    outputs: message.outputs,
    sizes: {
      inputBytes: message.inputBytes,
      outputBytes: message.outputBytes,
    },
  };
}

export function cancelWorkerJob(
  state: WorkerJobState,
): { state: WorkerJobState; message: CancelWorkerMessage } | null {
  if (state.status !== "processing" || !state.jobId) return null;
  return {
    state: { ...state, status: "canceled" },
    message: { type: "cancel", jobId: state.jobId },
  };
}
