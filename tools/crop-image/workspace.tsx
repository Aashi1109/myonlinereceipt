"use client";

/**
 * A draggable crop box over the source image.
 *
 * The box is the `cropX` / `cropY` / `cropWidth` / `cropHeight` settings, in
 * image pixels, written through `onSettingChange` — the number fields in the
 * settings panel and `run.worker.ts` read the same values the frame shows.
 * There is no page inspection here: the image is decoded by the browser from
 * an object URL, which the effect below revokes on every change.
 */

import {
  CropFrame,
  FileProcessorWorkspace,
  type CropBox,
} from "@/components/workspaces/FileProcessorWorkspace";
import {
  workspaceFileId,
  type WorkspaceProps,
} from "@/components/workspaces/SourceResultWorkspace";
import { WorkspaceSurface } from "@/components/Surfaces";
import { useCallback, useEffect, useState } from "react";

const ASPECT = "cropAspect";
const FREE = "free";
const CROP_KEYS = {
  height: "cropHeight",
  width: "cropWidth",
  x: "cropX",
  y: "cropY",
} as const;
const RATIOS: Readonly<Record<string, number>> = {
  "1:1": 1,
  "4:3": 4 / 3,
  "16:9": 16 / 9,
};

interface Size {
  readonly height: number;
  readonly width: number;
}

const NO_SIZE: Size = { height: 0, width: 0 };

function pixelsOf(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** Fits a box to the locked ratio, if any, without leaving the image. */
function applyAspect(box: CropBox, bounds: Size, ratio: number | undefined): CropBox {
  if (!ratio) return box;
  const height = Math.max(
    1,
    Math.min(Math.round(box.width / ratio), bounds.height - box.y),
  );
  return {
    height,
    width: Math.max(1, Math.min(Math.round(height * ratio), bounds.width - box.x)),
    x: box.x,
    y: box.y,
  };
}

/** An object URL for the picked image, revoked when the selection changes. */
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

interface CropPreviewProps {
  disabled: boolean;
  file: File | undefined;
  onSettingChange: WorkspaceProps["onSettingChange"];
  settings: WorkspaceProps["settings"];
}

function CropPreview({
  disabled,
  file,
  onSettingChange,
  settings,
}: CropPreviewProps) {
  const url = useImageUrl(file);
  const [size, setSize] = useState<Size>(NO_SIZE);
  const aspect = typeof settings[ASPECT] === "string" ? settings[ASPECT] : FREE;
  const ratio = RATIOS[aspect];
  const box: CropBox = {
    height: pixelsOf(settings[CROP_KEYS.height], 0),
    width: pixelsOf(settings[CROP_KEYS.width], 0),
    x: pixelsOf(settings[CROP_KEYS.x], 0),
    y: pixelsOf(settings[CROP_KEYS.y], 0),
  };

  const write = useCallback(
    (next: CropBox, current: CropBox) => {
      for (const [axis, key] of Object.entries(CROP_KEYS)) {
        const value = next[axis as keyof CropBox];
        if (value !== current[axis as keyof CropBox]) onSettingChange(key, value);
      }
    },
    [onSettingChange],
  );

  // Seeds the box once the image's real size is known, and re-fits it whenever
  // the ratio lock changes. Keyed on the size and the ratio alone: the writes
  // below change neither, so the effect settles after one pass.
  const sizeKey = `${size.width}x${size.height}:${aspect}`;
  useEffect(() => {
    if (size.width === 0 || size.height === 0) return;
    const seeded: CropBox =
      box.width > 0 && box.height > 0
        ? box
        : { height: size.height, width: size.width, x: 0, y: 0 };
    write(applyAspect(seeded, size, ratio), box);
    // The box is read, not depended on — depending on it would re-seed on
    // every drag.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sizeKey, write]);

  return (
    <WorkspaceSurface
      className="min-h-0"
      contentClassName="place-items-center p-4"
      description="Drag the frame, or focus it and use the arrow keys."
      purpose="preview"
      state={url ? "ready" : "empty"}
      stateDescription="Add an image to set its crop area."
      stateTitle="No image yet"
      title="Crop preview"
    >
      {url ? (
        <div className="relative inline-block max-w-full overflow-hidden bg-muted">
          <img
            alt="Crop preview"
            className="block max-h-[340px] max-w-full"
            onLoad={(event) =>
              setSize({
                height: event.currentTarget.naturalHeight,
                width: event.currentTarget.naturalWidth,
              })
            }
            src={url}
          />
          {size.width > 0 && size.height > 0 ? (
            <CropFrame
              bounds={size}
              box={box}
              disabled={disabled}
              onChange={(next) => write(applyAspect(next, size, ratio), box)}
            />
          ) : null}
        </div>
      ) : null}
    </WorkspaceSurface>
  );
}

export default function CropImageWorkspace(props: WorkspaceProps) {
  const { onSettingChange: change, settings } = props;
  // Typing a width or height directly releases the ratio lock, as the field's
  // own help text promises. The frame writes through the raw callback below,
  // so dragging a locked box does not release it.
  const onSettingChange = useCallback(
    (key: string, value: unknown) => {
      if (
        (key === CROP_KEYS.width || key === CROP_KEYS.height) &&
        settings[ASPECT] !== FREE
      ) {
        change(ASPECT, FREE);
      }
      change(key, value);
    },
    [change, settings],
  );

  return (
    <FileProcessorWorkspace
      {...props}
      detail={({ disabled }) => (
        <CropPreview
          disabled={disabled}
          file={props.input.files[0]}
          onSettingChange={props.onSettingChange}
          settings={props.settings}
        />
      )}
      onSettingChange={onSettingChange}
    />
  );
}
