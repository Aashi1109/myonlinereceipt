"use client";

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  DownloadResult,
  EmptyState,
  ProcessingStatus,
  ToolOptionsPanel,
} from "@smarttools/ui";
import { FileText, Loader2, Upload, X } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { FileOrderSurface } from "@/components/FileOrderSurface";
import {
  validateFileSelection,
  workspaceFileId,
} from "@/components/FileInput";
import { SplitStack, Stack } from "@/components/Stacks";
import { ResultView } from "@/components/ResultView";
import {
  FileIntakeSurface,
  FileQueueSurface,
  WorkspaceSurface,
} from "@/components/Surfaces";
import type { WorkspaceProps } from "@/components/ToolWorkspace";
import { WorkspaceInputSurface } from "@/components/WorkspaceInput";
import { SettingsPanel } from "@/components/SettingsPanel";
import { loadToolHooks } from "@/lib/tool-framework/hooks";
import type {
  ToolHooks,
  ToolPagePreview,
  ToolRunFile,
} from "@/lib/tool-framework/run";
import { parseSettings } from "@/lib/tool-framework/settings";
import type { ToolSpec } from "@/lib/tool-framework/spec";
import { useToolRun } from "@/lib/tool-framework/useToolRun";
import { createWorkerInput } from "@/lib/tool-framework/workerProtocol";

type Hooks = ToolHooks<Record<string, unknown>>;

const NO_HOOKS: Hooks = {};
const NO_FILES: readonly ToolRunFile[] = [];

function formatFileSize(bytes: number): string {
  if (bytes < 1_000) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  const unit = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1_000)),
    units.length,
  );
  const value = bytes / 1_000 ** unit;
  return `${value.toFixed(1).replace(/\.0$/, "")} ${units[unit - 1]}`;
}
function useImageDimensions(
  files: readonly File[],
): ReadonlyMap<File, { readonly height: number; readonly width: number }> {
  const [dimensions, setDimensions] = useState<
    ReadonlyMap<File, { readonly height: number; readonly width: number }>
  >(new Map());

  useEffect(() => {
    let current = true;
    const pending = files
      .filter((file) => file.type.startsWith("image/"))
      .map((file) => {
        const url = URL.createObjectURL(file);
        const image = new Image();
        image.onload = () => {
          URL.revokeObjectURL(url);
          if (!current || image.naturalWidth === 0 || image.naturalHeight === 0) {
            return;
          }
          setDimensions((existing) =>
            new Map(existing).set(file, {
              height: image.naturalHeight,
              width: image.naturalWidth,
            }),
          );
        };
        image.onerror = () => URL.revokeObjectURL(url);
        image.src = url;
        return { image, url };
      });

    setDimensions(new Map());
    return () => {
      current = false;
      for (const { image, url } of pending) {
        image.onload = null;
        image.onerror = null;
        image.src = "";
        URL.revokeObjectURL(url);
      }
    };
  }, [files]);

  return dimensions;
}

function downloadFile(buffer: ArrayBuffer, mime: string, name: string): void {
  const url = URL.createObjectURL(new Blob([buffer], { type: mime }));
  const link = document.createElement("a");
  link.download = name;
  link.href = url;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * Loads the tool's own hooks. Nothing here reaches into `tools/` by name —
 * `loadToolHooks` resolves the folder from the toolId.
 */
function useToolHooks(toolId: string): Hooks {
  const [hooks, setHooks] = useState<Hooks>(NO_HOOKS);
  useEffect(() => {
    let current = true;
    void loadToolHooks(toolId).then((loaded) => {
      if (current) setHooks(loaded);
    });
    return () => {
      current = false;
    };
  }, [toolId]);
  return hooks;
}

/**
 * Reads the picked files once per selection change and holds them, so the
 * hooks that take `ToolRunFile`s stay synchronous and cheap enough to call on
 * a keystroke.
 *
 * The effect depends on the selection's identity, not the array's. A parent
 * that rebuilds `input.files` on every render would otherwise refire the read
 * effect, whose `setRunFiles` triggers another render — an endless loop. This
 * is the same reference-identity trap that bites effects keyed on a whole spec
 * object, and every effect below follows the same rule.
 */
function useRunFiles(files: readonly File[]): readonly ToolRunFile[] {
  const [runFiles, setRunFiles] = useState<readonly ToolRunFile[]>(NO_FILES);
  const filesKey = files
    .map((file) => `${workspaceFileId(file)}:${file.size}:${file.lastModified}`)
    .join("|");

  useEffect(() => {
    let current = true;
    void Promise.all(
      files.map(async (file) => ({
        id: workspaceFileId(file),
        name: file.name,
        mime: file.type,
        data: await file.arrayBuffer(),
      })),
    ).then(
      (loaded) => {
        if (current) setRunFiles(loaded);
      },
      // An unreadable file leaves the hook with nothing to inspect, which
      // blocks the run rather than letting it start on bytes nobody has.
      () => {
        if (current) setRunFiles(NO_FILES);
      },
    );
    return () => {
      current = false;
    };
    // `files` is read through `filesKey`, which is what actually changes when
    // the selection does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filesKey]);

  return runFiles;
}

/**
 * Renders page previews for the tools whose spec declares `input.inspect`.
 *
 * The worker owns the renderer, so nothing PDF-specific is imported here; the
 * decision to inspect is the spec's, never the tool's identity.
 */
function useInspectedPages(
  spec: ToolSpec,
  runFiles: readonly ToolRunFile[],
): { readonly inspecting: boolean; readonly previews: readonly ToolPagePreview[] } {
  const { inspect, previews, reset, state } = useToolRun();
  const key =
    spec.input.kind === "files" && spec.input.inspect === true
      ? (spec.toolId.split(".")[1] ?? "")
      : "";
  const file = runFiles[0];
  // Derived identity again: `runFiles` is a new array on every read.
  const fileKey = file ? `${file.id}:${file.data.byteLength}` : "";

  useEffect(() => {
    if (!key || !file) {
      reset();
      return;
    }
    try {
      inspect({
        key,
        file: createWorkerInput(file.id, file.data, file.name, file.mime),
      });
    } catch {
      // An input the protocol rejects outright (an unusable MIME type, say)
      // simply gets no previews. The file stays selected and `validate` still
      // reports why the tool cannot run.
    }
    // `file` is read through `fileKey`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, fileKey, inspect, reset]);

  // This hook owns the only job this `useToolRun` ever starts, so a running
  // job here is always the inspection.
  return { inspecting: state.status === "running", previews };
}

function sameSetting(current: unknown, next: unknown): boolean {
  if (Object.is(current, next)) return true;
  return (
    Array.isArray(current) &&
    Array.isArray(next) &&
    current.length === next.length &&
    current.every((entry, index) => Object.is(entry, next[index]))
  );
}

/**
 * Pushes a hook's patch through the ordinary settings path, skipping any value
 * that is already what the hook asks for. That skip is what makes an idempotent
 * hook settle: applying a patch re-renders, which re-runs the hook, and only an
 * actual change keeps the cycle going.
 */
function applySettingsPatch(
  props: WorkspaceProps,
  patch: Readonly<Record<string, unknown>>,
): void {
  for (const [key, value] of Object.entries(patch)) {
    const current = Object.hasOwn(props.settings, key)
      ? props.settings[key]
      : undefined;
    if (!sameSetting(current, value)) props.onSettingChange(key, value);
  }
}

/**
 * Applies the two settings-shaped hooks: `onPagesInspected` seeds from a fresh
 * inspection, `onSettingsChanged` re-derives whenever an edit lands while
 * previews exist.
 */
function useSettingsHooks(
  props: WorkspaceProps,
  hooks: Hooks,
  previews: readonly ToolPagePreview[],
): void {
  const previewsKey = previews
    .map(({ pageNumber, pageWidth, pageHeight }) =>
      [pageNumber, pageWidth, pageHeight].join(":"),
    )
    .join("|");
  // Value identity, not object identity: the settings object is rebuilt on
  // every edit, and only the values decide whether a hook has more to say.
  const settingsKey = JSON.stringify(props.settings);

  useEffect(() => {
    if (previews.length === 0) return;
    applySettingsPatch(props, hooks.onPagesInspected?.(previews) ?? {});
    // Seeding is a reaction to a new inspection only — re-running it on a
    // settings edit would overwrite the edit that triggered it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hooks, previewsKey]);

  useEffect(() => {
    if (previews.length === 0) return;
    applySettingsPatch(
      props,
      hooks.onSettingsChanged?.(
        parseSettings(props.spec.settings, props.settings),
        previews,
      ) ?? {},
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hooks, previewsKey, settingsKey]);
}

/** What a tool's own detail surface is given. */
export interface FileProcessorDetail {
  readonly disabled: boolean;
  readonly inspecting: boolean;
  readonly previews: readonly ToolPagePreview[];
}

export interface FileProcessorWorkspaceProps extends WorkspaceProps {
  /**
   * A surface the tool renders below its file intake — a page picker, a crop
   * frame, a preview. It must return an element rather than call hooks itself:
   * this is invoked during render, so any state belongs to the element.
   */
  detail?: (state: FileProcessorDetail) => ReactNode;
  /** Shows the reorderable file list, for tools where file order is input. */
  orderFiles?: boolean;
}

export function FileProcessorWorkspace(props: FileProcessorWorkspaceProps) {
  const hooks = useToolHooks(props.spec.toolId);
  const runFiles = useRunFiles(props.input.files);
  const imageDimensions = useImageDimensions(props.input.files);
  const { inspecting, previews } = useInspectedPages(props.spec, runFiles);
  const [inputIssue, setInputIssue] = useState("");
  const [wasCancelled, setWasCancelled] = useState(false);
  useSettingsHooks(props, hooks, previews);
  const hasSettings = Object.keys(props.spec.settings.fields).length > 0;
  const fileInputSpec =
    props.spec.input.kind === "files" ? props.spec.input : null;
  const hasEmptyFileQueue =
    fileInputSpec !== null && props.input.files.length === 0;
  const hasDetailSurface = Boolean(props.orderFiles || props.detail);
  const workspaceStateKey = JSON.stringify([
    props.input.files.map((file) => workspaceFileId(file)),
    props.input.secondary,
    props.input.text,
    props.settings,
  ]);
  const previousWorkspaceStateKey = useRef(workspaceStateKey);
  const progress =
    props.progress &&
    Number.isFinite(props.progress.completed) &&
    Number.isFinite(props.progress.total) &&
    props.progress.total > 0
      ? props.progress
      : null;
  const progressPercent = progress
    ? Math.max(
        0,
        Math.min(
          100,
          Math.round((progress.completed / progress.total) * 100),
        ),
      )
    : undefined;
  const currentItem = progress
    ? Math.min(Math.max(progress.completed + 1, 1), progress.total)
    : undefined;

  const reason =
    hooks.validate?.(
      parseSettings(props.spec.settings, props.settings),
      runFiles,
    ) ?? null;
  const onValidationChange = props.onValidationChange;

  useEffect(() => {
    onValidationChange?.(reason);
  }, [onValidationChange, reason]);

  useEffect(() => {
    if (props.running) setWasCancelled(false);
  }, [props.running]);

  useEffect(() => {
    if (previousWorkspaceStateKey.current === workspaceStateKey) return;
    previousWorkspaceStateKey.current = workspaceStateKey;
    setWasCancelled(false);
  }, [workspaceStateKey]);

  const settingsSurface = (
    <ToolOptionsPanel
      action={props.primaryAction ? (
        <Button
          aria-busy={props.primaryAction.running || undefined}
          className="w-full"
          disabled={props.primaryAction.disabled}
          onClick={props.primaryAction.onRun}
          type="button"
        >
          {props.primaryAction.running ? (
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          ) : null}
          {props.primaryAction.label}
        </Button>
      ) : undefined}
      className="h-full overflow-y-auto bg-card p-[22px]"
      title="Options"
      variant="plain"
    >
      <SettingsPanel
        disabled={props.disabled}
        onChange={props.onSettingChange}
        spec={props.spec.settings}
        values={props.settings}
      />
    </ToolOptionsPanel>
  );
  const inputSurface = fileInputSpec ? (
    <Stack
      className={hasDetailSurface ? "shrink-0" : "h-full overflow-y-auto"}
    >
      <FileIntakeSurface
        accept={fileInputSpec.accept}
        className={`min-h-44 border-b border-border ${
          hasDetailSurface
            ? "h-44 shrink-0 [&_[data-slot=file-upload-zone]]:gap-1 [&_[data-slot=file-upload-zone]]:p-3"
            : hasSettings
              ? "flex-1"
              : "shrink-0"
        }`}
        disabled={props.disabled}
        intakeDescription={fileInputSpec.dropzoneDescription}
        intakeIcon={<Upload aria-hidden="true" />}
        intakeTitle={fileInputSpec.label}
        maxFiles={Number.MAX_SAFE_INTEGER}
        multiple={fileInputSpec.multiple}
        onFiles={(files) => {
          const selection = validateFileSelection(
            props.input.files,
            files,
            fileInputSpec,
          );
          setInputIssue(selection.issue);
          props.onInputChange({ ...props.input, files: selection.files });
        }}
        title="Input files"
      />
      {inputIssue ? (
        <Alert className="m-3" variant="destructive">
          <AlertTitle>Some files were not added</AlertTitle>
          <AlertDescription>{inputIssue}</AlertDescription>
        </Alert>
      ) : null}
      {hasEmptyFileQueue ? (
        <WorkspaceSurface
          className="h-[46px] min-h-[46px] shrink-0"
          purpose="source"
          title="Selected files"
        />
      ) : (
        <FileQueueSurface
          className={
            hasDetailSurface ? "max-h-44 shrink-0" : "min-h-44 flex-1"
          }
          getIcon={() => <FileText aria-hidden="true" />}
          getId={workspaceFileId}
          getMetadata={(file) => {
            const dimensions = imageDimensions.get(file);
            return dimensions
              ? `${dimensions.width} × ${dimensions.height} px · ${formatFileSize(file.size)}`
              : formatFileSize(file.size);
          }}
          getName={(file) => file.name}
          items={props.input.files}
          renderAction={(file) => (
            <Button
              aria-label={`Remove ${file.name}`}
              disabled={props.disabled}
              onClick={() =>
                props.onInputChange({
                  ...props.input,
                  files: props.input.files.filter((entry) => entry !== file),
                })
              }
              size="icon"
              type="button"
              variant="outline"
            >
              <X aria-hidden="true" />
            </Button>
          )}
          title="Selected files"
        />
      )}
    </Stack>
  ) : (
    <WorkspaceInputSurface
      disabled={props.disabled}
      input={props.input}
      inputSpec={props.spec.input}
      onInputChange={props.onInputChange}
    />
  );
  const detailSurface =
    hasDetailSurface ? (
      <Stack className="min-h-[46px] flex-1 [&>*]:h-full [&>section>div]:overflow-y-auto [&>section>header_p]:overflow-visible [&>section>header_p]:text-clip [&>section>header_p]:whitespace-normal [&_[data-surface-state]]:min-h-0">
        {props.orderFiles ? (
          <FileOrderSurface
            disabled={props.disabled}
            input={props.input}
            onInputChange={props.onInputChange}
          />
        ) : null}
        {props.detail?.({
          disabled: props.disabled ?? false,
          inspecting,
          previews,
        })}
      </Stack>
    ) : null;
  const inputContent = detailSurface ? (
    <Stack className="h-full overflow-y-auto max-[1025px]:h-[28rem]">
      {inputSurface}
      {detailSurface}
    </Stack>
  ) : (
    inputSurface
  );
  const validationAlert = reason && !hasEmptyFileQueue ? (
    <Alert className="m-3" variant="destructive">
      <AlertTitle>This tool cannot run yet</AlertTitle>
      <AlertDescription>{reason}</AlertDescription>
    </Alert>
  ) : null;
  const resultSurface = (
    <WorkspaceSurface
      className="h-full"
      contentClassName="gap-4 p-4"
      purpose="result"
      state={props.error ? "error" : "ready"}
      stateDescription={props.error}
      stateTitle="Unable to create the result"
      scroll="content"
      title="Processed output"
    >
      {props.running ? (
        <ProcessingStatus
          aria-label={
            progress && currentItem !== undefined
              ? `Processing ${progressPercent} percent. Working on item ${currentItem} of ${progress.total}. ${progress.stage}`
              : `${props.spec.labels.running}. Progress is not available.`
          }
          action={(
            <Button
              onClick={() => {
                setWasCancelled(true);
                props.onInputChange({ ...props.input });
              }}
              type="button"
              variant="secondary"
            >
              Cancel
            </Button>
          )}
          detail={
            progress && currentItem !== undefined
              ? `Working on item ${currentItem} of ${progress.total} · ${progress.stage}`
              : "Preparing the first item."
          }
          progress={progressPercent}
          title={
            progressPercent === undefined
              ? props.spec.labels.running
              : `Processing · ${progressPercent}%`
          }
        />
      ) : props.result?.render === "files" ? (
        <div className="grid gap-3">
          {props.result.files.map((file) => (
            <DownloadResult
              action={(
                <Button
                  onClick={() =>
                    downloadFile(file.buffer, file.mime, file.filename)
                  }
                  type="button"
                >
                  Download file
                </Button>
              )}
              className="[&_p]:truncate"
              key={`${file.filename}-${file.size}`}
              metadata={`${file.filename} · ${formatFileSize(file.size)}`}
              title="Your file is ready"
            />
          ))}
          {props.result.inputBytes !== undefined ||
          props.result.outputBytes !== undefined ? (
            <p className="text-xs text-muted-foreground">
              {props.result.inputBytes !== undefined
                ? `Input: ${formatFileSize(props.result.inputBytes)}`
                : null}
              {props.result.inputBytes !== undefined &&
              props.result.outputBytes !== undefined
                ? " · "
                : null}
              {props.result.outputBytes !== undefined
                ? `Output: ${formatFileSize(props.result.outputBytes)}`
                : null}
            </p>
          ) : null}
        </div>
      ) : props.result ? (
        <>
          <DownloadResult
            metadata={props.spec.labels.ready}
            title="Processing complete"
          />
          <ResultView result={props.result} />
        </>
      ) : (
        <EmptyState
          className="rounded-none border-0 bg-transparent"
          description={
            wasCancelled
              ? "Your input files are unchanged. Run again when ready."
              : props.spec.labels.empty
          }
          icon={<FileText aria-hidden="true" />}
          title={wasCancelled ? "Processing cancelled" : "Result will appear here"}
        />
      )}
    </WorkspaceSurface>
  );
  const resultContent = (
    <Stack className="h-full">
      {!hasSettings ? validationAlert : null}
      {resultSurface}
    </Stack>
  );
  const settingsContent = (
    <Stack className="h-full">
      {validationAlert}
      <Stack className="min-h-0 flex-1 [&>*]:h-full">{settingsSurface}</Stack>
    </Stack>
  );
  const primaryContent = props.spec.input.kind === "none" ? (
    resultContent
  ) : (
    <SplitStack
      className="h-full"
      defaultSize={hasSettings ? (hasEmptyFileQueue ? 48 : 52) : 50}
      key={hasEmptyFileQueue ? "empty-file-queue" : "input"}
      minSize={30}
    >
      {inputContent}
      {resultContent}
    </SplitStack>
  );

  if (!hasSettings) return primaryContent;

  return (
    <SplitStack className="h-full" defaultSize={70} minSize={52}>
      {primaryContent}
      {settingsContent}
    </SplitStack>
  );
}
