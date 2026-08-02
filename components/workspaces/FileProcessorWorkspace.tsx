"use client";

import { Alert, AlertDescription, AlertTitle, Button } from "@smarttools/ui";
import { OrderableList } from "@smarttools/ui/components/OrderableList";
import { GripVertical } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

import { SplitStack, Stack } from "@/components/Stacks";
import { WorkspaceSurface } from "@/components/Surfaces";
import {
  ResultSurface,
  SettingsSurface,
  type WorkspaceProps,
  WorkspaceInputSurface,
  workspaceFileId,
} from "@/components/workspaces/SourceResultWorkspace";
import { loadToolHooks } from "@/lib/tool-framework/hooks";
import type {
  ToolHooks,
  ToolPagePreview,
  ToolRunFile,
} from "@/lib/tool-framework/run";
import { parseSettings } from "@/lib/tool-framework/settings";
import type { ToolSpec } from "@/lib/tool-framework/spec";
import { useToolRun } from "@/lib/tool-framework/useToolRun";
import { createWorkerInput } from "@/lib/tool-framework/workerProtocol";

type Hooks = ToolHooks<Record<string, unknown>>;

const NO_HOOKS: Hooks = {};
const NO_FILES: readonly ToolRunFile[] = [];

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
 * Reads the picked files once per selection change and holds them, so the
 * hooks that take `ToolRunFile`s stay synchronous and cheap enough to call on
 * a keystroke.
 *
 * The effect depends on the selection's identity, not the array's. A parent
 * that rebuilds `input.files` on every render would otherwise refire the read
 * effect, whose `setRunFiles` triggers another render — an endless loop. This
 * is the same reference-identity trap that bites effects keyed on a whole spec
 * object, and every effect below follows the same rule.
 */
function useRunFiles(files: readonly File[]): readonly ToolRunFile[] {
  const [runFiles, setRunFiles] = useState<readonly ToolRunFile[]>(NO_FILES);
  const filesKey = files
    .map((file) => `${workspaceFileId(file)}:${file.size}:${file.lastModified}`)
    .join("|");

  useEffect(() => {
    let current = true;
    void Promise.all(
      files.map(async (file) => ({
        id: workspaceFileId(file),
        name: file.name,
        mime: file.type,
        data: await file.arrayBuffer(),
      })),
    ).then(
      (loaded) => {
        if (current) setRunFiles(loaded);
      },
      // An unreadable file leaves the hook with nothing to inspect, which
      // blocks the run rather than letting it start on bytes nobody has.
      () => {
        if (current) setRunFiles(NO_FILES);
      },
    );
    return () => {
      current = false;
    };
    // `files` is read through `filesKey`, which is what actually changes when
    // the selection does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filesKey]);

  return runFiles;
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
): { readonly inspecting: boolean; readonly previews: readonly ToolPagePreview[] } {
  const { inspect, previews, reset, state } = useToolRun();
  const key =
    spec.input.kind === "files" && spec.input.inspect === true
      ? (spec.toolId.split(".")[1] ?? "")
      : "";
  const file = runFiles[0];
  // Derived identity again: `runFiles` is a new array on every read.
  const fileKey = file ? `${file.id}:${file.data.byteLength}` : "";

  useEffect(() => {
    if (!key || !file) {
      reset();
      return;
    }
    try {
      inspect({
        key,
        file: createWorkerInput(file.id, file.data, file.name, file.mime),
      });
    } catch {
      // An input the protocol rejects outright (an unusable MIME type, say)
      // simply gets no previews. The file stays selected and `validate` still
      // reports why the tool cannot run.
    }
    // `file` is read through `fileKey`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, fileKey, inspect, reset]);

  // This hook owns the only job this `useToolRun` ever starts, so a running
  // job here is always the inspection.
  return { inspecting: state.status === "running", previews };
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

/** A crop rectangle in whatever units the tool's own settings are declared in. */
export interface CropBox {
  readonly height: number;
  readonly width: number;
  readonly x: number;
  readonly y: number;
}

export interface CropFrameProps {
  /** The page or image size the box lives inside, in the same units. */
  bounds: { readonly height: number; readonly width: number };
  box: CropBox;
  disabled?: boolean;
  onChange: (box: CropBox) => void;
  /** True when the origin is the bottom-left corner, as in PDF user space. */
  originBottomLeft?: boolean;
}

function roundBox(box: CropBox): CropBox {
  return {
    height: Math.round(box.height),
    width: Math.round(box.width),
    x: Math.round(box.x),
    y: Math.round(box.y),
  };
}

/**
 * A draggable, resizable crop box positioned over whatever its parent renders.
 *
 * It is absolutely positioned, so the caller supplies a `relative` container
 * holding the preview image — the container's box is what pointer movement is
 * measured against. The frame knows only the coordinate space it is handed,
 * which is what lets one implementation serve pixel and point units, and
 * top-left and bottom-left origins.
 */
export function CropFrame({
  bounds,
  box,
  disabled = false,
  onChange,
  originBottomLeft = false,
}: CropFrameProps) {
  const pointer = useRef<{ mode: "move" | "resize"; x: number; y: number } | null>(
    null,
  );

  function clamp(next: CropBox): CropBox {
    const width = Math.min(Math.max(1, next.width), bounds.width);
    const height = Math.min(Math.max(1, next.height), bounds.height);
    return {
      height,
      width,
      x: Math.min(Math.max(0, next.x), bounds.width - width),
      y: Math.min(Math.max(0, next.y), bounds.height - height),
    };
  }

  /** `dy` is screen-down, which is away from the origin only when it is at the top. */
  function move(dx: number, dy: number) {
    if (disabled) return;
    onChange(
      roundBox(
        clamp({
          ...box,
          x: box.x + dx,
          y: box.y + (originBottomLeft ? -dy : dy),
        }),
      ),
    );
  }

  /** Grows towards the bottom-right corner on screen, whichever way y runs. */
  function resize(dx: number, dy: number) {
    if (disabled) return;
    const width = Math.max(1, Math.min(box.width + dx, bounds.width - box.x));
    const limit = originBottomLeft ? box.y + box.height : bounds.height - box.y;
    const height = Math.max(1, Math.min(box.height + dy, limit));
    onChange(
      roundBox(
        clamp({
          height,
          width,
          x: box.x,
          // A bottom-left origin moves down as the box grows downwards; the
          // edge that stays put is the top one.
          y: originBottomLeft ? box.y + box.height - height : box.y,
        }),
      ),
    );
  }

  function step(event: KeyboardEvent<HTMLElement>, apply: (dx: number, dy: number) => void) {
    const amount = event.shiftKey ? 10 : 1;
    const movement: Record<string, readonly [number, number]> = {
      ArrowDown: [0, amount],
      ArrowLeft: [-amount, 0],
      ArrowRight: [amount, 0],
      ArrowUp: [0, -amount],
    };
    const delta = movement[event.key];
    if (!delta) return false;
    event.preventDefault();
    apply(delta[0], delta[1]);
    return true;
  }

  /** Converts a pointer movement in CSS pixels into the caller's units. */
  function scaled(frame: DOMRect, dx: number, dy: number): readonly [number, number] {
    return [(dx * bounds.width) / frame.width, (dy * bounds.height) / frame.height];
  }

  function trackPointer(
    event: PointerEvent<HTMLElement>,
    frame: DOMRect | undefined,
    apply: (dx: number, dy: number) => void,
  ) {
    const origin = pointer.current;
    if (!origin || !frame) return;
    const [dx, dy] = scaled(
      frame,
      event.clientX - origin.x,
      event.clientY - origin.y,
    );
    apply(dx, dy);
    pointer.current = { mode: origin.mode, x: event.clientX, y: event.clientY };
  }

  const top = originBottomLeft ? bounds.height - box.y - box.height : box.y;

  return (
    <div
      aria-label="Crop area"
      className="absolute cursor-move border-2 border-primary bg-primary/10 shadow-[0_0_0_999px_rgb(15_23_42_/_0.42)] outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onKeyDown={(event) => step(event, move)}
      onPointerDown={(event) => {
        if (disabled) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        pointer.current = { mode: "move", x: event.clientX, y: event.clientY };
      }}
      onPointerMove={(event) => {
        if (pointer.current?.mode !== "move") return;
        trackPointer(
          event,
          event.currentTarget.parentElement?.getBoundingClientRect(),
          move,
        );
      }}
      onPointerUp={(event) => {
        event.currentTarget.releasePointerCapture(event.pointerId);
        pointer.current = null;
      }}
      role="application"
      style={{
        height: `${(box.height / bounds.height) * 100}%`,
        left: `${(box.x / bounds.width) * 100}%`,
        top: `${(top / bounds.height) * 100}%`,
        width: `${(box.width / bounds.width) * 100}%`,
      }}
      tabIndex={disabled ? -1 : 0}
    >
      <button
        aria-label="Resize crop area"
        className="absolute -right-3 -bottom-3 size-6 cursor-nwse-resize rounded-full border-2 border-white bg-primary shadow before:absolute before:inset-[-10px] before:content-[''] focus-visible:ring-2 focus-visible:ring-ring"
        disabled={disabled}
        onKeyDown={(event) => {
          if (step(event, resize)) event.stopPropagation();
        }}
        onPointerDown={(event) => {
          event.stopPropagation();
          event.currentTarget.setPointerCapture(event.pointerId);
          pointer.current = { mode: "resize", x: event.clientX, y: event.clientY };
        }}
        onPointerMove={(event) => {
          if (pointer.current?.mode !== "resize") return;
          trackPointer(
            event,
            event.currentTarget.parentElement?.parentElement?.getBoundingClientRect(),
            resize,
          );
        }}
        onPointerUp={(event) => {
          event.currentTarget.releasePointerCapture(event.pointerId);
          pointer.current = null;
        }}
        type="button"
      />
    </div>
  );
}

/**
 * Drag-to-reorder over the selected files, for the tools whose output follows
 * the input order. The order lives in `input.files` itself, so reordering is
 * an ordinary input change and the run sees it without a second channel.
 */
function FileOrderSurface({
  disabled,
  input,
  onInputChange,
}: Pick<WorkspaceProps, "disabled" | "input" | "onInputChange">) {
  const files = input.files;
  return (
    <WorkspaceSurface
      className="min-h-0"
      contentClassName="p-3"
      description="Files are processed in this order."
      purpose="editor"
      scroll="content"
      state={files.length > 1 ? "ready" : "empty"}
      stateDescription="Add two or more files to arrange them."
      stateTitle="Nothing to arrange yet"
      title="File order"
    >
      <OrderableList
        ariaLabel="File order"
        className="grid gap-2"
        disabled={disabled ?? false}
        getId={workspaceFileId}
        getLabel={(file) => file.name}
        items={files}
        onReorder={(nextFiles) => onInputChange({ ...input, files: nextFiles })}
        renderItem={(file, orderable) => (
          <div
            className={`flex items-center gap-2 rounded-lg border border-border bg-background p-2 ${
              orderable.isDragging ? "shadow-lg ring-1 ring-primary/20" : ""
            }`}
          >
            <Button
              {...orderable.attributes}
              {...orderable.listeners}
              aria-label={`Drag ${file.name} to reorder`}
              className="relative size-8 shrink-0 cursor-grab touch-none text-muted-foreground before:absolute before:inset-[-6px] before:content-[''] active:cursor-grabbing disabled:cursor-not-allowed"
              disabled={orderable.disabled}
              ref={orderable.setActivatorNodeRef}
              size="icon"
              type="button"
              variant="ghost"
            >
              <GripVertical aria-hidden="true" className="size-4" />
            </Button>
            <p className="min-w-0 flex-1 truncate text-sm">{file.name}</p>
          </div>
        )}
      />
    </WorkspaceSurface>
  );
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
  const runFiles = useRunFiles(props.input.files);
  const { inspecting, previews } = useInspectedPages(props.spec, runFiles);
  useSettingsHooks(props, hooks, previews);

  const reason =
    hooks.validate?.(
      parseSettings(props.spec.settings, props.settings),
      runFiles,
    ) ?? null;
  const onValidationChange = props.onValidationChange;

  useEffect(() => {
    onValidationChange?.(reason);
  }, [onValidationChange, reason]);

  const settingsSurface = (
    <SettingsSurface
      disabled={props.disabled}
      onSettingChange={props.onSettingChange}
      settings={props.settings}
      spec={props.spec}
      title="Processing settings"
    />
  );
  const inputSurface = (
    <WorkspaceInputSurface
      disabled={props.disabled}
      input={props.input}
      inputSpec={props.spec.input}
      onInputChange={props.onInputChange}
    />
  );
  const detailSurface =
    props.orderFiles || props.detail ? (
      <Stack className="h-full">
        {props.orderFiles ? (
          <FileOrderSurface
            disabled={props.disabled}
            input={props.input}
            onInputChange={props.onInputChange}
          />
        ) : null}
        {props.detail?.({
          disabled: props.disabled ?? false,
          inspecting,
          previews,
        })}
      </Stack>
    ) : null;

  return (
    <SplitStack className="h-full" defaultSize={56} minSize={38}>
      {detailSurface ? (
        <SplitStack
          className="h-full"
          defaultSize={44}
          minSize={24}
          orientation="vertical"
        >
          {inputSurface}
          {detailSurface}
        </SplitStack>
      ) : (
        inputSurface
      )}
      <Stack className="h-full">
        {settingsSurface}
        {reason ? (
          <Alert className="m-3" variant="destructive">
            <AlertTitle>This tool cannot run yet</AlertTitle>
            <AlertDescription>{reason}</AlertDescription>
          </Alert>
        ) : null}
        <ResultSurface
          error={props.error}
          result={props.result}
          running={props.running}
          spec={props.spec}
          title="Processed output"
        />
      </Stack>
    </SplitStack>
  );
}
