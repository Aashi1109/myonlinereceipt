"use client";

/**
 * The page-thumbnail surface, shared by every tool whose spec declares
 * `input.inspect`.
 *
 * Thumbnails arrive as bytes: the worker answers an `inspect` with page
 * geometry plus a transferred JPEG buffer per page (`ToolWorkerInspected`).
 * Nothing here renders a PDF — `pdfjs-dist` is worker-only, and importing the
 * renderer from the main thread is what this indirection exists to prevent.
 *
 * `ToolPagePreview` declares only the geometry; the worker forwards whatever
 * the renderer produced, so the image bytes are read defensively rather than
 * through a declared field, and a page whose bytes are missing is dropped.
 */

import { Button } from "@smarttools/ui";
import { OrderableList } from "@smarttools/ui/components/OrderableList";
import { GripVertical } from "lucide-react";
import { useEffect, useState, type ReactElement } from "react";

import { WorkspaceSurface } from "@/components/Surfaces";
import type { ToolPagePreview } from "@/lib/tool-framework/run";
import { parsePageSelection } from "@/lib/tool-framework/settings";

/** A rendered page: the declared geometry plus a blob URL for its thumbnail. */
export interface PdfPageImage {
  readonly pageHeight: number;
  readonly pageNumber: number;
  readonly pageWidth: number;
  readonly url: string;
}

const NO_IMAGES: readonly PdfPageImage[] = [];
/** The renderer's own thumbnail type, used when the message carries no MIME. */
const THUMBNAIL_MIME = "image/jpeg";

function read(value: unknown, key: string): unknown {
  return typeof value === "object" && value !== null && Object.hasOwn(value, key)
    ? (value as Record<string, unknown>)[key]
    : undefined;
}

function thumbnailBytes(preview: ToolPagePreview): ArrayBuffer | null {
  const buffer = read(preview, "buffer");
  return buffer instanceof ArrayBuffer ? buffer : null;
}

/**
 * Derived identity for the inspection: page geometry plus thumbnail size. The
 * byte length is part of it because two different documents can share their
 * page geometry exactly, and a stale thumbnail is worse than a re-render.
 */
function previewKey(preview: ToolPagePreview): string {
  return [
    preview.pageNumber,
    preview.pageWidth,
    preview.pageHeight,
    thumbnailBytes(preview)?.byteLength ?? 0,
  ].join(":");
}

function toPageImage(preview: ToolPagePreview): PdfPageImage | null {
  const buffer = thumbnailBytes(preview);
  if (!buffer) return null;
  const mime = read(preview, "mime");
  return {
    pageHeight: preview.pageHeight,
    pageNumber: preview.pageNumber,
    pageWidth: preview.pageWidth,
    url: URL.createObjectURL(
      new Blob([buffer], { type: typeof mime === "string" ? mime : THUMBNAIL_MIME }),
    ),
  };
}

/**
 * Turns page previews into blob URLs and owns their lifetime.
 *
 * Every URL created here is revoked when the inspection changes and when the
 * workspace unmounts — a page picker that is re-opened for file after file
 * would otherwise pin every thumbnail it has ever shown in memory.
 *
 * The effect keys on `previewsKey`, not on the array: `previews` is rebuilt by
 * the parent on every render, and an effect that both fires on that identity
 * and calls `setState` never settles.
 */
export function usePdfPageImages(
  previews: readonly ToolPagePreview[],
): readonly PdfPageImage[] {
  const [images, setImages] = useState<readonly PdfPageImage[]>(NO_IMAGES);
  const previewsKey = previews.map(previewKey).join("|");

  useEffect(() => {
    const next = previews.flatMap((preview) => {
      const image = toPageImage(preview);
      return image ? [image] : [];
    });
    setImages(next);
    return () => {
      for (const { url } of next) URL.revokeObjectURL(url);
    };
    // `previews` is read through `previewsKey`, which is what actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewsKey]);

  return images;
}

/** The expression a `pages` setting holds, whatever shape it was written in. */
function pageExpressionOf(value: unknown): string {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is number => typeof entry === "number").join(",");
  }
  return typeof value === "string" ? value : "";
}

/** The page numbers a `pages` setting selects, resolved against the previews. */
export function selectedPageNumbers(
  value: unknown,
  pages: readonly PdfPageImage[],
): ReadonlySet<number> {
  const available = pages.map(({ pageNumber }) => pageNumber);
  const parsed = parsePageSelection(pageExpressionOf(value), pages.length);
  if (parsed === "all") return new Set(available);
  const wanted = new Set(parsed);
  return new Set(available.filter((pageNumber) => wanted.has(pageNumber)));
}

/** The value to write back into a `pages` setting for an explicit selection. */
export function pageExpression(pageNumbers: Iterable<number>): string {
  return [...pageNumbers].sort((left, right) => left - right).join(",");
}

export interface PdfPagesSurfaceProps {
  description?: string;
  disabled?: boolean;
  /** True while an inspection is in flight, so the surface can say so. */
  inspecting: boolean;
  /** Pages that may not be toggled right now, with the reason as a label. */
  lockedPages?: ReadonlySet<number>;
  /** Supplied by tools whose output order is the page order shown here. */
  onOrderChange?: (pageNumbers: readonly number[]) => void;
  /** Supplied by tools that act on a subset of the pages. */
  onToggle?: (pageNumber: number) => void;
  /** Already in the order they should be shown in. */
  pages: readonly PdfPageImage[];
  selected?: ReadonlySet<number>;
  title: string;
}

const PAGE_CLASSES = "min-w-0 rounded-xl border border-border bg-background p-2";
const THUMBNAIL_CLASSES =
  "mx-auto max-h-44 w-auto rounded-md border border-border bg-white object-contain";
const GRID_CLASSES = "grid grid-cols-2 gap-3 sm:grid-cols-3";

function PageThumbnail({ page }: { page: PdfPageImage }): ReactElement {
  return (
    <img
      alt=""
      className={THUMBNAIL_CLASSES}
      src={page.url}
      style={{ aspectRatio: `${page.pageWidth} / ${page.pageHeight}` }}
    />
  );
}

export function PdfPagesSurface({
  description,
  disabled = false,
  inspecting,
  lockedPages,
  onOrderChange,
  onToggle,
  pages,
  selected,
  title,
}: PdfPagesSurfaceProps): ReactElement {
  return (
    <WorkspaceSurface
      className="min-h-0"
      contentClassName="p-4"
      description={description}
      purpose="preview"
      scroll="content"
      state={inspecting ? "loading" : pages.length > 0 ? "ready" : "empty"}
      stateDescription={
        inspecting
          ? "Rendering small previews in this browser. The document is not uploaded."
          : "Add a document to work with its pages."
      }
      stateTitle={inspecting ? "Preparing page previews" : "No pages yet"}
      title={title}
    >
      {onOrderChange ? (
        <OrderableList
          ariaLabel={title}
          className={GRID_CLASSES}
          disabled={disabled || pages.length < 2}
          getId={(page) => String(page.pageNumber)}
          getLabel={(page) => `Page ${page.pageNumber}`}
          items={pages}
          layout="grid"
          onReorder={(next) => onOrderChange(next.map(({ pageNumber }) => pageNumber))}
          renderItem={(page, orderable) => (
            <div
              className={`${PAGE_CLASSES} ${orderable.isDragging ? "shadow-lg ring-1 ring-primary/20" : ""}`}
            >
              <Button
                {...orderable.attributes}
                {...orderable.listeners}
                aria-label={`Drag page ${page.pageNumber} to reorder`}
                className="relative mb-2 size-8 cursor-grab touch-none text-muted-foreground before:absolute before:inset-[-6px] before:content-[''] active:cursor-grabbing disabled:cursor-not-allowed"
                disabled={orderable.disabled}
                ref={orderable.setActivatorNodeRef}
                size="icon"
                type="button"
                variant="ghost"
              >
                <GripVertical aria-hidden="true" className="size-4" />
              </Button>
              <PageThumbnail page={page} />
              <p className="mt-2 text-center text-xs font-bold">
                Page {page.pageNumber}
              </p>
            </div>
          )}
        />
      ) : (
        <ol aria-label={title} className={GRID_CLASSES}>
          {pages.map((page) => {
            const isSelected = selected?.has(page.pageNumber) ?? false;
            const locked = lockedPages?.has(page.pageNumber) ?? false;
            return (
              <li className={PAGE_CLASSES} key={page.pageNumber}>
                {onToggle ? (
                  <button
                    aria-label={`${isSelected ? "Deselect" : "Select"} page ${page.pageNumber}`}
                    aria-pressed={isSelected}
                    className="w-full rounded-lg p-1 text-center outline-none transition hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[selected=true]:bg-accent"
                    data-selected={isSelected}
                    disabled={disabled || locked}
                    onClick={() => onToggle(page.pageNumber)}
                    type="button"
                  >
                    <PageThumbnail page={page} />
                    <span className="mt-2 block text-xs font-bold">
                      Page {page.pageNumber}
                      {isSelected ? " · Selected" : ""}
                    </span>
                  </button>
                ) : (
                  <>
                    <PageThumbnail page={page} />
                    <p className="mt-2 text-center text-xs font-bold">
                      Page {page.pageNumber}
                    </p>
                  </>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </WorkspaceSurface>
  );
}
