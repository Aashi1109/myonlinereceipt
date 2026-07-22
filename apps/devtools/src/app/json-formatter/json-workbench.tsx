"use client";

import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { json } from "@codemirror/lang-json";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import {
  AccountNavigation,
  type AccountNavigationProps,
  BrandLockup,
  Button,
  Select,
  StatusBadge,
} from "@smarttools/ui";
import {
  AlignLeft,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Info,
  Minimize2,
  PanelRightClose,
  PanelRightOpen,
  Search,
  TerminalSquare,
  Trash2,
} from "lucide-react";

import {
  MAX_JSON_INPUT_CHARS,
  type JsonIndentation,
  type JsonTransformMode,
  summarizeJson,
  transformJson,
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
const JSON_RESULT_EXTENSIONS = [
  json(),
  EditorView.contentAttributes.of({ "aria-label": "Formatted JSON output" }),
];

const CODE_EDITOR_CLASS_NAME =
  "min-h-0 w-full flex-1 overflow-hidden bg-inherit text-slate-900 focus-within:ring-2 focus-within:ring-inset focus-within:ring-ring [&_.cm-activeLine]:bg-blue-50 [&_.cm-content]:min-w-max [&_.cm-content]:p-4 [&_.cm-content]:caret-primary [&_.cm-editor]:h-full [&_.cm-editor]:bg-inherit [&_.cm-editor]:text-slate-900 [&_.cm-gutters]:hidden [&_.cm-line]:p-0 [&_.cm-matchingBracket]:bg-blue-100 [&_.cm-matchingBracket]:outline [&_.cm-matchingBracket]:outline-1 [&_.cm-matchingBracket]:outline-blue-600 [&_.cm-placeholder]:text-slate-400 [&_.cm-scroller]:overflow-auto [&_.cm-scroller]:font-mono [&_.cm-scroller]:text-[0.8125rem] [&_.cm-scroller]:leading-5 [&_.cm-scroller]:[font-variant-ligatures:none] [&_.cm-scroller]:[tab-size:2]";

export default function JsonWorkbench({
  account,
  platformUrl,
}: {
  account: AccountNavigationProps;
  platformUrl: string;
}) {
  const [input, setInput] = useState(EXAMPLE_JSON);
  const [mode, setMode] = useState<JsonTransformMode>("format");
  const [indentation, setIndentation] = useState<JsonIndentation>(2);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [notice, setNotice] = useState("");
  const [cursor, setCursor] = useState({ line: 1, column: 1 });
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

  async function copyResult() {
    if (!canUseResult) return;

    try {
      await navigator.clipboard.writeText(result.output);
      setNotice("Formatted JSON copied.");
    } catch {
      setNotice("Copy failed. Select the output and copy it manually.");
    }
  }

  function clearInput() {
    setInput("");
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
    <div className="flex h-dvh min-h-[44rem] w-full max-w-[100vw] flex-col overflow-hidden bg-slate-50 text-slate-900 motion-reduce:[&_*]:transition-none max-[54rem]:h-auto max-[54rem]:min-h-dvh max-[54rem]:overflow-visible">
      <a
        className="fixed top-3 left-3 z-[100] -translate-y-[180%] rounded-md bg-primary px-3.5 py-2.5 font-bold text-primary-foreground focus:translate-y-0"
        href="#json-input"
      >
        Skip to JSON input
      </a>

      <header className="z-40 h-16 shrink-0 border-b border-slate-200 bg-white max-[54rem]:sticky max-[54rem]:top-0">
        <div className="grid h-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 px-6 max-[54rem]:grid-cols-[minmax(0,1fr)_auto] max-[40rem]:px-4">
          <div className="flex min-w-0 items-center gap-4">
            <BrandLockup className="shrink-0" href={platformUrl} name="Devtools" />
            <a
              aria-label="Browse tools"
              className="inline-flex min-h-8 w-48 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 max-[64rem]:w-36 max-[54rem]:hidden"
              href="/"
            >
              <Search aria-hidden="true" size={16} />
              <span>Cmd + K</span>
            </a>
          </div>

          <nav
            aria-label="Devtools sections"
            className="flex h-full items-end gap-4 text-[0.8125rem] font-bold text-slate-500 max-[54rem]:hidden"
          >
            <a
              aria-current="page"
              className="flex h-full items-end border-b-2 border-primary px-1 pb-2 text-primary"
              href="/"
            >
              Tools
            </a>
            <span aria-disabled="true" className="flex h-full items-end px-1 pb-2 text-slate-400">
              Docs
            </span>
            <span aria-disabled="true" className="flex h-full items-end px-1 pb-2 text-slate-400">
              API
            </span>
            <span aria-disabled="true" className="flex h-full items-end px-1 pb-2 text-slate-400">
              Registry
            </span>
          </nav>

          <div className="flex items-center justify-end gap-3">
            <div className="flex items-center gap-1 max-[40rem]:hidden">
              <Button
                aria-label="Focus JSON editor"
                onClick={() =>
                  document
                    .querySelector<HTMLElement>("#json-input .cm-content")
                    ?.focus()
                }
                size="icon"
                title="Focus editor"
                type="button"
                variant="ghost"
              >
                <TerminalSquare aria-hidden="true" size={20} />
              </Button>
              <Button
                aria-label={inspectorOpen ? "Hide inspector" : "Show inspector"}
                onClick={() => setInspectorOpen((open) => !open)}
                size="icon"
                title={inspectorOpen ? "Hide inspector" : "Show inspector"}
                type="button"
                variant="ghost"
              >
                {inspectorOpen ? (
                  <PanelRightClose aria-hidden="true" size={20} />
                ) : (
                  <PanelRightOpen aria-hidden="true" size={20} />
                )}
              </Button>
            </div>
            <AccountNavigation {...account} />
          </div>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-100 max-[54rem]:overflow-visible">
        <div
          aria-label="JSON actions"
          className="flex min-h-11 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-1.5 max-[40rem]:w-full max-[40rem]:max-w-[100vw] max-[40rem]:flex-wrap max-[40rem]:items-stretch max-[40rem]:p-2"
        >
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

          <div className="ml-auto flex min-w-0 items-center gap-2 max-[40rem]:ml-0 max-[40rem]:grid max-[40rem]:w-full max-[40rem]:grid-cols-[minmax(0,1fr)_2.5rem_2.5rem]">
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

        <div className="flex min-h-0 flex-1 overflow-hidden max-[54rem]:block max-[54rem]:shrink-0 max-[54rem]:overflow-visible">
          <section
            aria-label="JSON input"
            className="relative flex min-w-0 flex-[0_0_35%] flex-col overflow-hidden border-r border-slate-200 bg-slate-50 max-[64rem]:flex-[0_0_40%] max-[54rem]:min-h-[32rem] max-[54rem]:w-full max-[54rem]:flex-none max-[54rem]:border-r-0 max-[54rem]:border-b"
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
              <CodeMirror
                basicSetup={{
                  autocompletion: false,
                  bracketMatching: true,
                  closeBrackets: false,
                  foldGutter: false,
                  highlightActiveLine: false,
                  highlightActiveLineGutter: false,
                  lineNumbers: false,
                }}
                className={CODE_EDITOR_CLASS_NAME}
                editable={false}
                extensions={JSON_RESULT_EXTENSIONS}
                height="100%"
                readOnly
                theme="light"
                value={result.output}
              />
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
                    "{summary?.selectedKey ?? "root"}"
                  </code>
                </div>
                <div className="mt-4">
                  <p className="mb-1.5 text-xs font-extrabold tracking-[0.04em] text-slate-500 uppercase">
                    Value Type
                  </p>
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 font-mono text-[0.8125rem] text-slate-800">
                    <i aria-hidden="true" className="size-2 rounded-full bg-primary" />
                    {summary?.selectedType ?? "Unknown"}
                  </span>
                </div>
                <div className="mt-4">
                  <p className="mb-1.5 text-xs font-extrabold tracking-[0.04em] text-slate-500 uppercase">
                    Data Preview
                  </p>
                  <div className="overflow-hidden rounded-md border border-slate-200 bg-slate-50 font-mono text-xs">
                    <div className="grid grid-cols-[minmax(4rem,0.65fr)_1fr] gap-2 border-b border-slate-200 px-2.5 py-2 text-slate-500">
                      <span>Index</span>
                      <span>Value</span>
                    </div>
                    {summary?.preview.length ? (
                      summary.preview.map((value, index) => (
                        <div
                          className="grid grid-cols-[minmax(4rem,0.65fr)_1fr] gap-2 border-b border-slate-200 px-2.5 py-2 last:border-b-0"
                          key={`${index}-${value}`}
                        >
                          <span className="text-slate-400">{index}</span>
                          <code className="font-mono text-primary">{value}</code>
                        </div>
                      ))
                    ) : (
                      <p className="p-3 font-sans text-slate-500">No array values to preview.</p>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </aside>
        </div>

        <div
          aria-live="polite"
          className="flex min-h-8 shrink-0 items-center justify-between gap-4 border-t border-slate-200 bg-slate-100 px-4 text-xs text-slate-500 max-[40rem]:flex-col max-[40rem]:items-start max-[40rem]:py-2"
          role="status"
        >
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
        </div>
      </main>

      <footer className="flex min-h-10 shrink-0 items-center justify-between gap-4 border-t border-slate-200 bg-white px-6 text-[0.6875rem] font-semibold tracking-[0.03em] text-slate-500 max-[40rem]:flex-col max-[40rem]:items-start max-[40rem]:py-3">
        <span>© {new Date().getFullYear()} SmartTools Devtools</span>
        <div className="flex items-center gap-4 max-[40rem]:flex-wrap">
          <span>Local processing</span>
          <span>RFC 8259</span>
          <span>Privacy-first</span>
        </div>
      </footer>

      <span className="sr-only">
        Maximum input size is {MAX_JSON_INPUT_CHARS.toLocaleString()} characters.
      </span>
    </div>
  );
}
