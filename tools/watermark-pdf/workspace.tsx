"use client";

/**
 * Page selection plus an approximate placement preview.
 *
 * The watermark image is the second input file — the spec already accepts two
 * files, so the generic intake picks it up and `run.worker.ts` reads it from
 * `input.files`; this surface only previews it. Everything else is a setting,
 * read here and edited through the settings panel.
 */

import { FileProcessorWorkspace } from "@/components/FileProcessorWorkspace";
import {
  PdfPagesSurface,
  pageExpression,
  selectedPageNumbers,
  usePdfPageImages,
  type PdfPageImage,
} from "@/components/PdfPagesSurface";
import { workspaceFileId } from "@/components/FileInput";
import { Stack } from "@/components/Stacks";
import { WorkspaceSurface } from "@/components/Surfaces";
import type { WorkspaceProps } from "@/components/ToolWorkspace";
import type { ToolPagePreview } from "@/lib/tool-framework/run";
import { useEffect, useState } from "react";

const PAGES = "pages";
const PDF_MIME = "application/pdf";
/** Fractional inset of the anchor row and column, matching the run's margin. */
const EDGE = "14%";
const CENTER = "50%";
const FAR_EDGE = "86%";

function textOf(value: unknown, fallback: string): string {
  return typeof value === "string" && value !== "" ? value : fallback;
}

function numberOf(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function anchor(position: string): { left: string; top: string } {
  const [vertical, horizontal] = position.split("-");
  return {
    left: horizontal === "left" ? EDGE : horizontal === "right" ? FAR_EDGE : CENTER,
    top: vertical === "top" ? EDGE : vertical === "bottom" ? FAR_EDGE : CENTER,
  };
}

/** An object URL for the picked watermark image, revoked when it changes. */
function useImageUrl(file: File | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  const fileKey = file ? `${workspaceFileId(file)}:${file.size}` : "";

  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
    // `file` is read through `fileKey`, which is what actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileKey]);

  return url;
}

interface PlacementPreviewProps {
  imageUrl: string | null;
  page: PdfPageImage;
  settings: WorkspaceProps["settings"];
}

function PlacementPreview({ imageUrl, page, settings }: PlacementPreviewProps) {
  const asImage = textOf(settings.watermarkKind, "text") === "image";
  const placement = anchor(textOf(settings.position, "bottom-center"));
  const opacity = Math.max(0.05, numberOf(settings.opacity, 25) / 100);
  const size = numberOf(settings.watermarkSize, 48);
  const rotation = numberOf(settings.watermarkRotation, -30);

  return (
    <WorkspaceSurface
      className="min-h-0"
      contentClassName="place-items-center p-4"
      description={`Approximate placement on page ${page.pageNumber}; the downloaded PDF is authoritative.`}
      purpose="preview"
      title="Watermark preview"
    >
      <div className="relative max-h-[340px] max-w-full overflow-hidden border border-border bg-white">
        <img
          alt={`Page ${page.pageNumber}`}
          className="block max-h-[340px] w-auto"
          src={page.url}
          style={{ aspectRatio: `${page.pageWidth} / ${page.pageHeight}` }}
        />
        {asImage && imageUrl ? (
          <img
            alt="Watermark"
            className="pointer-events-none absolute max-h-[45%] max-w-[45%] object-contain"
            src={imageUrl}
            style={{
              ...placement,
              opacity,
              transform: `translate(-50%, -50%) rotate(${rotation}deg) scale(${Math.max(0.1, size / 100)})`,
            }}
          />
        ) : (
          <span
            className="pointer-events-none absolute max-w-[85%] text-center font-bold text-foreground"
            style={{
              ...placement,
              fontSize: `${Math.max(12, size / 2)}px`,
              opacity,
              transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
            }}
          >
            {asImage
              ? "Add a JPG or PNG alongside the PDF"
              : textOf(settings.watermarkText, "DRAFT")}
          </span>
        )}
      </div>
    </WorkspaceSurface>
  );
}

interface WatermarkSurfaceProps {
  disabled: boolean;
  files: readonly File[];
  inspecting: boolean;
  onSettingChange: WorkspaceProps["onSettingChange"];
  previews: readonly ToolPagePreview[];
  settings: WorkspaceProps["settings"];
}

function WatermarkSurface({
  disabled,
  files,
  inspecting,
  onSettingChange,
  previews,
  settings,
}: WatermarkSurfaceProps) {
  const images = usePdfPageImages(previews);
  const selected = selectedPageNumbers(settings[PAGES], images);
  const imageUrl = useImageUrl(files.find((file) => file.type !== PDF_MIME));
  const previewPage = images.find(({ pageNumber }) => selected.has(pageNumber));

  return (
    <Stack className="h-full">
      <PdfPagesSurface
        description="Only the selected pages receive the watermark."
        disabled={disabled}
        inspecting={inspecting}
        onToggle={(pageNumber) => {
          const next = new Set(selected);
          if (!next.delete(pageNumber)) next.add(pageNumber);
          onSettingChange(PAGES, pageExpression(next));
        }}
        pages={images}
        selected={selected}
        title="Pages to watermark"
      />
      {previewPage ? (
        <PlacementPreview
          imageUrl={imageUrl}
          page={previewPage}
          settings={settings}
        />
      ) : null}
    </Stack>
  );
}

export default function WatermarkPdfWorkspace(props: WorkspaceProps) {
  return (
    <FileProcessorWorkspace
      {...props}
      detail={({ disabled, inspecting, previews }) => (
        <WatermarkSurface
          disabled={disabled}
          files={props.input.files}
          inspecting={inspecting}
          onSettingChange={props.onSettingChange}
          previews={previews}
          settings={props.settings}
        />
      )}
    />
  );
}
