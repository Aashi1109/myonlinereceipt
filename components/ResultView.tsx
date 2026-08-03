"use client";

import {
  AlertBanner,
  Button,
  DownloadResult,
  EmptyState,
  MetricCard,
  SectionHeading,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@smarttools/ui";
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { DiffView } from "@/components/DiffView";
import { JsonResultRenderer } from "@/components/JsonResultRenderer";
import { SandboxedHtmlPreview } from "@/components/SandboxedHtmlPreview";
import { GeneratedListSurface } from "@/components/Surfaces";
import type {
  ToolRender,
  ToolRenderKind,
  ToolResult,
} from "@/lib/tool-framework/result";

export interface ResultViewProps {
  result: ToolResult;
}

type ResultRendererRegistry = {
  [Kind in ToolRenderKind]: (
    result: Extract<ToolRender, { render: Kind }>,
  ) => ReactNode;
};

interface DownloadButtonProps {
  content: BlobPart;
  label?: string;
  mime: string;
  name: string;
  variant?: "link" | "outline";
}

interface CopyButtonProps {
  content: string;
  iconOnly?: boolean;
  label?: string;
  variant?: "link" | "outline";
}

function saveBlob(content: BlobPart, mime: string, name: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const link = document.createElement("a");
  link.download = name;
  link.href = url;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function DownloadButton({
  content,
  label = "Download",
  mime,
  name,
  variant = "link",
}: DownloadButtonProps) {
  return (
    <Button
      className={variant === "link" ? "px-2 text-xs" : undefined}
      onClick={() => saveBlob(content, mime, name)}
      type="button"
      variant={variant}
    >
      {variant === "outline" ? <Download aria-hidden="true" /> : null}
      {label}
    </Button>
  );
}

function CopyButton({
  content,
  iconOnly = false,
  label = "Copy",
  variant = iconOnly ? "outline" : "link",
}: CopyButtonProps) {
  const [feedback, setFeedback] = useState<{
    content: string;
    status: "copied" | "failed";
  } | null>(null);
  const contentRef = useRef(content);
  const copyRequest = useRef(0);
  const resetTimeout = useRef<number | undefined>(undefined);
  contentRef.current = content;

  useEffect(() => () => {
    copyRequest.current += 1;
    window.clearTimeout(resetTimeout.current);
  }, []);

  async function copy() {
    const request = ++copyRequest.current;
    const copiedContent = content;
    window.clearTimeout(resetTimeout.current);
    setFeedback(null);
    try {
      await navigator.clipboard.writeText(copiedContent);
      if (request !== copyRequest.current || copiedContent !== contentRef.current) return;
      setFeedback({ content: copiedContent, status: "copied" });
      resetTimeout.current = window.setTimeout(() => setFeedback(null), 2_000);
    } catch {
      if (request !== copyRequest.current || copiedContent !== contentRef.current) return;
      setFeedback({ content: copiedContent, status: "failed" });
    }
  }

  const status = feedback?.content === content ? feedback.status : "idle";
  const statusLabel = status === "copied"
    ? "Copied"
    : status === "failed"
      ? "Copy failed — try again"
      : label;
  const StatusIcon = status === "copied"
    ? Check
    : status === "failed"
      ? AlertTriangle
      : Copy;

  return (
    <Button
      aria-label={iconOnly ? statusLabel : undefined}
      className={variant === "link" ? (iconOnly ? "[&_svg]:size-4" : "px-2 text-xs") : undefined}
      onClick={() => void copy()}
      size={iconOnly ? "icon" : undefined}
      title={iconOnly ? statusLabel : undefined}
      type="button"
      variant={variant}
    >
      {iconOnly ? <StatusIcon aria-hidden="true" /> : null}
      <span aria-live="polite" className={iconOnly ? "sr-only" : undefined}>{statusLabel}</span>
    </Button>
  );
}

function RenderFrame({ actions, children }: { actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {actions ? <div className="flex shrink-0 justify-end px-4">{actions}</div> : null}
      {children}
    </div>
  );
}

function csvCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

const RESULT_RENDERERS: ResultRendererRegistry = {
  text: (result) => (
    <RenderFrame
      actions={(
        <>
          <CopyButton content={result.text} />
          {result.downloadName ? <DownloadButton content={result.text} mime="text/plain;charset=utf-8" name={result.downloadName} /> : null}
        </>
      )}
    >
      <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-sm leading-6">{result.text}</pre>
    </RenderFrame>
  ),
  code: (result) => (
    <RenderFrame
      actions={(
        <>
          <CopyButton content={result.code} />
          {result.downloadName ? <DownloadButton content={result.code} mime="text/plain;charset=utf-8" name={result.downloadName} /> : null}
        </>
      )}
    >
      <pre className="min-h-0 flex-1 overflow-auto bg-muted/45 p-4 font-mono text-xs leading-6"><code data-language={result.language}>{result.code}</code></pre>
    </RenderFrame>
  ),
  "json-tree": (result) => {
    const json = result.text ?? JSON.stringify(result.value, null, 2)!;
    return (
      <JsonResultRenderer
        className="h-full"
        defaultOpenDepth={1}
        downloadName="result.json"
        formattedValue={json}
        maxVisibleEntries={1_000}
        value={result.value}
      />
    );
  },
  table: (result) => {
    const csv = [result.columns, ...result.rows]
      .map((row) => row.map(csvCell).join(","))
      .join("\n");
    return (
      <RenderFrame
        actions={(
          <>
            <CopyButton content={csv} label={result.truncated ? "Copy shown rows" : "Copy"} />
            {result.downloadName ? <DownloadButton content={csv} label={result.truncated ? "Download shown rows" : "Download"} mime="text/csv;charset=utf-8" name={result.downloadName} /> : null}
          </>
        )}
      >
        <div className="min-h-0 flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>{result.columns.map((column, index) => <TableHead key={`${index}-${column}`}>{column}</TableHead>)}</TableRow>
            </TableHeader>
            <TableBody>
              {result.rows.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {result.columns.map((_, columnIndex) => <TableCell key={columnIndex}>{row[columnIndex] ?? ""}</TableCell>)}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {result.truncated ? <p className="border-t border-border p-3 text-xs text-muted-foreground">Only part of the result is shown.</p> : null}
        </div>
      </RenderFrame>
    );
  },
  "key-value": (result) => {
    const text = result.entries
      .map((entry) => `${entry.label}: ${entry.value}`)
      .join("\n");
    return (
      <RenderFrame actions={<CopyButton content={text} label="Copy all" />}>
        <dl className="min-h-0 flex-1 divide-y divide-border overflow-auto">
          {result.entries.map((entry) => (
            <div className="grid grid-cols-[minmax(8rem,0.4fr)_minmax(0,1fr)_auto] items-center gap-4 px-4 py-3" key={`${entry.label}-${entry.value}`}>
              <dt className="text-sm font-medium">{entry.label}</dt>
              <dd className="break-words font-mono text-sm text-muted-foreground">{entry.value}</dd>
              <CopyButton content={entry.value} iconOnly label={`Copy ${entry.label}`} />
            </div>
          ))}
        </dl>
      </RenderFrame>
    );
  },
  list: (result) => {
    const text = result.items.join("\n");
    const items = result.items.map((value, index) => ({
      description: result.labels?.[index],
      id: `${index}-${value}`,
      label: String(index + 1).padStart(2, "0"),
      value,
    }));
    return (
      <GeneratedListSurface
        actions={(
          <>
            <CopyButton content={text} label="Copy all" />
            {result.downloadName ? <DownloadButton content={text} mime="text/plain;charset=utf-8" name={result.downloadName} /> : null}
          </>
        )}
        className="min-h-0 flex-1"
        getDescription={(item) => item.description}
        getId={(item) => item.id}
        getLabel={(item) => item.label}
        getValue={(item) => item.value}
        items={items}
        renderAction={(item, index) => (
          <CopyButton content={item.value} iconOnly label={`Copy item ${index + 1}`} />
        )}
        title="Result summary"
      />
    );
  },
  html: (result) => (
    <RenderFrame
      actions={(
        <>
          <CopyButton content={result.html} />
          {result.downloadName ? <DownloadButton content={result.html} mime="text/html;charset=utf-8" name={result.downloadName} /> : null}
        </>
      )}
    >
      <SandboxedHtmlPreview html={result.html} />
    </RenderFrame>
  ),
  image: (result) => (
    <RenderFrame
      actions={result.downloadName ? (
        <Button asChild className="px-2 text-xs" variant="link">
          <a download={result.downloadName} href={result.src}>Download</a>
        </Button>
      ) : undefined}
    >
      <div className="grid min-h-80 flex-1 place-items-center overflow-auto bg-muted/45 p-6">
        <img
          alt={result.alt}
          className="max-h-full max-w-full object-contain"
          height={result.height}
          src={result.src}
          width={result.width}
        />
      </div>
    </RenderFrame>
  ),
  diff: (result) => {
    const patch = result.lines
      .map((line) => `${line.kind === "added" ? "+" : line.kind === "removed" ? "-" : " "}${line.text}`)
      .join("\n");
    return (
      <RenderFrame actions={<CopyButton content={patch} />}>
        <DiffView result={result} />
      </RenderFrame>
    );
  },
  files: (result) => (
    <div className="grid gap-3 p-4">
      {result.files.map((file) => (
        <DownloadResult
          action={<DownloadButton content={file.buffer} label="Download file" mime={file.mime} name={file.filename} variant="outline" />}
          className="[&_p]:truncate"
          key={`${file.filename}-${file.size}`}
          metadata={`${file.mime} · ${file.size.toLocaleString()} bytes`}
          title={file.filename}
        />
      ))}
      {result.inputBytes !== undefined || result.outputBytes !== undefined ? (
        <p className="text-xs text-muted-foreground">
          {result.inputBytes !== undefined ? `Input: ${result.inputBytes.toLocaleString()} bytes` : null}
          {result.inputBytes !== undefined && result.outputBytes !== undefined ? " · " : null}
          {result.outputBytes !== undefined ? `Output: ${result.outputBytes.toLocaleString()} bytes` : null}
        </p>
      ) : null}
    </div>
  ),
  none: () => (
    <EmptyState
      className="min-h-40"
      title="The action completed without a displayable result."
    />
  ),
};

function renderPrimary(result: ToolRender): ReactNode {
  return RESULT_RENDERERS[result.render](result as never);
}

function CommonResultDetails({ result }: ResultViewProps) {
  const hasDetails = Boolean(
    result.stats?.length ||
    result.verdict ||
    result.issues?.length ||
    result.artifacts?.length ||
    result.sections?.length,
  );
  if (!hasDetails) return null;
  return (
    <div className="grid gap-4 border-t border-border p-4">
      {result.stats?.length ? (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-3">
          {result.stats.map((stat) => (
            <MetricCard key={`${stat.label}-${stat.value}`} label={stat.label} value={stat.value} />
          ))}
        </div>
      ) : null}
      {result.verdict ? (
        <AlertBanner
          action={(
            <StatusBadge variant={result.verdict.level === "ok" ? "success" : result.verdict.level === "error" ? "danger" : "warning"}>
              {result.verdict.level === "ok" ? "OK" : result.verdict.level === "error" ? "Error" : "Warning"}
            </StatusBadge>
          )}
          title={result.verdict.label}
          variant={result.verdict.level === "ok" ? "success" : result.verdict.level === "error" ? "error" : "warning"}
        >
          {result.verdict.detail}
        </AlertBanner>
      ) : null}
      {result.issues?.length ? (
        <AlertBanner title="Issues" variant="warning">
          <ul className="list-disc space-y-1 pl-4">
            {result.issues.map((issue, index) => (
              <li key={`${index}-${issue.message}`}>
                {issue.target ? `${issue.target[0].toUpperCase()}${issue.target.slice(1)}: ` : null}
                {issue.message}
                {issue.line !== undefined ? ` (line ${issue.line}${issue.column !== undefined ? `, column ${issue.column}` : ""})` : ""}
              </li>
            ))}
          </ul>
        </AlertBanner>
      ) : null}
      {result.artifacts?.length ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">Downloads</span>
          {result.artifacts.map((artifact) => (
            <DownloadButton content={artifact.content} label={artifact.name} key={artifact.name} mime={artifact.mimeType} name={artifact.name} variant="outline" />
          ))}
        </div>
      ) : null}
      {result.sections?.map((section) => (
        <section key={section.title}>
          <SectionHeading title={section.title} />
          {renderPrimary(section.body)}
        </section>
      ))}
    </div>
  );
}

export function ResultView({ result }: ResultViewProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      {renderPrimary(result)}
      <CommonResultDetails result={result} />
    </div>
  );
}
