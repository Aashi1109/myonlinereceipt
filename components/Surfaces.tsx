"use client";

import {
  Button,
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  FileQueueItem,
  FileUploadZone,
  StatusBadge,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@smarttools/ui";
import {
  OrderableList,
  type OrderableItemState,
} from "@smarttools/ui/components/OrderableList";
import { cn } from "@smarttools/ui/lib/utils";
import {
  CircleAlert,
  File as FileIcon,
  Inbox,
  LoaderCircle,
  Maximize2,
  Minus,
  Plus,
} from "lucide-react";
import {
  type DragEvent,
  type HTMLAttributes,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useId,
  useRef,
  useState,
} from "react";

import {
  OverlayStack,
  ScrollRegion,
  Stack,
} from "./Stacks";

export type WorkspaceSurfacePurpose =
  | "source"
  | "editor"
  | "result"
  | "preview"
  | "inspector";

export type WorkspaceSurfaceState =
  | "ready"
  | "empty"
  | "loading"
  | "error";

export type WorkspaceSurfaceProps = Omit<
  HTMLAttributes<HTMLElement>,
  "title"
> & {
  actions?: ReactNode;
  children?: ReactNode;
  contentClassName?: string;
  description?: ReactNode;
  header?: "visible" | "sr-only";
  meta?: ReactNode;
  purpose?: WorkspaceSurfacePurpose;
  scroll?: "none" | "content";
  state?: WorkspaceSurfaceState;
  stateAction?: ReactNode;
  stateDescription?: ReactNode;
  stateIcon?: ReactNode;
  stateTitle?: ReactNode;
  status?: ReactNode;
  title: ReactNode;
  variant?: "card" | "panel";
};

const DEFAULT_STATE_TITLES: Record<
  Exclude<WorkspaceSurfaceState, "ready">,
  string
> = {
  empty: "Nothing here yet",
  error: "This surface needs attention",
  loading: "Loading",
};

const DEFAULT_STATE_ICONS: Record<
  Exclude<WorkspaceSurfaceState, "ready">,
  ReactNode
> = {
  empty: <Inbox aria-hidden="true" />,
  error: <CircleAlert aria-hidden="true" />,
  loading: <LoaderCircle aria-hidden="true" className="animate-spin" />,
};

function WorkspaceSurface({
  actions,
  children,
  className,
  contentClassName,
  description,
  header = "visible",
  meta,
  purpose = "source",
  scroll = "none",
  state = "ready",
  stateAction,
  stateDescription,
  stateIcon,
  stateTitle,
  status,
  title,
  variant = "panel",
  ...props
}: WorkspaceSurfaceProps) {
  const headingId = useId();
  const content =
    state === "ready" ? (
      children
    ) : state === "empty" && purpose === "result" ? (
      <div
        className="min-h-0 flex-1 px-4 py-3"
        data-surface-state={state}
      >
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground/70">
            {stateTitle ?? DEFAULT_STATE_TITLES[state]}
          </span>
          {stateDescription ? ` — ${stateDescription}` : null}
        </p>
        <div aria-hidden="true" className="mt-3 grid gap-2">
          {Array.from({ length: 3 }, (_, index) => (
            <div className="rounded-lg bg-muted/55 px-4 py-3 font-mono text-xs text-muted-foreground/55" key={index}>
              –
            </div>
          ))}
        </div>
        {stateAction ? <div className="mt-3">{stateAction}</div> : null}
      </div>
    ) : (
      <Empty
        className="min-h-72 flex-1 rounded-none border-0 bg-transparent"
        data-surface-state={state}
      >
        <EmptyHeader>
          <EmptyMedia
            className={cn(
              state === "error" ? "text-destructive" : undefined,
            )}
            variant="icon"
          >
            {stateIcon ?? DEFAULT_STATE_ICONS[state]}
          </EmptyMedia>
          <EmptyTitle>
            {stateTitle ?? DEFAULT_STATE_TITLES[state]}
          </EmptyTitle>
          {stateDescription ? (
            <EmptyDescription>{stateDescription}</EmptyDescription>
          ) : null}
        </EmptyHeader>
        {stateAction ? <EmptyContent>{stateAction}</EmptyContent> : null}
      </Empty>
    );
  const heading = (
    <h2
      className={cn(
        "truncate font-caption text-xs uppercase",
        variant === "card"
          ? "font-medium tracking-[0.04em] text-muted-foreground"
          : "font-extrabold tracking-[0.06em]",
      )}
      id={headingId}
    >
      {title}
    </h2>
  );
  const workspaceHeader = header === "visible" ? (
    <header
      className={cn(
        "flex shrink-0 items-center justify-between gap-3",
        variant === "card" ? "min-h-10 px-4 pt-2" : "min-h-[46px] border-b border-border px-4",
      )}
      data-slot="workspace-header"
    >
      <div className="min-w-0">
        {status !== undefined && status !== null ? (
          <div className="flex min-w-0 items-center gap-2">
            {heading}
            {variant === "card" ? status : (
              <StatusBadge className="shrink-0" variant={state === "ready" ? "success" : "neutral"}>
                {status}
              </StatusBadge>
            )}
          </div>
        ) : heading}
        {description ? (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {meta !== undefined && meta !== null ? (
        <div className="ml-auto flex shrink-0 items-center gap-3">
          <span className="text-right font-mono text-xs text-muted-foreground">{meta}</span>
          {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
        </div>
      ) : actions ? (
        <div className="flex shrink-0 items-center gap-1">{actions}</div>
      ) : null}
    </header>
  ) : (
    <h2 className="sr-only" id={headingId}>{title}</h2>
  );

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        "flex min-h-0 min-w-0 flex-col",
        variant === "card" ? "gap-2 overflow-visible bg-transparent" : "overflow-hidden bg-card",
        className,
      )}
      data-purpose={purpose}
      data-state={state}
      data-surface="workspace"
      {...props}
    >
      {variant === "card" ? null : workspaceHeader}
      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col",
          variant === "card" ? "overflow-hidden rounded-lg border border-border bg-muted/45" : undefined,
        )}
        data-slot="workspace-card"
      >
      {variant === "card" ? workspaceHeader : null}
      {scroll === "content" && state === "ready" ? (
        <ScrollRegion
          accessibleName={`${typeof title === "string" ? title : "Workspace"} content`}
          className="flex-1"
          data-slot="workspace-content"
        >
          <div
            className={cn(
              "flex min-h-full min-w-0 flex-col",
              contentClassName,
            )}
          >
            {content}
          </div>
        </ScrollRegion>
      ) : (
        <div
          className={cn(
            "flex min-h-0 min-w-0 flex-1 flex-col",
            contentClassName,
          )}
          data-slot="workspace-content"
        >
          {content}
        </div>
      )}
      </div>
    </section>
  );
}

export type FileIntakeSurfaceProps = Omit<
  WorkspaceSurfaceProps,
  "children" | "purpose" | "state"
> & {
  accept?: string;
  disabled?: boolean;
  intakeDescription?: ReactNode;
  intakeIcon?: ReactNode;
  intakeTitle: string;
  maxFiles?: number;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
};

function FileIntakeSurface({
  accept,
  disabled = false,
  intakeDescription,
  intakeIcon,
  intakeTitle,
  maxFiles,
  multiple = false,
  onFiles,
  ...surfaceProps
}: FileIntakeSurfaceProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function deliverFiles(files: FileList | readonly File[]) {
    const nextFiles = Array.from(files).slice(
      0,
      maxFiles ?? (multiple ? undefined : 1),
    );
    if (nextFiles.length > 0) onFiles(nextFiles);
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    if (disabled) return;
    deliverFiles(event.dataTransfer.files);
  }

  return (
    <WorkspaceSurface purpose="source" {...surfaceProps}>
      <div className="grid min-h-0 flex-1 place-items-center p-4">
        <input
          accept={accept}
          className="sr-only"
          disabled={disabled}
          multiple={multiple}
          onChange={(event) => {
            if (event.target.files) deliverFiles(event.target.files);
            event.target.value = "";
          }}
          ref={inputRef}
          tabIndex={-1}
          type="file"
        />
        <FileUploadZone
          description={
            intakeDescription ??
            (multiple
              ? "Drop files here or choose them from your device."
              : "Drop a file here or choose it from your device.")
          }
          disabled={disabled}
          icon={intakeIcon}
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
          title={intakeTitle}
        />
      </div>
    </WorkspaceSurface>
  );
}

export type FileQueueSurfaceProps<Item> = Omit<
  WorkspaceSurfaceProps,
  "children" | "purpose" | "state"
> & {
  emptyDescription?: ReactNode;
  getIcon?: (item: Item) => ReactNode;
  getId: (item: Item) => string;
  getMetadata: (item: Item) => ReactNode;
  getName: (item: Item) => ReactNode;
  items: readonly Item[];
  renderAction?: (item: Item) => ReactNode;
};

function FileQueueSurface<Item>({
  emptyDescription = "Add one or more files to continue.",
  getIcon,
  getId,
  getMetadata,
  getName,
  items,
  renderAction,
  ...surfaceProps
}: FileQueueSurfaceProps<Item>) {
  return (
    <WorkspaceSurface
      purpose="source"
      state={items.length === 0 ? "empty" : "ready"}
      stateDescription={emptyDescription}
      stateIcon={<FileIcon aria-hidden="true" />}
      stateTitle="No files added"
      {...surfaceProps}
    >
      <ScrollRegion
        accessibleName="File queue"
        className="flex-1 px-4"
      >
        <Stack>
          {items.map((item) => (
            <FileQueueItem
              action={renderAction?.(item)}
              icon={getIcon?.(item) ?? <FileIcon aria-hidden="true" />}
              key={getId(item)}
              metadata={getMetadata(item)}
              name={getName(item)}
            />
          ))}
        </Stack>
      </ScrollRegion>
    </WorkspaceSurface>
  );
}

export type CollectionSurfaceProps<Item> = Omit<
  WorkspaceSurfaceProps,
  "children" | "purpose" | "state"
> & {
  ariaLabel: string;
  disabled?: boolean;
  emptyDescription?: ReactNode;
  getId: (item: Item) => string;
  getLabel?: (item: Item) => string;
  items: readonly Item[];
  layout?: "grid" | "vertical";
  listClassName?: string;
  onReorder: (items: Item[]) => void;
  renderItem: (item: Item, state: OrderableItemState) => ReactNode;
};

function CollectionSurface<Item>({
  ariaLabel,
  disabled = false,
  emptyDescription = "Add items to build this collection.",
  getId,
  getLabel,
  items,
  layout = "vertical",
  listClassName,
  onReorder,
  renderItem,
  ...surfaceProps
}: CollectionSurfaceProps<Item>) {
  return (
    <WorkspaceSurface
      purpose="editor"
      state={items.length === 0 ? "empty" : "ready"}
      stateDescription={emptyDescription}
      stateTitle="Collection is empty"
      {...surfaceProps}
    >
      <ScrollRegion accessibleName={ariaLabel} className="flex-1 p-4">
        <OrderableList
          ariaLabel={ariaLabel}
          className={cn(
            layout === "grid"
              ? "grid grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))] gap-3"
              : "space-y-2",
            listClassName,
          )}
          disabled={disabled}
          getId={getId}
          getLabel={getLabel}
          items={items}
          layout={layout}
          onReorder={onReorder}
          renderItem={renderItem}
        />
      </ScrollRegion>
    </WorkspaceSurface>
  );
}

type CanvasPoint = { x: number; y: number };

export type CanvasSurfaceProps = Omit<
  WorkspaceSurfaceProps,
  "actions" | "children" | "purpose" | "state"
> & {
  actions?: ReactNode;
  canvasLabel: string;
  children: ReactNode;
  initialZoom?: number;
  maxZoom?: number;
  minZoom?: number;
  onViewChange?: (view: { pan: CanvasPoint; zoom: number }) => void;
  overlay?: ReactNode;
  overlayPointerEvents?: "auto" | "none";
  panStep?: number;
  zoomStep?: number;
};

function CanvasAction({
  children,
  label,
  onClick,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          aria-label={label}
          onClick={onClick}
          size="icon-xs"
          type="button"
          variant="outline"
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function CanvasSurface({
  actions,
  canvasLabel,
  children,
  className,
  initialZoom = 1,
  maxZoom = 4,
  minZoom = 0.25,
  onViewChange,
  overlay,
  overlayPointerEvents = "none",
  panStep = 16,
  zoomStep = 0.1,
  ...surfaceProps
}: CanvasSurfaceProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    origin: CanvasPoint;
    pan: CanvasPoint;
    pointerId: number;
  } | null>(null);
  const [zoom, setZoom] = useState(
    Math.min(maxZoom, Math.max(minZoom, initialZoom)),
  );
  const [pan, setPan] = useState<CanvasPoint>({ x: 0, y: 0 });

  function updateView(nextZoom: number, nextPan: CanvasPoint) {
    const normalizedZoom = Math.min(
      maxZoom,
      Math.max(minZoom, nextZoom),
    );
    setZoom(normalizedZoom);
    setPan(nextPan);
    onViewChange?.({ pan: nextPan, zoom: normalizedZoom });
  }

  function fitToView() {
    const viewport = viewportRef.current;
    const content = contentRef.current?.firstElementChild;
    if (!(content instanceof HTMLElement) || !viewport) {
      updateView(initialZoom, { x: 0, y: 0 });
      return;
    }
    const contentWidth = content.offsetWidth;
    const contentHeight = content.offsetHeight;
    if (contentWidth <= 0 || contentHeight <= 0) {
      updateView(initialZoom, { x: 0, y: 0 });
      return;
    }
    const fittedZoom = Math.min(
      (viewport.clientWidth - 32) / contentWidth,
      (viewport.clientHeight - 32) / contentHeight,
      maxZoom,
    );
    updateView(fittedZoom, { x: 0, y: 0 });
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const target = event.target;
    if (
      target instanceof Element &&
      target.closest("button, input, select, textarea, a, [data-no-canvas-pan]")
    ) {
      return;
    }
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      origin: { x: event.clientX, y: event.clientY },
      pan,
      pointerId: event.pointerId,
    };
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    updateView(zoom, {
      x: drag.pan.x + event.clientX - drag.origin.x,
      y: drag.pan.y + event.clientY - drag.origin.y,
    });
  }

  function stopPanning(event: PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const panByKey: Partial<Record<string, CanvasPoint>> = {
      ArrowDown: { x: pan.x, y: pan.y + panStep },
      ArrowLeft: { x: pan.x - panStep, y: pan.y },
      ArrowRight: { x: pan.x + panStep, y: pan.y },
      ArrowUp: { x: pan.x, y: pan.y - panStep },
    };
    const nextPan = panByKey[event.key];
    if (nextPan) {
      event.preventDefault();
      updateView(zoom, nextPan);
      return;
    }
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      updateView(zoom + zoomStep, pan);
    } else if (event.key === "-") {
      event.preventDefault();
      updateView(zoom - zoomStep, pan);
    } else if (event.key === "0") {
      event.preventDefault();
      fitToView();
    }
  }

  const canvasActions = (
    <TooltipProvider>
      <Stack align="center" direction="row" gap="xs">
        {actions}
        <CanvasAction
          label="Zoom out"
          onClick={() => updateView(zoom - zoomStep, pan)}
        >
          <Minus aria-hidden="true" />
        </CanvasAction>
        <span
          aria-live="polite"
          className="min-w-11 text-center font-mono text-[11px] text-muted-foreground"
        >
          {Math.round(zoom * 100)}%
        </span>
        <CanvasAction
          label="Zoom in"
          onClick={() => updateView(zoom + zoomStep, pan)}
        >
          <Plus aria-hidden="true" />
        </CanvasAction>
        <CanvasAction label="Fit to view" onClick={fitToView}>
          <Maximize2 aria-hidden="true" />
        </CanvasAction>
      </Stack>
    </TooltipProvider>
  );

  return (
    <WorkspaceSurface
      actions={canvasActions}
      className={className}
      purpose="preview"
      {...surfaceProps}
    >
      <OverlayStack
        base={
          <div
            aria-label={canvasLabel}
            className="grid h-full min-h-0 w-full touch-none place-items-center overflow-hidden bg-muted outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            onKeyDown={handleKeyDown}
            onLostPointerCapture={() => {
              dragRef.current = null;
            }}
            onPointerCancel={stopPanning}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={stopPanning}
            ref={viewportRef}
            role="region"
            tabIndex={0}
          >
            <div
              className="will-change-transform"
              ref={contentRef}
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: "center",
              }}
            >
              {children}
            </div>
          </div>
        }
        className="h-full flex-1"
        overlay={overlay}
        overlayPointerEvents={overlayPointerEvents}
      />
    </WorkspaceSurface>
  );
}

export type NavigatorSurfaceProps<Item> = Omit<
  WorkspaceSurfaceProps,
  "children" | "purpose" | "state"
> & {
  ariaLabel: string;
  emptyDescription?: ReactNode;
  getDescription?: (item: Item) => ReactNode;
  getIcon?: (item: Item) => ReactNode;
  getId: (item: Item) => string;
  getLabel: (item: Item) => ReactNode;
  items: readonly Item[];
  onSelect: (item: Item) => void;
  selectedId?: string;
};

function NavigatorSurface<Item>({
  ariaLabel,
  emptyDescription = "Nothing is available to navigate.",
  getDescription,
  getIcon,
  getId,
  getLabel,
  items,
  onSelect,
  selectedId,
  ...surfaceProps
}: NavigatorSurfaceProps<Item>) {
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = Math.max(
    0,
    items.findIndex((item) => getId(item) === selectedId),
  );

  function moveFocus(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    let nextIndex = index;
    if (event.key === "ArrowDown") nextIndex = Math.min(items.length - 1, index + 1);
    else if (event.key === "ArrowUp") nextIndex = Math.max(0, index - 1);
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = items.length - 1;
    else return;

    event.preventDefault();
    itemRefs.current[nextIndex]?.focus();
  }

  return (
    <WorkspaceSurface
      purpose="inspector"
      state={items.length === 0 ? "empty" : "ready"}
      stateDescription={emptyDescription}
      stateTitle="Nothing to navigate"
      {...surfaceProps}
    >
      <ScrollRegion accessibleName={ariaLabel} className="flex-1 p-2">
        <Stack gap="xs" role="list">
          {items.map((item, index) => {
            const id = getId(item);
            const selected = id === selectedId;
            return (
              <div key={id} role="listitem">
                <Button
                  aria-current={selected ? "true" : undefined}
                  className={cn(
                    "h-auto w-full justify-start px-3 py-2 text-left whitespace-normal",
                    selected ? "bg-accent text-primary" : undefined,
                  )}
                  onClick={() => onSelect(item)}
                  onKeyDown={(event) => moveFocus(event, index)}
                  ref={(node) => {
                    itemRefs.current[index] = node;
                  }}
                  tabIndex={index === selectedIndex ? 0 : -1}
                  type="button"
                  variant="ghost"
                >
                  {getIcon?.(item)}
                  <span className="min-w-0">
                    <span className="block truncate">{getLabel(item)}</span>
                    {getDescription ? (
                      <span className="mt-0.5 block truncate text-[11px] font-normal text-muted-foreground">
                        {getDescription(item)}
                      </span>
                    ) : null}
                  </span>
                </Button>
              </div>
            );
          })}
        </Stack>
      </ScrollRegion>
    </WorkspaceSurface>
  );
}

type GeneratedListProps<Item> = {
  getDescription?: (item: Item) => ReactNode;
  getId: (item: Item) => string;
  getLabel: (item: Item) => ReactNode;
  getValue: (item: Item) => ReactNode;
  items: readonly Item[];
  renderAction?: (item: Item, index: number) => ReactNode;
};

function GeneratedList<Item>({
  getDescription,
  getId,
  getLabel,
  getValue,
  items,
  renderAction,
}: GeneratedListProps<Item>) {
  return (
    <ScrollRegion accessibleName="Generated values" className="flex-1">
      <ol className="grid min-w-0 gap-2 p-4">
        {items.map((item, index) => (
          <li
            className="flex min-w-0 items-center gap-4 rounded-lg bg-muted/55 px-4 py-3"
            key={getId(item)}
          >
            <span className="shrink-0 font-mono text-xs text-muted-foreground">
              {getLabel(item)}
            </span>
            <div className="min-w-0 flex-1">
              <code className="break-words font-mono text-sm [overflow-wrap:anywhere]">
                {getValue(item)}
              </code>
              {getDescription ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {getDescription(item)}
                </p>
              ) : null}
            </div>
            {renderAction ? (
              <div className="shrink-0">{renderAction(item, index)}</div>
            ) : null}
          </li>
        ))}
      </ol>
    </ScrollRegion>
  );
}

export {
  CanvasSurface,
  CollectionSurface,
  FileIntakeSurface,
  FileQueueSurface,
  GeneratedList,
  NavigatorSurface,
  WorkspaceSurface,
};
