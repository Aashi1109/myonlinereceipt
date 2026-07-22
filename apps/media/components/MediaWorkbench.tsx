"use client";

import {
  AlertBanner,
  Button,
  Card,
  Checkbox,
  Field,
  Input,
  Select,
  StatusBadge,
  ToolPageHeader,
} from "@smarttools/ui";
import { OrderableList } from "@smarttools/ui/components/OrderableList";
import {
  Download,
  FileImage,
  FileText,
  GripVertical,
  LoaderCircle,
  RotateCcw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  type DragEvent,
  type KeyboardEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { MediaToolDefinition, MediaToolSlug } from "../lib/tools";
import {
  beginWorkerJob,
  cancelWorkerJob,
  createInspectPdfMessage,
  createStartWorkerMessage,
  createWorkerInput,
  createWorkerJobState,
  getStartTransferables,
  reduceWorkerJobState,
  type MediaJobOptionsByOperation,
  type PdfInspectionWorkerMessage,
  type WorkerJobState,
  type WorkerResponseMessage,
} from "../lib/workerProtocol";
import {
  MEDIA_LIMITS,
  detectMediaKind,
  parsePageRange,
  validateMediaSignature,
  validateImageSelection,
  validatePdfSelection,
  type MediaKind,
} from "../lib/validation";

type RawOptionValue = boolean | number | string;
type RawOptions = Record<string, RawOptionValue>;

type QueuedFile = {
  file: File;
  id: string;
  mime: string;
  previewUrl: string | null;
  rotation: 0 | 90 | 180 | 270;
};

type DownloadResult = {
  filename: string;
  mime: string;
  size: number;
  url: string;
};

type PdfPagePreview = {
  height: number;
  pageNumber: number;
  url: string;
  width: number;
};

const LOSSY_OUTPUTS = new Set<MediaToolSlug>([
  "png-to-jpg",
  "jpg-to-webp",
  "png-to-webp",
  "webp-to-jpg",
  "heic-to-jpg",
]);

const PDF_PAGE_CONTROL_TOOLS = new Set<MediaToolSlug>([
  "delete-pdf-pages",
  "reorder-pdf-pages",
  "rotate-pdf-pages",
]);

export function MediaWorkbench({
  definition,
  description,
  title,
}: {
  definition: MediaToolDefinition;
  description: string;
  title: string;
}) {
  const [files, setFiles] = useState<QueuedFile[]>([]);
  const [watermarkFile, setWatermarkFile] = useState<File | null>(null);
  const [options, setOptions] = useState<RawOptions>(() =>
    createDefaultOptions(definition.slug),
  );
  const [job, setJob] = useState<WorkerJobState>(() => createWorkerJobState());
  const [pdfPages, setPdfPages] = useState<PdfPagePreview[]>([]);
  const [isInspectingPdf, setIsInspectingPdf] = useState(false);
  const [results, setResults] = useState<DownloadResult[]>([]);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const activeJobIdRef = useRef<string | null>(null);
  const inspectionJobIdRef = useRef<string | null>(null);
  const resultUrlsRef = useRef(new Set<string>());
  const fileUrlsRef = useRef(new Set<string>());
  const pdfPageUrlsRef = useRef(new Set<string>());
  const mountedRef = useRef(false);
  const lifecycleGenerationRef = useRef(0);

  function isCurrentLifecycle(token: number) {
    return mountedRef.current && lifecycleGenerationRef.current === token;
  }

  const revokeResults = useCallback(() => {
    for (const url of resultUrlsRef.current) URL.revokeObjectURL(url);
    resultUrlsRef.current.clear();
    setResults([]);
  }, []);

  const revokePdfPagePreviews = useCallback(() => {
    for (const url of pdfPageUrlsRef.current) URL.revokeObjectURL(url);
    pdfPageUrlsRef.current.clear();
    setPdfPages([]);
  }, []);

  const terminateWorker = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
    activeJobIdRef.current = null;
    inspectionJobIdRef.current = null;
  }, []);

  useEffect(() => {
    const fileUrls = fileUrlsRef.current;
    const resultUrls = resultUrlsRef.current;
    const pdfPageUrls = pdfPageUrlsRef.current;
    mountedRef.current = true;
    lifecycleGenerationRef.current += 1;
    return () => {
      mountedRef.current = false;
      lifecycleGenerationRef.current += 1;
      activeJobIdRef.current = null;
      inspectionJobIdRef.current = null;
      workerRef.current?.terminate();
      workerRef.current = null;
      for (const url of fileUrls) URL.revokeObjectURL(url);
      for (const url of resultUrls) URL.revokeObjectURL(url);
      for (const url of pdfPageUrls) URL.revokeObjectURL(url);
      fileUrls.clear();
      resultUrls.clear();
      pdfPageUrls.clear();
    };
  }, []);

  useEffect(() => {
    if (selectionError || job.status === "failed") errorRef.current?.focus();
  }, [job.status, selectionError]);

  const setOption = useCallback(
    (name: string, value: RawOptionValue) => {
      if (activeJobIdRef.current) return;
      setOptions((current) => ({ ...current, [name]: value }));
      revokeResults();
      setJob(createWorkerJobState());
    },
    [revokeResults],
  );

  async function addFiles(selected: FileList | readonly File[]) {
    if (activeJobIdRef.current) return;
    const lifecycleToken = lifecycleGenerationRef.current;
    const incoming = Array.from(selected);
    if (!incoming.length) return;
    const nextFiles = definition.multiple ? incoming : incoming.slice(0, 1);
    if (!definition.multiple && incoming.length > 1) {
      setSelectionError("This tool accepts one file at a time.");
      return;
    }
    const combinedSizes = [...files.map(({ file }) => file), ...nextFiles];
    const selection = definition.accept.includes("image/")
      ? validateImageSelection(combinedSizes)
      : validatePdfSelection(combinedSizes, { merge: definition.slug === "merge-pdf" });
    if (!selection.ok) {
      setSelectionError(selection.message);
      return;
    }

    const queued: QueuedFile[] = [];
    for (const file of nextFiles) {
      const header = new Uint8Array(await file.slice(0, 64 * 1024).arrayBuffer());
      if (!isCurrentLifecycle(lifecycleToken)) return;
      if (definition.slug === "crop-image" && detectMediaKind(header) === "heic") {
        for (const item of queued) revokeFilePreview(item);
        setSelectionError(
          "HEIC crop previews are not supported. Convert the image to JPEG or PNG first.",
        );
        return;
      }
      const signature = validateMediaSignature(
        header,
        file.type || "application/octet-stream",
        allowedKinds(definition.accept),
      );
      if (!signature.ok) {
        for (const item of queued) revokeFilePreview(item);
        setSelectionError(signature.message);
        return;
      }
      const canPreview =
        signature.mime.startsWith("image/") && signature.kind !== "heic";
      const previewUrl = canPreview
        ? URL.createObjectURL(new Blob([file], { type: signature.mime }))
        : null;
      if (previewUrl) fileUrlsRef.current.add(previewUrl);
      queued.push({
        file,
        id: crypto.randomUUID(),
        mime: signature.mime,
        previewUrl,
        rotation: 0 as const,
      });
    }

    if (!isCurrentLifecycle(lifecycleToken)) return;

    if (!definition.multiple) {
      for (const current of files) revokeFilePreview(current);
      setFiles(queued);
    } else {
      setFiles((current) => [...current, ...queued]);
    }
    revokeResults();
    setSelectionError(null);
    setJob(createWorkerJobState());
    if (PDF_PAGE_CONTROL_TOOLS.has(definition.slug) && queued[0]) {
      void inspectPdfPages(queued[0]);
    }
  }

  function revokeFilePreview(item: QueuedFile) {
    if (!item.previewUrl) return;
    URL.revokeObjectURL(item.previewUrl);
    fileUrlsRef.current.delete(item.previewUrl);
  }

  function removeFile(id: string) {
    if (activeJobIdRef.current) return;
    if (PDF_PAGE_CONTROL_TOOLS.has(definition.slug)) {
      terminateWorker();
      setIsInspectingPdf(false);
      revokePdfPagePreviews();
    }
    setFiles((current) => {
      const removed = current.find((item) => item.id === id);
      if (removed) revokeFilePreview(removed);
      return current.filter((item) => item.id !== id);
    });
    revokeResults();
    setJob(createWorkerJobState());
  }

  function reorderFiles(nextFiles: QueuedFile[]) {
    if (activeJobIdRef.current) return;
    setFiles(nextFiles);
    revokeResults();
    setJob(createWorkerJobState());
  }

  function rotateQueuedFile(id: string) {
    if (activeJobIdRef.current) return;
    setFiles((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              rotation: ((item.rotation + 90) % 360) as QueuedFile["rotation"],
            }
          : item,
      ),
    );
    revokeResults();
    setJob(createWorkerJobState());
  }

  async function chooseWatermarkFile(file: File | null) {
    if (activeJobIdRef.current) return;
    if (!file) {
      setWatermarkFile(null);
      revokeResults();
      setJob(createWorkerJobState());
      return;
    }
    const lifecycleToken = lifecycleGenerationRef.current;
    const selection = validateImageSelection([file]);
    if (!selection.ok) {
      setSelectionError(selection.message);
      return;
    }
    const header = new Uint8Array(await file.slice(0, 64 * 1024).arrayBuffer());
    if (!isCurrentLifecycle(lifecycleToken)) return;
    const signature = validateMediaSignature(
      header,
      file.type || "application/octet-stream",
      ["jpeg", "png"],
    );
    if (!signature.ok) {
      setSelectionError(signature.message);
      return;
    }
    setWatermarkFile(
      file.type === signature.mime
        ? file
        : new File([file], file.name, { lastModified: file.lastModified, type: signature.mime }),
    );
    revokeResults();
    setJob(createWorkerJobState());
    setSelectionError(null);
  }

  function reset() {
    terminateWorker();
    setIsInspectingPdf(false);
    revokePdfPagePreviews();
    for (const item of files) revokeFilePreview(item);
    setFiles([]);
    setWatermarkFile(null);
    setOptions(createDefaultOptions(definition.slug));
    setSelectionError(null);
    setJob(createWorkerJobState());
    revokeResults();
    if (inputRef.current) inputRef.current.value = "";
  }

  function createWorker() {
    return definition.engine === "image"
      ? new Worker(new URL("../workers/image.worker.ts", import.meta.url), {
          name: "smarttools-image-worker",
          type: "module",
        })
      : new Worker(new URL("../workers/pdf.worker.ts", import.meta.url), {
          name: "smarttools-pdf-worker",
          type: "module",
        });
  }

  async function inspectPdfPages(item: QueuedFile) {
    terminateWorker();
    revokePdfPagePreviews();
    setIsInspectingPdf(true);
    setSelectionError(null);
    const jobId = crypto.randomUUID();
    inspectionJobIdRef.current = jobId;
    const lifecycleToken = lifecycleGenerationRef.current;

    try {
      const data = await item.file.arrayBuffer();
      if (
        !isCurrentLifecycle(lifecycleToken) ||
        inspectionJobIdRef.current !== jobId
      ) return;
      const input = createWorkerInput(
        item.id,
        data,
        item.file.name,
        item.mime,
      );
      const message = createInspectPdfMessage(jobId, input, 180);
      const worker = new Worker(new URL("../workers/pdf.worker.ts", import.meta.url), {
        name: "smarttools-pdf-inspection-worker",
        type: "module",
      });
      workerRef.current = worker;
      worker.onmessage = (event: MessageEvent<WorkerResponseMessage>) => {
        const response = event.data;
        if (
          !isCurrentLifecycle(lifecycleToken) ||
          response.jobId !== inspectionJobIdRef.current
        ) return;
        if (response.type === "progress") return;
        if (response.type === "pdf-inspection") {
          applyPdfInspection(response);
          inspectionJobIdRef.current = null;
          worker.terminate();
          if (workerRef.current === worker) workerRef.current = null;
          setIsInspectingPdf(false);
          return;
        }
        if (response.type === "failure") {
          setSelectionError(response.message);
          inspectionJobIdRef.current = null;
          worker.terminate();
          if (workerRef.current === worker) workerRef.current = null;
          setIsInspectingPdf(false);
        }
      };
      worker.onerror = () => {
        if (
          !isCurrentLifecycle(lifecycleToken) ||
          inspectionJobIdRef.current !== jobId
        ) return;
        setSelectionError(
          "The browser could not create PDF page previews. Your file is still selected.",
        );
        inspectionJobIdRef.current = null;
        worker.terminate();
        if (workerRef.current === worker) workerRef.current = null;
        setIsInspectingPdf(false);
      };
      worker.postMessage(message, [message.input.data]);
    } catch {
      if (
        !isCurrentLifecycle(lifecycleToken) ||
        inspectionJobIdRef.current !== jobId
      ) return;
      inspectionJobIdRef.current = null;
      setIsInspectingPdf(false);
      setSelectionError(
        "The browser could not prepare PDF page previews. Your file is still selected.",
      );
      terminateWorker();
    }
  }

  function applyPdfInspection(message: PdfInspectionWorkerMessage) {
    revokePdfPagePreviews();
    const previews = message.thumbnails.map((thumbnail) => {
      const url = URL.createObjectURL(
        new Blob([thumbnail.buffer], { type: thumbnail.mime }),
      );
      pdfPageUrlsRef.current.add(url);
      return {
        height: thumbnail.height,
        pageNumber: thumbnail.pageNumber,
        url,
        width: thumbnail.width,
      };
    });
    setPdfPages(previews);
    if (definition.slug === "reorder-pdf-pages") {
      setOption("pages", previews.map(({ pageNumber }) => pageNumber).join(","));
    } else if (definition.slug === "delete-pdf-pages") {
      setOption("pages", "");
    } else if (definition.slug === "rotate-pdf-pages") {
      setOption("pages", "all");
    }
  }

  function changePdfPageOrder(pageNumbers: readonly number[]) {
    if (activeJobIdRef.current) return;
    const byPageNumber = new Map(pdfPages.map((page) => [page.pageNumber, page]));
    setPdfPages(
      pageNumbers.flatMap((pageNumber) => {
        const page = byPageNumber.get(pageNumber);
        return page ? [page] : [];
      }),
    );
    setOption("pages", pageNumbers.join(","));
  }

  async function processFiles() {
    if (!files.length || job.status === "processing") return;
    if (PDF_PAGE_CONTROL_TOOLS.has(definition.slug) && !pdfPages.length) {
      setSelectionError(
        "Page previews are required for this tool. Re-select the PDF to prepare them.",
      );
      return;
    }
    if (
      definition.slug === "compress-pdf" &&
      options.mode === "strong" &&
      options.confirmed !== true
    ) {
      setSelectionError("Confirm the document-content loss before using Strong Compression.");
      return;
    }
    if (
      definition.slug === "watermark-pdf" &&
      options.watermarkKind === "image" &&
      !watermarkFile
    ) {
      setSelectionError("Choose a JPG or PNG watermark image.");
      return;
    }

    const useImageWatermark =
      definition.slug === "watermark-pdf" &&
      options.watermarkKind === "image" &&
      watermarkFile !== null;
    const watermarkInputId = useImageWatermark ? "watermark-image" : null;
    let jobOptions: MediaJobOptionsByOperation[MediaToolSlug];
    try {
      jobOptions = buildJobOptions(
        definition.slug,
        options,
        files,
        watermarkInputId,
      );
    } catch (error) {
      setSelectionError(
        error instanceof Error ? error.message : "Check the processing options.",
      );
      return;
    }

    revokeResults();
    setSelectionError(null);
    const jobId = crypto.randomUUID();
    setJob((current) => beginWorkerJob(current, jobId));
    activeJobIdRef.current = jobId;
    const lifecycleToken = lifecycleGenerationRef.current;

    try {
      const inputs = [];
      for (const item of files) {
        const data = await item.file.arrayBuffer();
        if (!isCurrentLifecycle(lifecycleToken) || activeJobIdRef.current !== jobId) return;
        inputs.push(
          createWorkerInput(
            item.id,
            data,
            item.file.name,
            item.mime,
          ),
        );
      }
      if (watermarkInputId && watermarkFile) {
        const watermarkData = await watermarkFile.arrayBuffer();
        if (!isCurrentLifecycle(lifecycleToken) || activeJobIdRef.current !== jobId) return;
        inputs.push(
          createWorkerInput(
            watermarkInputId!,
            watermarkData,
            watermarkFile.name,
            watermarkFile.type || "application/octet-stream",
          ),
        );
      }

      const message = createStartWorkerMessage({
        jobId,
        operation: definition.operation,
        files: inputs,
        options: jobOptions,
      });
      if (!isCurrentLifecycle(lifecycleToken) || activeJobIdRef.current !== jobId) return;
      const worker = workerRef.current ?? createWorker();
      workerRef.current = worker;
      worker.onmessage = (event: MessageEvent<WorkerResponseMessage>) => {
        const response = event.data;
        if (
          !isCurrentLifecycle(lifecycleToken) ||
          response.jobId !== activeJobIdRef.current
        ) return;
        if (response.type === "complete") {
          const downloads = response.outputs.map((output) => {
            const url = URL.createObjectURL(
              new Blob([output.buffer], { type: output.mime }),
            );
            resultUrlsRef.current.add(url);
            return {
              filename: output.filename,
              mime: output.mime,
              size: output.size,
              url,
            };
          });
          setResults(downloads);
          setJob((current) => ({
            ...reduceWorkerJobState(current, response),
            outputs: [],
          }));
          activeJobIdRef.current = null;
          return;
        }
        setJob((current) => reduceWorkerJobState(current, response));
        if (response.type === "failure") activeJobIdRef.current = null;
      };
      worker.onerror = () => {
        if (!isCurrentLifecycle(lifecycleToken) || activeJobIdRef.current !== jobId) return;
        const failure: WorkerResponseMessage = {
          type: "failure",
          jobId,
          code: "worker-unavailable",
          message:
            "The browser could not finish this job. Your selected files are still available; try again or choose a smaller batch.",
        };
        setJob((current) => reduceWorkerJobState(current, failure));
        terminateWorker();
      };
      worker.postMessage(message, getStartTransferables(message));
    } catch {
      if (!isCurrentLifecycle(lifecycleToken) || activeJobIdRef.current !== jobId) return;
      const failure: WorkerResponseMessage = {
        type: "failure",
        jobId,
        code: "job-setup-failed",
        message:
          "The browser could not prepare this job. Your files have not been uploaded or stored.",
      };
      setJob((current) => reduceWorkerJobState(current, failure));
      terminateWorker();
    }
  }

  function cancel() {
    setJob((current) => {
      const canceled = cancelWorkerJob(current);
      return canceled?.state ?? current;
    });
    terminateWorker();
  }

  const error = selectionError ?? job.error?.message ?? null;
  const firstPreview = files.find(({ previewUrl }) => previewUrl)?.previewUrl ?? null;
  const isProcessing = job.status === "processing";
  const signedPdfWarning =
    definition.engine === "pdf" &&
    !["pdf-to-jpg", "pdf-to-png"].includes(definition.slug);

  return (
    <div>
      <ToolPageHeader
        actions={
          files.length ? (
            <Button onClick={reset} type="button" variant="outline">
              <RotateCcw aria-hidden="true" className="size-4" />
              Reset
            </Button>
          ) : undefined
        }
        className="border-b-0 pb-0"
        description={description}
        eyebrow={
          <>
            <StatusBadge variant="success">Runs locally</StatusBadge>
            <span>{definition.category}</span>
          </>
        }
        inlineEyebrow
        title={title}
      />

      {signedPdfWarning ? (
        <AlertBanner className="mt-4" title="Digital signatures" variant="warning">
          Rewriting a digitally signed PDF invalidates its signatures. Keep the original if signatures matter.
        </AlertBanner>
      ) : null}
      {definition.slug === "crop-pdf" ? (
        <AlertBanner className="mt-4" variant="warning">
          Cropping changes the visible page box. Hidden content may remain in the PDF file.
        </AlertBanner>
      ) : null}
      {definition.slug === "remove-image-metadata" ? (
        <AlertBanner className="mt-4" variant="info">
          Images are decoded, oriented, and re-encoded. Metadata is removed, but exact color-profile preservation is not claimed.
        </AlertBanner>
      ) : null}

      <div className="mt-8 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
        <div className="min-w-0 space-y-6">
          <Card className="p-5 sm:p-6">
            <input
              accept={definition.accept}
              className="sr-only"
              disabled={isProcessing}
              multiple={definition.multiple}
              onChange={(event) => {
                if (event.target.files) void addFiles(event.target.files);
              }}
              ref={inputRef}
              type="file"
            />
            <button
              className="flex min-h-52 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/40 px-6 py-10 text-center outline-none transition hover:border-primary hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              disabled={isProcessing}
              onClick={() => inputRef.current?.click()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event: DragEvent<HTMLButtonElement>) => {
                event.preventDefault();
                void addFiles(event.dataTransfer.files);
              }}
              type="button"
            >
              <span className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
                <Upload aria-hidden="true" className="size-6" />
              </span>
              <strong className="mt-5 text-lg font-black">Choose or drop local files</strong>
              <span className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                {definition.multiple ? "Select one or more files." : "Select one file."} Contents are validated by signature inside the processing worker.
              </span>
            </button>
          </Card>

          {files.length ? (
            <Card className="overflow-hidden">
              <div className="border-b border-border px-5 py-4 sm:px-6">
                <h2 className="font-black">Selected files</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {definition.multiple
                    ? "Processing follows the displayed order. Drag the handles to change it."
                    : "This file will be processed locally."}
                </p>
              </div>
              <OrderableList
                ariaLabel="Selected files"
                className="divide-y divide-border"
                disabled={isProcessing || !definition.multiple || files.length < 2}
                getId={(item) => item.id}
                items={files}
                onReorder={reorderFiles}
                renderItem={(item, orderable) => (
                  <div
                    className={`flex min-w-0 items-center gap-3 px-4 py-3 sm:px-6 ${
                      orderable.isDragging ? "bg-card shadow-lg ring-1 ring-primary/20" : ""
                    }`}
                  >
                    {definition.multiple ? (
                      <Button
                        {...orderable.attributes}
                        {...orderable.listeners}
                        aria-label={`Drag ${item.file.name} to reorder`}
                        className="size-8 cursor-grab touch-none text-muted-foreground active:cursor-grabbing disabled:cursor-not-allowed"
                        disabled={orderable.disabled}
                        ref={orderable.setActivatorNodeRef}
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        <GripVertical aria-hidden="true" className="size-4" />
                      </Button>
                    ) : null}
                    {item.previewUrl ? (
                      <img
                        alt=""
                        className="size-12 shrink-0 rounded-lg border border-border object-cover"
                        src={item.previewUrl}
                      />
                    ) : definition.accept.includes("pdf") ? (
                      <FileText aria-hidden="true" className="size-9 shrink-0 text-primary" />
                    ) : (
                      <FileImage aria-hidden="true" className="size-9 shrink-0 text-primary" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{item.file.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatBytes(item.file.size)}
                        {item.rotation ? ` · ${item.rotation}°` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {definition.slug === "image-to-pdf" ? (
                        <Button
                          aria-label={`Rotate ${item.file.name} 90 degrees`}
                          disabled={isProcessing}
                          onClick={() => rotateQueuedFile(item.id)}
                          size="icon"
                          type="button"
                          variant="ghost"
                        >
                          <RotateCcw aria-hidden="true" className="size-4" />
                        </Button>
                      ) : null}
                      <Button
                        aria-label={`Remove ${item.file.name}`}
                        disabled={isProcessing}
                        onClick={() => removeFile(item.id)}
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        <Trash2 aria-hidden="true" className="size-4" />
                      </Button>
                    </div>
                  </div>
                )}
              />
            </Card>
          ) : null}

          {PDF_PAGE_CONTROL_TOOLS.has(definition.slug) && files.length ? (
            isInspectingPdf ? (
              <Card aria-live="polite" className="flex items-center gap-3 p-5 sm:p-6">
                <LoaderCircle aria-hidden="true" className="size-5 animate-spin text-primary" />
                <div>
                  <h2 className="font-black">Preparing page controls</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Rendering small local previews. The PDF stays in this browser.
                  </p>
                </div>
              </Card>
            ) : pdfPages.length ? (
              <PdfPageControls
                disabled={isProcessing}
                mode={pdfControlMode(definition.slug)}
                onOrderChange={changePdfPageOrder}
                onSelectionChange={(pageNumbers) =>
                  setOption("pages", pageNumbers.join(","))
                }
                pageValue={text(options.pages)}
                pages={pdfPages}
              />
            ) : null
          ) : null}

          {definition.slug === "crop-image" && firstPreview ? (
            <CropOverlay
              disabled={isProcessing}
              onChange={setOption}
              options={options}
              previewUrl={firstPreview}
            />
          ) : null}
        </div>

        <div className="min-w-0 space-y-6">
          <Card className="p-5 sm:p-6">
            <h2 className="text-lg font-black">Options</h2>
            <fieldset className="mt-5 grid gap-4" disabled={isProcessing}>
              <ToolOptions
                definition={definition}
                files={files}
                onChange={setOption}
                onWatermarkChange={(file) => void chooseWatermarkFile(file)}
                options={options}
                watermarkFile={watermarkFile}
              />
            </fieldset>
          </Card>

          {error ? (
            <div ref={errorRef} tabIndex={-1}>
              <AlertBanner title="Could not process files" variant="error">
                {error}
              </AlertBanner>
            </div>
          ) : null}

          {job.status === "processing" ? (
            <Card className="p-5 sm:p-6" aria-live="polite">
              <div className="flex items-center gap-3">
                <LoaderCircle aria-hidden="true" className="size-5 animate-spin text-primary" />
                <div>
                  <p className="font-black">Processing locally</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {job.progress?.stage ?? "Preparing worker…"}
                  </p>
                </div>
              </div>
              <progress
                aria-label="Processing progress"
                className="mt-4 h-2 w-full accent-primary"
                max={job.progress?.total ?? 1}
                value={job.progress?.completed ?? 0}
              />
              <Button className="mt-4 w-full" onClick={cancel} type="button" variant="outline">
                <X aria-hidden="true" className="size-4" />
                Cancel
              </Button>
            </Card>
          ) : (
            <Button
              className="w-full"
              disabled={!files.length || isInspectingPdf}
              onClick={processFiles}
              size="lg"
              type="button"
            >
              {job.status === "failed" || job.status === "canceled" ? "Retry" : "Process files"}
            </Button>
          )}

          {results.length ? (
            <Card className="overflow-hidden" aria-live="polite">
              <div className="border-b border-border px-5 py-4 sm:px-6">
                <h2 className="font-black">Ready to download</h2>
                {job.sizes ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatBytes(job.sizes.inputBytes)} → {formatBytes(job.sizes.outputBytes)}
                    {job.sizes.outputBytes >= job.sizes.inputBytes
                      ? " · Original may already be optimized."
                      : ` · ${Math.round((1 - job.sizes.outputBytes / job.sizes.inputBytes) * 100)}% smaller`}
                  </p>
                ) : null}
              </div>
              <ul className="divide-y divide-border">
                {results.map((result) => (
                  <li className="flex min-w-0 items-center gap-3 px-5 py-4 sm:px-6" key={result.url}>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{result.filename}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{formatBytes(result.size)}</p>
                    </div>
                    <a
                      className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      download={result.filename}
                      href={result.url}
                    >
                      <Download aria-hidden="true" className="size-4" />
                      Download
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

type PdfPageControlMode = "delete" | "reorder" | "rotate";

function PdfPageControls({
  disabled,
  mode,
  onOrderChange,
  onSelectionChange,
  pages,
  pageValue,
}: {
  disabled: boolean;
  mode: PdfPageControlMode;
  onOrderChange(pageNumbers: readonly number[]): void;
  onSelectionChange(pageNumbers: readonly number[]): void;
  pages: readonly PdfPagePreview[];
  pageValue: string;
}) {
  const selected = selectedPdfPages(pageValue, pages.length);

  function togglePage(pageNumber: number) {
    const next = new Set(selected);
    if (next.has(pageNumber)) {
      next.delete(pageNumber);
    } else {
      if (mode === "delete" && next.size >= pages.length - 1) return;
      next.add(pageNumber);
    }
    onSelectionChange([...next].sort((left, right) => left - right));
  }

  const heading =
    mode === "reorder"
      ? "Reorder PDF pages"
      : mode === "rotate"
        ? "Choose pages to rotate"
        : "Choose pages to delete";

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border px-5 py-4 sm:px-6">
        <h2 className="font-black">{heading}</h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {mode === "reorder"
            ? "Drag the page handles to set the output order."
            : mode === "delete"
              ? "At least one page must remain in the output."
              : "Select pages below, then choose the rotation in Options."}
        </p>
      </div>
      {mode === "reorder" ? (
        <OrderableList
          ariaLabel="PDF pages"
          className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 sm:p-6"
          disabled={disabled || pages.length < 2}
          getId={(page) => String(page.pageNumber)}
          items={pages}
          layout="grid"
          onReorder={(nextPages) =>
            onOrderChange(nextPages.map(({ pageNumber }) => pageNumber))
          }
          renderItem={(page, orderable) => (
            <div
              className={`min-w-0 rounded-xl border border-border bg-background p-2 ${
                orderable.isDragging ? "shadow-lg ring-1 ring-primary/20" : ""
              }`}
            >
              <Button
                {...orderable.attributes}
                {...orderable.listeners}
                aria-label={`Drag page ${page.pageNumber} to reorder`}
                className="mb-2 size-8 cursor-grab touch-none text-muted-foreground active:cursor-grabbing disabled:cursor-not-allowed"
                disabled={orderable.disabled}
                ref={orderable.setActivatorNodeRef}
                size="icon"
                type="button"
                variant="ghost"
              >
                <GripVertical aria-hidden="true" className="size-4" />
              </Button>
              <img
                alt=""
                className="mx-auto max-h-44 w-auto rounded-md border border-border bg-white object-contain"
                height={page.height}
                src={page.url}
                width={page.width}
              />
              <p className="mt-2 text-center text-xs font-bold">Page {page.pageNumber}</p>
            </div>
          )}
        />
      ) : (
        <ol
          aria-label="PDF pages"
          className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 sm:p-6"
        >
          {pages.map((page) => {
            const isSelected = selected.has(page.pageNumber);
            const cannotDelete =
              mode === "delete" && !isSelected && selected.size >= pages.length - 1;
            return (
              <li
                className="min-w-0 rounded-xl border border-border bg-background p-2"
                key={page.pageNumber}
              >
                <button
                  aria-label={`${isSelected ? "Deselect" : "Select"} page ${page.pageNumber} ${mode === "delete" ? "for deletion" : "for rotation"}`}
                  aria-pressed={isSelected}
                  className="w-full rounded-lg p-1 text-center outline-none transition hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[selected=true]:bg-accent"
                  data-selected={isSelected}
                  disabled={disabled || cannotDelete}
                  onClick={() => togglePage(page.pageNumber)}
                  type="button"
                >
                  <img
                    alt=""
                    className="mx-auto max-h-44 w-auto rounded-md border border-border bg-white object-contain"
                    height={page.height}
                    src={page.url}
                    width={page.width}
                  />
                  <span className="mt-2 block text-xs font-bold">
                    Page {page.pageNumber}{isSelected ? " · Selected" : ""}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}

function pdfControlMode(slug: MediaToolSlug): PdfPageControlMode {
  if (slug === "reorder-pdf-pages") return "reorder";
  if (slug === "rotate-pdf-pages") return "rotate";
  if (slug === "delete-pdf-pages") return "delete";
  throw new TypeError(`Tool ${slug} does not use PDF page controls.`);
}

function selectedPdfPages(value: string, pageCount: number) {
  if (value.trim().toLowerCase() === "all") {
    return new Set(Array.from({ length: pageCount }, (_, index) => index + 1));
  }
  const parsed = parsePageRange(value, pageCount);
  return new Set(parsed.ok ? parsed.pages : []);
}

function ToolOptions({
  definition,
  files,
  onChange,
  onWatermarkChange,
  options,
  watermarkFile,
}: {
  definition: MediaToolDefinition;
  files: readonly QueuedFile[];
  onChange(name: string, value: RawOptionValue): void;
  onWatermarkChange(file: File | null): void;
  options: RawOptions;
  watermarkFile: File | null;
}) {
  const slug = definition.slug;
  const lossyInput = files.some(({ mime }) => /jpe?g|webp/i.test(mime));
  const hasHeic = files.some(({ mime }) => /image\/hei[cf]/i.test(mime));
  const outputFormat = text(options.outputFormat, "original");

  if (["jpg-to-png", "webp-to-png", "heic-to-png"].includes(slug)) {
    return <p className="text-sm leading-6 text-muted-foreground">Original dimensions are retained. Decoding and re-encoding strips embedded metadata.</p>;
  }

  if (slug === "remove-image-metadata") {
    return (
      <div className="grid gap-2 text-sm leading-6 text-muted-foreground">
        <p>Original dimensions are retained. Decoding and re-encoding strips embedded metadata.</p>
        {hasHeic ? <p className="font-semibold text-foreground">HEIC inputs are exported as JPEG because HEIC encoding is not available.</p> : null}
      </div>
    );
  }

  if (LOSSY_OUTPUTS.has(slug)) {
    return (
      <>
        <QualityField onChange={onChange} options={options} />
        {["png-to-jpg", "webp-to-jpg", "heic-to-jpg"].includes(slug) ? (
          <ColorField label="Transparency background" name="background" onChange={onChange} options={options} />
        ) : null}
      </>
    );
  }

  if (slug === "image-to-pdf") {
    return (
      <>
        <SelectField label="Page" name="page" onChange={onChange} options={options} values={[["auto", "Auto"], ["a4", "A4"], ["letter", "Letter"]]} />
        <SelectField label="Orientation" name="orientation" onChange={onChange} options={options} values={[["auto", "Auto"], ["portrait", "Portrait"], ["landscape", "Landscape"]]} />
        <SelectField label="Margin" name="margin" onChange={onChange} options={options} values={[["none", "None"], ["small", "Small"], ["normal", "Normal"]]} />
        <SelectField label="Fit" name="fit" onChange={onChange} options={options} values={[["contain", "Contain"], ["fill", "Fill"]]} />
        <SelectField label="Quality" name="pdfQuality" onChange={onChange} options={options} values={[["original", "Original"], ["balanced", "Balanced"], ["small", "Small"]]} />
        <ColorField label="Alpha background" name="background" onChange={onChange} options={options} />
        <TextField label="Output filename" name="filename" onChange={onChange} options={options} />
      </>
    );
  }

  if (slug === "pdf-to-jpg" || slug === "pdf-to-png") {
    return (
      <>
        <TextField description="Use all or ranges such as 1-3,5,8." label="Pages" name="pages" onChange={onChange} options={options} />
        <SelectField label="Resolution" name="dpi" onChange={onChange} options={options} values={[["150", "150 DPI"], ["300", "300 DPI"]]} />
        {slug === "pdf-to-png" ? (
          <SelectField label="Background" name="pdfBackground" onChange={onChange} options={options} values={[["transparent", "Transparent"], ["white", "White"]]} />
        ) : (
          <p className="text-xs leading-5 text-muted-foreground">JPEG pages use a white background.</p>
        )}
        {slug === "pdf-to-jpg" ? <QualityField onChange={onChange} options={options} /> : null}
      </>
    );
  }

  if (slug === "merge-pdf") {
    return <p className="text-sm leading-6 text-muted-foreground">Every page is merged in the displayed file order.</p>;
  }

  if (slug === "split-pdf") {
    const mode = text(options.splitMode, "every-page");
    return (
      <>
        <SelectField label="Split mode" name="splitMode" onChange={onChange} options={options} values={[["every-page", "Every page"], ["interval", "Every N pages"], ["ranges", "Explicit ranges"]]} />
        {mode === "interval" ? <NumberField label="Pages per file" min={1} name="interval" onChange={onChange} options={options} /> : null}
        {mode === "ranges" ? <TextField description="Separate output groups with semicolons, for example 1-3;4-6;8." label="Ranges" name="ranges" onChange={onChange} options={options} /> : null}
      </>
    );
  }

  if (slug === "extract-pdf-pages") {
    return <TextField description="Use page numbers such as 1-3,5,8." label="Pages" name="pages" onChange={onChange} options={options} />;
  }

  if (slug === "reorder-pdf-pages" || slug === "delete-pdf-pages") {
    return (
      <p className="text-sm leading-6 text-muted-foreground">
        Page selection and order are controlled from the page previews.
      </p>
    );
  }

  if (slug === "rotate-pdf-pages") {
    return <SelectField label="Rotation" name="degrees" onChange={onChange} options={options} values={[["90", "90°"], ["180", "180°"], ["270", "270°"]]} />;
  }

  if (slug === "crop-pdf") {
    return (
      <>
        <TextField description="Use all or ranges such as 1-3,5." label="Pages" name="pages" onChange={onChange} options={options} />
        <div className="grid grid-cols-2 gap-3">
          {[["cropX", "Left"], ["cropY", "Bottom"], ["cropWidth", "Width"], ["cropHeight", "Height"]].map(([name, label]) => <NumberField key={name} label={`${label} (pt)`} min={0} name={name} onChange={onChange} options={options} />)}
        </div>
      </>
    );
  }

  if (slug === "resize-pdf-pages") {
    const custom = options.pageSize === "custom";
    return (
      <>
        <TextField description="Use all or ranges such as 1-3,5." label="Pages" name="pages" onChange={onChange} options={options} />
        <SelectField label="Page size" name="pageSize" onChange={onChange} options={options} values={[["a4", "A4"], ["letter", "Letter"], ["legal", "Legal"], ["custom", "Custom"]]} />
        {custom ? <div className="grid grid-cols-2 gap-3"><NumberField label="Width (pt)" min={1} name="pdfWidth" onChange={onChange} options={options} /><NumberField label="Height (pt)" min={1} name="pdfHeight" onChange={onChange} options={options} /></div> : null}
        <SelectField label="Orientation" name="orientation" onChange={onChange} options={options} values={[["portrait", "Portrait"], ["landscape", "Landscape"]]} />
        <SelectField label="Fit" name="fit" onChange={onChange} options={options} values={[["contain", "Contain"], ["cover", "Fill"], ["stretch", "Stretch"]]} />
        <NumberField label="Margin (pt)" min={0} name="pdfMargin" onChange={onChange} options={options} />
      </>
    );
  }

  if (slug === "compress-pdf") {
    const strong = options.mode === "strong";
    return (
      <>
        <SelectField label="Compression mode" name="mode" onChange={onChange} options={options} values={[["preserve", "Preserve Document"], ["strong", "Strong Compression"]]} />
        {strong ? (
          <>
            <AlertBanner variant="warning">Pages are rasterized. Selectable text, links, forms, signatures, bookmarks, annotations, and accessibility information are lost.</AlertBanner>
            <SelectField label="Preset" name="strongPreset" onChange={onChange} options={options} values={[["high", "High · 150 DPI"], ["balanced", "Balanced · 120 DPI"], ["smallest", "Smallest · 96 DPI"]]} />
            <SelectField label="Color" name="color" onChange={onChange} options={options} values={[["original", "Original"], ["grayscale", "Grayscale"], ["black-and-white", "Black and white"]]} />
            <Checkbox checked={options.confirmed === true} label="I understand document content will be flattened" onChange={(event) => onChange("confirmed", event.target.checked)} />
          </>
        ) : (
          <Checkbox checked={options.removeMetadata === true} description="Text, links, forms, annotations, bookmarks, and accessibility structures remain structural where qpdf permits." label="Remove document metadata" onChange={(event) => onChange("removeMetadata", event.target.checked)} />
        )}
      </>
    );
  }

  if (slug === "watermark-pdf") {
    const image = options.watermarkKind === "image";
    return (
      <>
        <SelectField label="Watermark" name="watermarkKind" onChange={onChange} options={options} values={[["text", "Text"], ["image", "JPG or PNG image"]]} />
        {image ? (
          <Field htmlFor="watermark-image" label="Watermark image">
            <Input accept="image/jpeg,image/png" onChange={(event) => onWatermarkChange(event.target.files?.[0] ?? null)} type="file" />
          </Field>
        ) : (
          <TextField description="Text must fit the standard PDF font. Use an image for other scripts or unsupported characters." label="Text" name="watermarkText" onChange={onChange} options={options} />
        )}
        {image && watermarkFile ? <p className="text-xs text-muted-foreground">Selected: {watermarkFile.name}</p> : null}
        <TextField description="Use all or ranges such as 1-3,5." label="Pages" name="pages" onChange={onChange} options={options} />
        <RangeField label="Opacity" max={100} min={5} name="opacity" onChange={onChange} options={options} suffix="%" />
        <NumberField label={image ? "Size (% of page)" : "Font size"} min={1} name="watermarkSize" onChange={onChange} options={options} />
        <NumberField label="Rotation (degrees)" min={-180} name="watermarkRotation" onChange={onChange} options={options} />
        <PositionFields onChange={onChange} options={options} />
      </>
    );
  }

  if (slug === "add-page-numbers") {
    return (
      <>
        <SelectField label="Format" name="numberFormat" onChange={onChange} options={options} values={[["number", "1"], ["page-number", "Page 1"], ["number-of-total", "1 / N"]]} />
        <NumberField label="Start number" min={0} name="startNumber" onChange={onChange} options={options} />
        <NumberField label="Font size" min={6} name="fontSize" onChange={onChange} options={options} />
        <PositionFields onChange={onChange} options={options} />
      </>
    );
  }

  if (slug === "compress-image") {
    const allPng = files.length > 0 && files.every(({ mime }) => mime === "image/png");
    return (
      <>
        <SelectField label={allPng ? "Lossless effort" : "Preset"} name="imagePreset" onChange={(name, value) => { onChange(name, value); onChange("advancedQuality", false); }} options={options} values={allPng ? [["fast", "Fast"], ["balanced", "Balanced"], ["maximum", "Maximum"]] : [["best", "Best"], ["balanced", "Balanced"], ["smallest", "Smallest"]]} />
        {!allPng && (lossyInput || !files.length) ? <QualityField onChange={(name, value) => { onChange(name, value); onChange("advancedQuality", true); }} options={options} /> : null}
        <p className="text-xs leading-5 text-muted-foreground">Format and dimensions stay unchanged. PNG uses lossless compression and never shows a quality control.</p>
      </>
    );
  }

  if (slug === "resize-image") {
    const percentage = options.resizeUnit === "percentage";
    return (
      <>
        <SelectField label="Size unit" name="resizeUnit" onChange={onChange} options={options} values={[["pixels", "Pixels"], ["percentage", "Percentage"]]} />
        {percentage ? <NumberField label="Percentage" min={1} name="percentage" onChange={onChange} options={options} /> : <div className="grid grid-cols-2 gap-3"><NumberField label="Width" min={1} name="width" onChange={onChange} options={options} /><NumberField label="Height" min={1} name="height" onChange={onChange} options={options} /></div>}
        <Checkbox checked={options.lockAspectRatio === true} label="Lock aspect ratio" onChange={(event) => onChange("lockAspectRatio", event.target.checked)} />
        <Checkbox checked={options.noUpscale === true} label="Do not upscale smaller images" onChange={(event) => onChange("noUpscale", event.target.checked)} />
        <SelectField label="Fit" name="fit" onChange={onChange} options={options} values={[["contain", "Contain"], ["cover", "Cover"], ["stretch", "Stretch"]]} />
        <OutputFields hasHeic={hasHeic} onChange={onChange} options={options} outputFormat={outputFormat} />
      </>
    );
  }

  if (slug === "crop-image") {
    return (
      <>
        <SelectField label="Aspect ratio" name="cropAspect" onChange={onChange} options={options} values={[["free", "Free"], ["1:1", "1:1"], ["4:3", "4:3"], ["16:9", "16:9"]]} />
        <div className="grid grid-cols-2 gap-3">
          {[["cropX", "X"], ["cropY", "Y"], ["cropWidth", "Width"], ["cropHeight", "Height"]].map(([name, label]) => <NumberField key={name} label={`${label} (px)`} min={0} name={name} onChange={onChange} options={options} />)}
        </div>
        <OutputFields onChange={onChange} options={options} outputFormat={outputFormat} />
      </>
    );
  }

  if (slug === "rotate-image") {
    return <><SelectField label="Rotation" name="degrees" onChange={onChange} options={options} values={[["90", "90°"], ["180", "180°"], ["270", "270°"]]} /><OutputFields hasHeic={hasHeic} onChange={onChange} options={options} outputFormat={outputFormat} /></>;
  }

  if (slug === "flip-image") {
    return <><SelectField label="Direction" name="axis" onChange={onChange} options={options} values={[["horizontal", "Horizontal"], ["vertical", "Vertical"]]} /><OutputFields hasHeic={hasHeic} onChange={onChange} options={options} outputFormat={outputFormat} /></>;
  }

  if (slug === "combine-images") {
    return (
      <>
        <SelectField label="Layout" name="layout" onChange={onChange} options={options} values={[["horizontal", "Horizontal"], ["vertical", "Vertical"], ["grid", "Grid"]]} />
        {options.layout === "grid" ? <NumberField label="Columns" min={1} name="columns" onChange={onChange} options={options} /> : null}
        <NumberField label="Gap (px)" min={0} name="gap" onChange={onChange} options={options} />
        <ColorField label="Background" name="background" onChange={onChange} options={options} />
        <OutputFields allowOriginal={false} onChange={onChange} options={options} outputFormat={outputFormat} />
      </>
    );
  }

  if (slug === "social-media-image-resizer") {
    return (
      <>
        <SelectField label="Preset" name="socialPreset" onChange={onChange} options={options} values={[["instagram-square", "Instagram square · 1080×1080"], ["instagram-portrait", "Instagram portrait · 1080×1350"], ["story-reel", "Story / Reel · 1080×1920"], ["youtube-thumbnail", "YouTube thumbnail · 1280×720"], ["x-landscape", "X landscape · 1600×900"], ["linkedin-landscape", "LinkedIn landscape · 1200×627"], ["facebook-landscape", "Facebook landscape · 1200×630"]]} />
        <SelectField label="Fit" name="fit" onChange={onChange} options={options} values={[["contain", "Contain"], ["cover", "Cover"]]} />
        <ColorField label="Background" name="background" onChange={onChange} options={options} />
        <OutputFields allowOriginal={false} onChange={onChange} options={options} outputFormat={outputFormat} />
      </>
    );
  }

  return <p className="text-sm text-muted-foreground">No additional options are required.</p>;
}

function OutputFields({
  allowOriginal = true,
  hasHeic = false,
  onChange,
  options,
  outputFormat,
}: {
  allowOriginal?: boolean;
  hasHeic?: boolean;
  onChange(name: string, value: RawOptionValue): void;
  options: RawOptions;
  outputFormat: string;
}) {
  const values = [
    ...(allowOriginal
      ? [["original", hasHeic ? "Original where supported (HEIC → JPEG)" : "Original format"]]
      : []),
    ["jpeg", "JPEG"],
    ["png", "PNG"],
    ["webp", "WebP"],
  ] as [string, string][];
  return (
    <>
      <SelectField label="Output format" name="outputFormat" onChange={onChange} options={options} values={values} />
      {allowOriginal && hasHeic && outputFormat === "original" ? (
        <p className="text-xs leading-5 text-muted-foreground">
          HEIC inputs are exported as JPEG because HEIC encoding is not available.
        </p>
      ) : null}
      {outputFormat !== "png" ? <QualityField onChange={onChange} options={options} /> : null}
    </>
  );
}

function PositionFields({ onChange, options }: FieldProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <SelectField label="Vertical" name="verticalPosition" onChange={onChange} options={options} values={[["top", "Top"], ["middle", "Middle"], ["bottom", "Bottom"]]} />
      <SelectField label="Horizontal" name="horizontalPosition" onChange={onChange} options={options} values={[["left", "Left"], ["center", "Center"], ["right", "Right"]]} />
    </div>
  );
}

type FieldProps = {
  onChange(name: string, value: RawOptionValue): void;
  options: RawOptions;
};

function SelectField({ label, name, onChange, options, values }: FieldProps & { label: string; name: string; values: readonly (readonly [string, string])[] }) {
  return (
    <Field htmlFor={`option-${name}`} label={label}>
      <Select value={text(options[name])} onChange={(event) => onChange(name, event.target.value)}>
        {values.map(([value, caption]) => <option key={value} value={value}>{caption}</option>)}
      </Select>
    </Field>
  );
}

function TextField({ description, label, name, onChange, options }: FieldProps & { description?: string; label: string; name: string }) {
  return (
    <Field description={description} htmlFor={`option-${name}`} label={label}>
      <Input value={text(options[name])} onChange={(event) => onChange(name, event.target.value)} type="text" />
    </Field>
  );
}

function NumberField({ label, min, name, onChange, options }: FieldProps & { label: string; min: number; name: string }) {
  return (
    <Field htmlFor={`option-${name}`} label={label}>
      <Input min={min} value={text(options[name])} onChange={(event) => onChange(name, event.target.value)} type="number" />
    </Field>
  );
}

function ColorField({ label, name, onChange, options }: FieldProps & { label: string; name: string }) {
  return (
    <Field htmlFor={`option-${name}`} label={label}>
      <Input value={text(options[name], "#ffffff")} onChange={(event) => onChange(name, event.target.value)} type="color" />
    </Field>
  );
}

function QualityField({ onChange, options }: FieldProps) {
  return <RangeField label="Quality" max={100} min={30} name="quality" onChange={onChange} options={options} suffix="%" />;
}

function RangeField({ label, max, min, name, onChange, options, suffix }: FieldProps & { label: string; max: number; min: number; name: string; suffix: string }) {
  return (
    <Field htmlFor={`option-${name}`} label={`${label}: ${text(options[name])}${suffix}`}>
      <Input max={max} min={min} value={text(options[name])} onChange={(event) => onChange(name, Number(event.target.value))} type="range" />
    </Field>
  );
}

function CropOverlay({
  disabled,
  onChange,
  options,
  previewUrl,
}: FieldProps & { disabled: boolean; previewUrl: string }) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const pointer = useRef<{
    mode: "move" | "resize";
    x: number;
    y: number;
  } | null>(null);
  const appliedAspect = useRef<string | null>(null);

  const cropX = Math.min(
    Math.max(0, number(options.cropX)),
    Math.max(0, dimensions.width - 1),
  );
  const cropY = Math.min(
    Math.max(0, number(options.cropY)),
    Math.max(0, dimensions.height - 1),
  );
  const crop = {
    x: cropX,
    y: cropY,
    width: Math.min(
      Math.max(1, number(options.cropWidth, dimensions.width)),
      Math.max(1, dimensions.width - cropX),
    ),
    height: Math.min(
      Math.max(1, number(options.cropHeight, dimensions.height)),
      Math.max(1, dimensions.height - cropY),
    ),
  };

  useEffect(() => {
    if (!dimensions.width || !dimensions.height) return;
    const aspect = text(options.cropAspect, "free");
    const missingSize = !number(options.cropWidth) || !number(options.cropHeight);
    if (!missingSize && appliedAspect.current === aspect) return;
    appliedAspect.current = aspect;
    const ratio = { "1:1": 1, "4:3": 4 / 3, "16:9": 16 / 9 }[aspect];
    const width = Math.min(
      number(options.cropWidth, dimensions.width),
      dimensions.width - number(options.cropX),
    );
    const height = ratio
      ? Math.min(width / ratio, dimensions.height - number(options.cropY))
      : Math.min(
          number(options.cropHeight, dimensions.height),
          dimensions.height - number(options.cropY),
        );
    onChange("cropWidth", Math.max(1, Math.round(ratio ? height * ratio : width)));
    onChange("cropHeight", Math.max(1, Math.round(height)));
  }, [dimensions, onChange, options]);

  function move(dx: number, dy: number) {
    if (disabled) return;
    onChange(
      "cropX",
      Math.round(Math.min(Math.max(0, crop.x + dx), dimensions.width - crop.width)),
    );
    onChange(
      "cropY",
      Math.round(Math.min(Math.max(0, crop.y + dy), dimensions.height - crop.height)),
    );
  }

  function resize(dx: number, dy: number) {
    if (disabled) return;
    const ratio = {
      "1:1": 1,
      "4:3": 4 / 3,
      "16:9": 16 / 9,
    }[text(options.cropAspect, "free")];
    const width = Math.min(
      dimensions.width - crop.x,
      Math.max(1, crop.width + dx),
    );
    const height = ratio
      ? Math.min(dimensions.height - crop.y, width / ratio)
      : Math.min(dimensions.height - crop.y, Math.max(1, crop.height + dy));
    onChange("cropWidth", Math.round(ratio ? height * ratio : width));
    onChange("cropHeight", Math.round(height));
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const amount = event.shiftKey ? 10 : 1;
    const movement = {
      ArrowDown: [0, amount],
      ArrowLeft: [-amount, 0],
      ArrowRight: [amount, 0],
      ArrowUp: [0, -amount],
    }[event.key];
    if (!movement) return;
    event.preventDefault();
    move(movement[0], movement[1]);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!pointer.current) return;
    const frame = event.currentTarget.parentElement?.getBoundingClientRect();
    if (!frame) return;
    const scaleX = dimensions.width / frame.width;
    const scaleY = dimensions.height / frame.height;
    const dx = (event.clientX - pointer.current.x) * scaleX;
    const dy = (event.clientY - pointer.current.y) * scaleY;
    if (pointer.current.mode === "move") move(dx, dy);
    else resize(dx, dy);
    pointer.current = {
      mode: pointer.current.mode,
      x: event.clientX,
      y: event.clientY,
    };
  }

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="font-black">Crop preview</h2>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">Drag the crop frame, or focus it and use arrow keys. Hold Shift for 10-pixel steps.</p>
      <div className="mt-4 flex justify-center overflow-hidden rounded-xl bg-muted">
        <div className="relative inline-block max-w-full">
          <img
            alt="Selected image crop preview"
            className="block max-h-[32rem] max-w-full"
            onLoad={(event) =>
              setDimensions({
                width: event.currentTarget.naturalWidth,
                height: event.currentTarget.naturalHeight,
              })
            }
            src={previewUrl}
          />
          {dimensions.width && dimensions.height ? (
            <div
              aria-label="Crop area"
              className="absolute cursor-move border-2 border-white bg-black/10 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              onKeyDown={onKeyDown}
              onPointerDown={(event) => {
                if (disabled) return;
                event.currentTarget.setPointerCapture(event.pointerId);
                pointer.current = {
                  mode: "move",
                  x: event.clientX,
                  y: event.clientY,
                };
              }}
              onPointerMove={onPointerMove}
              onPointerUp={(event) => {
                event.currentTarget.releasePointerCapture(event.pointerId);
                pointer.current = null;
              }}
              role="application"
              style={{
                height: `${(crop.height / dimensions.height) * 100}%`,
                left: `${(crop.x / dimensions.width) * 100}%`,
                top: `${(crop.y / dimensions.height) * 100}%`,
                width: `${(crop.width / dimensions.width) * 100}%`,
              }}
              tabIndex={disabled ? -1 : 0}
            >
              <button
                aria-label="Resize crop area"
                className="absolute -right-2 -bottom-2 size-5 cursor-nwse-resize rounded-full border-2 border-white bg-primary outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={disabled}
                onKeyDown={(event) => {
                  const amount = event.shiftKey ? 10 : 1;
                  if (event.key === "ArrowRight") resize(amount, 0);
                  else if (event.key === "ArrowLeft") resize(-amount, 0);
                  else if (event.key === "ArrowDown") resize(0, amount);
                  else if (event.key === "ArrowUp") resize(0, -amount);
                  else return;
                  event.preventDefault();
                  event.stopPropagation();
                }}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  pointer.current = {
                    mode: "resize",
                    x: event.clientX,
                    y: event.clientY,
                  };
                }}
                onPointerMove={(event) => {
                  if (!pointer.current || pointer.current.mode !== "resize") return;
                  const frame = event.currentTarget.parentElement?.parentElement?.getBoundingClientRect();
                  if (!frame) return;
                  resize(
                    ((event.clientX - pointer.current.x) * dimensions.width) / frame.width,
                    ((event.clientY - pointer.current.y) * dimensions.height) / frame.height,
                  );
                  pointer.current = {
                    mode: "resize",
                    x: event.clientX,
                    y: event.clientY,
                  };
                }}
                onPointerUp={(event) => {
                  event.currentTarget.releasePointerCapture(event.pointerId);
                  pointer.current = null;
                }}
                type="button"
              />
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

function createDefaultOptions(slug: MediaToolSlug): RawOptions {
  const common: RawOptions = {
    axis: "horizontal",
    advancedQuality: false,
    background: "#ffffff",
    color: "original",
    columns: 2,
    confirmed: false,
    cropAspect: "free",
    cropHeight: "",
    cropWidth: "",
    cropX: 0,
    cropY: 0,
    degrees: 90,
    dpi: 150,
    filename: "converted-images.pdf",
    fit: "contain",
    fontSize: 12,
    gap: 0,
    height: 1080,
    horizontalPosition: "center",
    imagePreset: "balanced",
    interval: 1,
    layout: "horizontal",
    lockAspectRatio: true,
    margin: "small",
    mode: "preserve",
    noUpscale: true,
    numberFormat: "number",
    opacity: 25,
    orientation: "auto",
    outputFormat: "original",
    page: "auto",
    pageSize: "a4",
    pages: "all",
    pdfBackground: "white",
    pdfHeight: 842,
    pdfMargin: 18,
    pdfQuality: "balanced",
    pdfWidth: 595,
    percentage: 50,
    quality: 80,
    ranges: "1",
    removeMetadata: true,
    resizeUnit: "pixels",
    socialPreset: "instagram-square",
    splitMode: "every-page",
    startNumber: 1,
    strongPreset: "balanced",
    verticalPosition: "bottom",
    watermarkKind: "text",
    watermarkRotation: -30,
    watermarkSize: 48,
    watermarkText: "DRAFT",
    width: 1920,
  };
  if (slug === "combine-images" || slug === "social-media-image-resizer") {
    common.outputFormat = "png";
  }
  if (slug === "extract-pdf-pages" || slug === "reorder-pdf-pages") {
    common.pages = "1";
  }
  if (slug === "delete-pdf-pages") common.pages = "";
  return common;
}

function buildJobOptions(
  slug: MediaToolSlug,
  raw: RawOptions,
  files: readonly QueuedFile[],
  watermarkInputId: string | null,
): MediaJobOptionsByOperation[MediaToolSlug] {
  const pages = pageSelection(text(raw.pages, "all"));
  const outputFormat = imageFormat(text(raw.outputFormat, "original"), true);
  const quality = number(raw.quality, 80) / 100;
  const position = `${text(raw.verticalPosition, "bottom")}-${text(raw.horizontalPosition, "center")}` as MediaJobOptionsByOperation["add-page-numbers"]["position"];

  switch (slug) {
    case "image-to-pdf":
      return {
        page: oneOf(text(raw.page), ["auto", "a4", "letter"], "auto"),
        orientation: oneOf(text(raw.orientation), ["auto", "portrait", "landscape"], "auto"),
        margin: oneOf(text(raw.margin), ["none", "small", "normal"], "small"),
        fit: oneOf(text(raw.fit), ["contain", "fill"], "contain"),
        quality: oneOf(text(raw.pdfQuality), ["original", "balanced", "small"], "balanced"),
        background: text(raw.background, "#ffffff"),
        filename: text(raw.filename, "converted-images.pdf"),
        items: files.map(({ id, rotation }) => ({ id, rotation })),
      };
    case "pdf-to-jpg":
      return { pages, dpi: number(raw.dpi) === 300 ? 300 : 150, background: "white", quality };
    case "pdf-to-png":
      return { pages, dpi: number(raw.dpi) === 300 ? 300 : 150, background: oneOf(text(raw.pdfBackground), ["white", "transparent"], "transparent") };
    case "merge-pdf":
      return { order: files.map(({ id }) => id) };
    case "split-pdf": {
      const mode = text(raw.splitMode, "every-page");
      if (mode === "interval") return { mode, interval: Math.max(1, number(raw.interval, 1)) };
      if (mode === "ranges") return { mode, ranges: text(raw.ranges, "1").split(";").map(pageList) };
      return { mode: "every-page" };
    }
    case "extract-pdf-pages":
      return { pages: pageList(text(raw.pages)) };
    case "reorder-pdf-pages":
      return { pages: pageList(text(raw.pages)) };
    case "rotate-pdf-pages":
      return { pages, degrees: quarterTurn(number(raw.degrees, 90)) };
    case "delete-pdf-pages":
      return { pages: pageList(text(raw.pages)) };
    case "crop-pdf":
      return { pages, box: { x: number(raw.cropX), y: number(raw.cropY), width: number(raw.cropWidth), height: number(raw.cropHeight) } };
    case "resize-pdf-pages":
      return {
        pages,
        pageSize: oneOf(text(raw.pageSize), ["a4", "letter", "legal", "custom"], "a4"),
        width: number(raw.pdfWidth, 595),
        height: number(raw.pdfHeight, 842),
        orientation: oneOf(text(raw.orientation), ["portrait", "landscape"], "portrait"),
        fit: oneOf(text(raw.fit), ["contain", "cover", "stretch"], "contain"),
        margin: Math.max(0, number(raw.pdfMargin, 18)),
      };
    case "compress-pdf":
      return raw.mode === "strong"
        ? { mode: "strong", preset: oneOf(text(raw.strongPreset), ["high", "balanced", "smallest"], "balanced"), color: oneOf(text(raw.color), ["original", "grayscale", "black-and-white"], "original"), confirmed: true }
        : { mode: "preserve", removeMetadata: raw.removeMetadata === true };
    case "watermark-pdf": {
      const shared = { pages, opacity: number(raw.opacity, 25) / 100, size: Math.max(1, number(raw.watermarkSize, 48)), rotation: number(raw.watermarkRotation, -30), position };
      return raw.watermarkKind === "image"
        ? { ...shared, kind: "image", imageInputId: watermarkInputId ?? "" }
        : { ...shared, kind: "text", text: text(raw.watermarkText, "DRAFT") };
    }
    case "add-page-numbers":
      return { format: oneOf(text(raw.numberFormat), ["number", "page-number", "number-of-total"], "number"), start: Math.max(0, number(raw.startNumber, 1)), fontSize: Math.max(6, number(raw.fontSize, 12)), position };
    case "jpg-to-png":
    case "webp-to-png":
    case "heic-to-png":
    case "remove-image-metadata":
      return {};
    case "png-to-jpg":
    case "webp-to-jpg":
    case "heic-to-jpg":
      return { quality, background: text(raw.background, "#ffffff") };
    case "jpg-to-webp":
    case "png-to-webp":
      return { quality };
    case "compress-image":
      return { preset: oneOf(text(raw.imagePreset), ["best", "balanced", "smallest", "fast", "maximum"], "balanced"), quality: raw.advancedQuality === true ? quality : undefined };
    case "resize-image":
      return {
        width: raw.resizeUnit === "pixels" ? Math.max(1, number(raw.width, 1920)) : undefined,
        height: raw.resizeUnit === "pixels" ? Math.max(1, number(raw.height, 1080)) : undefined,
        percentage: raw.resizeUnit === "percentage" ? Math.max(1, number(raw.percentage, 50)) : undefined,
        lockAspectRatio: raw.lockAspectRatio === true,
        noUpscale: raw.noUpscale === true,
        fit: oneOf(text(raw.fit), ["contain", "cover", "stretch"], "contain"),
        outputFormat,
        quality,
      };
    case "crop-image":
      return { crop: { x: number(raw.cropX), y: number(raw.cropY), width: number(raw.cropWidth), height: number(raw.cropHeight) }, outputFormat, quality };
    case "rotate-image":
      return { degrees: quarterTurn(number(raw.degrees, 90)), outputFormat, quality };
    case "flip-image":
      return { axis: oneOf(text(raw.axis), ["horizontal", "vertical"], "horizontal"), outputFormat, quality };
    case "combine-images":
      return { layout: oneOf(text(raw.layout), ["horizontal", "vertical", "grid"], "horizontal"), columns: Math.max(1, number(raw.columns, 2)), order: files.map(({ id }) => id), gap: Math.max(0, number(raw.gap)), background: text(raw.background, "#ffffff"), outputFormat: imageFormat(text(raw.outputFormat, "png"), false), quality };
    case "social-media-image-resizer":
      return { preset: oneOf(text(raw.socialPreset), ["instagram-square", "instagram-portrait", "story-reel", "youtube-thumbnail", "x-landscape", "linkedin-landscape", "facebook-landscape"], "instagram-square"), fit: oneOf(text(raw.fit), ["contain", "cover"], "cover"), background: text(raw.background, "#ffffff"), outputFormat: imageFormat(text(raw.outputFormat, "png"), false), quality };
  }
}

function pageSelection(value: string): "all" | readonly number[] {
  return value.trim().toLowerCase() === "all" ? "all" : pageList(value);
}

function pageList(value: string): number[] {
  const result = parsePageRange(value, MEDIA_LIMITS.pdfs.maxStructuralPages);
  if (!result.ok) throw new RangeError(result.message);
  return result.pages;
}

function imageFormat(value: string, allowOriginal: true): "original" | "jpeg" | "png" | "webp";
function imageFormat(value: string, allowOriginal: false): "jpeg" | "png" | "webp";
function imageFormat(value: string, allowOriginal: boolean) {
  if (value === "jpeg" || value === "png" || value === "webp") return value;
  return allowOriginal ? "original" : "png";
}

function quarterTurn(value: number): 90 | 180 | 270 {
  return value === 180 || value === 270 ? value : 90;
}

function oneOf<const Values extends readonly string[]>(
  value: string,
  values: Values,
  fallback: Values[number],
): Values[number] {
  return values.includes(value) ? (value as Values[number]) : fallback;
}

function text(value: RawOptionValue | undefined, fallback = "") {
  return value === undefined ? fallback : String(value);
}

function number(value: RawOptionValue | undefined, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MiB`;
}

function allowedKinds(accept: string): readonly MediaKind[] {
  if (accept.includes("application/pdf")) return ["pdf"];
  const kinds: MediaKind[] = [];
  if (accept.includes("image/jpeg")) kinds.push("jpeg");
  if (accept.includes("image/png")) kinds.push("png");
  if (accept.includes("image/webp")) kinds.push("webp");
  if (accept.includes("image/heic") || accept.includes("image/heif")) {
    kinds.push("heic");
  }
  return kinds;
}
