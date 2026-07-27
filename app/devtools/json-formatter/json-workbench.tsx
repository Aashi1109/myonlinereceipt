"use client";

import { SmartToolsFooter } from "@/components/smarttools/SmartToolsFooter";
import {
  type ReactNode,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { json } from "@codemirror/lang-json";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import {
  AccountNavigation,
  AlertBanner,
  type AccountNavigationProps,
  Badge,
  Button,
  Checkbox,
  Field,
  Input,
  Label,
  Select,
  Separator,
  StatusBadge,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
  ToolPageShell,
  WorkbenchShell,
  type WorkbenchShellProps,
} from "@smarttools/ui";
import {
  AlignLeft,
  ArrowLeftRight,
  Braces,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Copy,
  Download,
  FileJson,
  Globe2,
  Info,
  Lightbulb,
  Minimize2,
  Palette,
  PanelRightClose,
  PanelRightOpen,
  ShieldCheck,
  Sparkles,
  Table2,
  Trash2,
  WandSparkles,
  Workflow,
} from "lucide-react";

import {
  JsonResultRenderer,
  ROOT_JSON_TREE_PATH,
  type JsonTreePath,
  type JsonTreeSelection,
} from "../components/JsonResultRenderer";
import {
  MAX_JSON_INPUT_CHARS,
  type CsvDelimiter,
  type JsonIndentation,
  type JsonRepairMode,
  type JsonTransformMode,
  type UtilityOptionDefinition,
  type UtilityToolResult,
  convertCsvToJson,
  convertJsonToCsv,
  getJsonNodeMetadata,
  repairJson,
  runUtilityTool,
  summarizeJson,
  transformJson,
  utilityToolDefinitions,
} from "../../../lib/devtools/format-json";

const EXAMPLE_JSON = [
  "{",
  '"id": "12345",',
  '"name": "Project Apollo",',
  '  "status":"active",',
  '"details": {',
  '  "tasks": [',
  '    {"id": 1, "title": "Design System", "completed": true},',
  '    {"id": 2, "title": "API Integration", "completed": false}',
  "  ],",
  '  "metadata": "{\\"created\\":\\"2024-01-01\\"}"',
  "}",
  "}",
].join("\n");

const JSON_INPUT_EXTENSIONS = [
  json(),
  EditorView.contentAttributes.of({
    "aria-label": "JSON input",
    autocapitalize: "off",
    id: "json-input",
    spellcheck: "false",
  }),
];

const CODE_EDITOR_CLASS_NAME =
  "min-h-0 w-full flex-1 overflow-hidden bg-inherit text-foreground focus-within:ring-2 focus-within:ring-inset focus-within:ring-ring [&_.cm-activeLine]:bg-accent [&_.cm-content]:min-w-max [&_.cm-content]:p-4 [&_.cm-content]:caret-primary [&_.cm-editor]:h-full [&_.cm-editor]:bg-inherit [&_.cm-editor]:text-foreground [&_.cm-gutters]:hidden [&_.cm-line]:p-0 [&_.cm-matchingBracket]:bg-accent [&_.cm-matchingBracket]:outline [&_.cm-matchingBracket]:outline-1 [&_.cm-matchingBracket]:outline-ring [&_.cm-placeholder]:text-muted-foreground [&_.cm-scroller]:overflow-auto [&_.cm-scroller]:font-mono [&_.cm-scroller]:text-[0.8125rem] [&_.cm-scroller]:leading-5 [&_.cm-scroller]:[font-variant-ligatures:none] [&_.cm-scroller]:[tab-size:2]";

function parseJsonResult(output: string): { value: unknown } | null {
  try {
    return { value: JSON.parse(output) as unknown };
  } catch {
    return null;
  }
}

function resolveJsonTreePath(
  root: unknown,
  path: JsonTreePath,
): { found: true; value: unknown } | { found: false } {
  let current = root;
  for (const segment of path) {
    if (typeof segment === "number") {
      if (!Array.isArray(current) || segment < 0 || segment >= current.length) {
        return { found: false };
      }
      current = current[segment];
      continue;
    }
    if (
      current === null ||
      typeof current !== "object" ||
      Array.isArray(current) ||
      !Object.prototype.hasOwnProperty.call(current, segment)
    ) {
      return { found: false };
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return { found: true, value: current };
}

function ConversionFormatSelector({ label, value }: { label: string; value: string }) {
  const id = `conversion-${label.toLowerCase()}-${value.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <div className="flex w-44 flex-col gap-[7px]">
      <Label className="font-caption text-xs font-medium text-muted-foreground" htmlFor={id}>
        {label}
      </Label>
      <Select className="h-11 bg-card px-[13px] py-3 text-sm" id={id} value={value}>
        <option value={value}>{value}</option>
      </Select>
    </div>
  );
}

function ToolWorkspace({
  actions,
  busy,
  children,
  options,
  status,
  toolbarLabel,
  variant = "utility",
}: {
  actions: ReactNode;
  busy?: boolean;
  children: ReactNode;
  options?: ReactNode;
  status: ReactNode;
  toolbarLabel: string;
  variant?: WorkbenchShellProps["variant"];
}) {
  return (
    <WorkbenchShell
      aria-busy={busy || undefined}
      className="flex-1 text-card-foreground motion-reduce:[&_*]:transition-none"
      data-testid="tool-workspace"
      id="tool-workspace"
      options={options}
      status={
        <div
          aria-live="polite"
          className="flex w-full items-center justify-between gap-4 font-mono text-[10px] text-muted-foreground tabular-nums max-[40rem]:flex-col max-[40rem]:items-start max-[40rem]:gap-1"
          data-testid="tool-status-line"
          role="status"
        >
          {status}
        </div>
      }
      tabIndex={-1}
      variant={variant}
      toolbar={
        <div
          aria-label={toolbarLabel}
          className="flex w-full flex-wrap items-center gap-2"
          data-testid="tool-action-toolbar"
          role="toolbar"
        >
          {actions}
        </div>
      }
    >
      <div
        className="flex h-full min-h-0 overflow-hidden max-[54rem]:block max-[54rem]:h-auto max-[54rem]:overflow-visible"
        data-testid="tool-workspace-content"
      >
        {children}
      </div>
    </WorkbenchShell>
  );
}

function ToolPageFrame({
  account,
  category,
  children,
  description,
  introCategory,
  introDescription,
  introTitle,
  online = false,
  skipHref = "#tool-workspace",
  title,
}: {
  account: AccountNavigationProps;
  category: string;
  children: ReactNode;
  description: string;
  introCategory?: string;
  introDescription?: string;
  introTitle?: string;
  online?: boolean;
  skipHref?: string;
  title: string;
}) {
  return (
    <ToolPageShell
      badge={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Badge className="border-transparent bg-accent px-2.5 py-1.5 font-caption text-[11px] font-semibold tracking-[0.035em] text-primary" variant="secondary">
            QUICK TASK
          </Badge>
          <Badge className="border-transparent bg-accent px-2.5 py-1.5 font-caption text-[11px] font-semibold tracking-[0.035em] text-primary" variant="secondary">
            RESULT READY
          </Badge>
          <Badge className="border-transparent bg-accent px-2.5 py-1.5 font-caption text-[11px] font-semibold tracking-[0.035em] text-primary" variant="secondary">
            {online ? "ONLINE LOOKUP" : "PRIVATE IN BROWSER"}
          </Badge>
        </div>
      }
      category={introCategory ?? category}
      description={introDescription ?? description}
      footer={<SmartToolsFooter />}
      headerActions={<AccountNavigation {...account} />}
      productHref="/devtools"
      productName="Developer tools"
      skipHref={skipHref}
      skipLabel={skipHref === "#json-input" ? "Skip to JSON input" : "Skip to tool workspace"}
      title={introTitle ?? title}
    >
      {children}
    </ToolPageShell>
  );
}

export default function JsonWorkbench({
  account,
  category,
  description,
  title,
}: {
  account: AccountNavigationProps;
  category: string;
  description: string;
  title: string;
}) {
  const [input, setInput] = useState(EXAMPLE_JSON);
  const [mode, setMode] = useState<JsonTransformMode>("format");
  const [indentation, setIndentation] = useState<JsonIndentation>(2);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [notice, setNotice] = useState("");
  const [cursor, setCursor] = useState({ line: 1, column: 1 });
  const [selectedNode, setSelectedNode] = useState<JsonTreeSelection | null>(null);
  const deferredInput = useDeferredValue(input);

  const result = useMemo(
    () => transformJson(deferredInput, { mode, indentation }),
    [deferredInput, indentation, mode],
  );
  const isChecking = deferredInput !== input;
  const canUseResult = result.ok && !isChecking;
  const summary = useMemo(
    () => (result.ok ? summarizeJson(result.value, result.output) : null),
    [result],
  );
  const selectedMetadata = useMemo(
    () => selectedNode ? getJsonNodeMetadata(selectedNode.key, selectedNode.value) : null,
    [selectedNode],
  );

  useEffect(() => {
    if (!result.ok) {
      setSelectedNode(null);
      return;
    }
    const rootValue = result.value;
    setSelectedNode((current) => {
      if (current) {
        const resolved = resolveJsonTreePath(rootValue, current.path);
        if (resolved.found) return { ...current, value: resolved.value };
      }
      return { key: "root", path: ROOT_JSON_TREE_PATH, value: rootValue };
    });
  }, [result]);

  useEffect(() => {
    function openToolSearch(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        window.location.assign("/devtools");
      }
    }

    window.addEventListener("keydown", openToolSearch);
    return () => window.removeEventListener("keydown", openToolSearch);
  }, []);

  function updateInput(value: string) {
    setInput(value);
    setSelectedNode(null);
    setNotice("");
  }

  function chooseMode(nextMode: JsonTransformMode) {
    setMode(nextMode);
    setNotice(nextMode === "minify" ? "Output minified." : "Output formatted.");
  }

  function validateInput() {
    setInspectorOpen(true);
    setNotice(result.ok ? "JSON is valid." : result.error.message);
  }

  async function copyNode(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(`${label} copied.`);
    } catch {
      setNotice("Copy failed. Select the output and copy it manually.");
    }
  }

  async function copyResult() {
    if (!canUseResult) return;
    await copyNode(result.output, "Formatted JSON");
  }

  function clearInput() {
    setInput("");
    setSelectedNode(null);
    setNotice("Input cleared.");
  }

  const statusLabel = isChecking
    ? "Checking JSON"
    : result.ok
      ? "Valid JSON"
      : result.error.kind === "empty"
        ? "Waiting for JSON"
        : "Invalid JSON";

  return (
    <ToolPageFrame
      account={account}
      category={category}
      description={description}
      skipHref="#json-input"
      title={title}
    >
      <div className="flex min-h-[33rem] flex-col max-[54rem]:block max-[54rem]:min-h-0">
        <ToolWorkspace
          variant="json"
          actions={
            <>
          <div className="flex min-w-0 items-center gap-2 max-[40rem]:grid max-[40rem]:w-full max-[40rem]:grid-cols-3">
            <Button
              aria-pressed={mode === "format"}
              className="max-[40rem]:min-w-0 max-[40rem]:px-2"
              onClick={() => chooseMode("format")}
              size="sm"
              type="button"
              variant={mode === "format" ? "default" : "outline"}
            >
              <AlignLeft aria-hidden="true" size={16} />
              Format
            </Button>
            <Button
              aria-pressed={mode === "minify"}
              className="max-[40rem]:min-w-0 max-[40rem]:px-2"
              onClick={() => chooseMode("minify")}
              size="sm"
              type="button"
              variant={mode === "minify" ? "default" : "outline"}
            >
              <Minimize2 aria-hidden="true" size={16} />
              Minify
            </Button>
            <Button
              className="max-[40rem]:min-w-0 max-[40rem]:px-2"
              onClick={validateInput}
              size="sm"
              type="button"
              variant="outline"
            >
              <ClipboardCheck aria-hidden="true" size={16} />
              Validate
            </Button>
          </div>

          <div className="ml-auto flex min-w-0 items-center gap-2 max-[40rem]:ml-0 max-[40rem]:grid max-[40rem]:w-full max-[40rem]:grid-cols-[minmax(0,1fr)_2.5rem_3rem]">
            <Label
              className="flex min-h-9 w-48 min-w-0 items-center gap-1.5 rounded-md border border-border bg-muted pl-2 max-[40rem]:w-full"
              htmlFor="indentation"
            >
              <span className="text-[0.6875rem] font-extrabold tracking-[0.06em] text-muted-foreground uppercase">
                Indent:
              </span>
              <Select
                className="h-8 min-w-0 border-0 bg-transparent py-0 pr-7 pl-0.5 text-sm shadow-none focus-visible:ring-0 max-[40rem]:w-full"
                disabled={mode === "minify"}
                id="indentation"
                onChange={(event) => {
                  const value = event.target.value;
                  setIndentation(value === "tab" ? "tab" : value === "4" ? 4 : 2);
                }}
                value={indentation}
              >
                <option value="2">2 Spaces</option>
                <option value="4">4 Spaces</option>
                <option value="tab">Tabs</option>
              </Select>
            </Label>
            <Button
              aria-label="Copy formatted JSON"
              disabled={!canUseResult}
              onClick={copyResult}
              size="icon"
              title="Copy formatted JSON"
              type="button"
              variant="ghost"
            >
              <Copy aria-hidden="true" size={18} />
            </Button>
            <div className="border-l border-border pl-2">
              <Button
                aria-label="Clear JSON input"
                disabled={!input}
                onClick={clearInput}
                size="icon"
                title="Clear JSON input"
                type="button"
                variant="ghost"
              >
                <Trash2 aria-hidden="true" size={18} />
              </Button>
            </div>
          </div>
            </>
          }
          status={
            <>
              <div className="flex items-center gap-4 max-[40rem]:flex-wrap max-[40rem]:gap-2.5">
                <span
                  className={`inline-flex items-center gap-1.5 ${result.ok ? "text-primary" : "text-destructive"}`}
                >
                  {result.ok ? (
                    <CheckCircle2 aria-hidden="true" size={14} />
                  ) : (
                    <Info aria-hidden="true" size={14} />
                  )}
                  {notice || statusLabel}
                </span>
                <Separator className="h-4" orientation="vertical" />
                <span>Size: {summary ? `${summary.byteSize.toLocaleString()} B` : "—"}</span>
                <span>Lines: {summary?.lineCount ?? input.split("\n").length}</span>
              </div>
              <div className="flex items-center gap-4 max-[40rem]:flex-wrap max-[40rem]:gap-2.5">
                <span>Ln {cursor.line}, Col {cursor.column}</span>
                <span>UTF-8</span>
              </div>
            </>
          }
          toolbarLabel="JSON actions"
        >
          <section
            aria-label="JSON input"
            className="flex w-[560px] min-w-0 shrink-0 flex-col overflow-hidden border-r border-border bg-muted/20 max-[64rem]:w-[40%] max-[54rem]:min-h-[32rem] max-[54rem]:w-full max-[54rem]:flex-none max-[54rem]:border-r-0 max-[54rem]:border-b"
            data-workspace-panel="input"
          >
            <header className="flex min-h-11 shrink-0 items-center justify-between border-b border-border bg-muted/45 px-4">
              <h2 className="text-xs font-extrabold tracking-[0.08em] uppercase">
                Input
              </h2>
              <span className="text-[0.6875rem] font-bold tracking-[0.06em] text-muted-foreground uppercase">
                JSON
              </span>
            </header>
            <CodeMirror
              basicSetup={{
                autocompletion: false,
                bracketMatching: true,
                closeBrackets: true,
                foldGutter: false,
                highlightActiveLine: true,
                highlightActiveLineGutter: false,
                indentOnInput: true,
                lineNumbers: false,
                tabSize: 2,
              }}
              className={CODE_EDITOR_CLASS_NAME}
              extensions={JSON_INPUT_EXTENSIONS}
              height="100%"
              indentWithTab={false}
              onChange={updateInput}
              onUpdate={(update) => {
                if (!update.selectionSet) return;
                const head = update.state.selection.main.head;
                const line = update.state.doc.lineAt(head);
                setCursor({ line: line.number, column: head - line.from + 1 });
              }}
              placeholder={'Paste JSON here…\n\n{\n  "message": "Hello"\n}'}
              theme="light"
              value={input}
            />
          </section>

          <section
            aria-label="JSON output"
            className="flex min-w-0 flex-1 flex-col overflow-hidden bg-card max-[54rem]:min-h-[32rem] max-[54rem]:w-full max-[54rem]:border-b max-[54rem]:border-border"
            data-workspace-panel="output"
          >
            <header className="hidden min-h-11 shrink-0 items-center justify-between border-b border-border bg-card px-4">
              <h2 className="text-xs font-extrabold tracking-[0.08em] uppercase">
                Output
              </h2>
              {!inspectorOpen ? (
                <Button
                  aria-label="Show inspector"
                  className="size-8"
                  onClick={() => setInspectorOpen(true)}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <PanelRightOpen aria-hidden="true" size={18} />
                </Button>
              ) : null}
            </header>
            {result.ok ? (
              <JsonResultRenderer
                formattedValue={result.output}
                label="Formatted JSON result"
                onCopy={copyNode}
                onSelect={setSelectedNode}
                selectedPath={selectedNode?.path}
                value={result.value}
              />
            ) : (
              <div className="m-auto flex max-w-lg items-start gap-3 p-6 text-muted-foreground">
                <Info aria-hidden="true" className="shrink-0" size={20} />
                <div>
                  <strong className="text-foreground">
                    {result.error.kind === "empty" ? "Ready for JSON" : "JSON needs attention"}
                  </strong>
                  <p className="mt-1 text-sm">{result.error.message}</p>
                </div>
              </div>
            )}
          </section>

          <aside
            aria-hidden={!inspectorOpen}
            aria-label="JSON inspector"
            className={`hidden min-w-0 shrink-0 flex-col overflow-hidden border-l border-border bg-card transition-[width,flex-basis,border-color] duration-300 max-[54rem]:min-h-[38rem] max-[54rem]:border-l-0 max-[54rem]:border-b ${
              inspectorOpen
                ? "w-80 basis-80 max-[64rem]:w-72 max-[64rem]:basis-72 max-[54rem]:w-full max-[54rem]:basis-auto"
                : "invisible w-0 basis-0 border-transparent max-[54rem]:hidden"
            }`}
            data-workspace-panel="details"
            inert={!inspectorOpen ? true : undefined}
          >
            <section className="flex min-h-0 flex-1 flex-col border-b border-border">
              <header className="flex min-h-13 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
                <h2 className="flex items-center gap-1.5 text-xs font-extrabold tracking-[0.06em] text-muted-foreground uppercase">
                  <CheckCircle2 aria-hidden="true" className="text-primary" size={16} />
                  Validation
                </h2>
                <div className="flex items-center gap-2">
                  <StatusBadge className="font-mono">RFC 8259</StatusBadge>
                  <Button
                    aria-label="Hide inspector"
                    onClick={() => setInspectorOpen(false)}
                    size="icon"
                    title="Hide inspector"
                    type="button"
                    variant="ghost"
                  >
                    <PanelRightClose aria-hidden="true" size={18} />
                  </Button>
                </div>
              </header>
              <div className="min-h-0 flex-1 overflow-auto p-4">
                <AlertBanner
                  className="mb-4"
                  title={statusLabel}
                  variant={result.ok ? "success" : "error"}
                >
                  {result.ok
                    ? "The document is well-formed and passes structural validation."
                    : result.error.message}
                </AlertBanner>
                <dl>
                  <div className="flex min-h-9 items-center justify-between gap-4 border-b border-border text-[0.8125rem]">
                    <dt className="text-muted-foreground">Depth</dt>
                    <dd className="font-mono text-foreground">
                      {summary ? `${summary.depth} levels` : "—"}
                    </dd>
                  </div>
                  <div className="flex min-h-9 items-center justify-between gap-4 border-b border-border text-[0.8125rem]">
                    <dt className="text-muted-foreground">Keys</dt>
                    <dd className="font-mono text-foreground">{summary?.keyCount ?? "—"}</dd>
                  </div>
                  <div className="flex min-h-9 items-center justify-between gap-4 border-b border-border text-[0.8125rem]">
                    <dt className="text-muted-foreground">Arrays</dt>
                    <dd className="font-mono text-foreground">{summary?.arrayCount ?? "—"}</dd>
                  </div>
                </dl>
              </div>
            </section>

            <section className="flex min-h-0 flex-[1.5] flex-col">
              <header className="flex min-h-13 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
                <h2 className="text-xs font-extrabold tracking-[0.06em] text-muted-foreground uppercase">
                  Node Metadata
                </h2>
              </header>
              <div className="min-h-0 flex-1 overflow-auto p-4">
                <div>
                  <p className="mb-1.5 text-xs font-extrabold tracking-[0.04em] text-muted-foreground uppercase">
                    Selected Key
                  </p>
                  <code className="block rounded-md border border-border bg-muted/30 p-2.5 font-mono text-[0.8125rem] text-foreground">
                    {selectedMetadata ? `"${selectedMetadata.selectedKey}"` : "—"}
                  </code>
                </div>
                <div className="mt-4">
                  <p className="mb-1.5 text-xs font-extrabold tracking-[0.04em] text-muted-foreground uppercase">
                    Value Type
                  </p>
                  <Badge
                    className="rounded-md font-mono text-[0.8125rem] font-normal"
                    variant="secondary"
                  >
                    <i aria-hidden="true" className="size-2 rounded-full bg-primary" />
                    {selectedMetadata?.selectedType ?? "Unknown"}
                  </Badge>
                </div>
                <div className="mt-4">
                  <p className="mb-1.5 text-xs font-extrabold tracking-[0.04em] text-muted-foreground uppercase">
                    Data Preview
                  </p>
                  <div className="overflow-hidden rounded-md border border-border bg-muted/20 font-mono text-xs">
                    <Table
                      aria-label="Data Preview"
                      className="table-fixed text-left font-mono text-xs"
                    >
                      <TableHeader className="bg-transparent">
                        <TableRow className="text-muted-foreground hover:bg-transparent">
                          <TableHead className="w-[40%] px-2.5 py-2 font-normal">Key</TableHead>
                          <TableHead className="px-2.5 py-2 font-normal">Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedMetadata?.preview.length ? (
                          selectedMetadata.preview.map((item) => (
                            <TableRow className="hover:bg-transparent" key={item.key}>
                              <TableHead className="px-2.5 py-2 font-normal text-muted-foreground" scope="row">
                                {item.key}
                              </TableHead>
                              <TableCell className="px-2.5 py-2">
                                <code className="font-mono text-primary">{item.value}</code>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow className="hover:bg-transparent">
                            <TableCell className="p-3 font-sans text-muted-foreground" colSpan={2}>
                              No value preview available.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </section>
          </aside>
        </ToolWorkspace>
      </div>
      <span className="sr-only">
        Maximum input size is {MAX_JSON_INPUT_CHARS.toLocaleString()} characters.
      </span>
    </ToolPageFrame>
  );
}

const CONVERSION_EXAMPLES = {
  "json-to-csv": '[{"id":1,"name":"Alice"},{"id":2,"name":"Bob"}]',
  "csv-to-json": "id,name\n1,Alice\n2,Bob",
} as const;

export function DataConversionWorkbench({
  account,
  category,
  conversion,
  description,
  title,
}: {
  account: AccountNavigationProps;
  category: string;
  conversion: keyof typeof CONVERSION_EXAMPLES;
  description: string;
  title: string;
}) {
  const [input, setInput] = useState("");
  const [delimiter, setDelimiter] = useState<CsvDelimiter>(",");
  const [repairMode, setRepairMode] = useState<JsonRepairMode>("remove");
  const [notice, setNotice] = useState("");
  const deferredInput = useDeferredValue(input);
  const convertsCsv = conversion === "csv-to-json";
  const sourceFormat = convertsCsv ? "CSV" : "JSON";
  const targetFormat = convertsCsv ? "JSON" : "CSV";
  const result = useMemo(
    () =>
      convertsCsv
        ? convertCsvToJson(deferredInput, { delimiter })
        : convertJsonToCsv(deferredInput, { delimiter, repairMode }),
    [convertsCsv, deferredInput, delimiter, repairMode],
  );
  const isChecking = deferredInput !== input;
  const canExport = result.ok && !isChecking;

  function updateInput(value: string) {
    setInput(value);
    setNotice("");
  }

  async function pasteInput() {
    try {
      const value = await navigator.clipboard.readText();
      updateInput(value);
      setNotice(`${sourceFormat} pasted from clipboard.`);
    } catch {
      setNotice("Clipboard access was blocked. Paste into the input panel manually.");
    }
  }

  async function copyOutput() {
    if (!canExport) return;
    try {
      await navigator.clipboard.writeText(result.output);
      setNotice(`${targetFormat} copied.`);
    } catch {
      setNotice("Copy failed. Select the output and copy it manually.");
    }
  }

  function downloadOutput() {
    if (!canExport) return;
    const url = URL.createObjectURL(
      new Blob([result.output], {
        type: convertsCsv ? "application/json;charset=utf-8" : "text/csv;charset=utf-8",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `smarttools-data.${convertsCsv ? "json" : "csv"}`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice(`${targetFormat} downloaded.`);
  }

  const status = isChecking
    ? "Converting…"
    : result.ok
      ? `${result.rowCount.toLocaleString()} row${result.rowCount === 1 ? "" : "s"} ready${"repaired" in result && result.repaired ? " after safe repair" : ""}.`
      : result.error.message;

  return (
    <ToolPageFrame
      account={account}
      category={category}
      description={description}
      title={title}
    >
      <ToolWorkspace
        variant="conversion"
        actions={
          <>
            <div className="flex min-w-0 items-end gap-2.5">
              <ConversionFormatSelector label="FROM" value={sourceFormat} />
              <Button aria-label="Swap formats" className="size-10 rounded-lg" size="icon" variant="outline">
                <ArrowLeftRight aria-hidden="true" className="size-[18px]" />
              </Button>
              <ConversionFormatSelector label="TO" value={targetFormat} />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button className="text-primary" onClick={() => void pasteInput()} variant="ghost">
                <ClipboardCheck aria-hidden="true" className="size-4" />
                Paste
              </Button>
              <Button
                onClick={() => {
                  updateInput(CONVERSION_EXAMPLES[conversion]);
                  setNotice("Example loaded.");
                }}
                variant="outline"
              >
                Example
              </Button>
              <Button
                disabled={!input}
                onClick={() => {
                  updateInput("");
                  setNotice("Input cleared.");
                }}
                variant="outline"
              >
                Clear
              </Button>
              <Button
                disabled={!input || isChecking}
                onClick={() => setNotice(result.ok ? `${targetFormat} preview updated.` : result.error.message)}
              >
                Convert →
              </Button>
            </div>
          </>
        }
        options={
          <>
            {!convertsCsv ? (
              <Label className="flex items-center gap-2 text-xs font-normal" htmlFor="repair-mode">
                <span className="whitespace-nowrap">Auto-fix</span>
                <Select
                  className="h-8 w-44 bg-card py-0"
                  id="repair-mode"
                  onChange={(event) => setRepairMode(event.target.value as JsonRepairMode)}
                  value={repairMode}
                >
                  <option value="remove">Remove broken parts</option>
                  <option value="null">Replace with null</option>
                  <option value="off">Do not repair</option>
                </Select>
              </Label>
            ) : null}
            <Label className="flex items-center gap-2 text-xs font-normal" htmlFor="csv-delimiter">
              <span>Delimiter</span>
              <Select
                className="h-8 w-32 bg-card py-0"
                id="csv-delimiter"
                onChange={(event) => setDelimiter(event.target.value as CsvDelimiter)}
                value={delimiter}
              >
                <option value=",">Comma</option>
                <option value=";">Semicolon</option>
                <option value={"\t"}>Tab</option>
                <option value="|">Pipe</option>
              </Select>
            </Label>
            <span className="ml-auto font-mono text-[10px] text-muted-foreground">UTF-8 · Auto detect</span>
          </>
        }
        status={
              <>
                <span
                  className={`inline-flex items-center gap-1.5 font-semibold ${
                    result.ok
                      ? "text-primary"
                      : input
                        ? "text-destructive"
                        : "text-muted-foreground"
                  }`}
                >
                  {result.ok ? (
                    <CheckCircle2 aria-hidden="true" className="size-3.5 shrink-0" />
                  ) : (
                    <Info aria-hidden="true" className="size-3.5 shrink-0" />
                  )}
                  {notice || status}
                </span>
                <span>
                  {input.length.toLocaleString()} characters · {sourceFormat} → {targetFormat}
                </span>
              </>
            }
            toolbarLabel={`${title} actions`}
          >
            <section
              className="flex min-w-0 flex-1 flex-col overflow-hidden border-r border-border bg-card max-[54rem]:min-h-[28rem] max-[54rem]:w-full max-[54rem]:border-r-0 max-[54rem]:border-b"
              data-workspace-panel="input"
            >
              <header className="flex h-[46px] shrink-0 items-center justify-between gap-3 border-b border-border px-4">
                <div className="flex items-center gap-2">
                  <h2 className="font-caption text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">
                    {sourceFormat} input
                  </h2>
                  {result.ok ? <span className="font-caption text-[11px] font-semibold text-success">{result.rowCount} rows</span> : null}
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {new TextEncoder().encode(input).length.toLocaleString()} bytes
                </span>
              </header>
              <div className="flex min-h-[25rem] flex-1 overflow-hidden bg-muted">
                <pre aria-hidden="true" className="shrink-0 select-none border-r border-border/70 px-3 py-[18px] text-right font-mono text-xs leading-[1.65] text-muted-foreground/60">
                  {Array.from({ length: Math.max(1, input.split("\n").length) }, (_, index) => index + 1).join("\n")}
                </pre>
                <Textarea
                  aria-invalid={Boolean(input) && !result.ok}
                  aria-label={`${sourceFormat} input`}
                  className="min-h-[25rem] flex-1 resize-none rounded-none border-0 bg-muted p-[18px] font-mono text-xs leading-[1.65] shadow-none focus-visible:ring-2 focus-visible:ring-inset"
                  maxLength={MAX_JSON_INPUT_CHARS}
                  onChange={(event) => updateInput(event.target.value)}
                  placeholder={
                    convertsCsv
                      ? "Paste CSV with a header row…\n\nid,name\n1,Alice"
                      : 'Paste an object or array of objects…\n\n[{"id":1,"name":"Alice"}]'
                  }
                  spellCheck={false}
                  value={input}
                />
              </div>
            </section>

            <section
              className="flex min-w-0 flex-1 flex-col overflow-hidden bg-muted/15 max-[54rem]:min-h-[28rem] max-[54rem]:w-full"
              data-workspace-panel="output"
            >
              <header className="flex h-[46px] shrink-0 items-center justify-between gap-3 border-b border-border px-4">
                <div className="flex items-center gap-2">
                  <h2 className="font-caption text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">
                    {targetFormat} output
                  </h2>
                  {result.ok ? <CheckCircle2 aria-hidden="true" className="size-3.5 text-success" /> : null}
                </div>
                <div className="flex gap-1">
                  <Button disabled={!canExport} onClick={() => void copyOutput()} size="sm" variant="ghost">
                    <Copy aria-hidden="true" className="size-4" /> Copy
                  </Button>
                  <Button disabled={!canExport} onClick={downloadOutput} size="sm" variant="ghost">
                    <Download aria-hidden="true" className="size-4" /> Download
                  </Button>
                </div>
              </header>
              <Textarea
                aria-label={`${targetFormat} output`}
                className="min-h-[25rem] flex-1 resize-none rounded-none border-0 bg-card p-[18px] font-mono text-xs leading-[1.42] shadow-none focus-visible:ring-2 focus-visible:ring-inset"
                placeholder={`Converted ${targetFormat} will appear here.`}
                readOnly
                spellCheck={false}
                value={result.ok ? result.output : ""}
              />
            </section>
      </ToolWorkspace>
    </ToolPageFrame>
  );
}

const VIEWER_EXAMPLE = `{
  "name": "CodeUtilityKit",
  "version": 2,
  "active": true,
  "tags": ["json", "viewer", "free"],
  "author": { "name": "Dev", "url": "https://codeutilitykit.com" },
  "tools": [
    { "id": 1, "slug": "json-viewer" },
    { "id": 2, "slug": "json-formatter" }
  ]
}`;
const VIEWER_BROKEN_EXAMPLE =
  `[{"id":1,"name":"Alice","age":},{"id":2,"name":"Bob","age":30}]`;

export function JsonViewerWorkbench({
  account,
  category,
  description,
  title,
}: {
  account: AccountNavigationProps;
  category: string;
  description: string;
  title: string;
}) {
  const [input, setInput] = useState("");
  const [layout, setLayout] = useState<"modern" | "classic">("modern");
  const [classicTab, setClassicTab] = useState<"text" | "tree">("text");
  const [repairMode, setRepairMode] =
    useState<Exclude<JsonRepairMode, "off">>("remove");
  const [notice, setNotice] = useState("");
  const deferredInput = useDeferredValue(input);
  const result = useMemo(
    () => transformJson(deferredInput, { mode: "format", indentation: 2 }),
    [deferredInput],
  );
  const ready = result.ok && deferredInput === input;

  function updateInput(value: string) {
    setInput(value);
    setNotice("");
  }

  function transformInput(mode: JsonTransformMode) {
    const next = transformJson(input, { mode, indentation: 2 });
    if (!next.ok) {
      setNotice(next.error.message);
      return;
    }
    setInput(next.output);
    setNotice(mode === "format" ? "JSON beautified." : "JSON minified.");
  }

  function repairInput() {
    const repaired = repairJson(input, repairMode);
    if (!repaired.ok) {
      setNotice(repaired.error.message);
      return;
    }
    setInput(repaired.output);
    setNotice(repaired.repaired ? "JSON repaired and cleaned." : "JSON is already valid.");
  }

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(`${label} copied.`);
    } catch {
      setNotice("Copy failed. Select the content and copy it manually.");
    }
  }

  const showText = layout === "modern" || classicTab === "text";
  const showTree = layout === "modern" || classicTab === "tree";
  const status = deferredInput !== input
    ? "Parsing JSON…"
    : result.ok
      ? "Interactive tree ready."
      : result.error.message;

  return (
    <ToolPageFrame
      account={account}
      category={category}
      description={description}
      title={title}
    >
      <ToolWorkspace
        variant="json"
            actions={
              <>
                <Button disabled={!input} onClick={repairInput} size="sm">
                  Repair &amp; clean
                </Button>
                <Label
                  className="flex min-h-9 items-center gap-2 rounded-lg border border-border bg-muted/40 px-2 text-xs font-bold"
                  htmlFor="viewer-repair-mode"
                >
                  <span>Repair</span>
                  <Select
                    className="h-8 w-36 border-0 bg-transparent py-0 shadow-none focus-visible:ring-0"
                    id="viewer-repair-mode"
                    onChange={(event) =>
                      setRepairMode(
                        event.target.value as Exclude<JsonRepairMode, "off">,
                      )
                    }
                    value={repairMode}
                  >
                    <option value="remove">Remove broken</option>
                    <option value="null">Set broken to null</option>
                  </Select>
                </Label>
                <Button
                  disabled={!ready}
                  onClick={() => transformInput("format")}
                  size="sm"
                  variant="outline"
                >
                  Beautify
                </Button>
                <Button
                  disabled={!ready}
                  onClick={() => transformInput("minify")}
                  size="sm"
                  variant="outline"
                >
                  Minify
                </Button>
                <Button
                  aria-label="Load example"
                  onClick={() => updateInput(VIEWER_EXAMPLE)}
                  size="sm"
                  variant="outline"
                >
                  Example
                </Button>
                <Button
                  aria-label="Load broken example"
                  onClick={() => updateInput(VIEWER_BROKEN_EXAMPLE)}
                  size="sm"
                  variant="outline"
                >
                  Broken example
                </Button>

                <div
                  aria-label="Viewer layout"
                  className="flex rounded-lg border border-border bg-muted/40 p-0.5"
                  role="group"
                >
                  {(["modern", "classic"] as const).map((mode) => (
                    <Button
                      aria-pressed={layout === mode}
                      className="capitalize"
                      key={mode}
                      onClick={() => setLayout(mode)}
                      size="sm"
                      variant={layout === mode ? "default" : "ghost"}
                    >
                      {mode}
                    </Button>
                  ))}
                </div>

                {layout === "classic" ? (
                  <div
                    aria-label="Classic viewer panel"
                    className="flex rounded-lg border border-border bg-muted/40 p-0.5"
                    role="group"
                  >
                    {(["text", "tree"] as const).map((tab) => (
                      <Button
                        aria-pressed={classicTab === tab}
                        className="capitalize"
                        key={tab}
                        onClick={() => setClassicTab(tab)}
                        size="sm"
                        variant={classicTab === tab ? "default" : "ghost"}
                      >
                        {tab === "tree" ? "Viewer" : "Text"}
                      </Button>
                    ))}
                  </div>
                ) : null}

                <div className="border-l border-border pl-2">
                  <Button
                    disabled={!input}
                    onClick={() => {
                      updateInput("");
                      setNotice("Input cleared.");
                    }}
                    size="sm"
                    variant="ghost"
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                    Clear
                  </Button>
                </div>
              </>
            }
            status={
              <>
                <span
                  className={`inline-flex items-center gap-1.5 font-semibold ${
                    result.ok
                      ? "text-primary"
                      : input
                        ? "text-destructive"
                        : "text-muted-foreground"
                  }`}
                >
                  {result.ok ? (
                    <CheckCircle2 aria-hidden="true" className="size-3.5" />
                  ) : (
                    <Info aria-hidden="true" className="size-3.5" />
                  )}
                  {notice || status}
                </span>
                <span>{layout === "modern" ? "Split view" : `${classicTab === "tree" ? "Tree" : "Text"} view`}</span>
              </>
            }
            toolbarLabel="JSON Viewer actions"
          >
            {showText ? (
              <section
                className={`flex min-w-0 flex-col overflow-hidden bg-card max-[54rem]:min-h-[30rem] max-[54rem]:w-full ${
                  layout === "modern"
                    ? "flex-[0_0_40%] border-r border-border max-[54rem]:border-r-0 max-[54rem]:border-b"
                    : "flex-1"
                }`}
                data-workspace-panel="input"
              >
                <header className="flex min-h-11 items-center justify-between border-b border-border px-4 py-2">
                  <h2 className="text-xs font-extrabold tracking-[0.06em] uppercase">
                    JSON input
                  </h2>
                  <Button
                    disabled={!input}
                    onClick={() => copy(input, "Input")}
                    size="sm"
                    variant="ghost"
                  >
                    <Copy aria-hidden="true" className="size-4" />
                    Copy
                  </Button>
                </header>
                <Textarea
                  aria-invalid={Boolean(input) && !result.ok}
                  aria-label="JSON input"
                  className="min-h-[30rem] flex-1 resize-y rounded-none border-0 bg-card p-4 font-mono text-[0.8125rem] leading-6 shadow-none focus-visible:ring-2 focus-visible:ring-inset"
                  maxLength={MAX_JSON_INPUT_CHARS}
                  onChange={(event) => updateInput(event.target.value)}
                  placeholder="Paste JSON to explore — even broken JSON, then click Repair & clean…"
                  spellCheck={false}
                  value={input}
                />
              </section>
            ) : null}

            {showTree ? (
              <section
                className="flex min-w-0 flex-1 flex-col overflow-hidden bg-muted/15 max-[54rem]:min-h-[30rem] max-[54rem]:w-full"
                data-workspace-panel="output"
              >
                {result.ok ? (
                  <JsonResultRenderer
                    formattedValue={result.output}
                    label="Interactive JSON result"
                    onCopy={copy}
                    value={result.value}
                  />
                ) : (
                  <div className="flex min-h-[30rem] flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
                    {input ? result.error.message : "Interactive tree will appear here."}
                  </div>
                )}
              </section>
            ) : null}
      </ToolWorkspace>
    </ToolPageFrame>
  );
}

type UtilityOptionValues = Record<string, string | number | boolean>;

function getUtilityOptionDefaults(
  options: readonly UtilityOptionDefinition[],
): UtilityOptionValues {
  return Object.fromEntries(
    options.map((option) => [option.key, option.defaultValue]),
  );
}

function UtilityOptionControl({
  componentKey,
  onChange,
  option,
  value,
}: {
  componentKey: string;
  onChange: (value: string | number | boolean) => void;
  option: UtilityOptionDefinition;
  value: string | number | boolean;
}) {
  const id = `${componentKey}-${option.key}`;

  if (option.kind === "toggle") {
    return (
      <div className="flex min-h-10 items-center justify-between gap-4">
        <Label className="text-sm font-semibold" htmlFor={id}>{option.label}</Label>
        <Switch
          checked={Boolean(value)}
          id={id}
          onCheckedChange={(checked) => onChange(checked)}
          size="sm"
        />
      </div>
    );
  }

  if (option.kind === "checkbox") {
    return (
      <Checkbox
        checked={Boolean(value)}
        className="min-h-9 items-center"
        id={id}
        label={option.label}
        onCheckedChange={(checked) => onChange(checked === true)}
      />
    );
  }

  if (option.kind === "select") {
    return (
      <Field htmlFor={id} label={option.label}>
        <Select
          className="w-full"
          onChange={(event) => onChange(event.target.value)}
          value={String(value)}
        >
          {option.choices?.map((choice) => (
            <option key={choice.value} value={choice.value}>
              {choice.label}
            </option>
          ))}
        </Select>
      </Field>
    );
  }

  return (
    <Field htmlFor={id} label={option.label}>
      <Input
        className="w-full"
        max={option.max}
        min={option.min}
        placeholder={option.placeholder}
        step={option.step}
        type={option.kind === "number" ? "number" : "text"}
        value={String(value)}
        onChange={(event) => {
          const nextValue = event.target.value;
          onChange(
            option.kind === "number" && nextValue !== ""
              ? Number(nextValue)
              : nextValue,
          );
        }}
      />
    </Field>
  );
}

const CONVERSION_WORKBENCH_TOOL_KEYS = new Set([
  "json-to-typescript",
  "json-minifier",
  "yaml-to-json",
  "json-to-yaml",
  "json-schema-generator",
  "json-editor",
  "xml-to-json",
  "json-to-xml",
  "json-array-to-table",
  "json-sorter",
  "csv-viewer",
  "csv-to-markdown-table",
  "csv-to-tsv",
  "tsv-to-csv",
  "csv-formatter",
  "csv-to-table",
  "csv-duplicate-remover",
  "csv-delimiter-converter",
  "text-diff-checker",
  "find-and-replace",
  "jwt-decoder",
  "base64-decoder",
  "base64-encoder",
  "url-decoder",
  "url-encoder",
  "binary-to-text",
  "html-encoder",
  "html-decoder",
  "text-to-binary",
  "hex-to-text",
  "text-to-hex",
  "unicode-decoder",
  "unicode-encoder",
  "bcrypt-compare",
  "hash-compare",
]);

function UtilityToolbarOptionControl({
  componentKey,
  onChange,
  option,
  value,
}: {
  componentKey: string;
  onChange: (value: string | number | boolean) => void;
  option: UtilityOptionDefinition;
  value: string | number | boolean;
}) {
  const id = `${componentKey}-${option.key}`;

  if (option.kind === "toggle") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs">{option.label}</span>
        <Switch checked={Boolean(value)} onCheckedChange={(checked) => onChange(checked)} size="sm" />
      </div>
    );
  }

  if (option.kind === "checkbox") {
    return (
      <Checkbox
        checked={Boolean(value)}
        className="min-h-0 items-center text-xs [&_span]:font-normal"
        id={id}
        label={option.label}
        onCheckedChange={(checked) => onChange(checked === true)}
      />
    );
  }

  if (option.kind === "select") {
    return (
      <Label className="flex items-center gap-2 text-xs font-normal" htmlFor={id}>
        <span>{option.label}</span>
        <Select
          className="h-8 w-40 bg-card py-0"
          id={id}
          onChange={(event) => onChange(event.target.value)}
          value={String(value)}
        >
          {option.choices?.map((choice) => (
            <option key={choice.value} value={choice.value}>{choice.label}</option>
          ))}
        </Select>
      </Label>
    );
  }

  return (
    <Label className="flex items-center gap-2 text-xs font-normal" htmlFor={id}>
      <span>{option.label}</span>
      <Input
        className="h-8 w-40 bg-card"
        id={id}
        max={option.max}
        min={option.min}
        onChange={(event) => onChange(option.kind === "number" ? Number(event.target.value) : event.target.value)}
        placeholder={option.placeholder}
        step={option.step}
        type={option.kind === "number" ? "number" : "text"}
        value={String(value)}
      />
    </Label>
  );
}

export function UtilityToolWorkbench({
  account,
  componentKey,
  description,
  serverAction,
  title,
}: {
  account: AccountNavigationProps;
  componentKey: string;
  description: string;
  serverAction?: (primary: string) => Promise<UtilityToolResult>;
  title: string;
}) {
  const definition = utilityToolDefinitions[componentKey];
  if (!definition) throw new Error(`Unknown utility tool: ${componentKey}`);

  const defaultOptions = useMemo(
    () => getUtilityOptionDefaults(definition.options),
    [definition.options],
  );
  const [primary, setPrimary] = useState("");
  const [secondary, setSecondary] = useState("");
  const [options, setOptions] =
    useState<UtilityOptionValues>(defaultOptions);
  const [result, setResult] = useState<UtilityToolResult | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [running, setRunning] = useState(false);
  const execution = useRef(0);
  const jsonResult = useMemo(
    () => (result?.outputKind === "text" ? parseJsonResult(result.output) : null),
    [result],
  );

  const execute = useCallback(async () => {
    const currentExecution = ++execution.current;
    setRunning(true);
    setError("");
    setNotice("Running…");

    try {
      const nextResult = serverAction
        ? await serverAction(primary)
        : await runUtilityTool(componentKey, primary, secondary, options);
      if (currentExecution !== execution.current) return;
      setResult(nextResult);
      setNotice("Result ready.");
    } catch (caught) {
      if (currentExecution !== execution.current) return;
      setResult(null);
      setError(caught instanceof Error ? caught.message : "Unable to run this tool.");
      setNotice("");
    } finally {
      if (currentExecution === execution.current) setRunning(false);
    }
  }, [componentKey, options, primary, secondary, serverAction]);

  useEffect(() => {
    if (!definition.live) return;
    if (
      definition.mode !== "generator" &&
      !primary.trim() &&
      !secondary.trim()
    ) {
      execution.current += 1;
      setResult(null);
      setError("");
      setNotice("Waiting for input.");
      setRunning(false);
      return;
    }
    void execute();
  }, [definition.live, definition.mode, execute, primary, secondary]);

  function updatePrimary(value: string) {
    setPrimary(value);
    setResult(null);
    setError("");
    setNotice("");
  }

  function updateSecondary(value: string) {
    setSecondary(value);
    setResult(null);
    setError("");
    setNotice("");
  }

  function updateOption(option: UtilityOptionDefinition, value: string | number | boolean) {
    setOptions((current) => ({ ...current, [option.key]: value }));
    setResult(null);
    setError("");
    setNotice("");
  }

  function loadExample() {
    setPrimary(definition.primaryExample ?? "");
    setSecondary(definition.secondaryExample ?? "");
    setOptions(defaultOptions);
    setResult(null);
    setError("");
    setNotice("Example loaded.");
  }

  function clear() {
    execution.current += 1;
    setPrimary("");
    setSecondary("");
    setOptions(defaultOptions);
    setResult(null);
    setError("");
    setNotice("Cleared.");
    setRunning(false);
  }

  async function pasteInput() {
    try {
      const value = await navigator.clipboard.readText();
      updatePrimary(value);
      setNotice("Input pasted from clipboard.");
    } catch {
      setNotice("Clipboard access was blocked. Paste into the input panel manually.");
    }
  }

  async function copyOutput() {
    if (!result?.output) return;
    try {
      await navigator.clipboard.writeText(result.output);
      setNotice("Output copied.");
    } catch {
      setNotice("Copy failed. Select the output and copy it manually.");
    }
  }

  function downloadOutput() {
    if (!result?.output) return;
    const link = document.createElement("a");
    const isDataUrl = result.outputKind === "image" && result.output.startsWith("data:");
    const url = isDataUrl
      ? result.output
      : URL.createObjectURL(
          new Blob([result.output], {
            type:
              result.outputKind === "html"
                ? "text/html;charset=utf-8"
                : result.outputKind === "image"
                  ? "image/svg+xml;charset=utf-8"
                  : "text/plain;charset=utf-8",
          }),
        );
    link.href = url;
    link.download =
      result.downloadName ??
      `${componentKey}.${
        result.outputKind === "html"
          ? "html"
          : result.outputKind === "image"
            ? "png"
            : "txt"
      }`;
    link.click();
    if (!isDataUrl) URL.revokeObjectURL(url);
    setNotice("Download ready.");
  }

  const hasExample =
    definition.primaryExample !== undefined ||
    definition.secondaryExample !== undefined;
  const hasChangedOptions = definition.options.some(
    (option) => options[option.key] !== defaultOptions[option.key],
  );
  const outputLabel = `${definition.name} output`;
  const externalSource = ({
    "domain-rating-checker": "Ahrefs",
    "domain-age-checker": "public RDAP registry data",
    "dns-checker": "Google Public DNS",
  } as Record<string, string>)[componentKey];
  const isOnlineTool = Boolean(externalSource);
  const categoryPresentation = ({
    "JWT & API Tools": { Icon: Globe2, guidance: "Check the generated request or response before using it in production." },
    "Web & Markup Tools": { Icon: Braces, guidance: "Review syntax and semantics before replacing source files." },
    "Color & Design Tools": { Icon: Palette, guidance: "Preview the visual result before copying the CSS." },
    "Date & Time Tools": { Icon: CalendarClock, guidance: "Confirm timezone and precision before using the result." },
    "Developer Generators": { Icon: WandSparkles, guidance: "Review generated values before saving or publishing them." },
    "Diagram Tools": { Icon: Workflow, guidance: "Keep labels concise, then export the final diagram." },
    "SEO & Domain Tools": { Icon: ShieldCheck, guidance: "Confirm the queried host and data source before acting on the result." },
  } as Record<string, { Icon: typeof Sparkles; guidance: string }>)[definition.category] ?? { Icon: Sparkles, guidance: "Review the result before copying or downloading it." };
  const UtilityIcon = categoryPresentation.Icon;
  const generatorInputOptions = definition.mode === "generator"
    ? definition.options.filter((option) => option.kind === "number" || option.kind === "text").slice(0, 2)
    : [];
  const sideOptions = definition.mode === "generator"
    ? definition.options.filter((option) => !generatorInputOptions.includes(option))
    : definition.options;
  const status = error
    ? error
    : running
      ? "Running…"
      : notice ||
        (result
          ? "Result ready."
          : definition.mode === "generator"
            ? "Configure the generator, then run it."
            : "Waiting for input.");
  const usesConversionWorkbench = CONVERSION_WORKBENCH_TOOL_KEYS.has(componentKey);

  if (usesConversionWorkbench) {
    const sourceLabel = definition.primaryLabel ?? "Input";
    const targetLabel = definition.mode === "dual"
      ? definition.secondaryLabel ?? "Comparison value"
      : definition.name.replace(/ Decoder$| Encoder$| Generator$/, " result");

    return (
      <ToolPageFrame
        account={account}
        category={definition.category}
        description={description}
        online={Boolean(serverAction)}
        title={title}
      >
        <ToolWorkspace
          variant="conversion"
          actions={
            <>
              <div className="flex min-w-0 items-end gap-2.5">
                <ConversionFormatSelector label="FROM" value={sourceLabel} />
                <Button aria-label="Swap formats" className="size-10 rounded-lg" size="icon" variant="outline">
                  <ArrowLeftRight aria-hidden="true" className="size-[18px]" />
                </Button>
                <ConversionFormatSelector label="TO" value={targetLabel} />
              </div>
              <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                <Button onClick={() => void pasteInput()} variant="ghost">
                  <ClipboardCheck aria-hidden="true" className="size-4" /> Paste
                </Button>
                {hasExample ? (
                  <Button onClick={loadExample} variant="outline">
                    Example
                  </Button>
                ) : null}
                <Button
                  aria-label="Clear"
                  disabled={!primary && !secondary && !hasChangedOptions && !result && !error}
                  onClick={clear}
                  variant="outline"
                >
                  Clear
                </Button>
                <Button data-testid="run-tool" disabled={running} onClick={() => void execute()}>
                  {running ? "Running…" : definition.runLabel}
                </Button>
              </div>
            </>
          }
          busy={running}
          options={definition.options.length ? (
            <>
              {definition.options.map((option) => (
                <UtilityToolbarOptionControl
                  componentKey={componentKey}
                  key={option.key}
                  onChange={(value) => updateOption(option, value)}
                  option={option}
                  value={options[option.key]}
                />
              ))}
              <span className="ml-auto font-mono text-[10px] text-muted-foreground">UTF-8 · Auto detect</span>
            </>
          ) : undefined}
          status={
            <>
              <span className={`inline-flex items-center gap-1.5 font-semibold ${error ? "text-destructive" : result ? "text-success" : "text-muted-foreground"}`}>
                {result ? <CheckCircle2 aria-hidden="true" className="size-3.5" /> : <Info aria-hidden="true" className="size-3.5" />}
                {status}
              </span>
              <span>{serverAction ? "Provider-assisted lookup" : "Processed in this browser"}</span>
            </>
          }
          toolbarLabel={`${definition.name} actions`}
        >
          <div className="flex min-h-0 w-full flex-1 flex-col">
            <div className="flex min-h-0 flex-1 max-[54rem]:block">
              <section
                className="flex min-w-0 flex-1 flex-col overflow-hidden border-r border-border bg-muted/30 max-[54rem]:min-h-[28rem] max-[54rem]:border-r-0 max-[54rem]:border-b"
                data-testid="utility-input-panel"
                data-workspace-panel="input"
              >
                <header className="flex h-[46px] shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4">
                  <h2 className="font-caption text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">{sourceLabel}</h2>
                  <span className="font-mono text-[10px] text-muted-foreground">{new TextEncoder().encode(primary).length.toLocaleString()} bytes</span>
                </header>
                <div className="flex min-h-0 flex-1 flex-col">
                  <Label className="sr-only" htmlFor={`${componentKey}-primary`}>
                    {sourceLabel}
                  </Label>
                  <div className="flex min-h-[22rem] flex-1 overflow-hidden bg-muted">
                    <pre aria-hidden="true" className="shrink-0 select-none border-r border-border/70 px-3 py-[18px] text-right font-mono text-xs leading-[1.65] text-muted-foreground/60">
                      {Array.from({ length: Math.max(1, primary.split("\n").length) }, (_, index) => index + 1).join("\n")}
                    </pre>
                    <Textarea
                      aria-invalid={Boolean(error)}
                      className="min-h-[22rem] flex-1 resize-none rounded-none border-0 bg-muted p-[18px] font-mono text-xs leading-[1.65] shadow-none focus-visible:ring-2 focus-visible:ring-inset"
                      id={`${componentKey}-primary`}
                      onChange={(event) => updatePrimary(event.target.value)}
                      placeholder={definition.primaryPlaceholder}
                      spellCheck={false}
                      value={primary}
                    />
                  </div>
                  {definition.mode === "dual" ? (
                    <>
                      <Label className="border-y border-border px-4 py-2 text-xs font-bold text-muted-foreground" htmlFor={`${componentKey}-secondary`}>
                        {definition.secondaryLabel ?? "Second input"}
                      </Label>
                      <Textarea
                        aria-invalid={Boolean(error)}
                        className="min-h-[12rem] flex-1 resize-y rounded-none border-0 bg-muted/20 p-4 font-mono text-[0.8125rem] leading-6 shadow-none focus-visible:ring-2 focus-visible:ring-inset"
                        id={`${componentKey}-secondary`}
                        onChange={(event) => updateSecondary(event.target.value)}
                        placeholder={definition.secondaryPlaceholder}
                        spellCheck={false}
                        value={secondary}
                      />
                    </>
                  ) : null}
                </div>
              </section>

              <section
                className="flex min-w-0 flex-1 flex-col overflow-hidden bg-card max-[54rem]:min-h-[28rem]"
                data-testid="utility-output-panel"
                data-workspace-panel="output"
              >
                <header className="flex h-[46px] shrink-0 items-center justify-between gap-3 border-b border-border px-4">
                  <div className="flex items-center gap-2">
                    <h2 className="font-caption text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">{targetLabel}</h2>
                    {result ? <CheckCircle2 aria-hidden="true" className="size-3.5 text-success" /> : null}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button aria-label="Copy output" disabled={!result?.output} onClick={() => void copyOutput()} size="sm" variant="ghost">
                      Copy
                    </Button>
                    <Button aria-label="Download output" disabled={!result?.output} onClick={downloadOutput} size="sm" variant="ghost">
                      Download
                    </Button>
                  </div>
                </header>
                {error ? (
                  <AlertBanner className="m-4" title="Needs attention" variant="error">{error}</AlertBanner>
                ) : result?.outputKind === "html" ? (
                  <iframe className="min-h-[25rem] w-full flex-1 bg-white" sandbox="" srcDoc={result.output} title={`${definition.name} preview`} />
                ) : result?.outputKind === "image" ? (
                  <div className="flex min-h-[25rem] flex-1 items-center justify-center overflow-auto p-6">
                    <img alt={`${definition.name} result`} className="max-h-[28rem] max-w-full object-contain" src={result.output} />
                  </div>
                ) : jsonResult && result ? (
                  <JsonResultRenderer
                    formattedValue={result.output}
                    label={outputLabel}
                    onCopy={(value, label) => void navigator.clipboard.writeText(value).then(() => setNotice(`${label} copied.`), () => setNotice("Copy failed. Select the output and copy it manually."))}
                    value={jsonResult.value}
                  />
                ) : (
                  <Textarea
                    aria-label={outputLabel}
                    className="min-h-[25rem] flex-1 resize-y rounded-none border-0 bg-card p-4 font-mono text-[0.8125rem] leading-6 shadow-none focus-visible:ring-2 focus-visible:ring-inset"
                    placeholder="Output will appear here."
                    readOnly
                    spellCheck={false}
                    value={result?.output ?? ""}
                  />
                )}
              </section>
            </div>
          </div>
        </ToolWorkspace>
      </ToolPageFrame>
    );
  }

  return (
    <ToolPageFrame
      account={account}
      category={definition.category}
      description={description}
      online={isOnlineTool}
      title={title}
    >
      <ToolWorkspace
        variant="utility"
            actions={
              <>
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-[34px] shrink-0 place-items-center rounded-lg bg-accent text-primary">
                    <UtilityIcon aria-hidden="true" className="size-[18px]" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate font-heading text-[13px] font-semibold text-foreground">{title}</h2>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {externalSource ? `Uses ${externalSource}` : "Runs in your browser · nothing is uploaded"}
                    </p>
                  </div>
                </div>
                <span className="ml-auto hidden items-center gap-[7px] text-xs text-muted-foreground xl:inline-flex">
                  <Lightbulb aria-hidden="true" className="size-[15px] text-primary" />
                  Tip · use the example to get started
                </span>
                {hasExample ? (
                  <Button
                    aria-label="Load example"
                    onClick={loadExample}
                    variant="ghost"
                  >
                    Example
                  </Button>
                ) : null}
                <Button
                  aria-label="Clear"
                  disabled={
                    !primary &&
                    !secondary &&
                    !hasChangedOptions &&
                    !result &&
                    !error
                  }
                  onClick={clear}
                  variant="outline"
                >
                  Reset
                </Button>
                <Button
                  data-testid="run-tool"
                  disabled={running}
                  onClick={() => void execute()}
                >
                  {running ? "Running…" : definition.runLabel}
                </Button>
              </>
            }
            busy={running}
            status={
              <>
                <span
                  className={`inline-flex items-center gap-1.5 font-semibold ${
                    error
                      ? "text-destructive"
                      : result
                        ? "text-primary"
                        : "text-muted-foreground"
                  }`}
                >
                  {error ? (
                    <Info aria-hidden="true" className="size-3.5 shrink-0" />
                  ) : result ? (
                    <CheckCircle2 aria-hidden="true" className="size-3.5 shrink-0" />
                  ) : (
                    <Info aria-hidden="true" className="size-3.5 shrink-0" />
                  )}
                  {status}
                </span>
                <span>
                  {definition.outputKind === "html"
                    ? "Sandboxed HTML preview"
                    : definition.outputKind === "image"
                      ? "Image preview"
                      : "Text output"}
                </span>
              </>
            }
            toolbarLabel={`${definition.name} actions`}
          >
            <div className="flex min-w-0 flex-1 flex-col border-r border-border max-[54rem]:w-full max-[54rem]:border-r-0 max-[54rem]:border-b">
            <section
              className="flex min-h-0 flex-1 flex-col overflow-hidden bg-card"
              data-testid="utility-input-panel"
              data-workspace-panel="input"
            >
              <header className="flex min-h-11 items-center border-b border-border px-4 py-2">
                <h2 className="text-xs font-extrabold tracking-[0.06em] uppercase">
                  {definition.mode === "generator" ? "Generator settings" : "Input"}
                </h2>
              </header>

              {definition.mode === "generator" ? (
                <div className="grid min-h-[25rem] content-start gap-4 p-5 sm:grid-cols-2 max-[54rem]:min-h-0">
                  {generatorInputOptions.map((option) => (
                    <UtilityOptionControl
                      componentKey={componentKey}
                      key={option.key}
                      onChange={(value) => updateOption(option, value)}
                      option={option}
                      value={options[option.key]}
                    />
                  ))}
                  {generatorInputOptions.length === 0 ? (
                    <p className="text-sm leading-6 text-muted-foreground sm:col-span-2">
                      Select {definition.runLabel.toLowerCase()} to create a result.
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="flex min-h-[25rem] flex-1 flex-col">
                  <div className="flex min-h-0 flex-1 flex-col">
                    <Label
                      className="border-b border-border px-4 py-2 text-xs font-bold text-muted-foreground"
                      htmlFor={`${componentKey}-primary`}
                    >
                      {definition.primaryLabel ?? "Input"}
                    </Label>
                    <Textarea
                      aria-invalid={Boolean(error)}
                      className="min-h-[17rem] flex-1 resize-y rounded-none border-0 bg-card p-4 font-mono text-[0.8125rem] leading-6 shadow-none focus-visible:ring-2 focus-visible:ring-inset"
                      id={`${componentKey}-primary`}
                      onChange={(event) => updatePrimary(event.target.value)}
                      placeholder={definition.primaryPlaceholder}
                      spellCheck={false}
                      value={primary}
                    />
                  </div>

                  {definition.mode === "dual" ? (
                    <div
                      className="flex min-h-0 flex-1 flex-col border-t border-border"
                    >
                      <Label
                        className="border-b border-border px-4 py-2 text-xs font-bold text-muted-foreground"
                        htmlFor={`${componentKey}-secondary`}
                      >
                        {definition.secondaryLabel ?? "Second input"}
                      </Label>
                      <Textarea
                        aria-invalid={Boolean(error)}
                        className="min-h-[12rem] flex-1 resize-y rounded-none border-0 bg-card p-4 font-mono text-[0.8125rem] leading-6 shadow-none focus-visible:ring-2 focus-visible:ring-inset"
                        id={`${componentKey}-secondary`}
                        onChange={(event) => updateSecondary(event.target.value)}
                        placeholder={definition.secondaryPlaceholder}
                        spellCheck={false}
                        value={secondary}
                      />
                    </div>
                  ) : null}
                </div>
              )}
            </section>

            <section
              className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-border bg-muted/15"
              data-testid="utility-output-panel"
              data-workspace-panel="output"
            >
              <header className="flex min-h-11 items-center justify-between gap-3 border-b border-border px-4 py-2">
                <h2 className="text-xs font-extrabold tracking-[0.06em] uppercase">
                  Output
                </h2>
                <div className="flex items-center gap-1">
                  <Button aria-label="Copy output" disabled={!result?.output} onClick={() => void copyOutput()} size="sm" variant="ghost">
                    <Copy aria-hidden="true" className="size-4" /> Copy
                  </Button>
                  <Button aria-label="Download output" disabled={!result?.output} onClick={downloadOutput} size="sm" variant="ghost">
                    <Download aria-hidden="true" className="size-4" /> Download
                  </Button>
                </div>
              </header>

              {error ? (
                <AlertBanner
                  className="m-4 min-h-[23rem] flex-1 text-destructive"
                  variant="error"
                >
                  {error}
                </AlertBanner>
              ) : result?.outputKind === "html" ? (
                <iframe
                  className="min-h-[25rem] w-full flex-1 bg-white"
                  sandbox=""
                  srcDoc={result.output}
                  title={`${definition.name} preview`}
                />
              ) : result?.outputKind === "image" ? (
                <div className="flex min-h-[25rem] flex-1 items-center justify-center overflow-auto p-6">
                  <img
                    alt={`${definition.name} result`}
                    className="max-h-[28rem] max-w-full object-contain"
                    src={result.output}
                  />
                </div>
              ) : jsonResult && result ? (
                <JsonResultRenderer
                  formattedValue={result.output}
                  label={outputLabel}
                  onCopy={(value, label) => {
                    void navigator.clipboard.writeText(value).then(
                      () => setNotice(`${label} copied.`),
                      () => setNotice("Copy failed. Select the output and copy it manually."),
                    );
                  }}
                  value={jsonResult.value}
                />
              ) : (
                <Textarea
                  aria-label={outputLabel}
                  className="min-h-[25rem] flex-1 resize-y rounded-none border-0 bg-muted/20 p-4 font-mono text-[0.8125rem] leading-6 shadow-none focus-visible:ring-2 focus-visible:ring-inset"
                  placeholder="Output will appear here."
                  readOnly
                  spellCheck={false}
                  value={result?.output ?? ""}
                />
              )}
            </section>
            </div>

              <aside
                aria-label={`${definition.name} options`}
                className="w-[460px] shrink-0 overflow-auto bg-card p-5 max-[64rem]:w-[380px] max-[54rem]:w-full max-[54rem]:border-t"
                data-testid="utility-options-panel"
                data-workspace-panel="details"
              >
                <h2 className="mb-4 text-xs font-extrabold tracking-[0.06em] uppercase">
                  Options · optional
                </h2>
                <div className="grid gap-4">
                  {sideOptions.map((option) => (
                    <UtilityOptionControl
                      componentKey={componentKey}
                      key={option.key}
                      onChange={(value) => updateOption(option, value)}
                      option={option}
                      value={options[option.key]}
                    />
                  ))}
                  {sideOptions.length === 0 ? (
                    <p className="text-sm leading-6 text-muted-foreground">No extra configuration is required for this tool.</p>
                  ) : null}
                </div>
                <div className="my-5 h-px bg-border" />
                <p className="mb-3 text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">Your result</p>
                <AlertBanner
                  title={error ? "Needs attention" : result ? "Result ready" : "Ready when you are"}
                  variant={error ? "error" : result ? "success" : "info"}
                >
                  {error || (result ? "Processed successfully. Copy or download the result below." : "Add input, review the options, then run the tool.")}
                </AlertBanner>
                <div className="mt-4 rounded-lg bg-muted p-3.5">
                  <p className="text-sm font-semibold text-foreground">{result ? "Output is ready" : "No output yet"}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {result ? `${result.output.length.toLocaleString()} characters generated` : "The result summary and actions will appear here."}
                  </p>
                </div>
              </aside>
      </ToolWorkspace>
    </ToolPageFrame>
  );
}
