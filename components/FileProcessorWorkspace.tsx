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
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";

import { FileOrderSurface } from "@/components/FileOrderSurface";
import {
  validateFileSelection,
  workspaceFileId,
} from "@/components/FileInput";
import { SplitStack, Stack } from "@/components/Stacks";
import { ResultView } from "@/components/ResultView";
import { PdfInspectionProvider } from "@/components/PdfPagesSurface";
import {
  FileIntakeSurface,
  FileQueueSurface,
  WorkspaceSurface,
} from "@/components/Surfaces";
import type { WorkspaceProps } from "@/components/ToolWorkspace";
import { WorkspaceInputSurface } from "@/components/WorkspaceInput";
import { SettingsPanel } from "@/components/SettingsPanel";
import { loadToolHooks } from "@/lib/tool-framework/hooks";
import { readArtifact } from "@/lib/tool-framework/artifacts";
import type {
  ToolHooks,
  ToolPagePreview,
  ToolRunFile,
} from "@/lib/tool-framework/run";
import { parseSettings } from "@/lib/tool-framework/settings";
import type { ToolSpec } from "@/lib/tool-framework/spec";
import { useToolRun } from "@/lib/tool-framework/useToolRun";
import { createToolRunFile } from "@/lib/tool-framework/workerProtocol";

type Hooks = ToolHooks<Record<string, unknown>>;

const NO_HOOKS: Hooks = {};

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

async function downloadStoredFile(
  artifact: Extract<NonNullable<WorkspaceProps["result"]>, { render: "files" }>["files"][number],
): Promise<void> {
  const file = await readArtifact(artifact);
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.download = artifact.name;
  link.href = url;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

type StoredOutputFile = Extract<
  NonNullable<WorkspaceProps["result"]>,
  { render: "files" }
>["files"][number];

function StoredFileResult({ file }: { readonly file: StoredOutputFile }): ReactElement {
  const [downloadFailed, setDownloadFailed] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const download = async () => {
    setDownloadFailed(false);
    setDownloading(true);
    try {
      await downloadStoredFile(file);
    } catch {
      setDownloadFailed(true);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="grid gap-2">
      <DownloadResult
        action={(
          <Button disabled={downloading} onClick={() => void download()} type="button">
            {downloadFailed ? "Retry download" : downloading ? "Preparing…" : "Download file"}
          </Button>
        )}
        className="[&_p]:truncate"
        metadata={`${file.name} · ${formatFileSize(file.size)}`}
        title="Your file is ready"
      />
      {downloadFailed ? (
        <Alert variant="destructive">
          <AlertTitle>Download unavailable</AlertTitle>
          <AlertDescription>
            The browser could not reopen this stored output. Retry the download,
            or run the tool again if the file was cleared from browser storage.
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
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
 * Renders page previews for the tools whose spec declares `input.inspect`.
 *
 * The worker owns the renderer, so nothing PDF-specific is imported here; the
 * decision to inspect is the spec's, never the tool's identity.
 */
function useInspectedPages(
  spec: ToolSpec,
  runFiles: readonly ToolRunFile[],
  suspended: boolean,
): {
  readonly inspecting: boolean;
  readonly previews: readonly ToolPagePreview[];
  readonly requestThumbnails: (pageNumbers: readonly number[]) => void;
} {
  const {
    closeInspection,
    inspect,
    previews,
    requestThumbnails,
    reset,
    state,
  } = useToolRun();
  const key =
    spec.input.kind === "files" && spec.input.inspect === true
      ? (spec.toolId.split(".")[1] ?? "")
      : "";
  const file = runFiles[0];
  // Derived identity again: `runFiles` is a new array on every read.
  const fileKey = file ? `${file.id}:${file.size}:${file.source.lastModified}` : "";

  useEffect(() => {
    if (suspended) {
      closeInspection();
      return;
    }
    if (!key || !file) {
      reset();
      return;
    }
    try {
      inspect({
        key,
        file,
      });
    } catch {
      // An input the protocol rejects outright (an unusable MIME type, say)
      // simply gets no previews. The file stays selected and `validate` still
      // reports why the tool cannot run.
    }
    // `file` is read through `fileKey`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closeInspection, key, fileKey, inspect, reset, suspended]);

  // This hook owns the only job this `useToolRun` ever starts, so a running
  // job here is always the inspection.
  return {
    inspecting: state.status === "running",
    previews,
    requestThumbnails,
  };
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
  const filesKey = props.input.files
    .map((file) => `${workspaceFileId(file)}:${file.size}:${file.lastModified}`)
    .join("|");
  const runFiles = useMemo(
    () => props.input.files.map((file) => createToolRunFile(workspaceFileId(file), file)),
    // The selection identity is its stable file metadata, not the parent array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filesKey],
  );
  const { inspecting, previews, requestThumbnails } = useInspectedPages(
    props.spec,
    runFiles,
    props.running ?? false,
  );
  const [inputIssue, setInputIssue] = useState("");
  const [wasCancelled, setWasCancelled] = useState(false);
  useSettingsHooks(props, hooks, previews);
  const fields = Object.values(props.spec.settings.fields);
  const hasSettings = fields.length > 0;
  const hasMainSettings = fields.some((field) => field.pane === "main");
  const hasSideSettings = fields.some((field) => field.pane !== "main");
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
          disabled={props.primaryAction.running && props.primaryAction.onCancel ? false : props.primaryAction.disabled}
          onClick={props.primaryAction.running && props.primaryAction.onCancel ? props.primaryAction.onCancel : props.primaryAction.onRun}
          type="button"
        >
          {props.primaryAction.running && !props.primaryAction.onCancel ? (
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          ) : null}
          {props.primaryAction.running && props.primaryAction.onCancel ? "Cancel" : props.primaryAction.label}
        </Button>
      ) : undefined}
      className="h-full overflow-y-auto bg-card p-[22px]"
      title={hasSideSettings ? "Options" : props.primaryAction ? "Action" : "Guidance"}
      variant="plain"
    >
      {hasSideSettings ? (
        <SettingsPanel
          disabled={props.disabled}
          onChange={props.onSettingChange}
          pane="side"
          spec={props.spec.settings}
          values={props.settings}
        />
      ) : null}
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
          getMetadata={(file) => formatFileSize(file.size)}
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
        <PdfInspectionProvider requestThumbnails={requestThumbnails}>
          {props.detail?.({
            disabled: props.disabled ?? false,
            inspecting,
            previews,
          })}
        </PdfInspectionProvider>
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
                props.primaryAction?.onCancel?.();
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
            <StoredFileResult file={file} key={`${file.name}-${file.size}`} />
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
  const mainContent = hasMainSettings ? (
    <div className="flex h-full min-h-0 flex-col">
      <SettingsPanel
        className="shrink-0 border-b border-border p-4"
        disabled={props.disabled}
        layout="grid"
        onChange={props.onSettingChange}
        pane="main"
        spec={props.spec.settings}
        values={props.settings}
      />
      <div className="min-h-0 flex-1">{primaryContent}</div>
    </div>
  ) : primaryContent;

  if (!hasSettings) return mainContent;

  return (
    <SplitStack
      className="h-full"
      collapseLabel="settings panel"
      collapseSide="secondary"
      collapsible={hasSideSettings}
      defaultCollapsed={props.spec.optionsPanel?.defaultCollapsed ? "secondary" : undefined}
      defaultSize={70}
      minSize={52}
    >
      {mainContent}
      {settingsContent}
    </SplitStack>
  );
}
