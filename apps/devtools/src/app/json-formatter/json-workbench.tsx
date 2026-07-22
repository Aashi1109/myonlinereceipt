"use client";

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
  type AccountNavigationProps,
  AppContainer,
  Button,
  Input,
  ProductHeader,
  Select,
  StatusBadge,
  Textarea,
  ToolPageHeader,
} from "@smarttools/ui";
import {
  AlignLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Copy,
  Download,
  FileJson,
  Info,
  Minimize2,
  PanelRightClose,
  PanelRightOpen,
  ShieldCheck,
  Table2,
  Trash2,
} from "lucide-react";

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
} from "../../lib/format-json";

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
    spellcheck: "false",
  }),
];

const CODE_EDITOR_CLASS_NAME =
  "min-h-0 w-full flex-1 overflow-hidden bg-inherit text-slate-900 focus-within:ring-2 focus-within:ring-inset focus-within:ring-ring [&_.cm-activeLine]:bg-blue-50 [&_.cm-content]:min-w-max [&_.cm-content]:p-4 [&_.cm-content]:caret-primary [&_.cm-editor]:h-full [&_.cm-editor]:bg-inherit [&_.cm-editor]:text-slate-900 [&_.cm-gutters]:hidden [&_.cm-line]:p-0 [&_.cm-matchingBracket]:bg-blue-100 [&_.cm-matchingBracket]:outline [&_.cm-matchingBracket]:outline-1 [&_.cm-matchingBracket]:outline-blue-600 [&_.cm-placeholder]:text-slate-400 [&_.cm-scroller]:overflow-auto [&_.cm-scroller]:font-mono [&_.cm-scroller]:text-[0.8125rem] [&_.cm-scroller]:leading-5 [&_.cm-scroller]:[font-variant-ligatures:none] [&_.cm-scroller]:[tab-size:2]";

type JsonTreePath = readonly (string | number)[];
type JsonTreeSelection = {
  key: string;
  path: JsonTreePath;
  value: unknown;
};
type TreeExpansion = { version: number; open?: boolean };

const ROOT_JSON_TREE_PATH: JsonTreePath = [];
const FORMATTER_TREE_EXPANSION: TreeExpansion = { version: 0 };

function jsonTreePathsEqual(left: JsonTreePath, right: JsonTreePath) {
  return left.length === right.length && left.every((segment, index) => segment === right[index]);
}

function jsonTreePathKey(path: JsonTreePath) {
  return JSON.stringify(path);
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

function ToolWorkspace({
  actions,
  busy,
  children,
  status,
  toolbarLabel,
}: {
  actions: ReactNode;
  busy?: boolean;
  children: ReactNode;
  status: ReactNode;
  toolbarLabel: string;
}) {
  return (
    <section
      aria-busy={busy || undefined}
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground motion-reduce:[&_*]:transition-none max-[54rem]:overflow-visible"
      data-testid="tool-workspace"
    >
      <div
        aria-label={toolbarLabel}
        className="flex min-h-12 shrink-0 flex-wrap items-center gap-2 border-b border-border bg-card px-3 py-2 sm:px-4"
        data-testid="tool-action-toolbar"
      >
        {actions}
      </div>

      <div
        className="flex min-h-0 flex-1 overflow-hidden max-[54rem]:block max-[54rem]:overflow-visible"
        data-testid="tool-workspace-content"
      >
        {children}
      </div>

      <div
        aria-live="polite"
        className="flex min-h-8 shrink-0 items-center justify-between gap-4 border-t border-border bg-muted/40 px-4 py-1.5 text-xs text-muted-foreground max-[40rem]:flex-col max-[40rem]:items-start max-[40rem]:gap-1 max-[40rem]:py-2"
        data-testid="tool-status-line"
        role="status"
      >
        {status}
      </div>
    </section>
  );
}

function ToolBreadcrumb({
  category,
  title,
}: {
  category: string;
  title: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className="mb-5 text-xs font-bold text-muted-foreground">
      <a className="hover:text-primary hover:underline" href="/?view=all">All tools</a>
      <span aria-hidden="true" className="mx-2">/</span>
      <a
        className="hover:text-primary hover:underline"
        href={`/?category=${encodeURIComponent(category)}`}
      >
        {category}
      </a>
      <span aria-hidden="true" className="mx-2">/</span>
      <span aria-current="page">{title}</span>
    </nav>
  );
}

export default function JsonWorkbench({
  account,
  description,
  platformUrl,
  title,
}: {
  account: AccountNavigationProps;
  description: string;
  platformUrl: string;
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
        window.location.assign("/");
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
    <div className="min-h-screen bg-background text-foreground">
      <a
        className="fixed top-3 left-3 z-[100] -translate-y-[180%] rounded-md bg-primary px-3.5 py-2.5 font-bold text-primary-foreground focus:translate-y-0"
        href="#json-input"
      >
        Skip to JSON input
      </a>

      <ProductHeader
        actions={<AccountNavigation {...account} />}
        href={platformUrl}
        name="Devtools"
      />

      <main>
        <AppContainer className="py-8 sm:py-10">
          <ToolBreadcrumb category="JSON Tools" title={title} />

          <ToolPageHeader
            className="border-b-0 pb-0"
            description={description}
            eyebrow={
              <>
                <StatusBadge variant="success">Runs locally</StatusBadge>
                <span>JSON Tools</span>
              </>
            }
            inlineEyebrow
            title={title}
          />

          <div className="flex min-h-[33rem] flex-col max-[54rem]:block max-[54rem]:min-h-0">
            <ToolWorkspace
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
            <label
              className="flex min-h-9 w-48 min-w-0 items-center gap-1.5 rounded-md border border-slate-200 bg-slate-100 pl-2 max-[40rem]:w-full"
              htmlFor="indentation"
            >
              <span className="text-[0.6875rem] font-extrabold tracking-[0.06em] text-slate-500 uppercase">
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
            </label>
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
            <div className="border-l border-slate-200 pl-2">
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
                  className={`inline-flex items-center gap-1.5 ${result.ok ? "text-primary" : "text-rose-600"}`}
                >
                  {result.ok ? (
                    <CheckCircle2 aria-hidden="true" size={14} />
                  ) : (
                    <Info aria-hidden="true" size={14} />
                  )}
                  {notice || statusLabel}
                </span>
                <span aria-hidden="true" className="h-4 w-px bg-slate-300" />
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
            className="relative flex min-w-0 flex-[0_0_35%] flex-col overflow-hidden border-r border-slate-200 bg-slate-50 max-[64rem]:flex-[0_0_40%] max-[54rem]:min-h-[32rem] max-[54rem]:w-full max-[54rem]:flex-none max-[54rem]:border-r-0 max-[54rem]:border-b"
            data-workspace-panel="input"
          >
            <span className="absolute top-0 right-0 z-10 rounded-bl-md border-b border-l border-slate-200 bg-slate-100 px-2.5 py-1 text-[0.6875rem] font-extrabold tracking-[0.06em] text-slate-500 uppercase">
              Input
            </span>
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
              id="json-input"
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
            className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-white max-[54rem]:min-h-[32rem] max-[54rem]:w-full max-[54rem]:border-b max-[54rem]:border-slate-200"
            data-workspace-panel="output"
          >
            <span className="absolute top-0 right-0 z-10 rounded-bl-md border-b border-l border-slate-200 bg-slate-100 px-2.5 py-1 text-[0.6875rem] font-extrabold tracking-[0.06em] text-slate-500 uppercase">
              Output
            </span>
            {!inspectorOpen ? (
              <Button
                aria-label="Show inspector"
                className="absolute top-9 right-2 z-10 bg-white"
                onClick={() => setInspectorOpen(true)}
                size="icon"
                type="button"
                variant="outline"
              >
                <PanelRightOpen aria-hidden="true" size={18} />
              </Button>
            ) : null}
            {result.ok ? (
              <div className="min-h-0 flex-1 overflow-auto p-4">
                <div aria-label="JSON tree" className="w-max min-w-full" role="tree">
                  <JsonTreeNode
                    expansion={FORMATTER_TREE_EXPANSION}
                    label="root"
                    onCopy={copyNode}
                    onSelect={setSelectedNode}
                    path={ROOT_JSON_TREE_PATH}
                    selectedPath={selectedNode?.path}
                    value={result.value}
                  />
                </div>
              </div>
            ) : (
              <div className="m-auto flex max-w-lg items-start gap-3 p-6 text-slate-500">
                <Info aria-hidden="true" className="shrink-0" size={20} />
                <div>
                  <strong className="text-slate-900">
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
            className={`flex min-w-0 shrink-0 flex-col overflow-hidden border-l border-slate-200 bg-white transition-[width,flex-basis,border-color] duration-300 max-[54rem]:min-h-[38rem] max-[54rem]:border-l-0 max-[54rem]:border-b ${
              inspectorOpen
                ? "w-80 basis-80 max-[64rem]:w-72 max-[64rem]:basis-72 max-[54rem]:w-full max-[54rem]:basis-auto"
                : "invisible w-0 basis-0 border-transparent max-[54rem]:hidden"
            }`}
            data-workspace-panel="details"
            inert={!inspectorOpen ? true : undefined}
          >
            <section className="flex min-h-0 flex-1 flex-col border-b border-slate-200">
              <header className="flex min-h-13 shrink-0 items-center justify-between gap-2 border-b border-slate-200 px-4">
                <h2 className="flex items-center gap-1.5 text-xs font-extrabold tracking-[0.06em] text-slate-600 uppercase">
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
                <div
                  className={`mb-4 flex items-start gap-2 rounded-md border p-3 ${
                    result.ok
                      ? "border-blue-200 bg-blue-50 text-blue-700"
                      : "border-rose-200 bg-rose-50 text-rose-700"
                  }`}
                >
                  <Info aria-hidden="true" className="mt-0.5 shrink-0" size={18} />
                  <div>
                    <strong className="text-sm text-slate-950">{statusLabel}</strong>
                    <p className="mt-1 text-[0.8125rem] leading-5 text-slate-600">
                      {result.ok
                        ? "The document is well-formed and passes structural validation."
                        : result.error.message}
                    </p>
                  </div>
                </div>
                <dl>
                  <div className="flex min-h-9 items-center justify-between gap-4 border-b border-slate-200 text-[0.8125rem]">
                    <dt className="text-slate-500">Depth</dt>
                    <dd className="font-mono text-slate-900">
                      {summary ? `${summary.depth} levels` : "—"}
                    </dd>
                  </div>
                  <div className="flex min-h-9 items-center justify-between gap-4 border-b border-slate-200 text-[0.8125rem]">
                    <dt className="text-slate-500">Keys</dt>
                    <dd className="font-mono text-slate-900">{summary?.keyCount ?? "—"}</dd>
                  </div>
                  <div className="flex min-h-9 items-center justify-between gap-4 border-b border-slate-200 text-[0.8125rem]">
                    <dt className="text-slate-500">Arrays</dt>
                    <dd className="font-mono text-slate-900">{summary?.arrayCount ?? "—"}</dd>
                  </div>
                </dl>
              </div>
            </section>

            <section className="flex min-h-0 flex-[1.5] flex-col">
              <header className="flex min-h-13 shrink-0 items-center justify-between gap-2 border-b border-slate-200 px-4">
                <h2 className="text-xs font-extrabold tracking-[0.06em] text-slate-600 uppercase">
                  Node Metadata
                </h2>
              </header>
              <div className="min-h-0 flex-1 overflow-auto p-4">
                <div>
                  <p className="mb-1.5 text-xs font-extrabold tracking-[0.04em] text-slate-500 uppercase">
                    Selected Key
                  </p>
                  <code className="block rounded-md border border-slate-200 bg-slate-50 p-2.5 font-mono text-[0.8125rem] text-slate-900">
                    {selectedMetadata ? `"${selectedMetadata.selectedKey}"` : "—"}
                  </code>
                </div>
                <div className="mt-4">
                  <p className="mb-1.5 text-xs font-extrabold tracking-[0.04em] text-slate-500 uppercase">
                    Value Type
                  </p>
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 font-mono text-[0.8125rem] text-slate-800">
                    <i aria-hidden="true" className="size-2 rounded-full bg-primary" />
                    {selectedMetadata?.selectedType ?? "Unknown"}
                  </span>
                </div>
                <div className="mt-4">
                  <p className="mb-1.5 text-xs font-extrabold tracking-[0.04em] text-slate-500 uppercase">
                    Data Preview
                  </p>
                  <div className="overflow-hidden rounded-md border border-slate-200 bg-slate-50 font-mono text-xs">
                    <table aria-label="Data Preview" className="w-full table-fixed text-left">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500">
                          <th className="w-[40%] px-2.5 py-2 font-normal" scope="col">Key</th>
                          <th className="px-2.5 py-2 font-normal" scope="col">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedMetadata?.preview.length ? (
                          selectedMetadata.preview.map((item) => (
                            <tr className="border-b border-slate-200 last:border-b-0" key={item.key}>
                              <th className="px-2.5 py-2 font-normal text-slate-400" scope="row">
                                {item.key}
                              </th>
                              <td className="px-2.5 py-2">
                                <code className="font-mono text-primary">{item.value}</code>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td className="p-3 font-sans text-slate-500" colSpan={2}>
                              No value preview available.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>
          </aside>
            </ToolWorkspace>
          </div>

          <section className="mt-8 flex items-start gap-4 rounded-2xl border border-primary/20 bg-accent p-5 sm:p-6">
            <ShieldCheck aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-primary" />
            <div>
              <h2 className="font-extrabold">Your JSON stays on this device</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Formatting, validation, inspection, and copying all run in this browser.
              </p>
            </div>
          </section>
        </AppContainer>
      </main>

      <span className="sr-only">
        Maximum input size is {MAX_JSON_INPUT_CHARS.toLocaleString()} characters.
      </span>
    </div>
  );
}

const CONVERSION_EXAMPLES = {
  "json-to-csv": '[{"id":1,"name":"Alice"},{"id":2,"name":"Bob"}]',
  "csv-to-json": "id,name\n1,Alice\n2,Bob",
} as const;

export function DataConversionWorkbench({
  account,
  conversion,
  description,
  platformUrl,
  title,
}: {
  account: AccountNavigationProps;
  conversion: keyof typeof CONVERSION_EXAMPLES;
  description: string;
  platformUrl: string;
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
    <div className="min-h-screen bg-background text-foreground">
      <ProductHeader
        actions={<AccountNavigation {...account} />}
        href={platformUrl}
        name="Devtools"
      />

      <main>
        <AppContainer className="py-8 sm:py-10">
          <ToolBreadcrumb category="JSON Tools" title={title} />

          <ToolPageHeader
            className="border-b-0 pb-0"
            description={description}
            eyebrow={
              <>
                <StatusBadge variant="success">Runs locally</StatusBadge>
                <span>JSON Tools</span>
              </>
            }
            inlineEyebrow
            title={title}
          />

          <ToolWorkspace
            actions={
              <>
                <Button
                  onClick={() => {
                    updateInput(CONVERSION_EXAMPLES[conversion]);
                    setNotice("Example loaded.");
                  }}
                  size="sm"
                >
                  <FileJson aria-hidden="true" className="size-4" />
                  Load example
                </Button>
                <Button
                  aria-label={`Copy ${targetFormat} output`}
                  disabled={!canExport}
                  onClick={copyOutput}
                  size="sm"
                  variant="outline"
                >
                  <Copy aria-hidden="true" className="size-4" />
                  Copy
                </Button>
                <Button
                  aria-label={`Download ${targetFormat} output`}
                  disabled={!canExport}
                  onClick={downloadOutput}
                  size="sm"
                  variant="outline"
                >
                  <Download aria-hidden="true" className="size-4" />
                  Download
                </Button>

                <div className="flex flex-1 flex-wrap items-center gap-2 sm:ml-2">
                  {!convertsCsv ? (
                    <label
                      className="flex min-h-9 items-center gap-2 rounded-lg border border-border bg-muted/40 px-2 text-xs font-bold"
                      htmlFor="repair-mode"
                    >
                      <span className="whitespace-nowrap">Auto-fix</span>
                      <Select
                        className="h-8 w-44 border-0 bg-transparent py-0 shadow-none focus-visible:ring-0"
                        id="repair-mode"
                        onChange={(event) => setRepairMode(event.target.value as JsonRepairMode)}
                        value={repairMode}
                      >
                        <option value="remove">Remove broken parts</option>
                        <option value="null">Replace with null</option>
                        <option value="off">Do not repair</option>
                      </Select>
                    </label>
                  ) : null}
                  <label
                    className="flex min-h-9 items-center gap-2 rounded-lg border border-border bg-muted/40 px-2 text-xs font-bold"
                    htmlFor="csv-delimiter"
                  >
                    <span>Delimiter</span>
                    <Select
                      className="h-8 w-28 border-0 bg-transparent py-0 shadow-none focus-visible:ring-0"
                      id="csv-delimiter"
                      onChange={(event) => setDelimiter(event.target.value as CsvDelimiter)}
                      value={delimiter}
                    >
                      <option value=",">Comma</option>
                      <option value=";">Semicolon</option>
                      <option value={"\t"}>Tab</option>
                      <option value="|">Pipe</option>
                    </Select>
                  </label>
                </div>

                <div className="ml-auto border-l border-border pl-2">
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
              className="flex min-w-0 flex-[0_0_35%] flex-col overflow-hidden border-r border-border bg-card max-[64rem]:flex-[0_0_40%] max-[54rem]:min-h-[28rem] max-[54rem]:w-full max-[54rem]:border-r-0 max-[54rem]:border-b"
              data-workspace-panel="input"
            >
              <header className="flex min-h-11 items-center justify-between gap-3 border-b border-border px-4 py-2">
                <h2 className="flex items-center gap-2 text-xs font-extrabold tracking-[0.06em] uppercase">
                  {convertsCsv ? (
                    <Table2 aria-hidden="true" className="size-4 text-primary" />
                  ) : (
                    <FileJson aria-hidden="true" className="size-4 text-primary" />
                  )}
                  {sourceFormat} input
                </h2>
                <span className="text-xs text-muted-foreground">
                  {input.length.toLocaleString()} chars
                </span>
              </header>
              <Textarea
                aria-invalid={Boolean(input) && !result.ok}
                aria-label={`${sourceFormat} input`}
                className="min-h-[25rem] flex-1 resize-y rounded-none border-0 bg-card p-4 font-mono text-[0.8125rem] leading-6 shadow-none focus-visible:ring-2 focus-visible:ring-inset"
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
            </section>

            <section
              className="flex min-w-0 flex-1 flex-col overflow-hidden bg-muted/15 max-[54rem]:min-h-[28rem] max-[54rem]:w-full"
              data-workspace-panel="output"
            >
              <header className="flex min-h-11 items-center border-b border-border px-4 py-2">
                <h2 className="flex items-center gap-2 text-xs font-extrabold tracking-[0.06em] uppercase">
                  {convertsCsv ? (
                    <FileJson aria-hidden="true" className="size-4 text-primary" />
                  ) : (
                    <Table2 aria-hidden="true" className="size-4 text-primary" />
                  )}
                  {targetFormat} output
                </h2>
              </header>
              <Textarea
                aria-label={`${targetFormat} output`}
                className="min-h-[25rem] flex-1 resize-y rounded-none border-0 bg-muted/20 p-4 font-mono text-[0.8125rem] leading-6 shadow-none focus-visible:ring-2 focus-visible:ring-inset"
                placeholder={`Converted ${targetFormat} will appear here.`}
                readOnly
                spellCheck={false}
                value={result.ok ? result.output : ""}
              />
            </section>
          </ToolWorkspace>

          <section className="mt-8 flex items-start gap-4 rounded-2xl border border-primary/20 bg-accent p-5 sm:p-6">
            <ShieldCheck aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-primary" />
            <div>
              <h2 className="font-extrabold">Your data never leaves this browser</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Conversion, copying, and file creation all happen on this device.
              </p>
            </div>
          </section>
        </AppContainer>
      </main>

      <footer className="border-t border-border bg-card py-6 text-xs text-muted-foreground">
        <AppContainer className="flex flex-wrap items-center justify-between gap-3">
          <span>© {new Date().getFullYear()} SmartTools Devtools</span>
          <span>Local processing · {targetFormat} export · Privacy-first</span>
        </AppContainer>
      </footer>
    </div>
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

function JsonTreeNode({
  depth = 0,
  expansion,
  isArrayItem = false,
  label,
  onCopy,
  onSelect,
  path = ROOT_JSON_TREE_PATH,
  selectedPath,
  value,
}: {
  depth?: number;
  expansion: TreeExpansion;
  isArrayItem?: boolean;
  label: string;
  onCopy: (value: string, label: string) => void;
  onSelect?: (selection: JsonTreeSelection) => void;
  path?: JsonTreePath;
  selectedPath?: JsonTreePath;
  value: unknown;
}) {
  const entries =
    value !== null && typeof value === "object"
      ? Array.isArray(value)
        ? value.map((child, index) => [String(index), child] as const)
        : Object.entries(value)
      : null;
  const [open, setOpen] = useState(expansion.open ?? (depth < 2));
  const isRoot = depth === 0;
  const displayedLabel = isRoot
    ? ""
    : Array.isArray(value) || isArrayItem
      ? `[${label}]`
      : JSON.stringify(label);
  const treeItemLabel = isRoot ? "root" : isArrayItem ? `[${label}]` : label;
  const isSelectable = Boolean(onSelect);
  const isSelected = Boolean(selectedPath && jsonTreePathsEqual(path, selectedPath));
  const copyLabel = isRoot ? "Root node" : `${label} node`;
  const copyButton = (
    <button
      aria-label={`Copy ${isRoot ? "root" : label} value`}
      className="ml-2 grid size-6 shrink-0 place-items-center rounded text-muted-foreground opacity-0 transition hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100"
      onClick={(event) => {
        event.stopPropagation();
        onCopy(JSON.stringify(value, null, 2) ?? String(value), copyLabel);
      }}
      title={`Copy ${isRoot ? "root" : label} value`}
      type="button"
    >
      <Copy aria-hidden="true" className="size-3.5" />
    </button>
  );

  useEffect(() => {
    if (expansion.open !== undefined) setOpen(expansion.open);
  }, [expansion.open, expansion.version]);

  function selectNode(expand = false) {
    if (!onSelect) return;
    onSelect({ key: isRoot ? "root" : label, path, value });
    if (expand && entries?.length) setOpen(true);
  }

  function handleSelectionKeyDown(event: React.KeyboardEvent<HTMLDivElement>, expand = false) {
    if (event.target !== event.currentTarget) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    selectNode(expand);
  }

  const selectedClassName = isSelected
    ? "bg-primary/10 ring-1 ring-inset ring-primary/30"
    : "hover:bg-muted/60 focus-within:bg-muted/60";

  if (!entries) {
    const type = value === null ? "null" : typeof value;
    const displayedValue = type === "string" ? JSON.stringify(value) : String(value);
    return (
      <div
        aria-label={isSelectable ? treeItemLabel : undefined}
        aria-selected={isSelectable ? isSelected : undefined}
        className={`group flex min-w-max items-center rounded px-1 font-mono text-[0.875rem] leading-7 ${selectedClassName}`}
        onClick={isSelectable ? () => selectNode() : undefined}
        onFocus={isSelectable ? (event) => {
          if (event.target === event.currentTarget) selectNode();
        } : undefined}
        onKeyDown={isSelectable ? (event) => handleSelectionKeyDown(event) : undefined}
        role={isSelectable ? "treeitem" : undefined}
        tabIndex={isSelectable ? 0 : undefined}
      >
        {displayedLabel ? (
          <>
            <span className="ml-5 font-medium text-primary">{displayedLabel}</span>
            <span className="mx-1 text-muted-foreground">:</span>
          </>
        ) : null}
        <span
          className={
            type === "string"
              ? "text-emerald-700"
              : type === "number"
                ? "text-amber-700"
                : "text-violet-700"
          }
        >
          {displayedValue}
        </span>
        {copyButton}
      </div>
    );
  }

  const typeLabel = Array.isArray(value) ? `Array(${entries.length})` : "Object";
  const canExpand = entries.length > 0;
  const nodeDescription = (
    <>
      {displayedLabel ? (
        <>
          <span className="font-medium text-primary">{displayedLabel}</span>
          <span className="mx-1 text-muted-foreground">:</span>
        </>
      ) : null}
      <span className="text-muted-foreground">{typeLabel}</span>
    </>
  );

  return (
    <div
      className="min-w-max font-mono text-[0.875rem] leading-7 text-foreground"
    >
      <div
        aria-expanded={isSelectable && canExpand ? open : undefined}
        aria-label={isSelectable ? treeItemLabel : undefined}
        aria-selected={isSelectable ? isSelected : undefined}
        className={`group flex min-w-max items-center rounded px-1 ${selectedClassName}`}
        onClick={isSelectable ? () => selectNode(true) : undefined}
        onFocus={isSelectable ? (event) => {
          if (event.target === event.currentTarget) selectNode();
        } : undefined}
        onKeyDown={isSelectable ? (event) => handleSelectionKeyDown(event, true) : undefined}
        role={isSelectable ? "treeitem" : undefined}
        tabIndex={isSelectable ? 0 : undefined}
      >
        {canExpand && isSelectable ? (
          <button
            aria-expanded={open}
            aria-label={`${open ? "Collapse" : "Expand"} ${isRoot ? "root" : label}`}
            className="flex size-5 shrink-0 items-center justify-center focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={(event) => {
              event.stopPropagation();
              setOpen((current) => !current);
            }}
            type="button"
          >
            {open ? (
              <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground" />
            ) : (
              <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
            )}
          </button>
        ) : canExpand ? (
          <button
            aria-expanded={open}
            aria-label={`${open ? "Collapse" : "Expand"} ${isRoot ? "root" : label}`}
            className="flex min-w-0 items-center text-left focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={(event) => {
              event.stopPropagation();
              setOpen((current) => !current);
            }}
            type="button"
          >
            {open ? (
              <ChevronDown aria-hidden="true" className="mr-1 size-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight aria-hidden="true" className="mr-1 size-4 shrink-0 text-muted-foreground" />
            )}
            {nodeDescription}
          </button>
        ) : (
          <div className="flex min-w-0 items-center">
            <span aria-hidden="true" className="mr-1 block size-4 shrink-0" />
            {nodeDescription}
          </div>
        )}
        {canExpand && isSelectable ? nodeDescription : null}
        {copyButton}
      </div>
      {canExpand && open ? (
        <div className="ml-5" role={isSelectable ? "group" : undefined}>
          {entries.map(([key, child]) => {
            const childPath = [
              ...path,
              Array.isArray(value) ? Number(key) : key,
            ] as const;
            return (
              <JsonTreeNode
                depth={depth + 1}
                expansion={expansion}
                isArrayItem={Array.isArray(value)}
                key={jsonTreePathKey(childPath)}
                label={key}
                onCopy={onCopy}
                onSelect={onSelect}
                path={childPath}
                selectedPath={selectedPath}
                value={child}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function JsonViewerWorkbench({
  account,
  description,
  platformUrl,
  title,
}: {
  account: AccountNavigationProps;
  description: string;
  platformUrl: string;
  title: string;
}) {
  const [input, setInput] = useState("");
  const [layout, setLayout] = useState<"modern" | "classic">("modern");
  const [classicTab, setClassicTab] = useState<"text" | "tree">("text");
  const [repairMode, setRepairMode] =
    useState<Exclude<JsonRepairMode, "off">>("remove");
  const [expansion, setExpansion] = useState<TreeExpansion>({
    version: 0,
  });
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

  function download() {
    if (!ready) return;
    const url = URL.createObjectURL(
      new Blob([result.output], { type: "application/json;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "smarttools-viewer.json";
    link.click();
    URL.revokeObjectURL(url);
    setNotice("JSON downloaded.");
  }

  const showText = layout === "modern" || classicTab === "text";
  const showTree = layout === "modern" || classicTab === "tree";
  const status = deferredInput !== input
    ? "Parsing JSON…"
    : result.ok
      ? "Interactive tree ready."
      : result.error.message;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ProductHeader
        actions={<AccountNavigation {...account} />}
        href={platformUrl}
        name="Devtools"
      />

      <main>
        <AppContainer className="py-8 sm:py-10">
          <ToolBreadcrumb category="JSON Tools" title={title} />

          <ToolPageHeader
            className="border-b-0 pb-0"
            description={description}
            eyebrow={
              <>
                <StatusBadge variant="success">Runs locally</StatusBadge>
                <span>JSON Tools</span>
              </>
            }
            inlineEyebrow
            title={title}
          />

          <ToolWorkspace
            actions={
              <>
                <Button disabled={!input} onClick={repairInput} size="sm">
                  Repair &amp; clean
                </Button>
                <label
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
                </label>
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

                <div className="ml-auto flex flex-wrap gap-1">
                  <Button
                    disabled={!ready}
                    onClick={() =>
                      setExpansion(({ version }) => ({
                        version: version + 1,
                        open: true,
                      }))
                    }
                    size="sm"
                    variant="ghost"
                  >
                    Expand all
                  </Button>
                  <Button
                    disabled={!ready}
                    onClick={() =>
                      setExpansion(({ version }) => ({
                        version: version + 1,
                        open: false,
                      }))
                    }
                    size="sm"
                    variant="ghost"
                  >
                    Collapse all
                  </Button>
                </div>
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
                <header className="flex min-h-11 items-center justify-between border-b border-border px-4 py-2">
                  <h2 className="text-xs font-extrabold tracking-[0.06em] uppercase">
                    Tree view
                  </h2>
                  <div className="flex gap-1">
                    <Button
                      disabled={!ready}
                      onClick={() => copy(result.ok ? result.output : "", "JSON")}
                      size="sm"
                      variant="ghost"
                    >
                      <Copy aria-hidden="true" className="size-4" />
                      Copy
                    </Button>
                    <Button
                      disabled={!ready}
                      onClick={download}
                      size="sm"
                      variant="ghost"
                    >
                      <Download aria-hidden="true" className="size-4" />
                      Download
                    </Button>
                  </div>
                </header>
                <div className="min-h-[30rem] flex-1 overflow-auto p-4">
                  {result.ok ? (
                    <div aria-label="JSON tree" className="w-max min-w-full" role="region">
                      <JsonTreeNode
                        expansion={expansion}
                        label="root"
                        onCopy={copy}
                        value={result.value}
                      />
                    </div>
                  ) : (
                    <div className="flex min-h-[27rem] items-center justify-center p-6 text-center text-sm text-muted-foreground">
                      {input ? result.error.message : "Interactive tree will appear here."}
                    </div>
                  )}
                </div>
              </section>
            ) : null}
          </ToolWorkspace>

          <section className="mt-8 flex items-start gap-4 rounded-2xl border border-primary/20 bg-accent p-5 sm:p-6">
            <ShieldCheck aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-primary" />
            <div>
              <h2 className="font-extrabold">Your JSON stays on this device</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Parsing, repair, tree rendering, copying, and downloads all run in this browser.
              </p>
            </div>
          </section>
        </AppContainer>
      </main>
    </div>
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

  if (option.kind === "checkbox") {
    return (
      <label className="flex min-h-9 items-center gap-2 text-sm font-semibold" htmlFor={id}>
        <input
          checked={Boolean(value)}
          className="size-4 rounded border-border accent-primary"
          id={id}
          onChange={(event) => onChange(event.target.checked)}
          type="checkbox"
        />
        {option.label}
      </label>
    );
  }

  if (option.kind === "select") {
    return (
      <label className="grid gap-1 text-xs font-bold" htmlFor={id}>
        {option.label}
        <Select
          className="w-full"
          id={id}
          onChange={(event) => onChange(event.target.value)}
          value={String(value)}
        >
          {option.choices?.map((choice) => (
            <option key={choice.value} value={choice.value}>
              {choice.label}
            </option>
          ))}
        </Select>
      </label>
    );
  }

  return (
    <label className="grid gap-1 text-xs font-bold" htmlFor={id}>
      {option.label}
      <Input
        className="w-full"
        id={id}
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
    </label>
  );
}

export function UtilityToolWorkbench({
  account,
  componentKey,
  description,
  platformUrl,
  serverAction,
  title,
}: {
  account: AccountNavigationProps;
  componentKey: string;
  description: string;
  platformUrl: string;
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ProductHeader
        actions={<AccountNavigation {...account} />}
        href={platformUrl}
        name="Devtools"
      />

      <main>
        <AppContainer className="py-8 sm:py-10">
          <ToolBreadcrumb category={definition.category} title={title} />

          <ToolPageHeader
            className="border-b-0 pb-0"
            description={description}
            eyebrow={
              <>
                <StatusBadge variant="success">Runs locally</StatusBadge>
                <span>{definition.category}</span>
              </>
            }
            inlineEyebrow
            title={title}
          />

          <ToolWorkspace
            actions={
              <>
                <Button
                  data-testid="run-tool"
                  disabled={running}
                  onClick={() => void execute()}
                  size="sm"
                >
                  {running ? "Running…" : definition.runLabel}
                </Button>
                {hasExample ? (
                  <Button
                    aria-label="Load example"
                    onClick={loadExample}
                    size="sm"
                    variant="outline"
                  >
                    Load example
                  </Button>
                ) : null}
                <Button
                  aria-label="Copy output"
                  disabled={!result?.output}
                  onClick={() => void copyOutput()}
                  size="sm"
                  variant="outline"
                >
                  <Copy aria-hidden="true" className="size-4" />
                  Copy
                </Button>
                <Button
                  aria-label="Download output"
                  disabled={!result?.output}
                  onClick={downloadOutput}
                  size="sm"
                  variant="outline"
                >
                  <Download aria-hidden="true" className="size-4" />
                  Download
                </Button>
                <div className="ml-auto border-l border-border pl-2">
                  <Button
                    disabled={
                      !primary &&
                      !secondary &&
                      !hasChangedOptions &&
                      !result &&
                      !error
                    }
                    onClick={clear}
                    size="sm"
                    variant="ghost"
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                    Clear
                  </Button>
                </div>
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
            <section
              className="flex min-w-0 flex-[0_0_35%] flex-col overflow-hidden border-r border-border bg-card max-[64rem]:flex-[0_0_40%] max-[54rem]:min-h-[28rem] max-[54rem]:w-full max-[54rem]:border-r-0 max-[54rem]:border-b"
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
                  {definition.options.map((option) => (
                    <UtilityOptionControl
                      componentKey={componentKey}
                      key={option.key}
                      onChange={(value) => updateOption(option, value)}
                      option={option}
                      value={options[option.key]}
                    />
                  ))}
                  {definition.options.length === 0 ? (
                    <p className="text-sm leading-6 text-muted-foreground sm:col-span-2">
                      Select {definition.runLabel.toLowerCase()} to create a result.
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="flex min-h-[25rem] flex-1 flex-col">
                  <label className="flex min-h-0 flex-1 flex-col" htmlFor={`${componentKey}-primary`}>
                    <span className="border-b border-border px-4 py-2 text-xs font-bold text-muted-foreground">
                      {definition.primaryLabel ?? "Input"}
                    </span>
                    <Textarea
                      aria-invalid={Boolean(error)}
                      className="min-h-[17rem] flex-1 resize-y rounded-none border-0 bg-card p-4 font-mono text-[0.8125rem] leading-6 shadow-none focus-visible:ring-2 focus-visible:ring-inset"
                      id={`${componentKey}-primary`}
                      onChange={(event) => updatePrimary(event.target.value)}
                      placeholder={definition.primaryPlaceholder}
                      spellCheck={false}
                      value={primary}
                    />
                  </label>

                  {definition.mode === "dual" ? (
                    <label
                      className="flex min-h-0 flex-1 flex-col border-t border-border"
                      htmlFor={`${componentKey}-secondary`}
                    >
                      <span className="border-b border-border px-4 py-2 text-xs font-bold text-muted-foreground">
                        {definition.secondaryLabel ?? "Second input"}
                      </span>
                      <Textarea
                        aria-invalid={Boolean(error)}
                        className="min-h-[12rem] flex-1 resize-y rounded-none border-0 bg-card p-4 font-mono text-[0.8125rem] leading-6 shadow-none focus-visible:ring-2 focus-visible:ring-inset"
                        id={`${componentKey}-secondary`}
                        onChange={(event) => updateSecondary(event.target.value)}
                        placeholder={definition.secondaryPlaceholder}
                        spellCheck={false}
                        value={secondary}
                      />
                    </label>
                  ) : null}
                </div>
              )}
            </section>

            <section
              className="flex min-w-0 flex-1 flex-col overflow-hidden bg-muted/15 max-[54rem]:min-h-[28rem] max-[54rem]:w-full"
              data-testid="utility-output-panel"
              data-workspace-panel="output"
            >
              <header className="flex min-h-11 items-center border-b border-border px-4 py-2">
                <h2 className="text-xs font-extrabold tracking-[0.06em] uppercase">
                  Output
                </h2>
              </header>

              {error ? (
                <div
                  className="m-4 min-h-[23rem] flex-1 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
                  role="alert"
                >
                  {error}
                </div>
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

            {definition.mode !== "generator" && definition.options.length > 0 ? (
              <aside
                aria-label={`${definition.name} options`}
                className="w-72 shrink-0 overflow-auto border-l border-border bg-card p-4 max-[64rem]:w-64 max-[54rem]:w-full max-[54rem]:border-t max-[54rem]:border-l-0"
                data-testid="utility-options-panel"
                data-workspace-panel="details"
              >
                <h2 className="mb-4 text-xs font-extrabold tracking-[0.06em] uppercase">
                  Options
                </h2>
                <div className="grid gap-4">
                  {definition.options.map((option) => (
                    <UtilityOptionControl
                      componentKey={componentKey}
                      key={option.key}
                      onChange={(value) => updateOption(option, value)}
                      option={option}
                      value={options[option.key]}
                    />
                  ))}
                </div>
              </aside>
            ) : null}
          </ToolWorkspace>

          <section className="mt-8 flex items-start gap-4 rounded-2xl border border-primary/20 bg-accent p-5 sm:p-6">
            <ShieldCheck aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-primary" />
            <div>
              <h2 className="font-extrabold">Built for quick browser-side work</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Inputs stay in this workbench while you transform, inspect, copy, or download the result.
              </p>
            </div>
          </section>
        </AppContainer>
      </main>
    </div>
  );
}
