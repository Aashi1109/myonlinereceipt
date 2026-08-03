"use client";

import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";
import { Button, Input } from "@smarttools/ui";
import {
  Brackets,
  ChevronDown,
  ChevronRight,
  CircleSlash2,
  Copy,
  Hash,
  Search,
  ToggleRight,
  X,
} from "lucide-react";

export type JsonTreePath = readonly (string | number)[];
export type JsonTreeSelection = {
  key: string;
  path: JsonTreePath;
  value: unknown;
};

type TreeExpansion = { version: number; open?: boolean };
type JsonResultView = "tree" | "formatted";

export const ROOT_JSON_TREE_PATH: JsonTreePath = [];

const TREE_ROW_INDENT_CLASSES = [
  "pl-1.5",
  "pl-[26px]",
  "pl-[46px]",
  "pl-[66px]",
  "pl-[86px]",
  "pl-[106px]",
  "pl-[126px]",
  "pl-[146px]",
  "pl-[166px]",
  "pl-[186px]",
  "pl-[206px]",
  "pl-[226px]",
  "pl-[246px]",
  "pl-[266px]",
  "pl-[286px]",
  "pl-[306px]",
  "pl-[326px]",
] as const;

function treeRowIndent(depth: number) {
  return TREE_ROW_INDENT_CLASSES[Math.min(depth, TREE_ROW_INDENT_CLASSES.length - 1)];
}

function pathsEqual(left: JsonTreePath, right: JsonTreePath) {
  return left.length === right.length && left.every((segment, index) => segment === right[index]);
}

function pathKey(path: JsonTreePath) {
  return JSON.stringify(path);
}

const JSON_TOKEN_PATTERN =
  /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*")(\s*:)?|\b(true|false|null)\b|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/g;

function highlightJson(json: string): ReactNode[] {
  const tokens: ReactNode[] = [];
  let cursor = 0;

  for (const match of json.matchAll(JSON_TOKEN_PATTERN)) {
    const index = match.index;
    if (index > cursor) tokens.push(json.slice(cursor, index));

    if (match[1]) {
      tokens.push(
        <span
          className={match[2] ? "font-semibold text-foreground" : "text-syntax-string"}
          key={index}
        >
          {match[1]}
        </span>,
      );
      if (match[2]) tokens.push(match[2]);
    } else if (match[3] === "null") {
      tokens.push(
        <span className="text-violet-700 dark:text-violet-400" key={index}>
          {match[3]}
        </span>,
      );
    } else if (match[3]) {
      tokens.push(
        <span className="text-primary" key={index}>
          {match[3]}
        </span>,
      );
    } else {
      tokens.push(
        <span className="text-warning" key={index}>
          {match[0]}
        </span>,
      );
    }

    cursor = index + match[0].length;
  }

  if (cursor < json.length) tokens.push(json.slice(cursor));
  return tokens;
}

function nodeMatches(label: string, value: unknown, query: string): boolean {
  if (!query) return true;
  const pending: [string, unknown][] = [[label, value]];
  while (pending.length > 0) {
    const [currentLabel, currentValue] = pending.pop()!;
    if (currentLabel.toLocaleLowerCase().includes(query)) return true;
    if (currentValue === null || typeof currentValue !== "object") {
      if (String(currentValue).toLocaleLowerCase().includes(query)) return true;
      continue;
    }
    const entries = Array.isArray(currentValue)
      ? currentValue.map((child, index) => [String(index), child] as const)
      : Object.entries(currentValue);
    for (const [key, child] of entries) pending.push([key, child]);
  }
  return false;
}

function visibleTreePaths(value: unknown, query: string, limit: number) {
  const paths = new Set<string>();
  const pending: { path: JsonTreePath; value: unknown }[] = [
    { path: ROOT_JSON_TREE_PATH, value },
  ];

  while (pending.length > 0 && paths.size < limit) {
    const current = pending.pop()!;
    paths.add(pathKey(current.path));
    if (current.value === null || typeof current.value !== "object") continue;

    const entries = Array.isArray(current.value)
      ? current.value.map((child, index) => [index, child] as const)
      : Object.entries(current.value);
    for (let index = entries.length - 1; index >= 0; index -= 1) {
      const [key, child] = entries[index];
      if (query && !nodeMatches(String(key), child, query)) continue;
      pending.push({ path: [...current.path, key], value: child });
    }
  }

  return { limit, paths, truncated: pending.length > 0 };
}

function JsonTreeNode({
  depth = 0,
  defaultOpenDepth,
  expansion,
  isArrayItem = false,
  label,
  onCopy,
  onSelect,
  path = ROOT_JSON_TREE_PATH,
  query,
  selectedPath,
  showNodeCopyActions,
  compact,
  value,
  visiblePaths,
}: {
  compact: boolean;
  defaultOpenDepth?: number;
  depth?: number;
  expansion: TreeExpansion;
  isArrayItem?: boolean;
  label: string;
  onCopy: (value: string, label: string) => void;
  onSelect?: (selection: JsonTreeSelection) => void;
  path?: JsonTreePath;
  query: string;
  selectedPath?: JsonTreePath;
  showNodeCopyActions: boolean;
  value: unknown;
  visiblePaths?: ReadonlySet<string>;
}) {
  const entries =
    value !== null && typeof value === "object"
      ? Array.isArray(value)
        ? value.map((child, index) => [String(index), child] as const)
        : Object.entries(value)
      : null;
  const [open, setOpen] = useState(
    expansion.open ??
      (defaultOpenDepth === undefined
        ? depth === 0 || Array.isArray(value)
        : depth <= defaultOpenDepth),
  );
  const isRoot = depth === 0;
  const displayedLabel = isRoot ? "" : label;
  const treeItemLabel = isRoot ? "root" : isArrayItem ? `[${label}]` : label;
  const isSelected = Boolean(selectedPath && pathsEqual(path, selectedPath));
  const copyLabel = isRoot ? "Root node" : `${label} node`;
  const matchingEntries = entries?.filter(([key, child]) => {
    const childPath = [...path, Array.isArray(value) ? Number(key) : key];
    return (
      nodeMatches(key, child, query) &&
      (!visiblePaths || visiblePaths.has(pathKey(childPath)))
    );
  }) ?? null;
  const canExpand = Boolean(matchingEntries?.length);

  useEffect(() => {
    if (expansion.open !== undefined) setOpen(expansion.open);
  }, [expansion.open, expansion.version]);

  useEffect(() => {
    if (query && canExpand) setOpen(true);
  }, [canExpand, query]);

  function selectNode() {
    onSelect?.({ key: isRoot ? "root" : label, path, value });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    const tree = event.currentTarget.closest('[role="tree"]');
    const items = tree
      ? Array.from(tree.querySelectorAll<HTMLElement>('[role="treeitem"]'))
      : [];
    const currentIndex = items.indexOf(event.currentTarget);

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      items[currentIndex + direction]?.focus();
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      items[event.key === "Home" ? 0 : items.length - 1]?.focus();
    } else if (event.key === "ArrowRight" && canExpand) {
      event.preventDefault();
      setOpen(true);
    } else if (event.key === "ArrowLeft" && canExpand) {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectNode();
      if (canExpand) setOpen((current) => !current);
    }
  }

  const selectedClassName = isSelected
    ? "bg-accent"
    : "bg-transparent hover:bg-muted/60 focus-visible:bg-muted/60";
  const copyButton = showNodeCopyActions ? (
    <button
      aria-label={`Copy ${isRoot ? "root" : label} value`}
      className="relative ml-2 grid size-7 shrink-0 place-items-center rounded text-muted-foreground opacity-0 transition before:absolute before:inset-[-8px] before:content-[''] hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100"
      onClick={(event) => {
        event.stopPropagation();
        onCopy(JSON.stringify(value, null, 2) ?? String(value), copyLabel);
      }}
      title={`Copy ${isRoot ? "root" : label} value`}
      type="button"
    >
      <Copy aria-hidden="true" className="size-3.5" />
    </button>
  ) : null;

  if (!entries) {
    const type = value === null ? "null" : typeof value;
    const displayedValue = type === "string" ? JSON.stringify(value) : String(value);
    const TypeIcon = isArrayItem
      ? Brackets
      : type === "boolean"
        ? ToggleRight
        : type === "null"
          ? CircleSlash2
          : Hash;
    return (
      <div
        aria-label={treeItemLabel}
        aria-selected={onSelect ? isSelected : undefined}
        className={`group flex w-full min-w-max items-center gap-2 rounded-sm pr-1.5 font-mono text-xs leading-4 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${compact ? "h-7" : "min-h-11"} ${treeRowIndent(depth)} ${selectedClassName}`}
        onClick={selectNode}
        onFocus={selectNode}
        onKeyDown={handleKeyDown}
        role="treeitem"
        tabIndex={isRoot ? 0 : -1}
      >
        <TypeIcon aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
        {displayedLabel ? (
          <span className="font-semibold text-foreground">{displayedLabel}</span>
        ) : null}
        <span
          className={
            type === "string"
              ? "text-syntax-string"
              : type === "number"
                ? "text-warning"
                : type === "boolean"
                  ? "text-primary"
                  : "text-violet-700 dark:text-violet-400"
          }
        >
          {displayedValue}
        </span>
        {copyButton}
      </div>
    );
  }

  const typeLabel = Array.isArray(value)
    ? `[${entries.length} item${entries.length === 1 ? "" : "s"}]`
    : `{${entries.length} key${entries.length === 1 ? "" : "s"}}`;

  return (
    <div className="w-full min-w-max font-mono text-xs leading-4 text-foreground">
      <div
        aria-expanded={canExpand ? open : undefined}
        aria-label={treeItemLabel}
        aria-selected={onSelect ? isSelected : undefined}
        className={`group flex w-full min-w-max items-center gap-2 rounded-sm pr-1.5 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${compact ? "h-7" : "min-h-11"} ${treeRowIndent(depth)} ${selectedClassName}`}
        onClick={selectNode}
        onFocus={selectNode}
        onKeyDown={handleKeyDown}
        role="treeitem"
        tabIndex={isRoot ? 0 : -1}
      >
        <button
          aria-expanded={open}
          aria-label={`${open ? "Collapse" : "Expand"} ${isRoot ? "root" : label}`}
          className={`relative flex shrink-0 items-center justify-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 ${compact ? "h-7 w-3.5 before:absolute before:inset-x-[-15px] before:inset-y-[-8px] before:content-['']" : "size-11"}`}
          disabled={!canExpand}
          onClick={(event) => {
            event.stopPropagation();
            setOpen((current) => !current);
          }}
          type="button"
        >
          {open ? (
            <ChevronDown aria-hidden="true" className="size-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight aria-hidden="true" className="size-3.5 text-muted-foreground" />
          )}
        </button>
        {displayedLabel ? (
          <span className="font-semibold text-foreground">{displayedLabel}</span>
        ) : (
          <span className="font-semibold">{Array.isArray(value) ? "array" : "object"}</span>
        )}
        <span className="text-muted-foreground">{typeLabel}</span>
        {copyButton}
      </div>
      {canExpand && open ? (
        <div className="mt-[5px] flex w-full flex-col gap-[5px]" role="group">
          {matchingEntries?.map(([key, child]) => {
            const childPath = [...path, Array.isArray(value) ? Number(key) : key] as const;
            return (
              <JsonTreeNode
                depth={depth + 1}
                defaultOpenDepth={defaultOpenDepth}
                expansion={expansion}
                isArrayItem={Array.isArray(value)}
                key={pathKey(childPath)}
                label={key}
                onCopy={onCopy}
                onSelect={onSelect}
                path={childPath}
                query={query}
                selectedPath={selectedPath}
                showNodeCopyActions={showNodeCopyActions}
                compact={compact}
                value={child}
                visiblePaths={visiblePaths}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function JsonResultRenderer({
  artifactValue,
  className = "",
  compact = false,
  defaultOpenDepth,
  downloadName = "smarttools-result.json",
  formattedValue,
  label = "JSON result",
  maxVisibleEntries,
  onCopy,
  onSelect,
  persistentSearch = false,
  selectedPath,
  showArtifactActions = true,
  showNodeCopyActions = true,
  value,
}: {
  artifactValue?: string;
  className?: string;
  compact?: boolean;
  defaultOpenDepth?: number;
  downloadName?: string;
  formattedValue?: string;
  label?: string;
  maxVisibleEntries?: number;
  onCopy?: (value: string, label: string) => void;
  onSelect?: (selection: JsonTreeSelection) => void;
  persistentSearch?: boolean;
  selectedPath?: JsonTreePath;
  showArtifactActions?: boolean;
  showNodeCopyActions?: boolean;
  value: unknown;
}) {
  const resultId = useId().replaceAll(":", "");
  const [view, setView] = useState<JsonResultView>("tree");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [expansion, setExpansion] = useState<TreeExpansion>({ version: 0 });
  const [internalSelectedPath, setInternalSelectedPath] = useState<JsonTreePath | undefined>(
    selectedPath,
  );
  const formatted = formattedValue ?? JSON.stringify(value, null, 2) ?? String(value);
  const highlightedFormatted = useMemo(() => highlightJson(formatted), [formatted]);
  const artifact = artifactValue ?? formatted;
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const treeView = useMemo(
    () =>
      maxVisibleEntries === undefined
        ? null
        : visibleTreePaths(
            value,
            normalizedQuery,
            Math.max(1, Math.floor(maxVisibleEntries)),
          ),
    [maxVisibleEntries, normalizedQuery, value],
  );
  const resolvedSelectedPath = onSelect ? selectedPath : internalSelectedPath;
  const handleSelect =
    onSelect ??
    (selectedPath !== undefined
      ? (selection: JsonTreeSelection) => setInternalSelectedPath(selection.path)
      : undefined);

  useEffect(() => {
    if (!onSelect && selectedPath !== undefined) setInternalSelectedPath(selectedPath);
  }, [onSelect, selectedPath, value]);

  async function copyValue(copyValue: string, copyLabel: string) {
    if (onCopy) {
      onCopy(copyValue, copyLabel);
      return;
    }
    await navigator.clipboard.writeText(copyValue);
  }

  function setAll(open: boolean) {
    setExpansion(({ version }) => ({ version: version + 1, open }));
  }

  function activateView(nextView: JsonResultView) {
    setView(nextView);
    if (nextView === "formatted") {
      setQuery("");
      setSearchOpen(false);
    }
  }

  function handleViewKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    let nextView: JsonResultView | null = null;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      nextView = view === "tree" ? "formatted" : "tree";
    } else if (event.key === "Home") {
      nextView = "tree";
    } else if (event.key === "End") {
      nextView = "formatted";
    }
    if (!nextView) return;
    event.preventDefault();
    activateView(nextView);
    requestAnimationFrame(() =>
      document.getElementById(`${resultId}-${nextView}-tab`)?.focus(),
    );
  }

  function downloadValue() {
    const url = URL.createObjectURL(
      new Blob([artifact], { type: "application/json;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = downloadName;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section
      aria-label={label}
      className={`flex min-h-0 flex-1 flex-col overflow-hidden bg-card ${className}`}
      data-testid="json-result-renderer"
    >
      <header className="flex min-h-[46px] shrink-0 items-center justify-between gap-3 border-b border-border px-4 max-[42rem]:flex-col max-[42rem]:items-stretch max-[42rem]:gap-0 max-[42rem]:pb-2">
        <div aria-label="JSON result view" className="flex h-[46px] items-center gap-4" role="tablist">
          {(["tree", "formatted"] as const).map((nextView) => (
            <button
              aria-controls={`${resultId}-${nextView}`}
              aria-selected={view === nextView}
              className={`h-[46px] border-b-2 text-[0.8125rem] font-semibold capitalize outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
                view === nextView
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              id={`${resultId}-${nextView}-tab`}
              key={nextView}
              onClick={() => activateView(nextView)}
              onKeyDown={handleViewKeyDown}
              role="tab"
              tabIndex={view === nextView ? 0 : -1}
              type="button"
            >
              {nextView}
            </button>
          ))}
        </div>

        <div
          className={`flex min-w-0 items-center gap-2 max-[42rem]:w-full ${
            view === "tree"
              ? "max-[42rem]:grid max-[42rem]:grid-cols-[minmax(0,1fr)_auto_auto]"
              : "max-[42rem]:justify-end"
          }`}
        >
          {view === "tree" && (persistentSearch || searchOpen) ? (
            <div
              className={`relative flex min-w-0 items-center gap-1 ${
                persistentSearch
                  ? "w-[190px] shrink-0 max-[42rem]:w-auto max-[42rem]:flex-1 max-[42rem]:shrink"
                  : "max-[42rem]:flex-1"
              }`}
            >
              {persistentSearch ? (
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-[9px] z-10 size-3.5 text-muted-foreground"
                />
              ) : null}
              <Input
                aria-label="Search JSON result"
                autoFocus={!persistentSearch}
                className={`${
                  compact
                    ? persistentSearch
                      ? "h-11 w-full rounded-md border-border bg-muted pr-[9px] pl-[30px] !text-caption shadow-none"
                      : "h-11 w-[210px] text-[11px]"
                    : "h-11 w-44 text-xs"
                } appearance-none font-sans max-[42rem]:w-full [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden`}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search keys or values"
                type="search"
                value={query}
              />
              {!persistentSearch ? (
                <Button
                  aria-label="Close JSON search"
                  className="size-11"
                  onClick={() => {
                    setQuery("");
                    setSearchOpen(false);
                  }}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <X aria-hidden="true" className="size-4" />
                </Button>
              ) : null}
            </div>
          ) : view === "tree" ? (
            <Button
              aria-label="Search JSON result"
              className="size-11 shrink-0"
              onClick={() => setSearchOpen(true)}
              size="icon"
              title="Search JSON result"
              type="button"
              variant="ghost"
            >
              <Search aria-hidden="true" className="size-4" />
            </Button>
          ) : null}
          {view === "tree" ? (
            <>
              <Button
                className="min-h-11 px-1 text-primary"
                onClick={() => setAll(true)}
                size="sm"
                type="button"
                variant="link"
              >
                Expand all
              </Button>
              <Button
                className="min-h-11 px-1 text-primary"
                onClick={() => setAll(false)}
                size="sm"
                type="button"
                variant="link"
              >
                Collapse all
              </Button>
            </>
          ) : null}
          {showArtifactActions ? (
            <>
              <Button
                aria-label="Copy JSON result"
                className="size-11 shrink-0 text-muted-foreground max-[42rem]:col-start-2 max-[42rem]:row-start-2"
                onClick={() => void copyValue(artifact, "JSON result")}
                size="icon"
                title="Copy JSON result"
                type="button"
                variant="ghost"
              >
                <Copy aria-hidden="true" className="size-4" />
              </Button>
              <Button
                className="min-h-11 px-1 text-primary max-[42rem]:col-start-3 max-[42rem]:row-start-2"
                onClick={downloadValue}
                size="sm"
                type="button"
                variant="link"
              >
                Download .json
              </Button>
            </>
          ) : null}
        </div>
      </header>

      {view === "tree" ? (
        <div
          aria-labelledby={`${resultId}-tree-tab`}
          className="min-h-0 flex-1 overflow-auto px-3.5 py-4"
          id={`${resultId}-tree`}
          role="tabpanel"
        >
          {normalizedQuery && !nodeMatches("root", value, normalizedQuery) ? (
            <p className="p-4 text-center text-sm text-muted-foreground" role="status">
              No keys or values match “{query}”.
            </p>
          ) : (
            <div aria-label="JSON tree" className="w-max min-w-full" role="tree">
              <JsonTreeNode
                compact={compact}
                defaultOpenDepth={defaultOpenDepth}
                expansion={expansion}
                label="root"
                onCopy={copyValue}
                onSelect={handleSelect}
                query={normalizedQuery}
                selectedPath={resolvedSelectedPath}
                showNodeCopyActions={showNodeCopyActions}
                value={value}
                visiblePaths={treeView?.paths}
              />
              {treeView?.truncated ? (
                <p className="px-2 py-3 text-xs text-muted-foreground" role="status">
                  Showing the first {treeView.limit.toLocaleString()} nodes.
                  Search to narrow the tree.
                </p>
              ) : null}
            </div>
          )}
        </div>
      ) : (
        <div
          aria-labelledby={`${resultId}-formatted-tab`}
          className="min-h-0 flex-1 overflow-auto bg-muted/20 p-4"
          id={`${resultId}-formatted`}
          role="tabpanel"
          tabIndex={0}
        >
          <pre className="min-w-max font-mono text-[0.8125rem] leading-6 text-muted-foreground">
            {highlightedFormatted}
          </pre>
        </div>
      )}
    </section>
  );
}
