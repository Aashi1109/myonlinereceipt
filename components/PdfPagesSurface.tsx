"use client";

/**
 * The page-thumbnail surface, shared by every tool whose spec declares
 * `input.inspect`.
 *
 * Inspection first returns geometry only. An IntersectionObserver then asks the
 * still-open worker session for JPEG bytes as cards approach the viewport.
 * Nothing here renders a PDF — `pdfjs-dist` is worker-only, and importing the
 * renderer from the main thread is what this indirection exists to prevent.
 *
 * `ToolPagePreview` declares only the geometry; the worker forwards whatever
 * the renderer produced, so the image bytes are read defensively rather than
 * through a declared field. Pages without bytes remain as loading placeholders.
 */

import { Button } from "@smarttools/ui";
import { OrderableList } from "@smarttools/ui/components/OrderableList";
import { GripVertical } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";

import { WorkspaceSurface } from "@/components/Surfaces";
import type { ToolPagePreview } from "@/lib/tool-framework/run";
import { PDF_THUMBNAIL_CACHE_SIZE } from "@/lib/tool-framework/limits";
import { parsePageSelection } from "@/lib/tool-framework/settings";

/** A rendered page: the declared geometry plus a blob URL for its thumbnail. */
export interface PdfPageImage {
  readonly pageHeight: number;
  readonly pageNumber: number;
  readonly pageWidth: number;
  readonly url?: string;
}

const NO_IMAGES: readonly PdfPageImage[] = [];
/** The renderer's own thumbnail type, used when the message carries no MIME. */
const THUMBNAIL_MIME = "image/jpeg";

const PdfInspectionContext = createContext<
  ((pageNumbers: readonly number[]) => void) | null
>(null);

export function PdfInspectionProvider({
  children,
  requestThumbnails,
}: {
  readonly children: ReactNode;
  readonly requestThumbnails: (pageNumbers: readonly number[]) => void;
}): ReactElement {
  return (
    <PdfInspectionContext.Provider value={requestThumbnails}>
      {children}
    </PdfInspectionContext.Provider>
  );
}

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
 * Turns transferred thumbnail buffers into a bounded cache of blob URLs. Page
 * geometry is never evicted, so every card remains navigable while at most 24
 * decoded/downloadable thumbnail blobs stay live on the main thread.
 */
export function usePdfPageImages(
  previews: readonly ToolPagePreview[],
): readonly PdfPageImage[] {
  const cacheRef = useRef(new Map<
    number,
    {
      readonly buffer: ArrayBuffer;
      readonly pageHeight: number;
      readonly pageWidth: number;
      readonly url: string;
    }
  >());
  const [, setRevision] = useState(0);

  const clearCache = useCallback(() => {
    for (const entry of cacheRef.current.values()) {
      URL.revokeObjectURL(entry.url);
    }
    cacheRef.current.clear();
  }, []);

  useEffect(() => {
    let changed = false;
    const previewByPage = new Map(
      previews.map((preview) => [preview.pageNumber, preview] as const),
    );
    for (const [pageNumber, entry] of cacheRef.current) {
      const preview = previewByPage.get(pageNumber);
      if (
        !preview ||
        !thumbnailBytes(preview) ||
        preview.pageWidth !== entry.pageWidth ||
        preview.pageHeight !== entry.pageHeight
      ) {
        URL.revokeObjectURL(entry.url);
        cacheRef.current.delete(pageNumber);
        changed = true;
      }
    }
    for (const preview of previews) {
      const buffer = thumbnailBytes(preview);
      if (!buffer) continue;
      const existing = cacheRef.current.get(preview.pageNumber);
      if (existing?.buffer === buffer) continue;
      if (existing) URL.revokeObjectURL(existing.url);
      const mime = read(preview, "mime");
      cacheRef.current.delete(preview.pageNumber);
      cacheRef.current.set(preview.pageNumber, {
        buffer,
        pageHeight: preview.pageHeight,
        pageWidth: preview.pageWidth,
        url: URL.createObjectURL(
          new Blob([buffer], {
            type: typeof mime === "string" ? mime : THUMBNAIL_MIME,
          }),
        ),
      });
      changed = true;
    }
    while (cacheRef.current.size > PDF_THUMBNAIL_CACHE_SIZE) {
      const oldest = cacheRef.current.entries().next().value as
        | [number, { readonly url: string }]
        | undefined;
      if (!oldest) break;
      URL.revokeObjectURL(oldest[1].url);
      cacheRef.current.delete(oldest[0]);
      changed = true;
    }
    if (changed) setRevision((revision) => revision + 1);
  }, [previews]);

  useEffect(() => clearCache, [clearCache]);

  if (previews.length === 0) return NO_IMAGES;
  return previews.map((preview) => ({
    pageHeight: preview.pageHeight,
    pageNumber: preview.pageNumber,
    pageWidth: preview.pageWidth,
    url: cacheRef.current.get(preview.pageNumber)?.url,
  }));
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

export function PageThumbnail({ page }: { page: PdfPageImage }): ReactElement {
  const requestThumbnails = useContext(PdfInspectionContext);
  const targetRef = useRef<HTMLImageElement | HTMLDivElement>(null);

  useEffect(() => {
    const target = targetRef.current;
    if (page.url || !target || !requestThumbnails) return;
    if (typeof IntersectionObserver === "undefined") {
      requestThumbnails([page.pageNumber]);
      return;
    }
    let retry: ReturnType<typeof setTimeout> | null = null;
    let nearViewport = false;
    const demand = () => {
      if (!nearViewport) return;
      requestThumbnails([page.pageNumber]);
      retry = setTimeout(demand, 250);
    };
    const observer = new IntersectionObserver(
      (entries) => {
        nearViewport = entries.some((entry) => entry.isIntersecting);
        if (retry !== null) clearTimeout(retry);
        retry = null;
        if (nearViewport) demand();
      },
      {
        root: target.closest<HTMLElement>("[data-slot=scroll-area-viewport]"),
        rootMargin: "600px 0px",
      },
    );
    observer.observe(target);
    return () => {
      nearViewport = false;
      if (retry !== null) clearTimeout(retry);
      observer.disconnect();
    };
  }, [page.pageNumber, page.url, requestThumbnails]);

  return page.url ? (
    <img
      alt=""
      className={THUMBNAIL_CLASSES}
      ref={(node) => {
        targetRef.current = node;
      }}
      src={page.url}
      style={{ aspectRatio: `${page.pageWidth} / ${page.pageHeight}` }}
    />
  ) : (
    <div
      aria-label={`Loading preview for page ${page.pageNumber}`}
      className={`${THUMBNAIL_CLASSES} grid min-h-28 place-items-center text-xs text-muted-foreground`}
      ref={(node) => {
        targetRef.current = node;
      }}
      style={{ aspectRatio: `${page.pageWidth} / ${page.pageHeight}` }}
    >
      Loading preview
    </div>
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
