"use client";

import {
  AlertBanner,
  Button,
  Field,
  Input,
  SectionCard,
  SectionHeading,
} from "@smarttools/ui";
import { useActionState, type ReactElement } from "react";
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
  /** False when the deployment has no Cloudinary credentials. */
  readonly uploadsEnabled: boolean;
}

export function ToolIconPanel({
  iconRow,
  name,
  toolId,
  uploadsEnabled,
}: ToolIconPanelProps): ReactElement {
  const [uploadState, uploadAction, isUploading] = useActionState(
    uploadToolIconAction,
    IDLE,
  );
  const [removeState, removeAction, isRemoving] = useActionState(
    removeToolIconAction,
    IDLE,
  );
  const state = uploadState.status === "idle" ? removeState : uploadState;

  return (
    <SectionCard>
      <SectionHeading
        description="Uploads are signed and happen on the server. Without an icon the tool shows a generated identicon."
        title="Icon"
      />
      <div className="flex items-center gap-4">
        <span className="grid size-12 place-items-center rounded-lg border border-border bg-card">
          <ToolIcon name={name} row={iconRow} size={32} toolId={toolId} />
        </span>
        <span className="text-xs text-muted-foreground">
          {iconRow ? "Uploaded icon" : "Generated identicon"}
        </span>
      </div>

      {state.status !== "idle" ? (
        <AlertBanner variant={state.status === "success" ? "success" : "error"}>
          {state.message}
        </AlertBanner>
      ) : null}

      {uploadsEnabled ? (
        <form action={uploadAction} className="grid gap-4">
          <input name="toolId" type="hidden" value={toolId} />
          <Field
            description="PNG, JPG, or WebP, 1 MB or smaller. SVG is never accepted."
            htmlFor="tool-icon-file"
            label="Replace icon"
          >
            <Input
              accept="image/png,image/jpeg,image/webp"
              id="tool-icon-file"
              name="icon"
              required
              type="file"
            />
          </Field>
          <div className="flex flex-wrap items-center gap-2">
            <Button disabled={isUploading} type="submit">
              Upload icon
            </Button>
          </div>
        </form>
      ) : (
        <AlertBanner title="Icon uploads are disabled" variant="warning">
          This deployment has no Cloudinary credentials configured, so icons
          cannot be uploaded here. Existing icons and identicons still render.
        </AlertBanner>
      )}

      {iconRow ? (
        <form action={removeAction}>
          <input name="toolId" type="hidden" value={toolId} />
          <Button disabled={isRemoving} type="submit" variant="danger-subtle">
            Remove icon
          </Button>
        </form>
      ) : null}
    </SectionCard>
  );
}
