/**
 * The message protocol between the main thread and the single tool worker.
 *
 * This generalises the media protocol (`app/media/_lib/workerProtocol.ts`):
 * a request carries the tool's folder key instead of a media operation, and a
 * success carries a `ToolResult` instead of media output files.
 *
 * The file types and the input factory are declared here rather than imported
 * from the media protocol. They are small, and the framework must not depend on
 * `app/media/`, which this migration deletes — a package that outlives its own
 * dependency has to own the contract.
 *
 * `beginWorkerJob`, `reduceWorkerJobState` and `cancelWorkerJob` keep the
 * semantics they have in the media protocol: only the job that is currently
 * running can advance, and a stale message for another job is ignored.
 */

// Extension-qualified so this module loads under plain `node --test`, which is
// how its job-state reducer is covered. The type-only imports below are erased.
import { sanitizeFileName } from "./media/validation.ts";
import type { ToolResult } from "./result";
import type { ToolPagePreview, ToolRunItem, ToolRunProgress } from "./run";

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

/** The 3x3 placement grid used by watermarks and page numbering. */
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

/**
 * Builds a transferable input file. The name is sanitised and the MIME type is
 * shape-checked here because this is the boundary a picked `File` crosses on
 * its way to a worker.
 */
export function createWorkerInput(
  id: string,
  data: ArrayBuffer,
  name: string,
  mime: string,
): WorkerInputFile {
  if (!id.trim()) throw new TypeError("Worker input ID is required.");
  if (!(data instanceof ArrayBuffer)) {
    throw new TypeError("Worker input must be an ArrayBuffer.");
  }
  const normalizedMime = mime.trim().toLowerCase();
  if (
    !/^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/.test(normalizedMime)
  ) {
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

/** The folder key is validated in the worker before it reaches a module path. */
export type ToolWorkerRequest = {
  readonly type: "run";
  readonly jobId: string;
  readonly key: string;
  readonly text?: string;
  readonly secondary?: string;
  readonly files: readonly WorkerInputFile[];
  readonly items?: readonly ToolRunItem[];
  readonly settings: Readonly<Record<string, unknown>>;
};

/**
 * Page inspection for the tools whose spec declares `input.inspect`. One
 * document per request — page geometry is a property of a single document, and
 * carrying exactly one file keeps the same `assertRunnableFiles` boundary the
 * run path uses applicable unchanged.
 *
 * The buffer is deliberately not transferred (there is no transferables helper
 * for this request): the caller keeps reading the same bytes for its pre-run
 * hooks, and transferring would detach them.
 */
export type ToolWorkerInspect = {
  readonly type: "inspect";
  readonly jobId: string;
  readonly key: string;
  readonly files: readonly WorkerInputFile[];
  readonly thumbnailWidth: number;
};

export type ToolWorkerCancel = {
  readonly type: "cancel";
  readonly jobId: string;
};

export type ToolWorkerMessage =
  | ToolWorkerRequest
  | ToolWorkerInspect
  | ToolWorkerCancel;

export type ToolWorkerProgress = ToolRunProgress & {
  readonly type: "progress";
  readonly jobId: string;
};

export type ToolWorkerSuccess = {
  readonly type: "success";
  readonly jobId: string;
  readonly result: ToolResult;
};

export type ToolWorkerFailure = {
  readonly type: "failure";
  readonly jobId: string;
  readonly code: string;
  readonly message: string;
  readonly recovery?: string;
};

/**
 * The answer to an `inspect`. `previews` may carry more per page than
 * `ToolPagePreview` declares — the worker forwards what the renderer produced
 * rather than copying it into a narrower shape — so read only declared fields.
 */
export type ToolWorkerInspected = {
  readonly type: "inspected";
  readonly jobId: string;
  readonly pageCount: number;
  readonly previews: readonly ToolPagePreview[];
};

export type ToolWorkerCanceled = {
  readonly type: "canceled";
  readonly jobId: string;
};

export type ToolWorkerResponse =
  | ToolWorkerProgress
  | ToolWorkerSuccess
  | ToolWorkerInspected
  | ToolWorkerFailure
  | ToolWorkerCanceled;

export type ToolJobStatus =
  | "idle"
  | "running"
  | "completed"
  | "failed"
  | "canceled";

export type ToolJobError = {
  readonly code: string;
  readonly message: string;
  readonly recovery?: string;
};

export type ToolJobState = {
  readonly status: ToolJobStatus;
  readonly jobId: string | null;
  readonly progress: ToolRunProgress | null;
  readonly result: ToolResult | null;
  readonly previews: readonly ToolPagePreview[];
  readonly pageCount: number;
  readonly error: ToolJobError | null;
};

export function createToolJobState(): ToolJobState {
  return {
    status: "idle",
    jobId: null,
    progress: null,
    result: null,
    previews: [],
    pageCount: 0,
    error: null,
  };
}

/** What a caller supplies; the job id is minted by the host that starts it. */
export type ToolRunRequestInput = {
  readonly key: string;
  readonly text?: string;
  readonly secondary?: string;
  readonly files?: readonly WorkerInputFile[];
  readonly items?: readonly ToolRunItem[];
  readonly settings: Readonly<Record<string, unknown>>;
};

export function createToolWorkerRequest(
  input: ToolRunRequestInput & { readonly jobId: string },
): ToolWorkerRequest {
  if (!input.jobId.trim()) throw new TypeError("Worker job ID is required.");
  if (!input.key.trim()) throw new TypeError("Worker tool key is required.");
  return {
    type: "run",
    jobId: input.jobId.trim(),
    key: input.key.trim(),
    text: input.text,
    secondary: input.secondary,
    files: input.files ?? [],
    items: input.items,
    settings: input.settings,
  };
}

/** What the page-picker surfaces render at; matches the legacy media width. */
export const INSPECT_THUMBNAIL_WIDTH = 180;

export type ToolInspectRequestInput = {
  readonly key: string;
  readonly file: WorkerInputFile;
  readonly thumbnailWidth?: number;
};

export function createToolInspectRequest(
  input: ToolInspectRequestInput & { readonly jobId: string },
): ToolWorkerInspect {
  if (!input.jobId.trim()) throw new TypeError("Worker job ID is required.");
  if (!input.key.trim()) throw new TypeError("Worker tool key is required.");
  const thumbnailWidth = input.thumbnailWidth ?? INSPECT_THUMBNAIL_WIDTH;
  if (!Number.isInteger(thumbnailWidth) || thumbnailWidth < 1) {
    throw new RangeError("Thumbnail width must be a positive integer.");
  }
  return {
    type: "inspect",
    jobId: input.jobId.trim(),
    key: input.key.trim(),
    files: [input.file],
    thumbnailWidth,
  };
}

/** Same expression as the media protocol's helper, retyped for this request. */
export function getRequestTransferables(
  message: ToolWorkerRequest,
): Transferable[] {
  return [...new Set(message.files.map(({ data }) => data))];
}

export function getResultTransferables(result: ToolResult): Transferable[] {
  return result.render === "files"
    ? [...new Set(result.files.map(({ buffer }) => buffer))]
    : [];
}

/**
 * Structured-clone payloads are untrusted on both sides of the boundary, so
 * both directions are shape-checked before anything reads a field.
 */
export function isToolWorkerMessage(
  value: unknown,
): value is ToolWorkerMessage {
  if (!isRecord(value) || !isNonEmptyString(value.jobId)) return false;
  if (value.type === "cancel") return true;
  if (value.type === "inspect") {
    return (
      isNonEmptyString(value.key) &&
      Array.isArray(value.files) &&
      value.files.length === 1 &&
      value.files.every(isWorkerInputFile) &&
      Number.isInteger(value.thumbnailWidth) &&
      (value.thumbnailWidth as number) > 0
    );
  }
  return (
    value.type === "run" &&
    isNonEmptyString(value.key) &&
    isOptionalString(value.text) &&
    isOptionalString(value.secondary) &&
    Array.isArray(value.files) &&
    value.files.every(isWorkerInputFile) &&
    (value.items === undefined ||
      (Array.isArray(value.items) && value.items.every(isRunItem))) &&
    isRecord(value.settings)
  );
}

export function isToolWorkerResponse(
  value: unknown,
): value is ToolWorkerResponse {
  if (!isRecord(value) || !isNonEmptyString(value.jobId)) return false;
  if (value.type === "canceled") return true;
  if (value.type === "progress") {
    return (
      typeof value.completed === "number" &&
      typeof value.total === "number" &&
      typeof value.stage === "string"
    );
  }
  if (value.type === "failure") {
    return (
      typeof value.code === "string" &&
      typeof value.message === "string" &&
      isOptionalString(value.recovery)
    );
  }
  if (value.type === "inspected") {
    return (
      typeof value.pageCount === "number" &&
      Array.isArray(value.previews) &&
      value.previews.every(isPagePreview)
    );
  }
  // The result is produced by this repo's own worker, so only the envelope is
  // checked here; the render union is the renderer's own exhaustive switch.
  return (
    value.type === "success" &&
    isRecord(value.result) &&
    typeof value.result.render === "string"
  );
}

export function beginWorkerJob(
  state: ToolJobState,
  jobId: string,
): ToolJobState {
  if (!jobId.trim()) throw new TypeError("Worker job ID is required.");
  return {
    ...state,
    status: "running",
    jobId: jobId.trim(),
    progress: null,
    result: null,
    previews: [],
    pageCount: 0,
    error: null,
  };
}

export function reduceWorkerJobState(
  state: ToolJobState,
  message: ToolWorkerResponse,
): ToolJobState {
  if (state.status !== "running" || message.jobId !== state.jobId) return state;
  if (message.type === "progress") {
    const { completed, total, stage } = message;
    return { ...state, progress: { completed, total, stage } };
  }
  if (message.type === "failure") {
    return {
      ...state,
      status: "failed",
      progress: null,
      error: {
        code: message.code,
        message: message.message,
        recovery: message.recovery,
      },
    };
  }
  if (message.type === "canceled") {
    return { ...state, status: "canceled", progress: null };
  }
  if (message.type === "inspected") {
    return {
      ...state,
      status: "completed",
      progress: null,
      previews: message.previews,
      pageCount: message.pageCount,
    };
  }
  return {
    ...state,
    status: "completed",
    progress: null,
    result: message.result,
  };
}

export function cancelWorkerJob(
  state: ToolJobState,
): { state: ToolJobState; message: ToolWorkerCancel } | null {
  if (state.status !== "running" || !state.jobId) return null;
  return {
    state: { ...state, status: "canceled", progress: null },
    message: { type: "cancel", jobId: state.jobId },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === "string";
}

function isWorkerInputFile(value: unknown): value is WorkerInputFile {
  if (!isRecord(value) || !isNonEmptyString(value.id)) return false;
  if (!(value.data instanceof ArrayBuffer)) return false;
  const metadata = value.metadata;
  return (
    isRecord(metadata) &&
    typeof metadata.name === "string" &&
    typeof metadata.mime === "string" &&
    typeof metadata.size === "number"
  );
}

function isPagePreview(value: unknown): value is ToolPagePreview {
  return (
    isRecord(value) &&
    typeof value.pageNumber === "number" &&
    typeof value.pageWidth === "number" &&
    typeof value.pageHeight === "number"
  );
}

function isRunItem(value: unknown): value is ToolRunItem {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    typeof value.selected === "boolean" &&
    (value.rotation === 0 ||
      value.rotation === 90 ||
      value.rotation === 180 ||
      value.rotation === 270)
  );
}
