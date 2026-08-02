/**
 * The one worker for every tool that runs off the main thread.
 *
 * It knows nothing about any individual tool: the request carries a folder
 * key, and the two dynamic imports below are bundler context modules over
 * `tools/*` — the static prefix and suffix let the bundler emit one chunk per
 * folder and fetch only the requested one. There is no map and no registry.
 */

import {
  detectMediaKind,
  validateMediaSignature,
} from "./media/validation";
import { TOOL_SLUG_PATTERN } from "@smarttools/tool-catalog";

import { assertRunnableText } from "./inputGuard";
import { ToolError, type ToolRun, type ToolRunFile } from "./run";
import { parseSettings } from "./settings";
import type { ToolInputSpec, ToolSpec } from "./spec";
import {
  getResultTransferables,
  isToolWorkerMessage,
  type ToolWorkerInspect,
  type ToolWorkerRequest,
  type ToolWorkerResponse,
  type WorkerInputFile,
} from "./workerProtocol";

type WorkerScope = {
  addEventListener(
    type: "message",
    listener: (event: MessageEvent<unknown>) => void,
  ): void;
  postMessage(message: ToolWorkerResponse, transfer?: Transferable[]): void;
};

const scope = globalThis as unknown as WorkerScope;

/** Fallback limits for a spec that declares none. */
const DEFAULT_MAX_FILES = 50;
const DEFAULT_MAX_BYTES = 200 * 1024 * 1024;
let running: AbortController | null = null;

scope.addEventListener("message", (event) => {
  const message = event.data;
  if (!isToolWorkerMessage(message)) return;
  if (message.type === "cancel") {
    running?.abort();
    return;
  }
  if (message.type === "inspect") {
    void inspectJob(message);
    return;
  }
  void runJob(message);
});

/** Starts a job, aborting whatever was running. Returns its abort controller. */
function beginJob(): AbortController {
  running?.abort();
  const controller = new AbortController();
  running = controller;
  return controller;
}

async function runJob(message: ToolWorkerRequest): Promise<void> {
  const controller = beginJob();
  const jobId = message.jobId;
  const signal = controller.signal;
  try {
    if (!TOOL_SLUG_PATTERN.test(message.key)) {
      throw new ToolError("unknown-tool", "This tool is not available.");
    }
    const [specModule, runModule]: [unknown, unknown] = await Promise.all([
      import(`../../tools/${message.key}/definition`),
      import(`../../tools/${message.key}/run.worker`),
    ]);
    const spec = readSpec(specModule);
    signal.throwIfAborted();
    assertRunnableFiles(spec, message.files);
    assertRunnableText(spec, { text: message.text, secondary: message.secondary });
    const result = await readRun(runModule)({
      input: {
        text: message.text ?? "",
        secondary: message.secondary,
        files: message.files.map(toRunFile),
        items: message.items,
      },
      settings: parseSettings(spec.settings, message.settings),
      signal,
      progress: (progress) => {
        if (signal.aborted) return;
        scope.postMessage({ type: "progress", jobId, ...progress });
      },
    });
    signal.throwIfAborted();
    scope.postMessage(
      { type: "success", jobId, result },
      getResultTransferables(result),
    );
  } catch (error) {
    scope.postMessage(toFailureMessage(error, jobId));
  } finally {
    if (running === controller) running = null;
  }
}

/**
 * Renders page previews for a document. Whether a tool wants them is declared
 * by its own spec (`input.inspect`) and by nothing else — this file resolves a
 * folder as a module path and never compares one against a literal.
 *
 * `pdfRender` is imported dynamically and only here: it owns `pdfjs-dist`, so
 * keeping it behind this branch keeps the vendor chunk off every other job.
 */
async function inspectJob(message: ToolWorkerInspect): Promise<void> {
  const controller = beginJob();
  const jobId = message.jobId;
  const signal = controller.signal;
  try {
    if (!TOOL_SLUG_PATTERN.test(message.key)) {
      throw new ToolError("unknown-tool", "This tool is not available.");
    }
    const specModule: unknown = await import(
      `../../tools/${message.key}/definition`
    );
    const spec = readSpec(specModule);
    signal.throwIfAborted();
    if (
      spec.input.kind !== "files" ||
      spec.input.inspect !== true ||
      spec.input.engine !== "pdf"
    ) {
      throw new ToolError(
        "inspection-unsupported",
        "This tool does not use page previews.",
      );
    }
    // The same trust boundaries the run path applies, in the same order.
    assertRunnableFiles(spec, message.files);
    assertRunnableText(spec, { text: undefined, secondary: undefined });
    const file = message.files[0];
    if (!file) throw new ToolError("no-files", "Choose at least one file.");
    const { inspectPdf } = await import("./media/pdfRender");
    const inspection = await inspectPdf(
      toRunFile(file),
      message.thumbnailWidth,
      signal,
    );
    signal.throwIfAborted();
    scope.postMessage(
      {
        type: "inspected",
        jobId,
        pageCount: inspection.pageCount,
        previews: inspection.thumbnails,
      },
      inspection.thumbnails.map(({ buffer }) => buffer),
    );
  } catch (error) {
    scope.postMessage(toFailureMessage(error, jobId));
  } finally {
    if (running === controller) running = null;
  }
}

/** Never leaks a stack trace, a module path, or an internal message. */
function toFailureMessage(
  error: unknown,
  jobId: string,
): ToolWorkerResponse {
  if (error instanceof DOMException && error.name === "AbortError") {
    return { type: "canceled", jobId };
  }
  if (error instanceof ToolError) {
    return {
      type: "failure",
      jobId,
      code: error.code,
      message: error.message,
      recovery: error.recovery,
    };
  }
  return {
    type: "failure",
    jobId,
    code: "processing-failed",
    message: "This tool could not finish. The input may be malformed or unsupported.",
  };
}

/** The single trust boundary for file input: limits come from the spec only. */
export function assertRunnableFiles(
  spec: ToolSpec,
  files: readonly WorkerInputFile[],
): void {
  const limits = fileLimits(spec.input);
  if (!limits) {
    if (files.length > 0) {
      throw new ToolError("unexpected-files", "This tool does not accept files.");
    }
    return;
  }
  if (spec.input.kind === "files" && files.length === 0) {
    throw new ToolError("no-files", "Choose at least one file.");
  }
  if (files.length > limits.maxFiles) {
    throw new ToolError(
      "too-many-files",
      `Choose no more than ${limits.maxFiles} file${limits.maxFiles === 1 ? "" : "s"}.`,
    );
  }
  for (const file of files) {
    const size = file.data.byteLength;
    if (size === 0) {
      throw new ToolError("invalid-size", "A selected file is empty.");
    }
    if (size > limits.maxBytes) {
      throw new ToolError(
        "file-too-large",
        `Each file must be ${Math.floor(limits.maxBytes / (1024 * 1024))} MiB or smaller.`,
      );
    }
    const { mime, name } = file.metadata;
    if (!isAccepted(limits.accept, mime, name)) {
      throw new ToolError(
        "unsupported-type",
        "This file type is not supported by this tool.",
      );
    }
    // Content is checked only when the shared detector recognises the bytes,
    // so a file disguised behind an accepted MIME is rejected while formats
    // the detector does not know stay usable on their declared type.
    const bytes = new Uint8Array(file.data);
    if (detectMediaKind(bytes)) {
      const signature = validateMediaSignature(bytes, mime);
      if (!signature.ok) throw new ToolError(signature.code, signature.message);
    }
  }
}

function fileLimits(
  input: ToolInputSpec,
): { accept: string; maxFiles: number; maxBytes: number } | null {
  if (input.kind === "files") {
    return {
      accept: input.accept,
      maxFiles: input.maxFiles ?? (input.multiple ? DEFAULT_MAX_FILES : 1),
      maxBytes: input.maxBytes ?? DEFAULT_MAX_BYTES,
    };
  }
  if (input.kind === "text" && input.acceptFiles) {
    return { accept: input.acceptFiles.accept, maxFiles: 1, maxBytes: input.acceptFiles.maxBytes };
  }
  return null;
}

function isAccepted(accept: string, mime: string, name: string): boolean {
  const entries = accept
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  if (entries.length === 0) return true;
  const declaredMime = mime.trim().toLowerCase();
  const fileName = name.toLowerCase();
  return entries.some((entry) =>
    entry.startsWith(".")
      ? fileName.endsWith(entry)
      : entry.endsWith("/*")
        ? declaredMime.startsWith(entry.slice(0, -1))
        : entry === declaredMime,
  );
}

function toRunFile(file: WorkerInputFile): ToolRunFile {
  return {
    id: file.id,
    name: file.metadata.name,
    mime: file.metadata.mime,
    data: file.data,
  };
}

function readSpec(module: unknown): ToolSpec {
  const value = pick(module, "default");
  if (pick(value, "input") === undefined || pick(value, "settings") === undefined) {
    throw new ToolError("unknown-tool", "This tool is not available.");
  }
  return value as ToolSpec;
}

function readRun(module: unknown): ToolRun<unknown> {
  const value = pick(module, "default") ?? pick(module, "run");
  if (typeof value !== "function") {
    throw new ToolError("unknown-tool", "This tool is not available.");
  }
  return value as ToolRun<unknown>;
}

function pick(value: unknown, key: string): unknown {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)[key]
    : undefined;
}
