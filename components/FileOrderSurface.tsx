"use client";

import { Button, EmptyState } from "@smarttools/ui";
import { OrderableList } from "@smarttools/ui/components/OrderableList";
import { GripVertical } from "lucide-react";

import { workspaceFileId } from "@/components/FileInput";
import { WorkspaceSurface } from "@/components/Surfaces";
import type { WorkspaceProps } from "@/components/ToolWorkspace";

/**
 * Drag-to-reorder over the selected files, for the tools whose output follows
 * the input order. The order lives in `input.files` itself, so reordering is
 * an ordinary input change and the run sees it without a second channel.
 */
export function FileOrderSurface({
  disabled,
  input,
  onInputChange,
}: Pick<WorkspaceProps, "disabled" | "input" | "onInputChange">) {
  const files = input.files;
  return (
    <WorkspaceSurface
      className="min-h-0"
      contentClassName="p-3"
      description="Files are processed in this order."
      purpose="editor"
      scroll="content"
      title="File order"
    >
      {files.length > 1 ? (
        <OrderableList
          ariaLabel="File order"
          className="grid gap-2"
          disabled={disabled ?? false}
          getId={workspaceFileId}
          getLabel={(file) => file.name}
          items={files}
          onReorder={(nextFiles) =>
            onInputChange({ ...input, files: nextFiles })
          }
          renderItem={(file, orderable) => (
            <div
              className={`flex items-center gap-2 rounded-lg border border-border bg-background p-2 ${
                orderable.isDragging
                  ? "shadow-lg ring-1 ring-primary/20"
                  : ""
              }`}
            >
              <Button
                {...orderable.attributes}
                {...orderable.listeners}
                aria-label={`Drag ${file.name} to reorder`}
                className="relative size-8 shrink-0 cursor-grab touch-none text-muted-foreground before:absolute before:inset-[-6px] before:content-[''] active:cursor-grabbing disabled:cursor-not-allowed"
                disabled={orderable.disabled}
                ref={orderable.setActivatorNodeRef}
                size="icon"
                type="button"
                variant="ghost"
              >
                <GripVertical aria-hidden="true" className="size-4" />
              </Button>
              <p className="min-w-0 flex-1 truncate text-sm">{file.name}</p>
            </div>
          )}
        />
      ) : (
        <EmptyState
          description="Add two or more files to arrange them."
          icon={<GripVertical aria-hidden="true" />}
          title="Nothing to arrange yet"
        />
      )}
    </WorkspaceSurface>
  );
}

