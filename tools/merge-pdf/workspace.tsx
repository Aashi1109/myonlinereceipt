"use client";

/**
 * The generic file-processor surface, plus the reorderable file list: Pages are merged in this file order.
 * The order is `input.files` itself, which `run.worker.ts` reads directly.
 */

import {
  FileProcessorWorkspace,
} from "@/components/FileProcessorWorkspace";
import { GeneratedPdfPreview } from "@/components/GeneratedPdfPreview";
import type { WorkspaceProps } from "@/components/ToolWorkspace";

export default function Workspace(props: WorkspaceProps) {
  const file = props.result?.render === "files" ? props.result.files[0] : undefined;
  return (
    <FileProcessorWorkspace
      {...props}
      orderFiles
      resultPreview={file ? <GeneratedPdfPreview definitionKey="merge-pdf" file={file} key={file.id} /> : undefined}
    />
  );
}
