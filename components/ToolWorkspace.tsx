"use client";

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  SegmentedControl,
  ToolOptionsPanel,
} from "@smarttools/ui";
import { Loader2 } from "lucide-react";
import {
  type ReactNode,
  useLayoutEffect,
  useState,
} from "react";

import { FileProcessorWorkspace } from "@/components/FileProcessorWorkspace";
import { ResultSurface } from "@/components/ResultSurface";
import { SettingsPanel } from "@/components/SettingsPanel";
import { SplitStack } from "@/components/Stacks";
import { WorkspaceInputSurface } from "@/components/WorkspaceInput";
import type { ToolResult } from "@/lib/tool-framework/result";
import type {
  ToolInputSpec,
  ToolLayout,
  ToolSpec,
} from "@/lib/tool-framework/spec";
import type { ToolLifecycle } from "@/lib/tool-runtime/types";

export interface WorkspaceInputState {
  readonly files: readonly File[];
  readonly secondary?: string;
  readonly text: string;
}

export type WorkspacePrimaryAction = {
  readonly disabled: boolean;
  readonly label: string;
  readonly onRun: () => void;
  readonly running: boolean;
} | null;

export interface WorkspaceToolbarActions {
  readonly afterExample?: ReactNode;
  readonly before?: ReactNode;
  readonly exampleIcon?: ReactNode;
  readonly exampleLabel?: string;
  readonly exampleVariant?: "link" | "outline";
  readonly onExample?: () => void;
  readonly statusMeta?: ReactNode;
}

export interface WorkspaceProps {
  disabled?: boolean;
  error?: string;
  input: WorkspaceInputState;
  lifecycle: ToolLifecycle;
  onInputChange: (input: WorkspaceInputState) => void;
  onSettingChange: (key: string, value: unknown) => void;
  onToolbarActionsChange?: (actions: WorkspaceToolbarActions | null) => void;
  /**
   * Reports the tool's own pre-run readiness (`tools/<key>/hooks.ts`
   * `validate`): `null` when the job may start, otherwise the reason it may
   * not. The owner of the primary action disables it while this is non-null;
   * the workspace also shows the reason next to the settings it refers to.
   *
   * Optional so the workspaces that run no hook stay unchanged.
   */
  onValidationChange?: (reason: string | null) => void;
  primaryAction?: WorkspacePrimaryAction;
  progress?: {
    readonly completed: number;
    readonly stage: string;
    readonly total: number;
  } | null;
  result: ToolResult | null;
  running?: boolean;
  settings: Readonly<Record<string, unknown>>;
  spec: ToolSpec;
}

function getInputSplitSizes(
  inputSpec: ToolInputSpec,
  defaultSize: number,
  minSize: number,
) {
  const allSingleLineFields =
    inputSpec.kind === "fields" &&
    inputSpec.fields.every((field) => !field.multiline);
  if (!allSingleLineFields) return { defaultSize, minSize };

  return inputSpec.fields.length > 1
    ? { defaultSize: 36, minSize: 30 }
    : { defaultSize: 24, minSize: 20 };
}

const INPUT_RESULT_ITEMS = [
  { label: "Input", value: "input" },
  { label: "Result", value: "result" },
] as const;

function useNarrowWorkspace() {
  const [narrow, setNarrow] = useState(false);

  useLayoutEffect(() => {
    const query = window.matchMedia("(max-width: 64rem)");
    const update = () => setNarrow(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return narrow;
}

function InputResultWorkspace({
  defaultSize,
  input,
  layout,
  minSize,
  result,
}: {
  defaultSize: number;
  input: ReactNode;
  layout: ToolLayout;
  minSize: number;
  result: ReactNode;
}) {
  const narrow = useNarrowWorkspace();
  const [view, setView] = useState<(typeof INPUT_RESULT_ITEMS)[number]["value"]>("input");

  if (narrow) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <SegmentedControl
          className="shrink-0 items-center border-b border-border p-3 [&_[data-slot=tabs-trigger]]:min-h-11"
          items={INPUT_RESULT_ITEMS}
          onValueChange={(value) => setView(value as typeof view)}
          size="navigation"
          value={view}
        />
        <div className="min-h-0 flex-1 overflow-hidden">
          <div className={view === "input" ? "h-full" : "hidden h-full"}>{input}</div>
          <div className={view === "result" ? "h-full" : "hidden h-full"}>{result}</div>
        </div>
      </div>
    );
  }

  return (
    <SplitStack
      className={
        layout === "stacked"
          ? "h-full [&_[data-purpose=result]_pre]:text-[11px]"
          : "h-full"
      }
      defaultSize={defaultSize}
      minSize={minSize}
      orientation={layout === "stacked" ? "vertical" : "horizontal"}
    >
      {input}
      {result}
    </SplitStack>
  );
}

function PrimaryAction({ action }: { action: NonNullable<WorkspacePrimaryAction> }) {
  return (
    <Button
      aria-busy={action.running || undefined}
      className="!h-11 w-full"
      disabled={action.disabled}
      onClick={action.onRun}
      type="button"
    >
      {action.running ? (
        <Loader2 aria-hidden="true" className="size-4 animate-spin" />
      ) : null}
      {action.label}
    </Button>
  );
}

function ActionRailContent({ props }: { props: WorkspaceProps }) {
  const state = props.error
    ? {
        description: "Review the input, correct the problem, and run the tool again.",
        title: props.error,
        variant: "destructive" as const,
      }
    : props.lifecycle === "running"
      ? { description: "Keep this page open while the tool finishes.", title: props.spec.labels.running }
      : props.lifecycle === "completed"
        ? { description: "The result is ready in the workspace.", title: props.spec.labels.ready }
        : props.lifecycle === "ready"
          ? {
              description: props.primaryAction
                ? "The input is valid and the action is available."
                : "The result updates automatically as the input changes.",
              title: "Ready",
            }
          : {
              description: props.spec.labels.empty,
              title: "Waiting for input",
            };

  return (
    <>
      <Alert variant={state.variant}>
        <AlertTitle>{state.title}</AlertTitle>
        <AlertDescription>{state.description}</AlertDescription>
      </Alert>
      {props.spec.content.limitations?.length ? (
        <section>
          <h3 className="text-sm font-semibold">Keep in mind</h3>
          <ul className="mt-2 list-disc space-y-1.5 pl-4 text-xs leading-5 text-muted-foreground">
            {props.spec.content.limitations.map((item, index) => (
              <li key={`limitation-${index}`}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}
      <section>
        <h3 className="text-sm font-semibold">How to use</h3>
        <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-xs leading-5 text-muted-foreground">
          {props.spec.content.howToUse.map((item, index) => (
            <li key={`step-${index}`}>{item}</li>
          ))}
        </ol>
      </section>
    </>
  );
}

export function ToolWorkspace(props: WorkspaceProps) {
  if (props.spec.input.kind === "files") {
    return <FileProcessorWorkspace {...props} />;
  }

  const hasSettings = Object.keys(props.spec.settings.fields).length > 0;
  const inputSplit = getInputSplitSizes(props.spec.input, 50, 30);
  const result = (
    <ResultSurface
      error={props.error}
      result={props.result}
      running={props.running}
      spec={props.spec}
    />
  );
  const primaryContent = props.spec.input.kind === "none" ? (
    result
  ) : (
    <InputResultWorkspace
      defaultSize={inputSplit.defaultSize}
      input={(
        <WorkspaceInputSurface
          disabled={props.disabled}
          input={props.input}
          inputSpec={props.spec.input}
          onInputChange={props.onInputChange}
        />
      )}
      layout={props.spec.layout ?? "side-by-side"}
      minSize={inputSplit.minSize}
      result={result}
    />
  );

  return (
    <SplitStack className="h-full" defaultSize={69} minSize={52}>
      {primaryContent}
      <ToolOptionsPanel
        action={hasSettings && props.primaryAction ? <PrimaryAction action={props.primaryAction} /> : undefined}
        className="h-full overflow-y-auto bg-card p-[18px]"
        title={hasSettings ? "Options" : props.primaryAction ? "Action" : "Guidance"}
        variant="plain"
      >
        {hasSettings ? (
          <SettingsPanel
            disabled={props.disabled}
            onChange={props.onSettingChange}
            spec={props.spec.settings}
            values={props.settings}
          />
        ) : (
          <>
            {props.primaryAction ? <PrimaryAction action={props.primaryAction} /> : null}
            <ActionRailContent props={props} />
          </>
        )}
      </ToolOptionsPanel>
    </SplitStack>
  );
}

export default ToolWorkspace;
