"use client";

import { Alert, AlertDescription, AlertTitle, Button, Input, Label, Textarea } from "@smarttools/ui";
import { Eye, EyeOff, FileText, Trash2, Upload } from "lucide-react";
import { useId, useState } from "react";

import { ResultView } from "@/components/ResultView";
import { SettingsPanel } from "@/components/SettingsPanel";
import { SplitStack, Stack } from "@/components/Stacks";
import {
  FileIntakeSurface,
  FileQueueSurface,
  WorkspaceSurface,
} from "@/components/Surfaces";
import type { ToolResult } from "@/lib/tool-framework/result";
import type { ToolInputSpec, ToolSpec } from "@/lib/tool-framework/spec";

export interface WorkspaceInputState {
  readonly files: readonly File[];
  readonly secondary?: string;
  readonly text: string;
}

export interface WorkspaceProps {
  disabled?: boolean;
  error?: string;
  input: WorkspaceInputState;
  onInputChange: (input: WorkspaceInputState) => void;
  onSettingChange: (key: string, value: unknown) => void;
  /**
   * Reports the tool's own pre-run readiness (`tools/<key>/hooks.ts`
   * `validate`): `null` when the job may start, otherwise the reason it may
   * not. The owner of the primary action disables it while this is non-null;
   * the workspace also shows the reason next to the settings it refers to.
   *
   * Optional so the workspaces that run no hook stay unchanged.
   */
  onValidationChange?: (reason: string | null) => void;
  result: ToolResult | null;
  running?: boolean;
  settings: Readonly<Record<string, unknown>>;
  spec: ToolSpec;
}

export interface SettingsSurfaceProps {
  disabled?: boolean;
  onSettingChange: WorkspaceProps["onSettingChange"];
  settings: WorkspaceProps["settings"];
  spec: ToolSpec;
  title?: string;
}

export function SettingsSurface({
  disabled,
  onSettingChange,
  settings,
  spec,
  title = "Settings",
}: SettingsSurfaceProps) {
  const hasSettings = Object.keys(spec.settings.fields).length > 0;
  return (
    <WorkspaceSurface
      className="min-h-0"
      contentClassName="p-4"
      purpose="inspector"
      scroll="content"
      state={hasSettings ? "ready" : "empty"}
      stateDescription="This action has no configurable settings."
      stateTitle="No settings needed"
      title={title}
    >
      <SettingsPanel
        disabled={disabled}
        onChange={onSettingChange}
        spec={spec.settings}
        values={settings}
      />
    </WorkspaceSurface>
  );
}

export interface ResultSurfaceProps {
  error?: string;
  result: ToolResult | null;
  running?: boolean;
  spec: ToolSpec;
  title?: string;
}

export function ResultSurface({
  error,
  result,
  running = false,
  spec,
  title = "Result",
}: ResultSurfaceProps) {
  const state = error ? "error" : running ? "loading" : result ? "ready" : "empty";
  return (
    <WorkspaceSurface
      className="h-full"
      purpose="result"
      state={state}
      stateDescription={error ?? (running ? spec.labels.running : spec.labels.empty)}
      stateIcon={running ? <Upload aria-hidden="true" className="animate-pulse" /> : undefined}
      stateTitle={error ? "Unable to create the result" : running ? spec.labels.running : "Result will appear here"}
      title={title}
    >
      {result ? <ResultView result={result} /> : null}
    </WorkspaceSurface>
  );
}

interface InputSurfaceProps {
  disabled?: boolean;
  input: WorkspaceInputState;
  inputSpec: ToolInputSpec;
  onInputChange: WorkspaceProps["onInputChange"];
}

const FILE_IDS = new WeakMap<File, string>();

export function workspaceFileId(file: File): string {
  const existing = FILE_IDS.get(file);
  if (existing) return existing;
  const id = crypto.randomUUID();
  FILE_IDS.set(file, id);
  return id;
}

export interface FileSelectionResult {
  files: readonly File[];
  issue: string;
}

function acceptsFile(file: File, accept: string): boolean {
  const name = file.name.toLowerCase();
  const mime = file.type.toLowerCase();
  return accept.split(",").some((rawPattern) => {
    const pattern = rawPattern.trim().toLowerCase();
    if (!pattern) return false;
    if (pattern === "*/*") return true;
    if (pattern.startsWith(".")) return name.endsWith(pattern);
    if (pattern.endsWith("/*")) return mime.startsWith(pattern.slice(0, -1));
    return mime === pattern;
  });
}

export function validateFileSelection(
  current: readonly File[],
  incoming: readonly File[],
  inputSpec: Extract<ToolInputSpec, { kind: "files" }>,
): FileSelectionResult {
  const accepted: File[] = [];
  const issues: string[] = [];
  for (const file of incoming) {
    if (!acceptsFile(file, inputSpec.accept)) {
      issues.push(`${file.name} is not an accepted file type.`);
    } else if (inputSpec.maxBytes !== undefined && file.size > inputSpec.maxBytes) {
      issues.push(`${file.name} exceeds the ${inputSpec.maxBytes.toLocaleString()} byte limit.`);
    } else {
      accepted.push(file);
    }
  }
  const combined = inputSpec.multiple ? [...current, ...accepted] : accepted.slice(0, 1);
  const limit = inputSpec.maxFiles ?? combined.length;
  if (combined.length > limit) {
    issues.push(`Only ${limit} ${limit === 1 ? "file" : "files"} can be added.`);
  }
  return { files: combined.slice(0, limit), issue: issues.join(" ") };
}

export function WorkspaceInputSurface({
  disabled,
  input,
  inputSpec,
  onInputChange,
}: InputSurfaceProps) {
  const idPrefix = useId();
  const [inputIssue, setInputIssue] = useState("");
  const [revealedSecrets, setRevealedSecrets] = useState<Readonly<Record<string, boolean>>>({});
  switch (inputSpec.kind) {
    case "text": {
      const acceptedFile = inputSpec.acceptFiles;
      return (
        <WorkspaceSurface
          className="h-full"
          contentClassName="gap-4 p-4"
          purpose="source"
          title={inputSpec.label}
        >
          <div className="grid min-h-0 flex-1 gap-1.5">
            <Label className="sr-only" htmlFor={`${idPrefix}-primary`}>{inputSpec.label}</Label>
            <Textarea
              className="min-h-48 flex-1 resize-none font-mono"
              disabled={disabled}
              id={`${idPrefix}-primary`}
              maxLength={inputSpec.maxLength}
              onChange={(event) => onInputChange({ ...input, text: event.currentTarget.value })}
              placeholder={inputSpec.placeholder}
              value={input.text}
            />
          </div>
          {inputSpec.secondary ? (
            <div className="grid gap-1.5">
              <Label htmlFor={`${idPrefix}-secondary`}>{inputSpec.secondary.label}</Label>
              <Textarea
                className="min-h-28 resize-none font-mono"
                disabled={disabled}
                id={`${idPrefix}-secondary`}
                onChange={(event) => onInputChange({ ...input, secondary: event.currentTarget.value })}
                placeholder={inputSpec.secondary.placeholder}
                value={input.secondary ?? ""}
              />
            </div>
          ) : null}
          {acceptedFile ? (
            <div className="grid gap-1.5">
              <Label htmlFor={`${idPrefix}-file`}>Attach file</Label>
              <Input
                accept={acceptedFile.accept}
                disabled={disabled}
                id={`${idPrefix}-file`}
                onChange={(event) => {
                  const files = event.currentTarget.files;
                  const file = files?.[0];
                  if (!file) return;
                  if (file.size > acceptedFile.maxBytes) {
                    setInputIssue(`${file.name} exceeds the ${acceptedFile.maxBytes.toLocaleString()} byte limit.`);
                    return;
                  }
                  setInputIssue("");
                  onInputChange({ ...input, files: [file] });
                }}
                type="file"
              />
              {inputIssue ? <p className="text-xs text-destructive" role="alert">{inputIssue}</p> : null}
            </div>
          ) : null}
        </WorkspaceSurface>
      );
    }
    case "fields":
      return (
        <WorkspaceSurface
          className="h-full"
          contentClassName="gap-4 p-4"
          purpose="source"
          scroll="content"
          title={inputSpec.label}
        >
          {inputSpec.fields.map((field) => {
            const fieldId = `${idPrefix}-${field.channel}`;
            const value = field.channel === "text" ? input.text : input.secondary ?? "";
            const revealed = Boolean(revealedSecrets[field.channel]);
            const updateValue = (nextValue: string) => onInputChange({ ...input, [field.channel]: nextValue });
            return (
              <div className="grid gap-1.5" key={field.channel}>
                <Label htmlFor={fieldId}>{field.label}{field.required ? " (required)" : ""}</Label>
                <div className="flex items-start gap-2">
                  {field.multiline ? (
                    <Textarea
                      className="min-h-28 flex-1 font-mono"
                      disabled={disabled}
                      id={fieldId}
                      maxLength={field.maxLength}
                      onChange={(event) => updateValue(event.currentTarget.value)}
                      placeholder={field.secret && !revealed ? "Reveal to edit this protected value." : field.placeholder}
                      readOnly={field.secret && !revealed}
                      required={field.required}
                      value={field.secret && !revealed ? value.replace(/[^\n]/g, "•") : value}
                    />
                  ) : (
                    <Input
                      className="flex-1 font-mono"
                      disabled={disabled}
                      id={fieldId}
                      maxLength={field.maxLength}
                      onChange={(event) => updateValue(event.currentTarget.value)}
                      placeholder={field.placeholder}
                      required={field.required}
                      type={field.secret && !revealed ? "password" : "text"}
                      value={value}
                    />
                  )}
                  {field.secret ? (
                    <Button
                      aria-label={`${revealed ? "Hide" : "Show"} ${field.label}`}
                      disabled={disabled}
                      onClick={() => setRevealedSecrets((current) => ({ ...current, [field.channel]: !revealed }))}
                      size="icon"
                      type="button"
                      variant="outline"
                    >
                      {revealed ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </WorkspaceSurface>
      );
    case "files":
      return (
        <Stack className="h-full">
          <FileIntakeSurface
            accept={inputSpec.accept}
            className="min-h-64 flex-1 border-b border-border"
            disabled={disabled}
            intakeDescription={inputSpec.multiple ? "Drop files here or choose them from your device." : "Drop a file here or choose it from your device."}
            intakeIcon={<Upload aria-hidden="true" />}
            intakeTitle={inputSpec.label}
            maxFiles={Number.MAX_SAFE_INTEGER}
            multiple={inputSpec.multiple}
            onFiles={(files) => {
              const selection = validateFileSelection(input.files, files, inputSpec);
              setInputIssue(selection.issue);
              onInputChange({ ...input, files: selection.files });
            }}
            title={inputSpec.label}
          />
          {inputIssue ? (
            <Alert className="m-3" variant="destructive">
              <AlertTitle>Some files were not added</AlertTitle>
              <AlertDescription>{inputIssue}</AlertDescription>
            </Alert>
          ) : null}
          <FileQueueSurface
            className="min-h-48 flex-1"
            getIcon={() => <FileText aria-hidden="true" />}
            getId={workspaceFileId}
            getMetadata={(file) => `${file.type || "Unknown type"} · ${file.size.toLocaleString()} bytes`}
            getName={(file) => file.name}
            items={input.files}
            renderAction={(file) => (
              <Button
                aria-label={`Remove ${file.name}`}
                disabled={disabled}
                onClick={() => onInputChange({ ...input, files: input.files.filter((entry) => entry !== file) })}
                size="icon"
                type="button"
                variant="ghost"
              >
                <Trash2 aria-hidden="true" />
              </Button>
            )}
            title="Selected files"
          />
        </Stack>
      );
    case "none":
      // The tool reads no input channel — every value comes from its settings,
      // so there is deliberately no input surface to render.
      return null;
    default:
      return assertNoInputSurface(inputSpec);
  }
}

/**
 * Makes the switch above exhaustive: a new `ToolInputSpec` variant becomes a
 * compile error here rather than silently rendering a blank input pane.
 */
function assertNoInputSurface(inputSpec: never): never {
  throw new Error(
    `No input surface is registered for input kind ${JSON.stringify(inputSpec)}.`,
  );
}

export function SourceResultWorkspace(props: WorkspaceProps) {
  const settingsSurface = (
    <SettingsSurface
      disabled={props.disabled}
      onSettingChange={props.onSettingChange}
      settings={props.settings}
      spec={props.spec}
    />
  );
  const resultSurface = (
    <ResultSurface error={props.error} result={props.result} running={props.running} spec={props.spec} />
  );
  return (
    <SplitStack className="h-full" defaultSize={72} minSize={52}>
      <SplitStack className="h-full" defaultSize={50} minSize={30} orientation="vertical">
        <WorkspaceInputSurface
          disabled={props.disabled}
          input={props.input}
          inputSpec={props.spec.input}
          onInputChange={props.onInputChange}
        />
        {resultSurface}
      </SplitStack>
      {settingsSurface}
    </SplitStack>
  );
}
