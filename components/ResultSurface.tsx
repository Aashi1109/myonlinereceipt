"use client";

import { Upload } from "lucide-react";
import { StatusBadge } from "@smarttools/ui";

import {
  getResultCount,
  ResultActions,
  ResultView,
} from "@/components/ResultView";
import { WorkspaceSurface } from "@/components/Surfaces";
import type { ToolResult } from "@/lib/tool-framework/result";
import type { ToolSpec } from "@/lib/tool-framework/spec";

export interface ResultSurfaceProps {
  error?: string;
  result: ToolResult | null;
  running?: boolean;
  spec: ToolSpec;
  title?: string;
}

export function ResultSurface({
  error,
  result,
  running = false,
  spec,
  title = "Result",
}: ResultSurfaceProps) {
  const state = error ? "error" : running ? "loading" : result ? "ready" : "empty";
  const resultCount = getResultCount(result);
  const resultStatus = resultCount === null
    ? "READY"
    : result?.render === "table" && result.truncated
      ? `${resultCount} SHOWN`
      : `${resultCount} READY`;
  const hasResultActions = result?.render !== "json-tree" && Boolean(
    spec.capabilities?.copy || spec.capabilities?.download,
  );
  const jsonHeader = result?.render === "json-tree" ? (
    <div className="flex min-w-0 items-center gap-2">
      <span className="truncate font-caption text-xs font-extrabold tracking-[0.06em] uppercase">
        {title}
      </span>
      <StatusBadge className="shrink-0" variant="success">
        {resultStatus}
      </StatusBadge>
    </div>
  ) : undefined;
  return (
    <WorkspaceSurface
      actions={hasResultActions ? (
        <ResultActions
          canCopy={Boolean(spec.capabilities?.copy)}
          canDownload={Boolean(spec.capabilities?.download)}
          result={result}
        />
      ) : undefined}
      className="h-full"
      header={jsonHeader ? "sr-only" : "visible"}
      purpose="result"
      state={state}
      stateDescription={error ?? (running ? spec.labels.running : spec.labels.empty)}
      stateIcon={running ? <Upload aria-hidden="true" className="animate-pulse" /> : undefined}
      stateTitle={error ? "Unable to create the result" : running ? spec.labels.running : "Result will appear here"}
      status={state === "ready"
        ? <span className="text-foreground">{resultStatus}</span>
        : state === "empty"
          ? <span>0 GENERATED</span>
          : undefined}
      title={title}
    >
      {result ? <ResultView jsonHeader={jsonHeader} result={result} /> : null}
    </WorkspaceSurface>
  );
}
