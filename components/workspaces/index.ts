import type { ToolLayout } from "@/lib/tool-framework/spec";
import type { ComponentType } from "react";

import { CollectionWorkspace } from "./CollectionWorkspace";
import { FileProcessorWorkspace } from "./FileProcessorWorkspace";
import { GeneratorWorkspace } from "./GeneratorWorkspace";
import {
  SourceResultWorkspace,
  type WorkspaceInputState,
  type WorkspaceProps,
} from "./SourceResultWorkspace";
import { VisualEditorWorkspace } from "./VisualEditorWorkspace";

export type { WorkspaceInputState, WorkspaceProps };
export {
  CollectionWorkspace,
  FileProcessorWorkspace,
  GeneratorWorkspace,
  SourceResultWorkspace,
  VisualEditorWorkspace,
};

export const DEFAULT_WORKSPACES: Record<
  ToolLayout,
  ComponentType<WorkspaceProps>
> = {
  collection: CollectionWorkspace,
  "file-processor": FileProcessorWorkspace,
  generator: GeneratorWorkspace,
  "source-result": SourceResultWorkspace,
  "visual-editor": VisualEditorWorkspace,
};
