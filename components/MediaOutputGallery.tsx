"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, MediaPreview } from "@smarttools/ui";
import { ArtifactDownloadButton, useFileDownload } from "@/components/ArtifactDownloadButton";
import { MediaOutputCard } from "@smarttools/ui/components/MediaOutputCard";
import { Minus, Plus } from "lucide-react";
import { readArtifact, type StoredToolArtifact } from "@/lib/tool-framework/artifacts";

function sizeLabel(bytes: number) {
  return bytes < 1_000_000 ? `${Math.round(bytes / 1000)} KB` : `${(bytes / 1_000_000).toFixed(1)} MB`;
}

function useImageFile(file: StoredToolArtifact, enabled: boolean) {
  const [url, setUrl] = useState<string>();
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    setUrl(undefined);
    setError(false);
    if (!enabled) return;
    let disposed = false;
    let objectUrl: string | undefined;
    void readArtifact(file).then((blob) => {
      if (disposed) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    }).catch(() => { if (!disposed) setError(true); });
    return () => {
      disposed = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file, enabled, attempt]);
  return { url, error, fail: () => setError(true), retry: () => setAttempt((value) => value + 1) };
}

function Thumbnail({ file, cover = false }: { file: StoredToolArtifact; cover?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const image = useImageFile(file, visible);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "200px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return (
    <span ref={ref} className="flex h-full w-full items-center justify-center overflow-hidden text-xs text-muted-foreground">
      {image.error ? "Preview unavailable" : image.url ? (
        <img src={image.url} alt="" draggable={false} decoding="async" onError={image.fail} className={`h-full w-full ${cover ? "object-cover" : "object-contain"}`} />
      ) : "Loading…"}
    </span>
  );
}

function OutputCard({ file, onPreview }: { file: StoredToolArtifact; onPreview: () => void }) {
  const { download, downloading, error } = useFileDownload(file);
  return <MediaOutputCard name={file.name} metadata={sizeLabel(file.size)} onPreview={onPreview} onDownload={() => void download()} downloading={downloading} error={error}><Thumbnail file={file} /></MediaOutputCard>;
}

function ImagePreviewDialog({ files, selected, onSelect, onClose }: {
  files: readonly StoredToolArtifact[]; selected: number; onSelect: (index: number) => void; onClose: () => void;
}) {
  const file = files[selected];
  const image = useImageFile(file, true);
  const viewport = useRef<HTMLDivElement | null>(null);
  const [viewportNode, setViewportNode] = useState<HTMLDivElement | null>(null);
  const attachViewport = useCallback((node: HTMLDivElement | null) => {
    viewport.current = node;
    setViewportNode(node);
  }, []);
  const activeThumbnail = useRef<HTMLButtonElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [area, setArea] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState<number | null>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const [panning, setPanning] = useState(false);
  useEffect(() => {
    setZoom(null);
    setDimensions({ width: 0, height: 0 });
    activeThumbnail.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [file.id]);
  useEffect(() => {
    const node = viewportNode;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setArea({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(node);
    return () => observer.disconnect();
  }, [viewportNode]);
  const fit = dimensions.width && dimensions.height ? Math.min(area.width / dimensions.width, area.height / dimensions.height) * 100 : 100;
  const scale = zoom ?? fit;
  function changeZoom(value: number | null) {
    setZoom(value === null ? null : Math.min(400, Math.max(10, value)));
    viewport.current?.scrollTo({ left: 0, top: 0 });
  }
  return (
    <MediaPreview open onOpenChange={(open) => { if (!open) onClose(); }} title={file.name}
      actions={<ArtifactDownloadButton file={file} key={file.id} />}
      description={`Generated image · ${selected + 1} of ${files.length} · ${sizeLabel(file.size)}`}
      status="Generated output · View only"
      hint="Zoom to inspect · Drag to pan"
      viewportClassName="relative overflow-hidden bg-transparent"
      controls={<>
        <Button variant="secondary" size="icon" aria-label="Zoom out" disabled={!image.url || image.error || scale <= 10} onClick={() => changeZoom(scale - 10)}><Minus aria-hidden="true" /></Button>
        <span className="min-w-12 text-center text-sm tabular-nums">{Math.round(scale)}%</span>
        <Button variant="secondary" size="icon" aria-label="Zoom in" disabled={!image.url || image.error || scale >= 400} onClick={() => changeZoom(scale + 10)}><Plus aria-hidden="true" /></Button>
        <Button variant="secondary" onClick={() => changeZoom(null)}>Fit to screen</Button>
        <Button variant="secondary" onClick={() => changeZoom(100)}>100%</Button>
      </>}
    >
      <div ref={attachViewport} className="flex h-full min-h-0 w-full overflow-auto" style={{ cursor: zoom !== null && scale > fit ? "grab" : undefined }}
        onPointerDown={(event) => {
          if (zoom === null || scale <= fit || event.button !== 0) return;
          const node = event.currentTarget;
          drag.current = { x: event.clientX, y: event.clientY, left: node.scrollLeft, top: node.scrollTop };
          node.setPointerCapture(event.pointerId);
          setPanning(true);
          event.preventDefault();
        }}
        onPointerMove={(event) => {
          if (!drag.current) return;
          event.currentTarget.scrollLeft = drag.current.left + drag.current.x - event.clientX;
          event.currentTarget.scrollTop = drag.current.top + drag.current.y - event.clientY;
        }}
        onPointerUp={() => { drag.current = null; setPanning(false); }}
        onPointerCancel={() => { drag.current = null; setPanning(false); }}
      >
        {image.error ? <div role="alert" className="m-auto text-center"><p>Preview unavailable. Retry or convert the source again.</p><Button variant="secondary" className="mt-3" onClick={image.retry}>Retry preview</Button></div> : image.url ? <img alt={file.name} src={image.url} draggable={false} onError={image.fail}
          onLoad={(event) => setDimensions({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
          className="m-auto max-w-none shrink-0 object-contain"
          style={dimensions.width ? { width: dimensions.width * scale / 100, height: dimensions.height * scale / 100 } : { maxWidth: "100%", maxHeight: "100%" }}
        /> : <p role="status" className="m-auto">Loading preview…</p>}
      </div>
      {files.length > 1 && <nav aria-label="Output images" className={`absolute bottom-4 left-4 flex max-h-[65%] max-w-[calc(100%-2rem)] gap-3 overflow-auto p-1 sm:top-1/2 sm:bottom-auto sm:max-w-none sm:-translate-y-1/2 sm:flex-col ${panning ? "opacity-0 pointer-events-none" : ""}`}>
        {files.map((entry, index) => <Button key={entry.id} ref={index === selected ? activeThumbnail : undefined} variant="secondary" aria-label={`Preview image ${index + 1}: ${entry.name}`} aria-current={index === selected ? "true" : undefined}
          className={`size-16 shrink-0 overflow-hidden p-0 sm:size-24 ${index === selected ? "ring-2 ring-primary ring-offset-2" : ""}`} onClick={() => onSelect(index)}>
          <Thumbnail file={entry} cover />
        </Button>)}
      </nav>}
    </MediaPreview>
  );
}

export function MediaOutputGallery({ files }: { files: readonly StoredToolArtifact[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  return <div className="flex min-h-0 flex-1 flex-col gap-3 p-4" data-slot="media-output-gallery">
    <p className="shrink-0 text-sm text-muted-foreground">{files.length} images · Preview or download individually.</p>
    <div role="region" aria-label="Generated image previews" tabIndex={0} className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-sm focus-visible:outline-2 focus-visible:outline-primary">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,13rem),1fr))] gap-4 pr-2">
        {files.map((file, index) => <OutputCard file={file} key={file.id} onPreview={() => setSelected(index)} />)}
      </div>
    </div>
    {selected !== null && files[selected] && <ImagePreviewDialog files={files} selected={selected} onSelect={setSelected} onClose={() => setSelected(null)} />}
  </div>;
}
