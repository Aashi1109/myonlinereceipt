"use client";

import {
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@smarttools/ui";
import { Copy, Search } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";

import { JsonResultRenderer } from "@/components/JsonResultRenderer";
import { SplitStack } from "@/components/Stacks";
import { WorkspaceSurface } from "@/components/Surfaces";
import { SourceTextarea } from "@/components/WorkspaceInput";
import type {
  WorkspaceProps,
  WorkspaceToolbarActions,
} from "@/components/ToolWorkspace";

import { repairJsonViewerInput } from "./execution";

type JsonTreeResult = { text: string; value: unknown } | null;

function JsonSourceEditor({
  onRepairStatusChange,
  onSourceChange,
  repairStatus,
  ...props
}: WorkspaceProps & {
  onRepairStatusChange: (status: string | null) => void;
  onSourceChange: (text: string) => void;
  repairStatus: string | null;
}) {
  const errorId = useId();
  const editorId = useId();
  const inputSpec = props.spec.input;
  const inputBytes = useMemo(
    () => new TextEncoder().encode(props.input.text).length,
    [props.input.text],
  );

  if (inputSpec.kind !== "text") return null;

  return (
    <WorkspaceSurface
      className="h-full"
      contentClassName="bg-background"
      description={
        repairStatus ? <span aria-live="polite">{repairStatus}</span> : undefined
      }
      meta={`${inputBytes} bytes`}
      purpose="editor"
      title="Input"
    >
      <Label className="sr-only" htmlFor={editorId}>{inputSpec.label}</Label>
      <SourceTextarea
        className="min-h-0 flex-1"
        disabled={props.disabled}
        gutter
        id={editorId}
        maxLength={inputSpec.maxLength}
        onChange={(text) => {
          onRepairStatusChange(null);
          onSourceChange(text);
        }}
        placeholder={inputSpec.placeholder}
        value={props.input.text}
      />
      {props.error ? (
        <p className="sr-only" id={errorId} role="alert">
          {props.error}
        </p>
      ) : null}
    </WorkspaceSurface>
  );
}

function EmptyJsonResult({ error, running }: Pick<WorkspaceProps, "error" | "running">) {
  const title = error
    ? "JSON tree unavailable"
    : running
      ? "Parsing JSON…"
      : "Interactive tree will appear here";
  const description =
    error ?? (running ? "Parsing JSON…" : "Paste JSON to inspect its structure.");

  return (
    <section
      aria-label="JSON result"
      className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-card"
      data-testid="json-result-placeholder"
    >
      <header className="flex min-h-[46px] shrink-0 items-center justify-between gap-3 border-b border-border px-4 max-[42rem]:flex-col max-[42rem]:items-stretch max-[42rem]:gap-0 max-[42rem]:pb-2">
        <Tabs className="h-[46px] gap-0" value="tree">
          <TabsList
            aria-label="JSON result view"
            className="h-[46px] gap-4 border-b-0"
          >
            <TabsTrigger className="h-[46px] flex-none px-0 text-[0.8125rem]" disabled value="tree">
              Tree
            </TabsTrigger>
            <TabsTrigger className="h-[46px] flex-none px-0 text-[0.8125rem]" disabled value="formatted">
              Formatted
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex min-w-0 items-center gap-2 max-[42rem]:grid max-[42rem]:w-full max-[42rem]:grid-cols-[minmax(0,1fr)_auto_auto]">
          <Button
            aria-label="Search JSON result"
            className="size-11 shrink-0"
            disabled
            size="icon"
            type="button"
            variant="ghost"
          >
            <Search aria-hidden="true" className="size-4" />
          </Button>
          <Button className="min-h-11 px-1" disabled size="sm" type="button" variant="link">
            Expand all
          </Button>
          <Button className="min-h-11 px-1" disabled size="sm" type="button" variant="link">
            Collapse all
          </Button>
          <Button
            aria-label="Copy JSON result"
            className="size-11 shrink-0 text-muted-foreground max-[42rem]:col-start-2 max-[42rem]:row-start-2"
            disabled
            size="icon"
            type="button"
            variant="ghost"
          >
            <Copy aria-hidden="true" className="size-4" />
          </Button>
          <Button
            className="min-h-11 px-1 max-[42rem]:col-start-3 max-[42rem]:row-start-2"
            disabled
            size="sm"
            type="button"
            variant="link"
          >
            Download .json
          </Button>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-center" role="status">
        <div className="max-w-sm">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
    </section>
  );
}

function JsonResultPane({
  error,
  running,
  tree,
}: Pick<WorkspaceProps, "error" | "running"> & { tree: JsonTreeResult }) {
  if (!error && !running && tree) {
    return (
      <JsonResultRenderer
        className="h-full"
        compact
        defaultOpenDepth={1}
        downloadName="formatted.json"
        formattedValue={tree.text}
        maxVisibleEntries={1_000}
        value={tree.value}
      />
    );
  }

  return <EmptyJsonResult error={error} running={running} />;
}

export default function JsonViewerWorkspace(props: WorkspaceProps) {
  const [repairStatus, setRepairStatus] = useState<string | null>(null);
  const tree = useMemo<JsonTreeResult>(
    () =>
      props.result?.render === "json-tree" && typeof props.result.text === "string"
        ? { text: props.result.text, value: props.result.value }
        : null,
    [props.result],
  );

  const updateSource = useCallback(
    (text: string) => props.onInputChange({ ...props.input, text }),
    [props.input, props.onInputChange],
  );
  const clearSource = useCallback(() => {
    setRepairStatus(null);
    updateSource("");
  }, [updateSource]);
  const repairSource = useCallback(() => {
    const repairMode = props.settings.repairMode === "null" ? "null" : "remove";
    const repaired = repairJsonViewerInput(props.input.text, repairMode);
    if (!repaired.ok) {
      setRepairStatus(repaired.error.message);
      return;
    }
    if (
      repaired.repaired &&
      repairMode === "remove" &&
      !window.confirm("Repair may remove broken properties from the input. Continue?")
    ) {
      setRepairStatus("Repair cancelled. Input was not changed.");
      return;
    }
    setRepairStatus(
      repaired.repaired
        ? `JSON repaired with the “${repairMode === "null" ? "Set broken values to null" : "Remove broken properties"}” strategy.`
        : "JSON was already valid; formatting was applied.",
    );
    updateSource(repaired.output);
  }, [props.input.text, props.settings.repairMode, updateSource]);
  const minifySource = useCallback(() => {
    setRepairStatus(null);
    if (!tree) return;
    const minified = JSON.stringify(tree.value);
    if (typeof minified === "string") updateSource(minified);
  }, [tree, updateSource]);
  const formatSource = useCallback(() => {
    setRepairStatus(null);
    if (tree) updateSource(tree.text);
  }, [tree, updateSource]);

  const toolbarActions = useMemo<WorkspaceToolbarActions>(
    () => ({
      before: (
        <div className="flex min-w-0 items-center gap-2 max-[56rem]:w-full max-[56rem]:flex-wrap max-[56rem]:justify-end">
          <div
            aria-label="JSON repair controls"
            className="flex h-11 shrink-0 items-center overflow-hidden rounded-lg border border-input bg-muted/45 [&_button]:rounded-none [&_button]:!px-3 [&_button]:!text-[13px]"
            role="group"
          >
            <Button
              disabled={props.disabled || props.input.text.trim().length === 0}
              onClick={repairSource}
              type="button"
              variant="link"
            >
              Repair &amp; clean
            </Button>
            <Select
              disabled={props.disabled}
              onValueChange={(value) => props.onSettingChange("repairMode", value)}
              value={props.settings.repairMode === "null" ? "null" : "remove"}
            >
              <SelectTrigger
                aria-label="Repair strategy"
                className="h-11 w-[7.25rem] min-w-0 rounded-none border-0 border-l border-border bg-transparent px-2 text-xs"
                title="Repair strategy"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="remove">Remove</SelectItem>
                <SelectItem value="null">Set null</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            disabled={props.disabled || !tree}
            onClick={minifySource}
            type="button"
            variant="link"
          >
            Minify
          </Button>
        </div>
      ),
      afterExample: (
        <div className="flex items-center gap-2">
          <Button
            disabled={props.disabled || props.input.text.length === 0}
            onClick={clearSource}
            type="button"
            variant="outline"
          >
            Clear
          </Button>
          <Button
            disabled={props.disabled || !tree}
            onClick={formatSource}
            type="button"
          >
            Format JSON
          </Button>
        </div>
      ),
      exampleLabel: "Load sample",
      onExample: () => setRepairStatus(null),
    }),
    [
      clearSource,
      formatSource,
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
    <SplitStack className="h-full" defaultSize={42} maxSize={65} minSize={35}>
      <div className="h-full min-h-0 max-[64.01rem]:h-[286px] max-[42.01rem]:h-[28rem]">
        <JsonSourceEditor
          {...props}
          onRepairStatusChange={setRepairStatus}
          onSourceChange={updateSource}
          repairStatus={repairStatus}
        />
      </div>
      <div className="h-full min-h-0 max-[64.01rem]:h-[28rem]">
        <JsonResultPane error={props.error} running={props.running} tree={tree} />
      </div>
    </SplitStack>
  );
}
