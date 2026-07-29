"use client";

import * as React from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";

import { cn } from "#lib/utils";

export interface Chapter {
  id: string;
  title: string;
  description?: React.ReactNode;
  meta?: React.ReactNode;
}

export interface ChapterScrubberProps {
  chapters: Chapter[];
  side?: "left" | "right";
  peakLength?: number;
  restLength?: number;
  rowHeight?: number;
  radius?: number;
  currentIndex?: number;
  onActiveChange?: (chapter: Chapter | null, index: number) => void;
  onSelect?: (chapter: Chapter, index: number) => void;
  label?: string;
  className?: string;
}

const CARD_MAX_WIDTH = 260;
const CARD_GAP = 20;
const POINTER_SPRING = { stiffness: 700, damping: 52, mass: 0.5 };
const STRENGTH_SPRING = { stiffness: 260, damping: 30, mass: 0.6 };

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function waveStrength(distance: number, radius: number) {
  if (distance >= radius) return 0;
  return 0.5 * (1 + Math.cos(Math.PI * (distance / radius)));
}

type ChapterTickProps = {
  current: boolean;
  index: number;
  peakLength: number;
  pointer: MotionValue<number>;
  radius: number;
  restLength: number;
  strength: MotionValue<number>;
};

const ChapterTick = React.memo(function ChapterTick({
  current,
  index,
  peakLength,
  pointer,
  radius,
  restLength,
  strength,
}: ChapterTickProps) {
  const width = useTransform(() => {
    const rise =
      strength.get() * waveStrength(Math.abs(index - pointer.get()), radius);
    return restLength + rise * (peakLength - restLength);
  });
  const opacity = useTransform(() => {
    const rise =
      strength.get() * waveStrength(Math.abs(index - pointer.get()), radius);
    const restingOpacity = current ? 0.72 : 0.48;
    return restingOpacity + rise * (1 - restingOpacity);
  });
  const scaleY = useTransform(() => {
    const rise =
      strength.get() * waveStrength(Math.abs(index - pointer.get()), radius);
    return 1 + rise * 0.4;
  });

  return (
    <motion.span
      aria-hidden="true"
      className={cn(
        "block h-0.5 rounded-full",
        current ? "bg-primary" : "bg-foreground",
      )}
      style={{ opacity, scaleY, width }}
    />
  );
});

export function ChapterScrubber({
  chapters,
  side = "right",
  peakLength = 56,
  restLength = 14,
  rowHeight = 24,
  radius = 4,
  currentIndex,
  onActiveChange,
  onSelect,
  label = "Chapters",
  className,
}: ChapterScrubberProps) {
  const prefersReducedMotion = useReducedMotion();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const cardRef = React.useRef<HTMLDivElement>(null);
  const buttonsRef = React.useRef<Array<HTMLButtonElement | null>>([]);
  const baseId = React.useId();

  const rawPointer = useMotionValue(0);
  const rawStrength = useMotionValue(0);
  const springPointer = useSpring(rawPointer, POINTER_SPRING);
  const springStrength = useSpring(rawStrength, STRENGTH_SPRING);
  const pointer = prefersReducedMotion ? rawPointer : springPointer;
  const strength = prefersReducedMotion ? rawStrength : springStrength;

  const [activeIndex, setActiveIndex] = React.useState(0);
  const [cardHeight, setCardHeight] = React.useState(0);
  const [cardMaxWidth, setCardMaxWidth] = React.useState(CARD_MAX_WIDTH);
  const [engaged, setEngaged] = React.useState(false);
  const [flipped, setFlipped] = React.useState(false);
  const activeRef = React.useRef(0);
  const focusedRef = React.useRef<number | null>(null);
  const hoveringRef = React.useRef(false);
  const lastPointerTypeRef = React.useRef<string | null>(null);
  const touchPreviewRef = React.useRef<number | null>(null);

  const lastIndex = chapters.length - 1;
  const optionId = (index: number) => `${baseId}-option-${index}`;
  const normalizedCurrentIndex =
    currentIndex === undefined || lastIndex < 0
      ? 0
      : clamp(currentIndex, 0, lastIndex);
  const rovingIndex = engaged
    ? clamp(activeIndex, 0, Math.max(lastIndex, 0))
    : normalizedCurrentIndex;

  const commitActive = React.useCallback((index: number) => {
    if (index === activeRef.current) return;
    activeRef.current = index;
    setActiveIndex(index);
  }, []);

  React.useEffect(() => {
    const activeChapter = engaged ? chapters[activeIndex] : undefined;
    onActiveChange?.(
      activeChapter ?? null,
      activeChapter ? activeIndex : -1,
    );
  }, [activeIndex, chapters, engaged, onActiveChange]);

  React.useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const measure = () => {
      setCardHeight(card.offsetHeight);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(card);
    return () => observer.disconnect();
  }, [activeIndex]);

  React.useEffect(() => {
    if (!engaged) return;
    const container = containerRef.current;
    if (!container) return;

    const view = container.ownerDocument.defaultView;
    const updatePlacement = () => {
      const rect = container.getBoundingClientRect();
      const viewportWidth = view?.innerWidth ?? 0;
      const rightSpace = viewportWidth - rect.right - CARD_GAP - 8;
      const leftSpace = rect.left - CARD_GAP - 8;
      let openRight = side === "right";

      if (
        openRight &&
        rightSpace < CARD_MAX_WIDTH &&
        leftSpace > rightSpace
      ) {
        openRight = false;
      } else if (
        !openRight &&
        leftSpace < CARD_MAX_WIDTH &&
        rightSpace > leftSpace
      ) {
        openRight = true;
      }

      const availableSpace = openRight ? rightSpace : leftSpace;
      setCardMaxWidth(clamp(availableSpace, 96, CARD_MAX_WIDTH));
      setFlipped(openRight !== (side === "right"));
    };

    updatePlacement();
    view?.addEventListener("resize", updatePlacement);
    const observer = new ResizeObserver(updatePlacement);
    observer.observe(container);
    return () => {
      view?.removeEventListener("resize", updatePlacement);
      observer.disconnect();
    };
  }, [activeIndex, engaged, side]);

  React.useEffect(() => {
    if (lastIndex < 0) {
      activeRef.current = 0;
      setActiveIndex(0);
      setEngaged(false);
      return;
    }
    if (activeRef.current > lastIndex) {
      activeRef.current = lastIndex;
      setActiveIndex(lastIndex);
    }
  }, [lastIndex]);

  const resolvedSide =
    side === "right"
      ? flipped
        ? "left"
        : "right"
      : flipped
        ? "right"
        : "left";
  const totalHeight = chapters.length * rowHeight;

  const cardTop = useTransform(pointer, (position) => {
    const halfHeight = cardHeight / 2;
    const center = clamp(
      (position + 0.5) * rowHeight,
      halfHeight,
      Math.max(halfHeight, totalHeight - halfHeight),
    );
    return center - halfHeight;
  });
  const cardScale = useTransform(strength, [0, 1], [0.97, 1]);
  const cardX = useTransform(
    strength,
    [0, 1],
    [resolvedSide === "right" ? -6 : 6, 0],
  );

  function engageAt(pointerRow: number, activeAt: number) {
    if (lastIndex < 0) return;
    rawPointer.set(pointerRow);
    rawStrength.set(1);
    commitActive(clamp(activeAt, 0, lastIndex));
    setEngaged(true);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const list = listRef.current;
    if (!list) return;

    const rect = list.getBoundingClientRect();
    const row = (event.clientY - rect.top) / rowHeight - 0.5;
    hoveringRef.current = true;
    engageAt(clamp(row, -0.5, lastIndex + 0.5), Math.round(row));
  }

  function handlePointerLeave() {
    hoveringRef.current = false;
    if (focusedRef.current !== null) {
      rawPointer.set(focusedRef.current);
      return;
    }
    rawStrength.set(0);
    setEngaged(false);
  }

  function handlePointerCancel(event: React.PointerEvent<HTMLDivElement>) {
    hoveringRef.current = false;
    focusedRef.current = null;
    lastPointerTypeRef.current = null;
    touchPreviewRef.current = null;
    rawStrength.set(0);
    setEngaged(false);
    if (event.target instanceof HTMLElement) event.target.blur();
  }

  function handleBlur(event: React.FocusEvent<HTMLDivElement>) {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    focusedRef.current = null;
    lastPointerTypeRef.current = null;
    touchPreviewRef.current = null;
    if (!hoveringRef.current) {
      rawStrength.set(0);
      setEngaged(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    let nextIndex = focusedRef.current ?? activeRef.current;

    switch (event.key) {
      case "Enter":
      case " ": {
        const chapter = chapters[nextIndex];
        if (!chapter) return;
        event.preventDefault();
        lastPointerTypeRef.current = null;
        touchPreviewRef.current = null;
        onSelect?.(chapter, nextIndex);
        return;
      }
      case "Escape":
        event.preventDefault();
        focusedRef.current = null;
        touchPreviewRef.current = null;
        rawStrength.set(0);
        setEngaged(false);
        if (event.target instanceof HTMLElement) event.target.blur();
        return;
      case "ArrowDown":
      case "ArrowRight":
        nextIndex = Math.min(lastIndex, nextIndex + 1);
        break;
      case "ArrowUp":
      case "ArrowLeft":
        nextIndex = Math.max(0, nextIndex - 1);
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = lastIndex;
        break;
      default:
        return;
    }

    event.preventDefault();
    buttonsRef.current[nextIndex]?.focus();
  }

  if (chapters.length === 0) {
    return (
      <div
        className={cn("text-sm text-muted-foreground", className)}
        data-slot="chapter-scrubber-empty"
        role="status"
      >
        No chapters available.
      </div>
    );
  }

  return (
    <div
      className={cn("relative", className)}
      data-slot="chapter-scrubber"
      ref={containerRef}
      style={{ width: peakLength }}
    >
      <div
        aria-activedescendant={
          engaged && chapters[activeIndex] ? optionId(activeIndex) : undefined
        }
        aria-label={label}
        aria-orientation="vertical"
        className="flex w-full flex-col"
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onPointerCancel={handlePointerCancel}
        onPointerLeave={handlePointerLeave}
        onPointerMove={handlePointerMove}
        ref={listRef}
        role="listbox"
      >
        {chapters.map((chapter, index) => {
          const current =
            currentIndex !== undefined && index === normalizedCurrentIndex;
          const description =
            typeof chapter.description === "string"
              ? `. ${chapter.description}`
              : "";

          return (
            <button
              aria-label={`${chapter.title}${description}`}
              aria-selected={current}
              className={cn(
                "flex w-full items-center rounded-sm outline-none",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                resolvedSide === "left" ? "justify-end" : "justify-start",
              )}
              id={optionId(index)}
              key={chapter.id}
              onClick={() => {
                if (
                  lastPointerTypeRef.current === "touch" &&
                  touchPreviewRef.current !== index
                ) {
                  touchPreviewRef.current = index;
                  engageAt(index, index);
                  return;
                }
                lastPointerTypeRef.current = null;
                touchPreviewRef.current = null;
                onSelect?.(chapter, index);
              }}
              onFocus={() => {
                focusedRef.current = index;
                engageAt(index, index);
              }}
              onPointerDown={(event) => {
                lastPointerTypeRef.current = event.pointerType;
                if (event.pointerType === "touch") engageAt(index, index);
              }}
              ref={(element) => {
                buttonsRef.current[index] = element;
              }}
              role="option"
              style={{ height: rowHeight }}
              tabIndex={index === rovingIndex ? 0 : -1}
              type="button"
            >
              <ChapterTick
                current={current}
                index={index}
                peakLength={peakLength}
                pointer={pointer}
                radius={radius}
                restLength={restLength}
                strength={strength}
              />
            </button>
          );
        })}
      </div>

      {chapters[activeIndex] ? (
        <motion.div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute z-10 rounded-xl border border-border bg-popover px-4 py-3.5 text-popover-foreground shadow-lg",
            resolvedSide === "right" ? "origin-left" : "origin-right",
          )}
          ref={cardRef}
          style={{
            opacity: strength,
            scale: cardScale,
            top: cardTop,
            width: cardMaxWidth,
            x: cardX,
            ...(resolvedSide === "right"
              ? { left: peakLength + CARD_GAP }
              : { right: peakLength + CARD_GAP }),
          }}
        >
          {chapters[activeIndex].meta ? (
            <div className="mb-1 font-caption text-xs font-semibold tabular-nums text-muted-foreground">
              {chapters[activeIndex].meta}
            </div>
          ) : null}
          <div className="break-words font-heading text-sm leading-snug font-semibold tracking-[-0.01em]">
            {chapters[activeIndex].title}
          </div>
          {chapters[activeIndex].description ? (
            <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
              {chapters[activeIndex].description}
            </p>
          ) : null}
        </motion.div>
      ) : null}
    </div>
  );
}
