"use client";

import { Alert, AlertDescription, AlertTitle, Button } from "@smarttools/ui";
import { GripVertical, Trash2, Upload } from "lucide-react";
import { useState } from "react";

import { SplitStack, Stack } from "@/components/Stacks";
import {
  CollectionSurface,
  FileIntakeSurface,
} from "@/components/Surfaces";
import {
  ResultSurface,
  SettingsSurface,
  validateFileSelection,
  workspaceFileId,
  type WorkspaceProps,
  WorkspaceInputSurface,
} from "@/components/workspaces/SourceResultWorkspace";

export function CollectionWorkspace(props: WorkspaceProps) {
  const [inputIssue, setInputIssue] = useState("");
  const settingsSurface = (
    <SettingsSurface
      disabled={props.disabled}
      onSettingChange={props.onSettingChange}
      settings={props.settings}
      spec={props.spec}
      title="Collection settings"
    />
  );
  const collection = props.spec.input.kind === "files" ? (
    <Stack className="h-full">
      <FileIntakeSurface
        accept={props.spec.input.accept}
        className="min-h-52 shrink-0 border-b border-border"
        disabled={props.disabled}
        intakeDescription="Add items, then drag them into the required order."
        intakeIcon={<Upload aria-hidden="true" />}
        intakeTitle={props.spec.input.label}
        maxFiles={Number.MAX_SAFE_INTEGER}
        multiple={props.spec.input.multiple}
        onFiles={(files) => {
          if (props.spec.input.kind !== "files") return;
          const selection = validateFileSelection(props.input.files, files, props.spec.input);
          setInputIssue(selection.issue);
          props.onInputChange({ ...props.input, files: selection.files });
        }}
        title="Add items"
      />
      {inputIssue ? (
        <Alert className="m-3" variant="destructive">
          <AlertTitle>Some files were not added</AlertTitle>
          <AlertDescription>{inputIssue}</AlertDescription>
        </Alert>
      ) : null}
      <CollectionSurface
        ariaLabel="Collection order"
        className="min-h-64 flex-1"
        disabled={props.disabled}
        getId={workspaceFileId}
        getLabel={(file) => file.name}
        items={props.input.files}
        onReorder={(files) => props.onInputChange({ ...props.input, files })}
        renderItem={(file, state) => (
          <div className="flex min-h-14 items-center gap-2 rounded-lg border border-border bg-card p-2">
            <Button
              aria-label={`Reorder ${file.name}`}
              disabled={state.disabled}
              ref={state.setActivatorNodeRef}
              size="icon"
              type="button"
              variant="ghost"
              {...state.attributes}
              {...state.listeners}
            >
              <GripVertical aria-hidden="true" />
            </Button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">{file.size.toLocaleString()} bytes</p>
            </div>
            <Button
              aria-label={`Remove ${file.name}`}
              disabled={props.disabled}
              onClick={() => props.onInputChange({ ...props.input, files: props.input.files.filter((entry) => entry !== file) })}
              size="icon"
              type="button"
              variant="ghost"
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </div>
        )}
        title="Arrange collection"
      />
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
    <SplitStack className="h-full" defaultSize={62} minSize={42}>
      {collection}
      <Stack className="h-full">
        {settingsSurface}
        <ResultSurface
          error={props.error}
          result={props.result}
          running={props.running}
          spec={props.spec}
          title="Collection output"
        />
      </Stack>
    </SplitStack>
  );
}
