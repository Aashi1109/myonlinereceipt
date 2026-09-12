"use client";

import { Button, MediaPreview, Muted, PdfViewer } from "@smarttools/ui";
import { useEffect, useRef, useState } from "react";

import { usePdfPageImages } from "@/components/PdfPagesSurface";
import { ArtifactDownloadButton } from "@/components/ArtifactDownloadButton";
import { WorkspaceSurface } from "@/components/Surfaces";
import { readArtifact, type StoredToolArtifact } from "@/lib/tool-framework/artifacts";
import { useToolRun } from "@/lib/tool-framework/useToolRun";
import { createToolRunFile } from "@/lib/tool-framework/workerProtocol";
import { PDF_PREVIEW_MAX_WIDTH } from "@/lib/tool-framework/limits";

export function GeneratedPdfPreview({ file, definitionKey }: {
  file: StoredToolArtifact;
  definitionKey: string;
}) {
  const { inspect, previews, requestThumbnails, state } = useToolRun();
  const pages = usePdfPageImages(previews);
  const [currentPage, setCurrentPage] = useState(1);
  const [failure, setFailure] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let current = true;
    setFailure("");
    void readArtifact(file).then((blob) => {
      if (!current) return;
      inspect({
        key: definitionKey,
        source: "output",
        file: createToolRunFile(file.id, new File([blob], file.name, { type: file.mime })),
        thumbnailWidth: 1200,
      });
    }).catch(() => {
      if (current) setFailure("The generated PDF could not be opened.");
    });
    return () => { current = false; };
  }, [file, definitionKey, inspect, attempt]);

  useEffect(() => {
    if (state.status === "completed") requestThumbnails([currentPage]);
  }, [currentPage, requestThumbnails, state.status, previews]);

  const error = failure || state.error?.message;
  const viewer = (onExpand?: () => void) => (
    <PdfViewer
      className={`min-w-0 w-full ${onExpand ? "h-[40rem]" : "h-full"}`}
      currentPage={currentPage}
      fileName={file.name}
      onExpand={onExpand}
      onPageChange={setCurrentPage}
      outline={pages.map((entry) => ({ id: `page-${entry.pageNumber}`, title: `Page ${entry.pageNumber}`, page: entry.pageNumber }))}
      pageCount={pages.length}
      pages={pages.map((page) => ({
        pageNumber: page.pageNumber,
        width: page.pageWidth,
        height: page.pageHeight,
        content: <GeneratedPage page={page} requestThumbnails={requestThumbnails} active={!onExpand || !expanded} />,
      }))}
      pagePreviewDetail={file.name}
      renderPagePreview={(pageNumber) => <PagePreview pageNumber={pageNumber} previews={pages} requestThumbnails={requestThumbnails} />}
    />
  );
  return (
    <WorkspaceSurface
      header="sr-only"
      purpose="preview"
      state={error ? "error" : pages.length ? "ready" : "loading"}
      stateAction={error ? <Button onClick={() => setAttempt((value) => value + 1)} variant="outline">Retry preview</Button> : undefined}
      stateDescription={error ? `${error} Retry the preview, or download the PDF from Processed output.` : undefined}
      stateTitle={error ? "Preview unavailable" : "Opening generated PDF…"}
      title="Generated PDF"
    >
      {viewer(() => setExpanded(true))}
      <MediaPreview
        open={expanded}
        onOpenChange={setExpanded}
        title={file.name}
        description={`Generated PDF · Page ${currentPage} of ${pages.length}`}
        actions={<ArtifactDownloadButton file={file} />}
        viewportClassName="bg-card p-0 text-foreground sm:p-0"
      >
        {viewer()}
      </MediaPreview>
    </WorkspaceSurface>
  );
}

function GeneratedPage({ page, requestThumbnails, active }: {
  page: ReturnType<typeof usePdfPageImages>[number];
  requestThumbnails: (pages: readonly number[], renderWidth?: number) => void;
  active: boolean;
}) {
  const element = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = element.current;
    if (!node || !active) return;
    let visible = false;
    const render = () => {
      if (!visible) return;
      const width = Math.min(PDF_PREVIEW_MAX_WIDTH, Math.ceil(node.getBoundingClientRect().width * window.devicePixelRatio / 64) * 64);
      if (width > 0 && (!page.url || width > (page.renderWidth ?? 0))) {
        requestThumbnails([page.pageNumber], width);
      }
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      render();
    }, { rootMargin: "200px" });
    const resize = new ResizeObserver(render);
    observer.observe(node);
    resize.observe(node);
    window.addEventListener("resize", render);
    return () => {
      observer.disconnect();
      resize.disconnect();
      window.removeEventListener("resize", render);
    };
  }, [active, page.pageNumber, page.url, page.renderWidth, requestThumbnails]);
  return (
    <div className="absolute inset-0" ref={element}>
      {page.url ? <img alt={`Generated PDF page ${page.pageNumber}`} className="h-full w-full object-contain" src={page.url} />
        : <Muted role="status">Rendering page {page.pageNumber}…</Muted>}
    </div>
  );
}

function PagePreview({ pageNumber, previews, requestThumbnails }: {
  pageNumber: number;
  previews: ReturnType<typeof usePdfPageImages>;
  requestThumbnails: (pages: readonly number[]) => void;
}) {
  useEffect(() => { requestThumbnails([pageNumber]); }, [pageNumber, requestThumbnails]);
  const page = previews.find((entry) => entry.pageNumber === pageNumber);
  return page?.url
    ? <img alt={`Page ${pageNumber}`} className="h-full w-full object-contain" src={page.url} />
    : <Muted role="status">Rendering page {pageNumber}…</Muted>;
}
