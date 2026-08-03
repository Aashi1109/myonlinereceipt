"use client";

import { Upload } from "lucide-react";

import { ResultView } from "@/components/ResultView";
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
  return (
    <WorkspaceSurface
      className="h-full"
      purpose="result"
      state={state}
      stateDescription={error ?? (running ? spec.labels.running : spec.labels.empty)}
      stateIcon={running ? <Upload aria-hidden="true" className="animate-pulse" /> : undefined}
      stateTitle={error ? "Unable to create the result" : running ? spec.labels.running : "Result will appear here"}
      status={state === "ready" ? <span className="text-foreground">READY</span> : undefined}
      title={title}
    >
      {result ? <ResultView result={result} /> : null}
    </WorkspaceSurface>
  );
}
