"use client";

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Input,
  Label,
} from "@smarttools/ui";
import { ClipboardPaste, Eye, EyeOff, FileText, Trash2, Upload } from "lucide-react";
import {
  type TextareaHTMLAttributes,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  validateFileSelection,
  workspaceFileId,
} from "@/components/FileInput";
import { Stack } from "@/components/Stacks";
import {
  FileIntakeSurface,
  FileQueueSurface,
  WorkspaceSurface,
} from "@/components/Surfaces";
import type {
  WorkspaceInputState,
  WorkspaceProps,
} from "@/components/ToolWorkspace";
import type { ToolInputSpec } from "@/lib/tool-framework/spec";

interface InputSurfaceProps {
  disabled?: boolean;
  input: WorkspaceInputState;
  inputSpec: ToolInputSpec;
  onInputChange: WorkspaceProps["onInputChange"];
}

interface SourceTextareaProps extends Pick<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "aria-describedby" | "aria-invalid"
> {
  className: string;
  disabled?: boolean;
  gutter: boolean;
  id: string;
  maxLength?: number;
  onCaretChange?: (position: { readonly column: number; readonly line: number }) => void;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  required?: boolean;
  value: string;
}

function isCodeShaped(value: string): boolean {
  const trimmed = value.trim();
  const lines = trimmed.split(/\r\n?|\n/).filter(Boolean);
  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
    (value.includes("{") && value.includes("}") && /[:;]/.test(value)) ||
    /=>|<\/?[A-Za-z][^>]*>|;\s*$/m.test(value)
  ) return true;
  if (lines.length < 2) return false;

  const delimited = [",", "\t", "|"].some((delimiter) => {
    const counts = lines.map((line) => line.split(delimiter).length - 1);
    return counts[0] > 0 && counts.every((count) => count === counts[0]);
  });
  return delimited || lines.filter((line) => /^\s*[\w"'-]+\s*:\s*\S/.test(line)).length > 1;
}

function sourceMeta(value: string, codeShaped: boolean): string {
  const count = codeShaped ? new TextEncoder().encode(value).byteLength : value.length;
  return `${count} ${codeShaped ? "bytes" : count === 1 ? "character" : "characters"}`;
}

export function SourceTextarea({
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  className,
  disabled,
  gutter,
  id,
  maxLength,
  onCaretChange,
  onChange,
  placeholder,
  readOnly,
  required,
  value,
}: SourceTextareaProps) {
  const gutterRef = useRef<HTMLPreElement>(null);
  const reportCaret = (textarea: HTMLTextAreaElement) => {
    if (!onCaretChange) return;
    const valueBeforeCaret = textarea.value.slice(0, textarea.selectionStart);
    const lines = valueBeforeCaret.split(/\r\n?|\n/);
    onCaretChange({
      column: (lines.at(-1)?.length ?? 0) + 1,
      line: lines.length,
    });
  };
  const lineNumbers = useMemo(() => {
    const lineCount = (value.match(/\r\n|\r|\n/g)?.length ?? 0) + 1;
    return Array.from({ length: lineCount }, (_, index) => index + 1).join("\n");
  }, [value]);

  return (
    <div
      className={`${className} flex min-w-0 overflow-hidden ${gutter ? "bg-background pl-4 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/75 has-[:focus-visible]:ring-inset" : "rounded-lg border border-input bg-card has-[:focus-visible]:border-primary has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/20"}`}
    >
      {gutter ? (
        <div aria-hidden="true" className="w-[15px] min-w-max shrink-0 overflow-hidden text-right">
          <pre
            className="m-0 select-none py-[18px] font-mono text-xs leading-[1.55] text-muted-foreground will-change-transform"
            ref={gutterRef}
          >
            {lineNumbers}
          </pre>
        </div>
      ) : null}
      <textarea
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        autoCapitalize={gutter ? "off" : undefined}
        autoCorrect={gutter ? "off" : undefined}
        className={`${gutter ? "ml-[14px] pr-4" : "px-4"} min-h-0 min-w-0 flex-1 resize-none overflow-auto border-0 bg-transparent py-[18px] font-mono text-xs leading-[1.55] text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60`}
        disabled={disabled}
        id={id}
        maxLength={maxLength}
        onChange={(event) => {
          onChange(event.currentTarget.value);
          reportCaret(event.currentTarget);
        }}
        onFocus={(event) => reportCaret(event.currentTarget)}
        onSelect={(event) => reportCaret(event.currentTarget)}
        onScroll={(event) => {
          if (gutterRef.current) {
            gutterRef.current.style.transform = `translateY(-${event.currentTarget.scrollTop}px)`;
          }
        }}
        placeholder={placeholder}
        readOnly={readOnly}
        required={required}
        spellCheck={!gutter}
        value={value}
        wrap={gutter ? "off" : "soft"}
      />
    </div>
  );
}
export function WorkspaceInputSurface({
  disabled,
  input,
  inputSpec,
  onInputChange,
}: InputSurfaceProps) {
  const idPrefix = useId();
  const [inputIssue, setInputIssue] = useState("");
  const [pasteFailed, setPasteFailed] = useState(false);
  const [pastePending, setPastePending] = useState(false);
  const [pasteSupported, setPasteSupported] = useState(false);
  const [revealedSecrets, setRevealedSecrets] = useState<Readonly<Record<string, boolean>>>({});
  const inputRef = useRef(input);
  inputRef.current = input;
  useEffect(() => {
    setPasteSupported(typeof navigator !== "undefined" && typeof navigator.clipboard?.readText === "function");
  }, []);
  useEffect(() => setPasteFailed(false), [input.secondary, input.text]);

  const pastePrimaryInput = async (maxLength?: number) => {
    if (pastePending) return;
    setPasteFailed(false);
    setPastePending(true);
    try {
      const clipboard = navigator.clipboard;
      if (typeof clipboard?.readText !== "function") {
        setPasteSupported(false);
        return;
      }
      const text = await clipboard.readText();
      onInputChange({
        ...inputRef.current,
        text: maxLength === undefined ? text : text.slice(0, maxLength),
      });
    } catch {
      setPasteFailed(true);
    } finally {
      setPastePending(false);
    }
  };
  const pasteAction = (label: string, maxLength?: number) => pasteSupported ? (
    <Button
      aria-busy={pastePending || undefined}
      aria-label={pasteFailed ? `Paste into ${label} failed. Try again` : `Paste into ${label}`}
      aria-live="polite"
      disabled={disabled || pastePending}
      onClick={() => void pastePrimaryInput(maxLength)}
      size="xs"
      title={`Paste into ${label}`}
      type="button"
      variant="outline"
    >
      <ClipboardPaste aria-hidden="true" />
      {pastePending ? "Pasting…" : pasteFailed ? "Paste failed" : "Paste"}
    </Button>
  ) : null;
  switch (inputSpec.kind) {
    case "text": {
      const acceptedFile = inputSpec.acceptFiles;
      const codeShaped =
        isCodeShaped(input.text) || isCodeShaped(inputSpec.placeholder ?? "");
      return (
        <WorkspaceSurface
          actions={pasteAction(inputSpec.label, inputSpec.maxLength)}
          className="h-full"
          contentClassName={codeShaped ? "gap-4 bg-background" : "gap-4 bg-background p-4"}
          meta={sourceMeta(input.text, codeShaped)}
          purpose="source"
          title={inputSpec.label}
        >
          <div className="grid min-h-0 flex-1 gap-1.5">
            <Label className="sr-only" htmlFor={`${idPrefix}-primary`}>{inputSpec.label}</Label>
            <SourceTextarea
              className="min-h-48 flex-1"
              disabled={disabled}
              gutter={codeShaped}
              id={`${idPrefix}-primary`}
              maxLength={inputSpec.maxLength}
              onChange={(text) => onInputChange({ ...input, text })}
              placeholder={inputSpec.placeholder}
              value={input.text}
            />
          </div>
          {inputSpec.secondary ? (
            <div className="grid gap-1.5">
              <Label htmlFor={`${idPrefix}-secondary`}>{inputSpec.secondary.label}</Label>
              <SourceTextarea
                className="min-h-28"
                disabled={disabled}
                gutter={
                  isCodeShaped(input.secondary ?? "") ||
                  isCodeShaped(inputSpec.secondary.placeholder ?? "")
                }
                id={`${idPrefix}-secondary`}
                onChange={(secondary) => onInputChange({ ...input, secondary })}
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
    case "fields": {
      const primaryField = inputSpec.fields.find((field) => field.channel === "text");
      const values = inputSpec.fields.map((field) =>
        field.channel === "text" ? input.text : input.secondary ?? "",
      );
      const codeShaped = inputSpec.fields.some(
        (field, index) =>
          Boolean(field.multiline) &&
          (isCodeShaped(values[index]) || isCodeShaped(field.placeholder ?? "")),
      );
      return (
        <WorkspaceSurface
          actions={pasteAction(primaryField?.label ?? "primary input", primaryField?.maxLength)}
          className="h-full [&_[data-stack=scroll-region]]:bg-background"
          contentClassName={codeShaped ? "gap-4 bg-background" : "gap-4 bg-background p-4"}
          meta={sourceMeta(values.join(""), codeShaped)}
          purpose="source"
          scroll="content"
          title={inputSpec.label}
        >
          {inputSpec.fields.map((field) => {
            const fieldId = `${idPrefix}-${field.channel}`;
            const value = field.channel === "text" ? input.text : input.secondary ?? "";
            const fieldCodeShaped = Boolean(field.multiline) && (
              isCodeShaped(value) || isCodeShaped(field.placeholder ?? "")
            );
            const revealed = Boolean(revealedSecrets[field.channel]);
            const updateValue = (nextValue: string) => onInputChange({ ...input, [field.channel]: nextValue });
            return (
              <div
                className={`grid gap-1.5 ${codeShaped ? "first:pt-4 last:pb-4" : ""} ${codeShaped && !fieldCodeShaped ? "px-4" : ""}`}
                key={field.channel}
              >
                <Label className={fieldCodeShaped ? "px-4" : undefined} htmlFor={fieldId}>
                  {field.label}{field.required ? " (required)" : ""}
                </Label>
                <div className="flex items-start gap-2">
                  {field.multiline ? (
                    <SourceTextarea
                      className="min-h-28 flex-1"
                      disabled={disabled}
                      gutter={
                        isCodeShaped(value) ||
                        isCodeShaped(field.placeholder ?? "")
                      }
                      id={fieldId}
                      maxLength={field.maxLength}
                      onChange={updateValue}
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
                      className="border-0 bg-transparent p-1.5 hover:bg-transparent"
                      disabled={disabled}
                      onClick={() => setRevealedSecrets((current) => ({ ...current, [field.channel]: !revealed }))}
                      size="icon"
                      style={{ height: 44, width: 44 }}
                      type="button"
                      variant="ghost"
                    >
                      <span className="grid size-8 place-items-center rounded-lg border border-input bg-card hover:bg-muted">
                        {revealed ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                      </span>
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </WorkspaceSurface>
      );
    }
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
