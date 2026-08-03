"use client";

/**
 * Per-page selection on the thumbnails, with each thumbnail showing the
 * rotation the run will apply to it.
 *
 * The selection is the `pages` setting and the angle is the `degrees` setting,
 * both edited through `onSettingChange`, so the settings panel and
 * `run.worker.ts` read the same values this surface shows.
 */

import { FileProcessorWorkspace } from "@/components/FileProcessorWorkspace";
import {
  PdfPagesSurface,
  pageExpression,
  selectedPageNumbers,
  usePdfPageImages,
} from "@/components/PdfPagesSurface";
import type { WorkspaceProps } from "@/components/ToolWorkspace";
import type { ToolPagePreview } from "@/lib/tool-framework/run";

const PAGES = "pages";

interface PagePickerProps {
  degrees: unknown;
  disabled: boolean;
  inspecting: boolean;
  onSettingChange: WorkspaceProps["onSettingChange"];
  previews: readonly ToolPagePreview[];
  value: unknown;
}

function PagePicker({
  degrees,
  disabled,
  inspecting,
  onSettingChange,
  previews,
  value,
}: PagePickerProps) {
  const images = usePdfPageImages(previews);
  const selected = selectedPageNumbers(value, images);
  const angle = typeof degrees === "string" ? degrees : "";

  return (
    <PdfPagesSurface
      description={`Selected pages are rotated${angle ? ` ${angle}°` : ""} clockwise.`}
      disabled={disabled}
      inspecting={inspecting}
      onToggle={(pageNumber) => {
        const next = new Set(selected);
        if (!next.delete(pageNumber)) next.add(pageNumber);
        onSettingChange(PAGES, pageExpression(next));
      }}
      pages={images}
      selected={selected}
      title="Pages to rotate"
    />
  );
}

export default function RotatePdfPagesWorkspace(props: WorkspaceProps) {
  return (
    <FileProcessorWorkspace
      {...props}
      detail={({ disabled, inspecting, previews }) => (
        <PagePicker
          degrees={props.settings.degrees}
          disabled={disabled}
          inspecting={inspecting}
          onSettingChange={props.onSettingChange}
          previews={previews}
          value={props.settings[PAGES]}
        />
      )}
    />
  );
}
