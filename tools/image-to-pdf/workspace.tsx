"use client";

/**
 * The generic file-processor surface, plus the reorderable file list: One page per image, in this file order.
 * The order is `input.files` itself, which `run.worker.ts` reads directly.
 */

import {
  FileProcessorWorkspace,
} from "@/components/workspaces/FileProcessorWorkspace";
import type { WorkspaceProps } from "@/components/workspaces/SourceResultWorkspace";

export default function Workspace(props: WorkspaceProps) {
  return <FileProcessorWorkspace {...props} orderFiles />;
}
