"use client";

import { type KeyboardEvent, useEffect, useId, useState } from "react";
import { Button, Input } from "@smarttools/ui";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  Search,
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

function pathsEqual(left: JsonTreePath, right: JsonTreePath) {
  return left.length === right.length && left.every((segment, index) => segment === right[index]);
}

function pathKey(path: JsonTreePath) {
  return JSON.stringify(path);
}

function nodeMatches(label: string, value: unknown, query: string): boolean {
  if (!query) return true;
  if (label.toLocaleLowerCase().includes(query)) return true;
  if (value === null || typeof value !== "object") {
    return String(value).toLocaleLowerCase().includes(query);
  }
  if (Array.isArray(value)) {
    return value.some((child, index) => nodeMatches(String(index), child, query));
  }
  return Object.entries(value).some(([key, child]) => nodeMatches(key, child, query));
}

function JsonTreeNode({
  depth = 0,
  expansion,
  isArrayItem = false,
  label,
  onCopy,
  onSelect,
  path = ROOT_JSON_TREE_PATH,
  query,
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
  query: string;
  selectedPath?: JsonTreePath;
  value: unknown;
}) {
  const entries =
    value !== null && typeof value === "object"
      ? Array.isArray(value)
        ? value.map((child, index) => [String(index), child] as const)
        : Object.entries(value)
      : null;
  const [open, setOpen] = useState(expansion.open ?? depth < 2);
  const isRoot = depth === 0;
  const displayedLabel = isRoot
    ? ""
    : Array.isArray(value) || isArrayItem
      ? `[${label}]`
      : JSON.stringify(label);
  const treeItemLabel = isRoot ? "root" : isArrayItem ? `[${label}]` : label;
  const isSelected = Boolean(selectedPath && pathsEqual(path, selectedPath));
  const copyLabel = isRoot ? "Root node" : `${label} node`;
  const matchingEntries =
    entries?.filter(([key, child]) => nodeMatches(key, child, query)) ?? null;
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
    ? "bg-primary/10 ring-1 ring-inset ring-primary/30"
    : "hover:bg-muted/60 focus-visible:bg-muted/60";
  const copyButton = (
    <button
      aria-label={`Copy ${isRoot ? "root" : label} value`}
      className="ml-2 grid size-7 shrink-0 place-items-center rounded text-muted-foreground opacity-0 transition hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100"
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

  if (!entries) {
    const type = value === null ? "null" : typeof value;
    const displayedValue = type === "string" ? JSON.stringify(value) : String(value);
    return (
      <div
        aria-label={treeItemLabel}
        aria-selected={onSelect ? isSelected : undefined}
        className={`group flex min-w-max items-center rounded px-1 font-mono text-[0.8125rem] leading-7 outline-none ${selectedClassName}`}
        onClick={selectNode}
        onFocus={selectNode}
        onKeyDown={handleKeyDown}
        role="treeitem"
        tabIndex={isRoot ? 0 : -1}
      >
        {displayedLabel ? (
          <>
            <span className="ml-5 font-semibold text-foreground">{displayedLabel}</span>
            <span className="mx-1 text-muted-foreground">:</span>
          </>
        ) : null}
        <span
          className={
            type === "string"
              ? "text-emerald-700 dark:text-emerald-400"
              : type === "number"
                ? "text-amber-700 dark:text-amber-400"
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
    <div className="min-w-max font-mono text-[0.8125rem] leading-7 text-foreground">
      <div
        aria-expanded={canExpand ? open : undefined}
        aria-label={treeItemLabel}
        aria-selected={onSelect ? isSelected : undefined}
        className={`group flex min-w-max items-center rounded px-1 outline-none ${selectedClassName}`}
        onClick={selectNode}
        onFocus={selectNode}
        onKeyDown={handleKeyDown}
        role="treeitem"
        tabIndex={isRoot ? 0 : -1}
      >
        <button
          aria-expanded={open}
          aria-label={`${open ? "Collapse" : "Expand"} ${isRoot ? "root" : label}`}
          className="flex size-5 shrink-0 items-center justify-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
          disabled={!canExpand}
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
        {displayedLabel ? (
          <span className="font-semibold text-foreground">{displayedLabel}</span>
        ) : (
          <span className="font-semibold">{Array.isArray(value) ? "array" : "object"}</span>
        )}
        <span className="ml-2 text-muted-foreground">{typeLabel}</span>
        {copyButton}
      </div>
      {canExpand && open ? (
        <div className="ml-6" role="group">
          {matchingEntries?.map(([key, child]) => {
            const childPath = [...path, Array.isArray(value) ? Number(key) : key] as const;
            return (
              <JsonTreeNode
                depth={depth + 1}
                expansion={expansion}
                isArrayItem={Array.isArray(value)}
                key={pathKey(childPath)}
                label={key}
                onCopy={onCopy}
                onSelect={onSelect}
                path={childPath}
                query={query}
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

export function JsonResultRenderer({
  className = "",
  downloadName = "smarttools-result.json",
  formattedValue,
  label = "JSON result",
  onCopy,
  onSelect,
  selectedPath,
  value,
}: {
  className?: string;
  downloadName?: string;
  formattedValue?: string;
  label?: string;
  onCopy?: (value: string, label: string) => void;
  onSelect?: (selection: JsonTreeSelection) => void;
  selectedPath?: JsonTreePath;
  value: unknown;
}) {
  const resultId = useId().replaceAll(":", "");
  const [view, setView] = useState<JsonResultView>("tree");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [expansion, setExpansion] = useState<TreeExpansion>({ version: 0 });
  const formatted = formattedValue ?? JSON.stringify(value, null, 2) ?? String(value);
  const normalizedQuery = query.trim().toLocaleLowerCase();

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

  function downloadValue() {
    const url = URL.createObjectURL(
      new Blob([formatted], { type: "application/json;charset=utf-8" }),
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
      <header className="flex min-h-[46px] shrink-0 items-center justify-between gap-3 border-b border-border px-4">
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
              onClick={() => {
                setView(nextView);
                if (nextView === "formatted") {
                  setQuery("");
                  setSearchOpen(false);
                }
              }}
              role="tab"
              type="button"
            >
              {nextView}
            </button>
          ))}
        </div>

        <div className="flex min-w-0 items-center gap-1">
          {view === "tree" && searchOpen ? (
            <div className="flex min-w-0 items-center gap-1">
              <Input
                aria-label="Search JSON result"
                autoFocus
                className="h-8 w-44 font-mono text-xs max-[34rem]:w-28"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search keys or values"
                type="search"
                value={query}
              />
              <Button
                aria-label="Close JSON search"
                className="size-8"
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
            </div>
          ) : view === "tree" ? (
            <Button
              aria-label="Search JSON result"
              className="size-8"
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
                className="px-2 text-xs"
                onClick={() => setAll(true)}
                size="sm"
                type="button"
                variant="ghost"
              >
                Expand all
              </Button>
              <Button
                className="px-2 text-xs max-[42rem]:hidden"
                onClick={() => setAll(false)}
                size="sm"
                type="button"
                variant="ghost"
              >
                Collapse all
              </Button>
            </>
          ) : null}
          <Button
            aria-label="Copy JSON result"
            className="size-8"
            onClick={() => void copyValue(formatted, "JSON result")}
            size="icon"
            title="Copy JSON result"
            type="button"
            variant="ghost"
          >
            <Copy aria-hidden="true" className="size-4" />
          </Button>
          <Button
            aria-label="Download JSON result"
            className="size-8"
            onClick={downloadValue}
            size="icon"
            title="Download JSON result"
            type="button"
            variant="ghost"
          >
            <Download aria-hidden="true" className="size-4" />
          </Button>
        </div>
      </header>

      {view === "tree" ? (
        <div
          aria-labelledby={`${resultId}-tree-tab`}
          className="min-h-0 flex-1 overflow-auto p-4"
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
                expansion={expansion}
                label="root"
                onCopy={copyValue}
                onSelect={onSelect}
                query={normalizedQuery}
                selectedPath={selectedPath}
                value={value}
              />
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
          <pre className="min-w-max font-mono text-[0.8125rem] leading-6 text-foreground">{formatted}</pre>
        </div>
      )}
    </section>
  );
}
