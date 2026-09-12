"use client";

import type { ReactNode } from "react";
import { Download, Maximize2 } from "lucide-react";
import { Button } from "#components/button";
import { cn } from "#lib/utils";

export interface MediaOutputCardProps {
  name: string;
  metadata: string;
  children: ReactNode;
  onPreview: () => void;
  onDownload: () => void;
  downloading?: boolean;
  error?: string;
  className?: string;
}

/** Image, file metadata and persistent per-file actions share one boundary. */
export function MediaOutputCard({ name, metadata, children, onPreview, onDownload, downloading, error, className }: MediaOutputCardProps) {
  return (
    <article className={cn("flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card", className)} data-slot="media-output-card">
      <Button variant="card-action" onClick={onPreview} aria-label={`Preview ${name}`} className="aspect-[4/3] h-auto w-full overflow-hidden border-b border-border bg-muted p-0">
        {children}
      </Button>
      <div className="flex min-w-0 items-center justify-between gap-2 px-3 py-2">
        <span className="truncate text-sm font-semibold" title={name}>{name}</span>
        <span className="shrink-0 text-xs text-muted-foreground">{metadata}</span>
      </div>
      <div className="grid grid-cols-2 divide-x divide-border border-t border-border">
        <Button variant="card-action" size="sm" onClick={onPreview} aria-label={`Open preview of ${name}`}>
          <Maximize2 aria-hidden="true" />Preview
        </Button>
        <Button variant="card-action" size="sm" onClick={onDownload} disabled={downloading} aria-label={`Download ${name}`}>
          <Download aria-hidden="true" />{downloading ? "Preparing…" : error ? "Retry" : "Download"}
        </Button>
      </div>
      {error && <p role="alert" className="px-3 py-2 text-xs text-destructive">{error}</p>}
    </article>
  );
}
