"use client";

/**
 * The source-result layout with one substitution: a collapsible tree in place
 * of the shared `json-tree` renderer, which always renders every branch fully
 * expanded. Expanding and collapsing branches is what this tool is for — its
 * own `definition.ts` documents it as step two — so it is the one part the
 * shared surfaces cannot express from the spec.
 *
 * Everything else (the input pane, the settings pane, the empty/loading/error
 * states) is the shared implementation, unmodified.
 */

import { Button } from "@smarttools/ui";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

import { SplitStack } from "@/components/Stacks";
import { WorkspaceSurface } from "@/components/Surfaces";
import {
  SettingsSurface,
  WorkspaceInputSurface,
  type WorkspaceProps,
} from "@/components/workspaces/SourceResultWorkspace";

/** Branches at or below this depth start expanded; deeper ones start closed. */
const DEFAULT_OPEN_DEPTH = 1;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function primitiveJson(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(String(value));
}

interface JsonBranchProps {
  depth: number;
  entries: readonly (readonly [string, unknown])[];
  label: string | null;
  summary: string;
}

function JsonBranch({ depth, entries, label, summary }: JsonBranchProps) {
  const [open, setOpen] = useState(depth <= DEFAULT_OPEN_DEPTH);
  return (
    <div className="font-mono text-xs leading-6">
      <Button
        aria-expanded={open}
        className="h-6 gap-1 px-1 font-mono text-xs font-normal"
        onClick={() => setOpen((current) => !current)}
        size="sm"
        type="button"
        variant="ghost"
      >
        {open ? (
          <ChevronDown aria-hidden="true" className="size-3.5" />
        ) : (
          <ChevronRight aria-hidden="true" className="size-3.5" />
        )}
        {label ? <span className="font-semibold text-foreground">{label}: </span> : null}
        <span className="text-muted-foreground">{summary}</span>
      </Button>
      {open ? (
        <div className="border-l border-border pl-4">
          {entries.map(([key, entry]) => (
            <JsonTreeNode depth={depth + 1} key={key} name={key} value={entry} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

interface JsonTreeNodeProps {
  depth: number;
  name?: string;
  value: unknown;
}

function JsonTreeNode({ depth, name, value }: JsonTreeNodeProps) {
  const label = name === undefined ? null : JSON.stringify(name);
  if (Array.isArray(value)) {
    return (
      <JsonBranch
        depth={depth}
        entries={value.map((entry, index) => [String(index), entry] as const)}
        label={label}
        summary={`Array(${value.length})`}
      />
    );
  }
  if (isRecord(value)) {
    const entries = Object.entries(value);
    return (
      <JsonBranch
        depth={depth}
        entries={entries}
        label={label}
        summary={`Object(${entries.length})`}
      />
    );
  }
  return (
    <div className="pl-[1.625rem] font-mono text-xs leading-6">
      {label ? <span className="font-semibold text-foreground">{label}: </span> : null}
      <span className="text-primary">{primitiveJson(value)}</span>
    </div>
  );
}

export default function JsonViewerWorkspace(props: WorkspaceProps) {
  const tree = props.result?.render === "json-tree" ? props.result : null;
  const state = props.error
    ? "error"
    : props.running
      ? "loading"
      : tree
        ? "ready"
        : "empty";

  return (
    <SplitStack className="h-full" defaultSize={72} minSize={52}>
      <SplitStack className="h-full" defaultSize={50} minSize={30} orientation="vertical">
        <WorkspaceInputSurface
          disabled={props.disabled}
          input={props.input}
          inputSpec={props.spec.input}
          onInputChange={props.onInputChange}
        />
        <WorkspaceSurface
          className="h-full"
          contentClassName="p-4"
          purpose="inspector"
          scroll="content"
          state={state}
          stateDescription={props.error ?? (props.running ? props.spec.labels.running : props.spec.labels.empty)}
          stateTitle={
            props.error
              ? "JSON tree unavailable"
              : props.running
                ? props.spec.labels.running
                : "Interactive tree will appear here"
          }
          title="JSON tree"
        >
          {tree ? <JsonTreeNode depth={0} value={tree.value} /> : null}
        </WorkspaceSurface>
      </SplitStack>
      <SettingsSurface
        disabled={props.disabled}
        onSettingChange={props.onSettingChange}
        settings={props.settings}
        spec={props.spec}
      />
    </SplitStack>
  );
}
