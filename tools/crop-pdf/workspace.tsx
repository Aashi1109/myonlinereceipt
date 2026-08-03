"use client";

/**
 * Page selection plus a draggable crop box over the page it will apply to.
 *
 * Every value the frame edits is a setting — `pages`, `cropX`, `cropY`,
 * `cropWidth`, `cropHeight` — written through `onSettingChange`, so the
 * number fields in the settings panel and `run.worker.ts` see exactly what the
 * frame shows. `hooks.ts#onSettingsChanged` re-clamps the box against whatever
 * pages are selected, so no clamping is duplicated here.
 */

import {
  FileProcessorWorkspace,
} from "@/components/FileProcessorWorkspace";
import { CropFrame, type CropBox } from "@/components/CropFrame";
import {
  PdfPagesSurface,
  pageExpression,
  selectedPageNumbers,
  usePdfPageImages,
  type PdfPageImage,
} from "@/components/PdfPagesSurface";
import type { WorkspaceProps } from "@/components/ToolWorkspace";
import { Stack } from "@/components/Stacks";
import { WorkspaceSurface } from "@/components/Surfaces";
import type { ToolPagePreview } from "@/lib/tool-framework/run";

const PAGES = "pages";
const CROP_KEYS = {
  height: "cropHeight",
  width: "cropWidth",
  x: "cropX",
  y: "cropY",
} as const;

function pointsOf(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

interface CropPreviewProps {
  disabled: boolean;
  onSettingChange: WorkspaceProps["onSettingChange"];
  page: PdfPageImage;
  settings: WorkspaceProps["settings"];
}

function CropPreview({
  disabled,
  onSettingChange,
  page,
  settings,
}: CropPreviewProps) {
  const box: CropBox = {
    height: pointsOf(settings[CROP_KEYS.height], page.pageHeight),
    width: pointsOf(settings[CROP_KEYS.width], page.pageWidth),
    x: pointsOf(settings[CROP_KEYS.x], 0),
    y: pointsOf(settings[CROP_KEYS.y], 0),
  };

  return (
    <WorkspaceSurface
      className="min-h-0"
      contentClassName="place-items-center p-4"
      description="Drag the frame, or focus it and use the arrow keys."
      purpose="preview"
      title={`Crop preview · page ${page.pageNumber}`}
    >
      <div className="relative max-h-[340px] max-w-full overflow-hidden border border-border bg-white">
        <img
          alt={`Page ${page.pageNumber}`}
          className="block max-h-[340px] w-auto"
          src={page.url}
          style={{ aspectRatio: `${page.pageWidth} / ${page.pageHeight}` }}
        />
        <CropFrame
          bounds={{ height: page.pageHeight, width: page.pageWidth }}
          box={box}
          disabled={disabled}
          onChange={(next) => {
            for (const [axis, key] of Object.entries(CROP_KEYS)) {
              const value = next[axis as keyof CropBox];
              if (value !== box[axis as keyof CropBox]) onSettingChange(key, value);
            }
          }}
          originBottomLeft
        />
      </div>
    </WorkspaceSurface>
  );
}

interface CropSurfaceProps {
  disabled: boolean;
  inspecting: boolean;
  onSettingChange: WorkspaceProps["onSettingChange"];
  previews: readonly ToolPagePreview[];
  settings: WorkspaceProps["settings"];
}

function CropSurface({
  disabled,
  inspecting,
  onSettingChange,
  previews,
  settings,
}: CropSurfaceProps) {
  const images = usePdfPageImages(previews);
  const selected = selectedPageNumbers(settings[PAGES], images);
  // The box has to fit every selected page, so the smallest one is the honest
  // page to show it on.
  const previewPage = images
    .filter(({ pageNumber }) => selected.has(pageNumber))
    .reduce<PdfPageImage | undefined>(
      (smallest, page) =>
        !smallest ||
        page.pageWidth * page.pageHeight < smallest.pageWidth * smallest.pageHeight
          ? page
          : smallest,
      undefined,
    );

  return (
    <Stack className="h-full">
      <PdfPagesSurface
        description="Cropping changes the visible page box; hidden content may remain."
        disabled={disabled}
        inspecting={inspecting}
        onToggle={(pageNumber) => {
          const next = new Set(selected);
          if (!next.delete(pageNumber)) next.add(pageNumber);
          onSettingChange(PAGES, pageExpression(next));
        }}
        pages={images}
        selected={selected}
        title="Pages to crop"
      />
      {previewPage ? (
        <CropPreview
          disabled={disabled}
          onSettingChange={onSettingChange}
          page={previewPage}
          settings={settings}
        />
      ) : null}
    </Stack>
  );
}

export default function CropPdfWorkspace(props: WorkspaceProps) {
  return (
    <FileProcessorWorkspace
      {...props}
      detail={({ disabled, inspecting, previews }) => (
        <CropSurface
          disabled={disabled}
          inspecting={inspecting}
          onSettingChange={props.onSettingChange}
          previews={previews}
          settings={props.settings}
        />
      )}
    />
  );
}
