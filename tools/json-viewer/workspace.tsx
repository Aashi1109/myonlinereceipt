"use client";

import { Button, Select, Textarea } from "@smarttools/ui";
import {
  AlignLeft,
  Braces,
  Copy,
  FileJson,
  Minimize2,
  Trash2,
  WandSparkles,
} from "lucide-react";
import {
  useRef,
} from "react";

import {
  JsonResultRenderer,
  ROOT_JSON_TREE_PATH,
} from "@/app/devtools/components/JsonResultRenderer";
import { SplitStack } from "@/components/tool-workbench/stacks";
import { EditorSurface, EmptySurface } from "@/components/tool-workbench/surfaces";
import { MAX_JSON_INPUT_CHARS } from "@/lib/devtools/format-json";
import { useToolRuntime } from "@/lib/tool-runtime/useToolRuntime";

import type { JsonViewerExecutionResult } from "./result";

export type JsonViewerSettings = {
  repairMode: "remove" | "null";
};

type SuccessfulJsonViewerResult = Extract<
  JsonViewerExecutionResult,
  { ok: true }
>;

export const VIEWER_EXAMPLE = `{
  "name": "CodeUtilityKit",
  "version": 2,
  "active": true,
  "tags": ["json", "viewer", "free"],
  "author": {
    "name": "Dev",
    "url": "https://codeutilitykit.com"
  }
}`;

const VIEWER_BROKEN_EXAMPLE =
  `[{"id":1,"name":"Alice","age":},{"id":2,"name":"Bob","age":30}]`;

export function JsonViewerToolbar() {
  const runtime = useToolRuntime<
    string,
    JsonViewerSettings,
    SuccessfulJsonViewerResult
  >();
  const hasInput = Boolean(runtime.input);
  const hasValidResult = runtime.lifecycle === "completed";

  return (
    <div className="flex w-full min-w-max items-center gap-2 max-[64rem]:min-w-0 max-[64rem]:flex-wrap">
      <div
        aria-hidden="true"
        className="mr-auto grid size-[34px] shrink-0 place-items-center rounded-md bg-foreground text-background"
      >
        <Braces className="size-[18px]" strokeWidth={2.25} />
      </div>

      <Button
        className="h-9 rounded-md px-3 max-[64rem]:h-11"
        disabled={!hasInput}
        onClick={() => void runtime.runCommand("repair")}
        size="sm"
        type="button"
      >
        <WandSparkles aria-hidden="true" className="size-4" />
        Repair &amp; clean
      </Button>
      <Button
        className="h-9 rounded-md px-3 max-[64rem]:h-11"
        disabled={!hasValidResult}
        onClick={() => void runtime.runCommand("format")}
        size="sm"
        type="button"
        variant="outline"
      >
        <AlignLeft aria-hidden="true" className="size-4" />
        Beautify
      </Button>
      <Button
        className="h-9 rounded-md px-2.5 max-[64rem]:h-11"
        disabled={!hasValidResult}
        onClick={() => void runtime.runCommand("minify")}
        size="sm"
        type="button"
        variant="outline"
      >
        <Minimize2 aria-hidden="true" className="size-4" />
        Minify
      </Button>
      <Button
        aria-label="Load example"
        className="h-9 rounded-md px-2.5 max-[64rem]:h-11"
        onClick={() => runtime.setInput(VIEWER_EXAMPLE)}
        size="sm"
        type="button"
        variant="outline"
      >
        <FileJson aria-hidden="true" className="size-4" />
        Example
      </Button>
      <Button
        aria-label="Load broken example"
        className="h-9  rounded-md px-2.5 max-[64rem]:h-11"
        onClick={() => runtime.setInput(VIEWER_BROKEN_EXAMPLE)}
        size="sm"
        type="button"
        variant="outline"
      >
        Broken example
      </Button>

      <div className="relative shrink-0">
        <span className="pointer-events-none absolute top-1/2 left-2 z-10 -translate-y-1/2 font-caption text-[8px] font-extrabold tracking-[0.06em] text-muted-foreground">
          REPAIR
        </span>
        <Select
          aria-label="Repair strategy"
          className="h-9 gap-1 rounded-md pr-1 pl-[38px] text-[9px] max-[64rem]:h-11"
          onChange={(event) =>
            runtime.updateSetting(
              "repairMode",
              event.target.value as JsonViewerSettings["repairMode"],
            )
          }
          value={runtime.settings.repairMode}
        >
          <option value="remove">Remove broken</option>
          <option value="null">Set to null</option>
        </Select>
      </div>

      <Button
        className="h-9 rounded-md px-2.5 max-[64rem]:h-11"
        disabled={!hasInput}
        onClick={() => void runtime.runCommand("clear")}
        size="sm"
        type="button"
        variant="destructive"
      >
        <Trash2 aria-hidden="true" className="size-4" />
        Clear
      </Button>
    </div>
  );
}

export function JsonViewerStatusMeta() {
  return <>Split view · UTF-8</>;
}

export function JsonViewerWorkspace() {
  const runtime = useToolRuntime<
    string,
    JsonViewerSettings,
    SuccessfulJsonViewerResult
  >();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLPreElement>(null);
  const inputIssue = runtime.issues.find((issue) => issue.target === "input");
  const lineNumbers = Array.from(
    { length: Math.max(1, runtime.input.split(/\r\n|\r|\n/).length) },
    (_, index) => index + 1,
  ).join("\n");

  async function copyInput() {
    try {
      await navigator.clipboard.writeText(runtime.input);
      runtime.setNotice("Input copied.");
    } catch {
      runtime.setNotice("Copy failed. Select the input and copy it manually.");
    }
  }

  function focusInputIssue() {
    if (!inputRef.current || !inputIssue?.line || !inputIssue.column) return;
    const lines = runtime.input.split(/\r\n|\r|\n/);
    const precedingLength = lines
      .slice(0, Math.max(0, inputIssue.line - 1))
      .reduce((total, line) => total + line.length + 1, 0);
    const offset = Math.min(
      runtime.input.length,
      precedingLength + Math.max(0, inputIssue.column - 1),
    );
    inputRef.current.focus();
    inputRef.current.setSelectionRange(
      offset,
      Math.min(runtime.input.length, offset + 1),
    );
  }

  return (
    <SplitStack className="relative grid-cols-[minmax(0,520px)_minmax(0,1fr)]">
      <EditorSurface
          actions={
            <Button
              className="h-8 px-2 text-xs text-muted-foreground max-[64rem]:h-11"
              disabled={!runtime.input}
              onClick={() => void copyInput()}
              size="sm"
              type="button"
              variant="ghost"
            >
              <Copy aria-hidden="true" className="size-3.5" />
              Copy
            </Button>
          }
          className="border-r border-border max-[64rem]:min-h-[494px] max-[64rem]:border-r-0 max-[64rem]:border-b"
          data-workspace-panel="input"
          title="JSON input"
        >
          <div className="relative flex min-h-0 flex-1 overflow-hidden bg-muted">
            <pre
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-4 z-10 w-[15px] overflow-hidden pt-[18px] text-right font-mono text-xs leading-[1.55] text-on-ink-muted"
              ref={lineNumbersRef}
            >
              {lineNumbers}
            </pre>
            <Textarea
              aria-errormessage={
                runtime.lifecycle === "invalid"
                  ? "json-viewer-validation-0"
                  : undefined
              }
              aria-invalid={runtime.lifecycle === "invalid"}
              aria-label="JSON input"
              className="h-full min-h-0 flex-1 resize-none rounded-none border-0 bg-transparent pt-[18px] pr-4 pb-[18px] pl-[45px] !font-mono !text-xs !leading-[1.55] shadow-none focus-visible:ring-2 focus-visible:ring-inset"
              id="json-viewer-input"
              maxLength={MAX_JSON_INPUT_CHARS}
              onChange={(event) => runtime.setInput(event.target.value)}
              onScroll={(event) => {
                if (lineNumbersRef.current) {
                  lineNumbersRef.current.scrollTop = event.currentTarget.scrollTop;
                }
              }}
              placeholder="Paste JSON to explore — even broken JSON can be repaired."
              ref={inputRef}
              spellCheck={false}
              value={runtime.input}
            />
            {inputIssue?.line && inputIssue.column ? (
              <div className="absolute right-3 bottom-3 left-[58px] flex items-center justify-between gap-3 rounded-md border border-destructive/25 bg-card/95 px-3 py-2 text-xs text-destructive shadow-sm">
                <span>
                  Error near line {inputIssue.line}, column {inputIssue.column}
                </span>
                <Button
                  className="h-8"
                  onClick={focusInputIssue}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Go to error
                </Button>
              </div>
            ) : null}
          </div>
      </EditorSurface>

      <section
          aria-label="JSON tree"
          className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-card max-[64rem]:h-[60dvh] max-[64rem]:min-h-[30rem] max-[64rem]:max-h-[36rem]"
          data-surface="result"
          data-workspace-panel="output"
        >
          {runtime.result ? (
            <JsonResultRenderer
              artifactValue={runtime.input}
              compact
              downloadName="smarttools-json-viewer.json"
              formattedValue={runtime.result.formattedValue}
              label="JSON tree"
              onCopy={async (value, label) => {
                try {
                  await navigator.clipboard.writeText(value);
                  runtime.setNotice(`${label} copied.`);
                } catch {
                  runtime.setNotice("Copy failed. Select the value manually.");
                }
              }}
              persistentSearch
              selectedPath={ROOT_JSON_TREE_PATH}
              showArtifactActions
              showNodeCopyActions={false}
              value={runtime.result.value}
            />
          ) : (
            <EmptySurface>
              {runtime.issues[0]?.message ??
                (runtime.lifecycle === "running"
                  ? "Parsing JSON…"
                  : "Interactive tree will appear here.")}
            </EmptySurface>
          )}
      </section>
    </SplitStack>
  );
}
