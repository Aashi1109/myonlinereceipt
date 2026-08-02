"use client";

import { Alert, AlertDescription, AlertTitle } from "@smarttools/ui";
import { FileText, Upload } from "lucide-react";
import { useEffect, useState } from "react";

import { SplitStack, Stack } from "@/components/Stacks";
import { CanvasSurface, FileIntakeSurface } from "@/components/Surfaces";
import {
  ResultSurface,
  SettingsSurface,
  validateFileSelection,
  type WorkspaceProps,
  WorkspaceInputSurface,
} from "@/components/workspaces/SourceResultWorkspace";

function useFilePreview(file: File | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const nextUrl = URL.createObjectURL(file);
    setUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);
  return url;
}

export function VisualEditorWorkspace(props: WorkspaceProps) {
  const [inputIssue, setInputIssue] = useState("");
  const firstFile = props.input.files[0];
  const previewUrl = useFilePreview(firstFile);
  const settingsSurface = (
    <SettingsSurface
      disabled={props.disabled}
      onSettingChange={props.onSettingChange}
      settings={props.settings}
      spec={props.spec}
      title="Editor settings"
    />
  );
  const editor = props.spec.input.kind === "files" ? (
    <Stack className="h-full">
      <FileIntakeSurface
        accept={props.spec.input.accept}
        className="min-h-48 shrink-0 border-b border-border"
        disabled={props.disabled}
        intakeDescription={firstFile ? "Choose another file to replace the current preview." : "Choose a file to open it on the preview canvas."}
        intakeIcon={<Upload aria-hidden="true" />}
        intakeTitle={props.spec.input.label}
        maxFiles={1}
        multiple={false}
        onFiles={(files) => {
          if (props.spec.input.kind !== "files") return;
          const selection = validateFileSelection([], files, props.spec.input);
          setInputIssue(selection.issue);
          props.onInputChange({ ...props.input, files: selection.files });
        }}
        title="Source"
      />
      {inputIssue ? (
        <Alert className="m-3" variant="destructive">
          <AlertTitle>File not added</AlertTitle>
          <AlertDescription>{inputIssue}</AlertDescription>
        </Alert>
      ) : null}
      <CanvasSurface
        canvasLabel={`${props.spec.input.label} canvas`}
        className="min-h-80 flex-1"
        title="Preview canvas"
      >
        {previewUrl && firstFile ? (
          props.spec.input.engine === "image" ? (
            <img
              alt={`Preview of ${firstFile.name}`}
              className="max-h-[70vh] max-w-[70vw] object-contain shadow-lg"
              src={previewUrl}
            />
          ) : (
            <object
              aria-label={`Preview of ${firstFile.name}`}
              className="h-[70vh] w-[min(70vw,56rem)] bg-white shadow-lg"
              data={previewUrl}
              type="application/pdf"
            >
              <div className="grid min-h-64 place-items-center gap-2 rounded-lg border border-border bg-card p-6 text-center">
                <FileText aria-hidden="true" className="size-8" />
                <p>{firstFile.name}</p>
              </div>
            </object>
          )
        ) : (
          <div className="grid min-h-64 min-w-64 place-items-center gap-2 rounded-lg border border-dashed border-border bg-card p-6 text-center text-muted-foreground">
            <FileText aria-hidden="true" className="size-8" />
            <p>Add a file to open the visual workspace.</p>
          </div>
        )}
      </CanvasSurface>
    </Stack>
  ) : (
    <WorkspaceInputSurface
      disabled={props.disabled}
      input={props.input}
      inputSpec={props.spec.input}
      onInputChange={props.onInputChange}
    />
  );
  return (
    <SplitStack className="h-full" defaultSize={68} minSize={45}>
      {editor}
      <Stack className="h-full">
        {settingsSurface}
        <ResultSurface
          error={props.error}
          result={props.result}
          running={props.running}
          spec={props.spec}
          title="Edited output"
        />
      </Stack>
    </SplitStack>
  );
}
