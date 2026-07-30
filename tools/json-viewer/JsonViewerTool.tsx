"use client";

import { UniversalWorkbench } from "@/components/tool-workbench/UniversalWorkbench";
import type {
  ToolPageComponentProps,
  ToolRuntimeSpec,
} from "@/lib/tool-runtime/types";

import { jsonViewerDefinition } from "./definition";
import {
  describeJsonViewerRepair,
  executeJsonViewer,
  formatJsonViewerInput,
  minifyJsonViewerInput,
  repairJsonViewerInput,
} from "./execution";
import type { JsonViewerExecutionResult } from "./result";
import {
  JsonViewerStatusMeta,
  JsonViewerToolbar,
  JsonViewerWorkspace,
  VIEWER_EXAMPLE,
  type JsonViewerSettings,
} from "./workspace";

type JsonViewerResult = Extract<JsonViewerExecutionResult, { ok: true }>;

const runtimeSpec: ToolRuntimeSpec<
  string,
  JsonViewerSettings,
  JsonViewerResult
> = {
  commands: {
    clear: ({ input }) => ({
      changes: ["Cleared the JSON input"],
      input: "",
      notice: "Input cleared. Undo is available.",
      offerUndo: Boolean(input),
    }),
    format: ({ input }) => {
      const result = formatJsonViewerInput(input);
      return result.ok
        ? {
            input: result.output,
            notice: "JSON beautified. Undo is available.",
            offerUndo: true,
          }
        : { notice: result.error.message };
    },
    minify: ({ input }) => {
      const result = minifyJsonViewerInput(input);
      return result.ok
        ? {
            input: result.output,
            notice: "JSON minified. Copy and download now use the minified JSON.",
            offerUndo: true,
          }
        : { notice: result.error.message };
    },
    repair: ({ input, settings }) => {
      const current = executeJsonViewer(input);
      if (current.ok) return { notice: "JSON is already valid." };

      const result = repairJsonViewerInput(input, settings.repairMode);
      const repairPlan = describeJsonViewerRepair(input, settings.repairMode);
      if (!result.ok || !repairPlan.ok) {
        return {
          notice: result.ok
            ? "Unable to describe the proposed repair."
            : result.error.message,
        };
      }
      const action =
        settings.repairMode === "remove" ? "Removed" : "Set to null";
      const changes =
        repairPlan.changedPaths.length > 0
          ? repairPlan.changedPaths.map((path) => `${action}: ${path}`)
          : ["Normalized invalid JSON syntax"];
      const notice =
        repairPlan.changedPaths.length > 0
          ? `JSON repaired. ${action} ${repairPlan.changedPaths.length} path${repairPlan.changedPaths.length === 1 ? "" : "s"}. Undo is available.`
          : "JSON syntax repaired. Undo is available.";

      return {
        changes,
        confirmation:
          settings.repairMode === "remove" &&
          repairPlan.changedPaths.length > 0
            ? {
                confirmLabel: "Apply repair",
                description: `This repair will permanently remove ${repairPlan.changedPaths.length} broken path${repairPlan.changedPaths.length === 1 ? "" : "s"} from the source. Review the paths before continuing.`,
                title: "Confirm destructive repair",
              }
            : undefined,
        input: result.output,
        notice,
        offerUndo: true,
      };
    },
  },
  debounceMs: jsonViewerDefinition.trigger.debounceMs,
  execute: (input) => {
    const result = executeJsonViewer(input);
    if (!result.ok) throw new Error(result.error.message);
    const rootType = Array.isArray(result.value)
      ? "Array"
      : result.value === null
        ? "Null"
        : typeof result.value === "object"
          ? "Object"
          : typeof result.value;
    return {
      artifacts: [
        {
          content: input,
          mimeType: "application/json;charset=utf-8",
          name: "smarttools-json-viewer.json",
        },
      ],
      facts: [
        { label: "Root", value: rootType },
        {
          label: "Size",
          value: `${new TextEncoder().encode(input).length.toLocaleString("en-US")} B`,
        },
      ],
      result,
    };
  },
  initialInput: VIEWER_EXAMPLE,
  initialSettings: {
    repairMode: "remove",
  },
  isEmpty: (input) => !input.trim(),
  trigger: jsonViewerDefinition.trigger.mode,
  validate: (input) => {
    const result = executeJsonViewer(input);
    return result.ok
      ? []
      : [
          {
            column: result.error.column,
            line: result.error.line,
            message: result.error.message,
            target: "input" as const,
            targetId: "json-viewer-input",
          },
        ];
  },
};

export default function JsonViewerTool({
  definitionKey,
  ...page
}: ToolPageComponentProps) {
  if (definitionKey !== jsonViewerDefinition.definitionKey) {
    throw new Error(`JSON Viewer cannot render definition "${definitionKey}".`);
  }

  return (
    <UniversalWorkbench
      {...page}
      definition={jsonViewerDefinition}
      runtimeSpec={runtimeSpec}
      StatusMeta={JsonViewerStatusMeta}
      Toolbar={JsonViewerToolbar}
      Workspace={JsonViewerWorkspace}
    />
  );
}
