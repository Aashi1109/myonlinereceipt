"use client";

import { FileProcessorWorkspace } from "@/components/FileProcessorWorkspace";
import { GeneratedPdfPreview } from "@/components/GeneratedPdfPreview";
import type { WorkspaceProps } from "@/components/ToolWorkspace";

export default function Workspace(props: WorkspaceProps) {
  const file = props.result?.render === "files" ? props.result.files[0] : undefined;
  return (
    <FileProcessorWorkspace
      {...props}
      orderFiles
      resultPreview={file ? <GeneratedPdfPreview definitionKey="image-to-pdf" file={file} key={file.id} /> : undefined}
    />
  );
}
