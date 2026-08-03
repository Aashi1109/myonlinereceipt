"use client";

import { AlertBanner, Button, Input } from "@smarttools/ui";
import { ImagePlus, Trash2, Upload } from "lucide-react";
import {
  useActionState,
  useEffect,
  useState,
  type ChangeEvent,
  type ReactElement,
} from "react";
import { ToolIcon } from "../../../../../../components/ToolIcon";
import type { ToolIconRow } from "../../../../../../lib/tool-framework/icons";
import {
  removeToolIconAction,
  uploadToolIconAction,
  type ToolContentActionState,
} from "../../actions";

const IDLE: ToolContentActionState = { status: "idle", message: "" };

export interface ToolIconPanelProps {
  readonly iconRow: ToolIconRow | null;
  readonly name: string;
  readonly toolId: string;
  readonly uploadsEnabled: boolean;
}

export function ToolIconPanel({
  iconRow,
  name,
  toolId,
  uploadsEnabled,
}: ToolIconPanelProps): ReactElement {
  const [uploadState, uploadAction, isUploading] = useActionState(uploadToolIconAction, IDLE);
  const [removeState, removeAction, isRemoving] = useActionState(removeToolIconAction, IDLE);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const state = uploadState.status === "idle" ? removeState : uploadState;

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function preview(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
    setFileName(file?.name ?? null);
  }

  return (
    <section className="grid gap-5">
      <div className="border-b border-border pb-5">
        <h2 className="font-heading text-xl font-semibold">Tool icon</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a square source. The catalog generates its display sizes automatically.
        </p>
      </div>

      {state.status !== "idle" ? (
        <AlertBanner variant={state.status === "success" ? "success" : "error"}>{state.message}</AlertBanner>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-[150px_minmax(0,1fr)]">
        <div className="grid content-start gap-2">
          <span className="grid aspect-square w-full place-items-center overflow-hidden rounded-xl border border-border bg-muted">
            {previewUrl ? (
              // This blob URL is local-only and exists solely for the selected-file preview.
              // eslint-disable-next-line @next/next/no-img-element
              <img alt="Selected icon preview" className="size-full object-cover" src={previewUrl} />
            ) : (
              <ToolIcon name={name} row={iconRow} size={72} toolId={toolId} />
            )}
          </span>
          <p className="text-center text-[11px] text-muted-foreground">
            {fileName ?? (iconRow ? "Uploaded icon" : "Generated identicon")}
          </p>
        </div>

        {uploadsEnabled ? (
          <form action={uploadAction} className="grid content-start gap-4">
            <input name="toolId" type="hidden" value={toolId} />
            <label className="group grid min-h-32 cursor-pointer place-items-center rounded-xl border border-dashed border-input bg-muted/40 p-5 text-center outline-none transition-colors hover:border-primary/45 hover:bg-accent focus-within:ring-2 focus-within:ring-ring">
              <span>
                <span className="mx-auto grid size-9 place-items-center rounded-lg bg-card text-primary"><ImagePlus aria-hidden="true" className="size-4" /></span>
                <span className="mt-2 block text-sm font-semibold">Choose a replacement icon</span>
                <span className="mt-1 block text-xs text-muted-foreground">PNG, JPG, or WebP · square recommended · 1 MB maximum</span>
              </span>
              <Input accept="image/png,image/jpeg,image/webp" className="sr-only" name="icon" onChange={preview} required type="file" />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button disabled={isUploading || !fileName} type="submit"><Upload aria-hidden="true" />{isUploading ? "Uploading…" : "Upload icon"}</Button>
            </div>
          </form>
        ) : (
          <AlertBanner title="Icon uploads are disabled" variant="warning">
            Configure Cloudinary credentials to enable uploads. Existing icons and generated identicons still render.
          </AlertBanner>
        )}
      </div>

      {iconRow ? (
        <form action={removeAction} className="border-t border-border pt-4">
          <input name="toolId" type="hidden" value={toolId} />
          <Button disabled={isRemoving} size="sm" type="submit" variant="danger-subtle"><Trash2 aria-hidden="true" />Remove uploaded icon</Button>
        </form>
      ) : null}
    </section>
  );
}
