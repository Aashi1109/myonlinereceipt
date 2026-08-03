"use client";

import {
  Button,
  Label,
  SegmentedControl,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@smarttools/ui";
import {
  AlertTriangle,
  AlignLeft,
  Copy,
  Download,
  FileText,
  FileWarning,
  LocateFixed,
  Minimize2,
  Trash2,
  Undo2,
  WandSparkles,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";

import {
  JsonResultRenderer,
  ROOT_JSON_TREE_PATH,
} from "@/components/JsonResultRenderer";
import { SplitStack } from "@/components/Stacks";
import { WorkspaceSurface } from "@/components/Surfaces";
import { SourceTextarea } from "@/components/WorkspaceInput";
import type {
  WorkspaceProps,
  WorkspaceToolbarActions,
} from "@/components/ToolWorkspace";

import { describeJsonViewerRepair } from "./execution";

type JsonTreeResult = { text: string; value: unknown } | null;
type LayoutMode = "modern" | "classic";

const LAYOUT_ITEMS = [
  { label: "Modern", value: "modern" },
  { label: "Classic", value: "classic" },
] as const;

const BROKEN_EXAMPLE =
  '[{"id":1,"name":"Alice","age":},{"id":2,"name":"Bob","age":30}]';
const JSON_VALUE_TOKEN_PATTERN =
  /"(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"|'(?:\\.|[^\\'])*'|\/\/[^\r\n]*|\/\*[\s\S]*?\*\/|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/g;

function risksNumericPrecisionLoss(input: string) {
  for (const match of input.matchAll(JSON_VALUE_TOKEN_PATTERN)) {
    const token = match[0];
    if (
      token.startsWith('"') ||
      token.startsWith("'") ||
      token.startsWith("//") ||
      token.startsWith("/*")
    ) continue;
    const value = Number(token);
    const significantDigits = token
      .split(/[eE]/, 1)[0]
      .replace("-", "")
      .replace(".", "")
      .replace(/^0+|0+$/g, "").length;
    if (
      !Number.isFinite(value) ||
      Object.is(value, -0) ||
      (Number.isInteger(value) && !Number.isSafeInteger(value)) ||
      significantDigits > 15 ||
      (value === 0 && /[1-9]/.test(token))
    ) return true;
  }
  return false;
}

function JsonSourceEditor({
  onRepairStatusChange,
  onSourceChange,
  onUndo,
  precisionWarning,
  repairStatus,
  ...props
}: WorkspaceProps & {
  onRepairStatusChange: (status: string | null) => void;
  onSourceChange: (text: string) => void;
  onUndo: (() => void) | null;
  precisionWarning: boolean;
  repairStatus: string | null;
}) {
  const errorId = useId();
  const editorId = useId();
  const inputSpec = props.spec.input;
  const inputBytes = useMemo(
    () => new TextEncoder().encode(props.input.text).length,
    [props.input.text],
  );
  const errorLocation = useMemo(() => {
    const match = /line (\d+), column (\d+)/i.exec(props.error ?? "");
    return match ? { column: Number(match[2]), line: Number(match[1]) } : null;
  }, [props.error]);

  if (inputSpec.kind !== "text") return null;

  return (
    <WorkspaceSurface
      actions={(
        <Button
          aria-label="Copy JSON input"
          disabled={props.input.text.length === 0}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(props.input.text);
              onRepairStatusChange("JSON input copied.");
            } catch {
              onRepairStatusChange("Copy failed. Select the input and copy it manually.");
            }
          }}
          size="xs"
          type="button"
          variant="ghost"
        >
          <Copy aria-hidden="true" />
          Copy
        </Button>
      )}
      className="h-full"
      contentClassName="bg-background"
      meta={`${inputBytes} bytes`}
      purpose="editor"
      title="JSON input"
    >
      <Label className="sr-only" htmlFor={editorId}>{inputSpec.label}</Label>
      <SourceTextarea
        className="min-h-0 flex-1"
        disabled={props.disabled}
        gutter
        id={editorId}
        onChange={(text) => {
          onRepairStatusChange(null);
          onSourceChange(text);
        }}
        placeholder={inputSpec.placeholder}
        value={props.input.text}
      />
      {precisionWarning ? (
        <div
          className="flex shrink-0 items-center gap-2 border-t border-warning/25 bg-warning/5 px-4 py-2 text-xs text-warning"
          role="status"
        >
          <AlertTriangle aria-hidden="true" className="size-3.5 shrink-0" />
          <span className="truncate">
            High-precision number: previews may round it; copy and download preserve the exact source. Transform actions are blocked.
          </span>
        </div>
      ) : null}
      {repairStatus ? (
        <div
          aria-live="polite"
          className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-card px-4 py-2 text-xs text-muted-foreground"
        >
          <span className="min-w-0 truncate">{repairStatus}</span>
          {onUndo ? (
            <Button onClick={onUndo} size="xs" type="button" variant="ghost">
              <Undo2 aria-hidden="true" />
              Undo
            </Button>
          ) : null}
        </div>
      ) : null}
      {props.error ? (
        <div
          className="flex shrink-0 items-center justify-between gap-3 border-t border-destructive/20 bg-destructive/5 px-4 py-2 text-xs text-destructive"
          id={errorId}
          role="alert"
        >
          <span className="min-w-0 truncate">{props.error}</span>
          {errorLocation ? (
            <Button
              onClick={() => {
                const input = document.getElementById(editorId);
                if (!(input instanceof HTMLTextAreaElement)) return;
                const lines = props.input.text.split(/\r\n|\r|\n/);
                const offset = lines
                  .slice(0, Math.max(0, errorLocation.line - 1))
                  .reduce((total, line) => total + line.length + 1, 0) +
                  Math.max(0, errorLocation.column - 1);
                input.focus();
                input.setSelectionRange(
                  Math.min(offset, props.input.text.length),
                  Math.min(offset + 1, props.input.text.length),
                );
              }}
              size="xs"
              type="button"
              variant="outline"
            >
              <LocateFixed aria-hidden="true" />
              Go to error
            </Button>
          ) : null}
        </div>
      ) : null}
    </WorkspaceSurface>
  );
}

function JsonResultPlaceholder({ error, running }: Pick<WorkspaceProps, "error" | "running">) {
  const title = error
    ? "JSON tree unavailable"
    : running
      ? "Parsing JSON…"
      : "Interactive tree will appear here";
  const description =
    error ?? (running ? "Parsing JSON…" : "Paste JSON to inspect its structure.");

  return (
    <div
      className="absolute inset-x-0 top-[46px] bottom-0 z-10 flex items-center justify-center bg-card p-6 text-center"
      data-testid="json-result-placeholder"
      role="status"
    >
      <div className="max-w-sm">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function JsonResultPane({
  error,
  onStatusChange,
  precisionWarning,
  running,
  source,
  tree,
}: Pick<WorkspaceProps, "error" | "running"> & {
  onStatusChange: (status: string | null) => void;
  precisionWarning: boolean;
  source: string;
  tree: JsonTreeResult;
}) {
  const ready = !error && !running && tree !== null;

  return (
    <div className="relative h-full min-h-0">
      <div aria-disabled={!ready || undefined} className="h-full" inert={!ready}>
        <JsonResultRenderer
          artifactValue={source}
          className="h-full [&_[role=tab]]:!border-b-0 [&_[role=tab][aria-selected=false]]:!font-normal [&_header>div:last-child]:pr-[72px] [&_header>div:last-child>button]:!text-muted-foreground [&_input]:!h-8 [&_input]:!pl-[30px] [&_input]:!text-[11px]"
          compact
          defaultOpenDepth={1}
          downloadName="smarttools-json-viewer.json"
          formattedValue={source}
          maxVisibleEntries={1_000}
          onCopy={async (value, label) => {
            try {
              await navigator.clipboard.writeText(value);
              onStatusChange(`${label} copied.`);
            } catch {
              onStatusChange("Copy failed. Select the value and copy it manually.");
            }
          }}
          persistentSearch
          selectedPath={ROOT_JSON_TREE_PATH}
          showArtifactActions={false}
          showNodeCopyActions={ready && !precisionWarning}
          value={tree?.value ?? null}
        />
      </div>
      {!ready ? <JsonResultPlaceholder error={error} running={running} /> : null}
      <div className="absolute top-[7px] right-4 z-20 flex items-center gap-1">
        <Button
          aria-label="Download JSON result"
          disabled={!ready}
          onClick={() => {
            const url = URL.createObjectURL(
              new Blob([source], { type: "application/json;charset=utf-8" }),
            );
            const link = document.createElement("a");
            link.href = url;
            link.download = "smarttools-json-viewer.json";
            link.click();
            URL.revokeObjectURL(url);
            onStatusChange("JSON downloaded.");
          }}
          size="icon-xs"
          title="Download JSON result"
          type="button"
          variant="ghost"
        >
          <Download aria-hidden="true" />
        </Button>
        <Button
          aria-label="Copy JSON result"
          disabled={!ready}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(source);
              onStatusChange("JSON result copied.");
            } catch {
              onStatusChange("Copy failed. Select the value and copy it manually.");
            }
          }}
          size="icon-xs"
          title="Copy JSON result"
          type="button"
          variant="ghost"
        >
          <Copy aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

export default function JsonViewerWorkspace(props: WorkspaceProps) {
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("modern");
  const [repairStatus, setRepairStatus] = useState<string | null>(null);
  const [previousSource, setPreviousSource] = useState<string | null>(null);
  const tree = useMemo<JsonTreeResult>(
    () =>
      props.result?.render === "json-tree" && typeof props.result.text === "string"
        ? { text: props.result.text, value: props.result.value }
        : null,
    [props.result],
  );
  const precisionWarning = useMemo(
    () => risksNumericPrecisionLoss(props.input.text),
    [props.input.text],
  );

  const updateSource = useCallback(
    (text: string) => props.onInputChange({ ...props.input, text }),
    [props.input, props.onInputChange],
  );
  const applySource = useCallback(
    (text: string, status: string) => {
      setPreviousSource(props.input.text);
      setRepairStatus(status);
      updateSource(text);
    },
    [props.input.text, updateSource],
  );
  const clearSource = useCallback(() => {
    applySource("", "Input cleared.");
  }, [applySource]);
  const repairSource = useCallback(() => {
    if (precisionWarning) {
      setRepairStatus("Repair blocked because it could change a high-precision number.");
      return;
    }
    const repairMode = props.settings.repairMode === "null" ? "null" : "remove";
    const repaired = describeJsonViewerRepair(props.input.text, repairMode);
    if (!repaired.ok) {
      setRepairStatus(repaired.error.message);
      return;
    }
    if (
      repairMode === "remove" &&
      repaired.changedPaths.length > 0 &&
      !window.confirm(
        `Repair will remove ${repaired.changedPaths.length} broken ${repaired.changedPaths.length === 1 ? "path" : "paths"}${repaired.changedPaths.length ? ` (${repaired.changedPaths.join(", ")})` : ""}. Continue?`,
      )
    ) {
      setRepairStatus("Repair cancelled. Input was not changed.");
      return;
    }
    applySource(
      repaired.output,
      tree === null
        ? `JSON repaired with the “${repairMode === "null" ? "Set broken values to null" : "Remove broken properties"}” strategy.`
        : "JSON was already valid; formatting was applied.",
    );
  }, [applySource, precisionWarning, props.input.text, props.settings.repairMode, tree]);
  const minifySource = useCallback(() => {
    if (!tree) return;
    if (precisionWarning) {
      setRepairStatus("Minify blocked because it could change a high-precision number.");
      return;
    }
    const minified = JSON.stringify(tree.value);
    if (typeof minified === "string") {
      applySource(minified, "JSON minified.");
    }
  }, [applySource, precisionWarning, tree]);
  const formatSource = useCallback(() => {
    if (tree) {
      if (precisionWarning) {
        setRepairStatus("Beautify blocked because it could change a high-precision number.");
        return;
      }
      applySource(tree.text, "JSON beautified.");
    }
  }, [applySource, precisionWarning, tree]);
  const loadBrokenExample = useCallback(() => {
    applySource(
      BROKEN_EXAMPLE,
      "Broken example loaded. Choose a repair strategy, then run Repair & clean.",
    );
  }, [applySource]);

  const toolbarActions = useMemo<WorkspaceToolbarActions>(
    () => ({
      exampleIcon: <FileText aria-hidden="true" />,
      statusMeta: `${layoutMode === "modern" ? "Modern" : "Classic"} layout · UTF-8`,
      before: (
        <div className="flex min-w-0 items-center gap-2 max-[56rem]:w-full max-[56rem]:flex-wrap max-[56rem]:justify-end">
          <Button
            disabled={props.disabled || props.input.text.trim().length === 0}
            onClick={repairSource}
            size="xs"
            type="button"
            variant="default"
          >
            <WandSparkles aria-hidden="true" />
            Repair &amp; clean
          </Button>
          <Button
            aria-label="Beautify JSON"
            disabled={props.disabled || !tree}
            onClick={formatSource}
            size="xs"
            type="button"
            variant="outline"
          >
            <AlignLeft aria-hidden="true" />
            Beautify
          </Button>
          <Button
            disabled={props.disabled || !tree}
            onClick={minifySource}
            size="xs"
            type="button"
            variant="outline"
          >
            <Minimize2 aria-hidden="true" />
            Minify
          </Button>
        </div>
      ),
      afterExample: (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            aria-label="Broken example"
            disabled={props.disabled}
            onClick={loadBrokenExample}
            size="xs"
            title="Load broken JSON example"
            type="button"
            variant="outline"
          >
            <FileWarning aria-hidden="true" />
            <span className="max-[90rem]:sr-only">Broken example</span>
          </Button>
          <Select
            disabled={props.disabled}
            onValueChange={(value) => props.onSettingChange("repairMode", value)}
            value={props.settings.repairMode === "null" ? "null" : "remove"}
          >
            <SelectTrigger
              aria-label="Repair strategy"
              className="relative w-[168px] gap-1.5 after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-['']"
              size="xs"
              title="Repair strategy"
            >
              <span className="text-[8px] font-extrabold tracking-[0.06em] text-muted-foreground">
                REPAIR
              </span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="remove">Remove broken</SelectItem>
              <SelectItem value="null">Set to null</SelectItem>
            </SelectContent>
          </Select>
          <SegmentedControl
            aria-label="Workspace layout"
            className="shrink-0 [&_[data-slot=tabs-list]]:h-8 [&_[data-slot=tabs-trigger]]:h-6 [&_[data-slot=tabs-trigger]]:px-3 [&_[data-slot=tabs-trigger]]:py-0 [&_[data-slot=tabs-trigger]]:text-[11px] [&_[data-slot=tabs-trigger]]:after:!inset-x-0 [&_[data-slot=tabs-trigger]]:after:!-inset-y-2.5 [&_[data-slot=tabs-trigger]]:after:!h-auto [&_[data-slot=tabs-trigger]]:after:!bg-transparent [&_[data-slot=tabs-trigger]]:after:!opacity-100"
            items={LAYOUT_ITEMS}
            onValueChange={(value) => setLayoutMode(value as LayoutMode)}
            value={layoutMode}
          />
          <Button
            disabled={props.disabled || props.input.text.length === 0}
            onClick={clearSource}
            size="xs"
            type="button"
            variant="ghost"
          >
            <Trash2 aria-hidden="true" />
            Clear
          </Button>
        </div>
      ),
      exampleLabel: "Example",
      onExample: () => {
        setPreviousSource(props.input.text);
        setRepairStatus("Sample loaded.");
      },
    }),
    [
      clearSource,
      formatSource,
      loadBrokenExample,
      layoutMode,
      minifySource,
      props.disabled,
      props.input.text,
      props.onSettingChange,
      props.settings.repairMode,
      repairSource,
      tree,
    ],
  );

  useEffect(() => {
    props.onToolbarActionsChange?.(toolbarActions);
    return () => props.onToolbarActionsChange?.(null);
  }, [props.onToolbarActionsChange, toolbarActions]);

  return (
    <SplitStack
      className="h-full max-[54rem]:h-[56rem]"
      defaultSize={40}
      maxSize={layoutMode === "modern" ? 65 : 70}
      minSize={layoutMode === "modern" ? 35 : 30}
      orientation={layoutMode === "modern" ? "horizontal" : "vertical"}
    >
      <div className={layoutMode === "modern" ? "h-full min-h-0 max-[64.01rem]:h-[286px] max-[42.01rem]:h-[28rem]" : "h-full min-h-0"}>
        <JsonSourceEditor
          {...props}
          onRepairStatusChange={setRepairStatus}
          onSourceChange={(text) => {
            setPreviousSource(null);
            updateSource(text);
          }}
          onUndo={
            previousSource === null
              ? null
              : () => {
                  updateSource(previousSource);
                  setPreviousSource(null);
                  setRepairStatus("Last change undone.");
                }
          }
          precisionWarning={precisionWarning}
          repairStatus={repairStatus}
        />
      </div>
      <div className={layoutMode === "modern" ? "h-full min-h-0 max-[64.01rem]:h-[28rem]" : "h-full min-h-0"}>
        <JsonResultPane
          error={props.error}
          onStatusChange={setRepairStatus}
          precisionWarning={precisionWarning}
          running={props.running}
          source={props.input.text}
          tree={tree}
        />
      </div>
    </SplitStack>
  );
}
