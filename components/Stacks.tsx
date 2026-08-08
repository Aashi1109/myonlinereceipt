"use client";

import {
  Button,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  ScrollArea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  usePanelRef,
} from "@smarttools/ui";
import { cn } from "@smarttools/ui/lib/utils";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  SlidersHorizontal,
} from "lucide-react";
import {
  Children,
  type HTMLAttributes,
  type ReactNode,
  useEffect,
  useId,
  useState,
} from "react";

type StackDirection = "row" | "column";
type StackGap = "none" | "xs" | "sm" | "md" | "lg";
type StackAlignment = "start" | "center" | "end" | "stretch";
type StackJustification =
  | "start"
  | "center"
  | "end"
  | "between"
  | "around";

export type StackProps = HTMLAttributes<HTMLDivElement> & {
  align?: StackAlignment;
  direction?: StackDirection;
  gap?: StackGap;
  justify?: StackJustification;
  responsiveDirection?: StackDirection;
  wrap?: boolean;
};

const STACK_DIRECTION_CLASSES: Record<StackDirection, string> = {
  column: "flex-col",
  row: "flex-row",
};

const STACK_RESPONSIVE_DIRECTION_CLASSES: Record<StackDirection, string> = {
  column: "max-[64rem]:flex-col",
  row: "max-[64rem]:flex-row",
};

const STACK_GAP_CLASSES: Record<StackGap, string> = {
  lg: "gap-6",
  md: "gap-4",
  none: "gap-0",
  sm: "gap-2",
  xs: "gap-1",
};

const STACK_ALIGNMENT_CLASSES: Record<StackAlignment, string> = {
  center: "items-center",
  end: "items-end",
  start: "items-start",
  stretch: "items-stretch",
};

const STACK_JUSTIFICATION_CLASSES: Record<StackJustification, string> = {
  around: "justify-around",
  between: "justify-between",
  center: "justify-center",
  end: "justify-end",
  start: "justify-start",
};

function Stack({
  align = "stretch",
  className,
  direction = "column",
  gap = "none",
  justify = "start",
  responsiveDirection,
  wrap = false,
  ...props
}: StackProps) {
  return (
    <div
      className={cn(
        "flex min-h-0 min-w-0",
        STACK_DIRECTION_CLASSES[direction],
        STACK_GAP_CLASSES[gap],
        STACK_ALIGNMENT_CLASSES[align],
        STACK_JUSTIFICATION_CLASSES[justify],
        responsiveDirection
          ? STACK_RESPONSIVE_DIRECTION_CLASSES[responsiveDirection]
          : undefined,
        wrap ? "flex-wrap" : undefined,
        className,
      )}
      data-direction={direction}
      data-stack="flow"
      {...props}
    />
  );
}

type SplitOrientation = "horizontal" | "vertical";
type SplitCollapseSide = "primary" | "secondary";

export type SplitStackProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "children" | "onChange"
> & {
  children: ReactNode;
  collapseLabel?: string;
  collapseControlPosition?: "bottom" | "center" | "top";
  collapseSide?: SplitCollapseSide;
  collapsible?: boolean;
  defaultCollapsed?: SplitCollapseSide;
  defaultSize?: number;
  maxSize?: number;
  minSize?: number;
  onSizeChange?: (size: number) => void;
  orientation?: SplitOrientation;
  resizable?: boolean;
  storageKey?: string;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function useNarrowWorkbench() {
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 64rem)");
    const update = () => setNarrow(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return narrow;
}

function SplitStack({
  children,
  className,
  collapseLabel,
  collapseControlPosition = "center",
  collapseSide = "primary",
  collapsible = false,
  defaultCollapsed,
  defaultSize = 40,
  maxSize = 80,
  minSize = 20,
  onSizeChange,
  orientation = "horizontal",
  resizable = true,
  storageKey,
  style,
  ...props
}: SplitStackProps) {
  const panes = Children.toArray(children);
  const splitId = useId();
  const primaryPaneId = `${splitId}-primary`;
  const secondaryPaneId = `${splitId}-secondary`;
  const primaryPanelRef = usePanelRef();
  const secondaryPanelRef = usePanelRef();
  const [size, setSize] = useState(() =>
    clamp(defaultSize, minSize, maxSize),
  );
  const [collapsed, setCollapsed] = useState<SplitCollapseSide | null>(
    collapsible ? defaultCollapsed ?? null : null,
  );
  const narrow = useNarrowWorkbench();
  const stacked = orientation === "horizontal" && narrow;

  useEffect(() => {
    if (!storageKey || stacked) return;
    try {
      const storedValue = window.localStorage.getItem(storageKey);
      if (storedValue === null) return;
      const storedSize = Number(storedValue);
      if (!Number.isFinite(storedSize)) return;
      const normalized = clamp(storedSize, minSize, maxSize);
      primaryPanelRef.current?.resize(`${normalized}%`);
      setSize(normalized);
    } catch {
      // Ignore unavailable or blocked storage.
    }
  }, [maxSize, minSize, primaryPanelRef, stacked, storageKey]);

  function toggleCollapsedPane() {
    if (!collapsible) return;
    const panel =
      collapseSide === "primary" ? primaryPanelRef : secondaryPanelRef;
    if (panel.current?.isCollapsed()) {
      panel.current.expand();
      setCollapsed(null);
    } else {
      panel.current?.collapse();
      setCollapsed(collapseSide);
    }
  }

  const collapsedPanelLabel = `${collapsed ? "Restore" : "Collapse"} ${collapseLabel ?? `${collapseSide} panel`}`;
  const CollapseIcon =
    collapsed && collapseControlPosition !== "center"
      ? SlidersHorizontal
      : orientation === "horizontal"
        ? collapseSide === "primary"
        ? collapsed
          ? ChevronRight
          : ChevronLeft
        : collapsed
          ? ChevronLeft
          : ChevronRight
        : collapseSide === "primary"
          ? collapsed
            ? ChevronDown
            : ChevronUp
          : collapsed
            ? ChevronUp
            : ChevronDown;

  useEffect(() => {
    if (stacked) setCollapsed(null);
  }, [stacked]);

  if (stacked) {
    return (
      <div
        className={cn(
          "flex h-full min-h-0 min-w-0 flex-col overflow-x-hidden overflow-y-auto",
          className,
        )}
        data-orientation={orientation}
        data-stack="split"
        style={style}
        {...props}
      >
        <div
          className="min-w-0 shrink-0 overflow-visible"
          data-split-pane="primary"
          id={primaryPaneId}
        >
          {panes[0]}
        </div>
        <div
          className="min-w-0 shrink-0 overflow-visible"
          data-split-pane="secondary"
          id={secondaryPaneId}
        >
          {panes[1]}
        </div>
      </div>
    );
  }

  const collapseControlStyle =
    orientation === "horizontal"
      ? collapseControlPosition === "bottom"
        ? {
            left: "calc(100% - 1rem)",
            top: "calc(100% - 1rem)",
          }
        : {
            left:
              collapsed === "primary"
                ? "1rem"
                : collapsed === "secondary"
                  ? "calc(100% - 1rem)"
                  : `${size}%`,
            top: collapseControlPosition === "top" ? "4rem" : "50%",
          }
      : {
          left: "50%",
          top:
            collapsed === "primary"
              ? "1rem"
              : collapsed === "secondary"
                ? "calc(100% - 1rem)"
                : `${size}%`,
        };

  return (
    <div
      className={cn(
        "relative h-full min-h-0 min-w-0 overflow-hidden",
        className,
      )}
      data-collapsed={collapsed ?? undefined}
      data-orientation={orientation}
      data-stack="split"
      style={style}
      {...props}
    >
      <ResizablePanelGroup
        className="h-full min-h-0 min-w-0"
        disabled={!resizable}
        id={storageKey ?? splitId}
        onLayoutChanged={(layout, meta) => {
          const nextSize = layout[primaryPaneId];
          if (
            !Number.isFinite(nextSize) ||
            nextSize <= 0 ||
            nextSize >= 100
          ) {
            return;
          }
          setSize(nextSize);
          if (!meta.isUserInteraction) return;
          onSizeChange?.(nextSize);
          if (!storageKey) return;
          try {
            window.localStorage.setItem(storageKey, String(nextSize));
          } catch {
            // Persistence is optional; the shadcn resize interaction still works.
          }
        }}
        orientation={orientation}
        resizeTargetMinimumSize={{ coarse: 44, fine: 24 }}
      >
        <ResizablePanel
          aria-hidden={collapsed === "primary" || undefined}
          className="min-h-0 min-w-0 overflow-hidden"
          collapsible={collapsible && collapseSide === "primary"}
          collapsedSize="0%"
          data-split-pane="primary"
          defaultSize={collapsed === "secondary" ? "100%" : collapsed === "primary" ? "0%" : `${size}%`}
          disabled={!resizable}
          id={primaryPaneId}
          inert={collapsed === "primary" || undefined}
          maxSize={
            collapsible && collapseSide === "secondary"
              ? "100%"
              : `${maxSize}%`
          }
          minSize={`${minSize}%`}
          onResize={(panelSize) => {
            if (panelSize.asPercentage > 0) {
              setSize(panelSize.asPercentage);
              if (collapseSide === "primary") setCollapsed(null);
            } else if (collapseSide === "primary") {
              setCollapsed("primary");
            }
          }}
          panelRef={primaryPanelRef}
        >
          {panes[0]}
        </ResizablePanel>
        <ResizableHandle
          aria-label={
            orientation === "horizontal"
              ? "Resize workspace panels"
              : "Resize workspace regions"
          }
          className="z-20 focus-visible:ring-2"
          disabled={!resizable}
        />
        <ResizablePanel
          aria-hidden={collapsed === "secondary" || undefined}
          className="min-h-0 min-w-0 overflow-hidden"
          collapsible={collapsible && collapseSide === "secondary"}
          collapsedSize="0%"
          data-split-pane="secondary"
          defaultSize={collapsed === "primary" ? "100%" : collapsed === "secondary" ? "0%" : `${100 - size}%`}
          disabled={!resizable}
          id={secondaryPaneId}
          inert={collapsed === "secondary" || undefined}
          maxSize={
            collapsible && collapseSide === "primary"
              ? "100%"
              : `${100 - minSize}%`
          }
          minSize={`${100 - maxSize}%`}
          onResize={(panelSize) => {
            if (
              collapseSide === "secondary" &&
              panelSize.asPercentage <= 0
            ) {
              setCollapsed("secondary");
            } else if (collapseSide === "secondary") {
              setCollapsed(null);
            }
          }}
          panelRef={secondaryPanelRef}
        >
          {panes[1]}
        </ResizablePanel>
      </ResizablePanelGroup>
      {collapsible ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-controls={
                  collapseSide === "primary"
                    ? primaryPaneId
                    : secondaryPaneId
                }
                aria-label={collapsedPanelLabel}
                aria-expanded={collapsed !== collapseSide}
                className="absolute z-30 !size-8 -translate-x-1/2 -translate-y-1/2 shadow-sm"
                onClick={toggleCollapsedPane}
                size="icon-xs"
                style={collapseControlStyle}
                type="button"
                variant={collapsed ? "default" : "outline"}
              >
                <CollapseIcon aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{collapsedPanelLabel}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : null}
    </div>
  );
}

export type GridStackProps = HTMLAttributes<HTMLDivElement> & {
  columns?: number;
  gap?: StackGap;
  minItemWidth?: string;
};

function GridStack({
  className,
  columns,
  gap = "md",
  minItemWidth = "14rem",
  style,
  ...props
}: GridStackProps) {
  return (
    <div
      className={cn(
        "grid min-h-0 min-w-0",
        STACK_GAP_CLASSES[gap],
        className,
      )}
      data-stack="grid"
      style={{
        ...style,
        gridTemplateColumns: columns
          ? `repeat(${Math.max(1, columns)}, minmax(0, 1fr))`
          : `repeat(auto-fit, minmax(min(100%, ${minItemWidth}), 1fr))`,
      }}
      {...props}
    />
  );
}

export type OverlayStackProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> & {
  base: ReactNode;
  baseClassName?: string;
  overlay?: ReactNode;
  overlayClassName?: string;
  overlayPointerEvents?: "auto" | "none";
};

function OverlayStack({
  base,
  baseClassName,
  className,
  overlay,
  overlayClassName,
  overlayPointerEvents = "auto",
  ...props
}: OverlayStackProps) {
  return (
    <div
      className={cn("relative min-h-0 min-w-0 overflow-hidden", className)}
      data-stack="overlay"
      {...props}
    >
      <div className={cn("min-h-0 min-w-0", baseClassName)}>{base}</div>
      {overlay ? (
        <div
          className={cn(
            "absolute inset-0",
            overlayPointerEvents === "none"
              ? "pointer-events-none"
              : "pointer-events-auto",
            overlayClassName,
          )}
          data-overlay-layer="controls"
        >
          {overlay}
        </div>
      ) : null}
    </div>
  );
}

export type ScrollRegionProps = HTMLAttributes<HTMLDivElement> & {
  accessibleName?: string;
};

function ScrollRegion({
  accessibleName,
  children,
  className,
  tabIndex,
  ...props
}: ScrollRegionProps) {
  return (
    <ScrollArea
      className={cn("min-h-0 min-w-0", className)}
      data-stack="scroll-region"
      viewportClassName="overscroll-contain"
      viewportProps={{
        ...props,
        "aria-label": accessibleName,
        role: accessibleName ? "region" : undefined,
        tabIndex: tabIndex ?? (accessibleName ? 0 : undefined),
      }}
    >
      {children}
    </ScrollArea>
  );
}

export { GridStack, OverlayStack, ScrollRegion, SplitStack, Stack };
