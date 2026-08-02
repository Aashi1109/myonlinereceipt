"use client";

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@smarttools/ui";
import { AlertTriangle, CheckCircle2, Download, XCircle } from "lucide-react";
import type { ReactNode } from "react";

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
}: DownloadButtonProps) {
  return (
    <Button
      onClick={() => saveBlob(content, mime, name)}
      type="button"
      variant="outline"
    >
      <Download aria-hidden="true" />
      {label}
    </Button>
  );
}

function RenderFrame({ actions, children }: { actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {actions ? <div className="flex shrink-0 justify-end border-b border-border p-2">{actions}</div> : null}
      {children}
    </div>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function primitiveJson(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(String(value));
}

function JsonNode({ depth = 0, name, value }: { depth?: number; name?: string; value: unknown }) {
  const label = name === undefined ? null : (
    <span className="font-semibold text-foreground">{JSON.stringify(name)}: </span>
  );
  if (Array.isArray(value)) {
    return (
      <div className="font-mono text-xs leading-6">
        <div>{label}<span className="text-muted-foreground">Array({value.length})</span></div>
        <div className="border-l border-border pl-4">
          {value.map((entry, index) => (
            <JsonNode depth={depth + 1} key={`${depth}-${index}`} name={String(index)} value={entry} />
          ))}
        </div>
      </div>
    );
  }
  if (isRecord(value)) {
    const entries = Object.entries(value);
    return (
      <div className="font-mono text-xs leading-6">
        <div>{label}<span className="text-muted-foreground">Object({entries.length})</span></div>
        <div className="border-l border-border pl-4">
          {entries.map(([key, entry]) => (
            <JsonNode depth={depth + 1} key={`${depth}-${key}`} name={key} value={entry} />
          ))}
        </div>
      </div>
    );
  }
  return <div className="font-mono text-xs leading-6">{label}<span className="text-primary">{primitiveJson(value)}</span></div>;
}

function csvCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

const RESULT_RENDERERS: ResultRendererRegistry = {
  text: (result) => (
    <RenderFrame
      actions={result.downloadName ? <DownloadButton content={result.text} mime="text/plain;charset=utf-8" name={result.downloadName} /> : undefined}
    >
      <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-sm leading-6">{result.text}</pre>
    </RenderFrame>
  ),
  code: (result) => (
    <RenderFrame
      actions={result.downloadName ? <DownloadButton content={result.code} mime="text/plain;charset=utf-8" name={result.downloadName} /> : undefined}
    >
      <pre className="min-h-0 flex-1 overflow-auto bg-muted/45 p-4 font-mono text-xs leading-6"><code data-language={result.language}>{result.code}</code></pre>
    </RenderFrame>
  ),
  "json-tree": (result) => (
    <div className="min-h-0 flex-1 overflow-auto p-4">
      <JsonNode value={result.value} />
    </div>
  ),
  table: (result) => {
    const csv = [result.columns, ...result.rows]
      .map((row) => row.map(csvCell).join(","))
      .join("\n");
    return (
      <RenderFrame
        actions={result.downloadName ? <DownloadButton content={csv} label={result.truncated ? "Download shown rows" : "Download"} mime="text/csv;charset=utf-8" name={result.downloadName} /> : undefined}
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
  "key-value": (result) => (
    <dl className="grid gap-0 divide-y divide-border">
      {result.entries.map((entry) => (
        <div className="grid grid-cols-[minmax(8rem,0.4fr)_minmax(0,1fr)] gap-4 px-4 py-3" key={`${entry.label}-${entry.value}`}>
          <dt className="text-sm font-medium">{entry.label}</dt>
          <dd className="break-words font-mono text-sm text-muted-foreground">{entry.value}</dd>
        </div>
      ))}
    </dl>
  ),
  html: (result) => (
    <RenderFrame
      actions={result.downloadName ? <DownloadButton content={result.html} mime="text/html;charset=utf-8" name={result.downloadName} /> : undefined}
    >
      <iframe
        className="min-h-80 w-full flex-1 bg-white"
        sandbox=""
        srcDoc={result.html}
        title="Generated HTML preview"
      />
    </RenderFrame>
  ),
  image: (result) => (
    <RenderFrame
      actions={result.downloadName ? (
                <Button asChild variant="outline">
          <a download={result.downloadName} href={result.src}><Download aria-hidden="true" /> Download</a>
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
  diff: (result) => (
    <div className="min-h-0 flex-1 overflow-auto font-mono text-xs leading-6">
      {result.leftLabel || result.rightLabel ? (
        <div className="grid grid-cols-2 border-b border-border bg-muted/50 px-4 py-2 font-sans font-medium">
          <span>{result.leftLabel ?? "Before"}</span><span>{result.rightLabel ?? "After"}</span>
        </div>
      ) : null}
      {result.lines.map((line, index) => (
        <div
          className={line.kind === "added" ? "bg-success/10 text-foreground" : line.kind === "removed" ? "bg-destructive/10 text-foreground" : undefined}
          key={`${index}-${line.text}`}
        >
          <span className="sr-only">{line.kind === "added" ? "Added: " : line.kind === "removed" ? "Removed: " : "Unchanged: "}</span>
          <span aria-hidden="true" className="inline-block w-8 select-none text-center text-muted-foreground">{line.kind === "added" ? "+" : line.kind === "removed" ? "−" : " "}</span>
          <span className="whitespace-pre-wrap break-all">{line.text}</span>
        </div>
      ))}
    </div>
  ),
  files: (result) => (
    <div className="grid gap-3 p-4">
      {result.files.map((file) => (
        <Card key={`${file.filename}-${file.size}`}>
          <CardHeader className="flex-row items-center justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="truncate text-sm">{file.filename}</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">{file.mime} · {file.size.toLocaleString()} bytes</p>
            </div>
            <DownloadButton content={file.buffer} label="Download file" mime={file.mime} name={file.filename} />
          </CardHeader>
        </Card>
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
    <div className="grid min-h-40 place-items-center p-6 text-center text-sm text-muted-foreground">
      The action completed without a displayable result.
    </div>
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
  const VerdictIcon = result.verdict?.level === "ok"
    ? CheckCircle2
    : result.verdict?.level === "error"
      ? XCircle
      : AlertTriangle;
  return (
    <div className="grid gap-4 border-t border-border p-4">
      {result.stats?.length ? (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-3">
          {result.stats.map((stat) => (
            <Card className="p-4" key={`${stat.label}-${stat.value}`}>
              <CardContent className="p-0"><p className="text-xs text-muted-foreground">{stat.label}</p><p className="mt-1 font-mono text-lg font-semibold">{stat.value}</p></CardContent>
            </Card>
          ))}
        </div>
      ) : null}
      {result.verdict ? (
        <Alert variant={result.verdict.level === "error" ? "destructive" : "default"}>
          <VerdictIcon aria-hidden="true" />
          <AlertTitle>{result.verdict.label}</AlertTitle>
          {result.verdict.detail ? <AlertDescription>{result.verdict.detail}</AlertDescription> : null}
        </Alert>
      ) : null}
      {result.issues?.length ? (
        <Alert>
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>Issues</AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-1 pl-4">
              {result.issues.map((issue, index) => (
                <li key={`${index}-${issue.message}`}>
                  {issue.target ? `${issue.target[0].toUpperCase()}${issue.target.slice(1)}: ` : null}
                  {issue.message}
                  {issue.line !== undefined ? ` (line ${issue.line}${issue.column !== undefined ? `, column ${issue.column}` : ""})` : ""}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}
      {result.artifacts?.length ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">Downloads</span>
          {result.artifacts.map((artifact) => (
            <DownloadButton content={artifact.content} label={artifact.name} key={artifact.name} mime={artifact.mimeType} name={artifact.name} />
          ))}
        </div>
      ) : null}
      {result.sections?.map((section) => (
        <Card key={section.title}>
          <CardHeader><CardTitle className="text-base">{section.title}</CardTitle></CardHeader>
          <CardContent className="p-0">{renderPrimary(section.body)}</CardContent>
        </Card>
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
