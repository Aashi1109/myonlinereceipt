"use client";

/**
 * The generator layout, plus the one thing the shared surfaces cannot express:
 * the gradient itself. `run.ts` returns a `background:` declaration as text, so
 * the default result pane shows the CSS and nothing else — for a gradient tool
 * that is the whole point of the output.
 *
 * The declaration is parsed back out of the result rather than rebuilt from the
 * settings so there is one source of truth for the gradient, and so the swatch
 * can only show a value `run.ts` already validated both colours for.
 */

import { SplitStack, Stack } from "@/components/Stacks";
import { WorkspaceSurface } from "@/components/Surfaces";
import {
  ResultSurface,
  SettingsSurface,
  WorkspaceInputSurface,
  type WorkspaceProps,
} from "@/components/workspaces/SourceResultWorkspace";
import type { ToolResult } from "@/lib/tool-framework/result";

/** The CSS value from a `background: <value>;` declaration, or "" when absent. */
function gradientValue(result: ToolResult | null): string {
  if (!result || result.render !== "text") return "";
  return /background:\s*(.+);\s*$/.exec(result.text)?.[1] ?? "";
}

export default function GradientGeneratorWorkspace(props: WorkspaceProps) {
  const gradient = gradientValue(props.result);

  return (
    <SplitStack className="h-full" defaultSize={62} minSize={45}>
      <SplitStack className="h-full" defaultSize={48} minSize={28} orientation="vertical">
        <WorkspaceInputSurface
          disabled={props.disabled}
          input={props.input}
          inputSpec={props.spec.input}
          onInputChange={props.onInputChange}
        />
        <ResultSurface
          error={props.error}
          result={props.result}
          running={props.running}
          spec={props.spec}
          title="Generated result"
        />
      </SplitStack>
      <Stack className="h-full">
        <WorkspaceSurface
          className="min-h-0 flex-1 border-b border-border"
          contentClassName="p-4"
          purpose="preview"
          state={gradient ? "ready" : "empty"}
          stateDescription="Enter two valid HEX colours to preview the blend."
          stateTitle="Gradient preview"
          title="Preview"
        >
          <div
            aria-label="Generated gradient preview"
            className="min-h-40 flex-1 rounded-lg border border-border"
            role="img"
            style={{ backgroundImage: gradient }}
          />
        </WorkspaceSurface>
        <SettingsSurface
          disabled={props.disabled}
          onSettingChange={props.onSettingChange}
          settings={props.settings}
          spec={props.spec}
          title={props.spec.input.kind === "fields" ? props.spec.input.label : "Generator settings"}
        />
      </Stack>
    </SplitStack>
  );
}
