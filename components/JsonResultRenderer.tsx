"use client";

import {
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";
import {
  Button,
  ButtonGroup,
  Input,
  Label,
  OrderableList,
  Popover as PopoverPrimitive,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  type OrderableItemState,
} from "@smarttools/ui";
import {
  Brackets,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ChevronsDown,
  ChevronsUp,
  Check,
  CircleAlert,
  CircleCheck,
  CircleSlash2,
  Copy,
  CopyPlus,
  GripVertical,
  Hash,
  Link,
  PencilLine,
  Plus,
  Redo2,
  Replace,
  Search,
  ToggleRight,
  Trash2,
  Type,
  Undo2,
  X,
} from "lucide-react";

import { SourceTextarea } from "@/components/WorkspaceInput";

export type JsonTreePath = readonly (string | number)[];
export type JsonTreeSelection = {
  key: string;
  path: JsonTreePath;
  value: unknown;
};

type TreeExpansion = { version: number; open?: boolean };
type JsonEditMode = "form" | "tree";
type JsonValueType = "string" | "number" | "boolean" | "null" | "object" | "array";

const JSON_VALUE_TYPES: readonly JsonValueType[] = [
  "string",
  "number",
  "boolean",
  "null",
  "object",
  "array",
];

export type JsonResultView = "tree" | "formatted" | "code" | "form";
export type JsonEditorController = {
  canRedo: boolean;
  canUndo: boolean;
  code: string;
  codeError: string | null;
  onCodeChange: (code: string) => void;
  onRedo: () => void;
  onUndo: () => void;
  onValueChange: (value: unknown) => void;
};

export const ROOT_JSON_TREE_PATH: JsonTreePath = [];

function JsonTooltip({
  children,
  label,
}: {
  children: ReactElement;
  label: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

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

function pathLabel(path: JsonTreePath) {
  return path.length === 0
    ? "root"
    : path.map((segment) => typeof segment === "number" ? `[${segment}]` : segment).join(".").replaceAll(".[", "[");
}

function updateJsonAtPath(
  value: unknown,
  path: JsonTreePath,
  update: (current: unknown) => unknown,
): unknown {
  if (path.length === 0) return update(value);
  const [segment, ...rest] = path;
  if (Array.isArray(value) && typeof segment === "number") {
    const next = [...value];
    next[segment] = updateJsonAtPath(next[segment], rest, update);
    return next;
  }
  if (value !== null && typeof value === "object" && typeof segment === "string") {
    return {
      ...(value as Record<string, unknown>),
      [segment]: updateJsonAtPath(
        (value as Record<string, unknown>)[segment],
        rest,
        update,
      ),
    };
  }
  return value;
}

function uniqueJsonKey(value: Record<string, unknown>, base = "newProperty") {
  if (!(base in value)) return base;
  let suffix = 2;
  while (`${base}${suffix}` in value) suffix += 1;
  return `${base}${suffix}`;
}

function readJsonAtPath(value: unknown, path: JsonTreePath) {
  let current = value;
  for (const segment of path) {
    if (Array.isArray(current) && typeof segment === "number") {
      current = current[segment];
    } else if (current !== null && typeof current === "object" && typeof segment === "string") {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return undefined;
    }
  }
  return current;
}

function jsonValueType(value: unknown): JsonValueType {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  if (typeof value === "string") return "string";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return "object";
}

function jsonValueFromDraft(type: JsonValueType, draft: string): unknown {
  if (type === "string") return draft;
  if (type === "number") {
    const number = Number(draft);
    return Number.isFinite(number) ? number : 0;
  }
  if (type === "boolean") return draft === "true";
  if (type === "null") return null;
  if (type === "array") return [];
  return {};
}

function convertJsonValue(value: unknown, type: JsonValueType): unknown {
  if (jsonValueType(value) === type) return value;
  if (type === "string") {
    return value !== null && typeof value === "object"
      ? JSON.stringify(value)
      : String(value ?? "");
  }
  if (type === "number") {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }
  if (type === "boolean") {
    if (typeof value === "string") return value.trim().toLocaleLowerCase() === "true";
    return Boolean(value);
  }
  if (type === "null") return null;
  if (type === "array") return [];
  return {};
}

function insertJsonNode(
  value: unknown,
  parentPath: JsonTreePath,
  child: unknown,
  key: string,
  index: number,
) {
  return updateJsonAtPath(value, parentPath, (parent) => {
    if (Array.isArray(parent)) {
      const next = [...parent];
      next.splice(Math.max(0, Math.min(index, next.length)), 0, child);
      return next;
    }
    if (parent !== null && typeof parent === "object") {
      return { ...(parent as Record<string, unknown>), [key]: child };
    }
    return parent;
  });
}

function JsonScalarEditor({
  label,
  onChange,
  onErrorChange,
  type,
  value,
}: {
  label: string;
  onChange: (value: unknown) => void;
  onErrorChange: (error: string | null) => void;
  type: string;
  value: unknown;
}) {
  const [draft, setDraft] = useState(String(value ?? ""));

  useEffect(() => setDraft(String(value ?? "")), [value]);

  if (type === "boolean") {
    return (
      <Switch
        aria-label={`Set ${label}`}
        checked={Boolean(value)}
        onCheckedChange={onChange}
        size="xs"
      />
    );
  }
  if (type === "null") {
    return <span className="text-violet-700 dark:text-violet-400">null</span>;
  }

  function commit() {
    if (type === "number") {
      const number = Number(draft);
      if (!draft.trim() || !Number.isFinite(number)) return;
      onChange(number);
      return;
    }
    onChange(draft);
  }

  return (
    <Input
      aria-label={`Edit ${label}`}
      aria-invalid={type === "number" && (!draft.trim() || !Number.isFinite(Number(draft)))}
      className={`min-w-0 max-w-[300px] flex-1 rounded-sm bg-muted font-mono !text-[10px] shadow-none ${
        type === "string" ? "text-syntax-string" : "text-warning"
      }`}
      inputMode={type === "number" ? "decimal" : undefined}
      onBlur={commit}
      onChange={(event) => {
        const next = event.target.value;
        setDraft(next);
        onErrorChange(
          type === "number" && (!next.trim() || !Number.isFinite(Number(next)))
            ? "Enter a valid number."
            : null,
        );
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          commit();
          event.currentTarget.blur();
        } else if (event.key === "Escape") {
          setDraft(String(value ?? ""));
          onErrorChange(null);
          event.currentTarget.blur();
        }
      }}
      size="xs"
      value={draft}
    />
  );
}

function JsonNodeActionPopover({
  action,
  editor,
  label,
  path,
  rootValue,
  triggerText,
  value,
}: {
  action: "add" | "change-type" | "edit-key";
  editor: JsonEditorController;
  label: string;
  path: JsonTreePath;
  rootValue: unknown;
  triggerText?: string;
  value: unknown;
}) {
  const id = useId().replaceAll(":", "");
  const currentIsContainer = value !== null && typeof value === "object";
  const parentPath = action === "add" && currentIsContainer
    ? path
    : path.slice(0, -1);
  const parentValue = readJsonAtPath(rootValue, parentPath);
  const parentItems = Array.isArray(parentValue) ? parentValue : null;
  const arrayParent = parentItems !== null;
  const objectParent = parentValue !== null && typeof parentValue === "object" && !arrayParent;
  const siblingIndex = path.at(-1);
  const defaultInsertIndex = arrayParent
    ? currentIsContainer || typeof siblingIndex !== "number"
      ? parentItems.length
      : siblingIndex + 1
    : 0;
  const currentKey = typeof path.at(-1) === "string" ? path.at(-1) as string : label;
  const defaultKey = action === "edit-key"
    ? currentKey
    : objectParent
      ? uniqueJsonKey(parentValue as Record<string, unknown>)
      : "";
  const [open, setOpen] = useState(false);
  const [nextType, setNextType] = useState<JsonValueType>(
    action === "change-type" ? jsonValueType(value) : "string",
  );
  const [draft, setDraft] = useState("");
  const [propertyKey, setPropertyKey] = useState(defaultKey);
  const [insertIndex, setInsertIndex] = useState(defaultInsertIndex);
  const keyIsBlank = !propertyKey.trim();
  const keyError = (action === "add" || action === "edit-key") && objectParent
    ? keyIsBlank
      ? "Property key is required."
      : Object.hasOwn(parentValue as Record<string, unknown>, propertyKey) &&
          (action !== "edit-key" || propertyKey !== currentKey)
        ? "That property already exists."
        : null
    : null;
  const valueError = action === "add" && nextType === "number" &&
    (!draft.trim() || !Number.isFinite(Number(draft)))
    ? "Enter a valid number."
    : null;
  const sameType = action === "change-type" && nextType === jsonValueType(value);
  const sameKey = action === "edit-key" && propertyKey === currentKey;
  const ActionIcon = action === "add"
    ? Plus
    : action === "edit-key"
      ? PencilLine
      : Replace;
  const addActionLabel = arrayParent ? "Add item" : "Add property";
  const triggerLabel = action === "add"
    ? addActionLabel
    : action === "edit-key"
      ? "Edit key"
      : "Change type";
  const heading = action === "add"
    ? addActionLabel
    : action === "edit-key"
      ? "Edit object key"
      : "Change value type";
  const objectPath = `root.${pathLabel(path)}`;
  const keyAvailable = action === "edit-key" && !keyError && !sameKey;

  function resetFields() {
    setNextType(action === "change-type" ? jsonValueType(value) : "string");
    setDraft("");
    setPropertyKey(action === "edit-key" ? currentKey : defaultKey);
    setInsertIndex(defaultInsertIndex);
  }

  function confirm() {
    if (action === "change-type") {
      editor.onValueChange(
        updateJsonAtPath(rootValue, path, (current) => convertJsonValue(current, nextType)),
      );
    } else if (action === "edit-key" && objectParent && !keyError && !sameKey) {
      editor.onValueChange(renameJsonObjectKey(rootValue, path, propertyKey));
    } else if (action === "add" && (arrayParent || objectParent) && !keyError && !valueError) {
      editor.onValueChange(
        insertJsonNode(
          rootValue,
          parentPath,
          jsonValueFromDraft(nextType, draft),
          propertyKey,
          insertIndex,
        ),
      );
    }
    setOpen(false);
  }

  return (
    <PopoverPrimitive.Root
      onOpenChange={(nextOpen) => {
        if (nextOpen) resetFields();
        setOpen(nextOpen);
      }}
      open={open}
    >
      <JsonTooltip label={triggerLabel}>
        <PopoverPrimitive.Trigger asChild>
          <button
            aria-label={action === "add"
              ? `Add near ${label}`
              : action === "edit-key"
                ? `Edit ${label} key`
                : `Change ${label} type`}
            className={triggerText
              ? "flex h-7 w-fit items-center gap-[7px] rounded-sm pr-1.5 pl-[26px] font-sans text-[11px] font-semibold text-primary hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              : "flex size-6 items-center justify-center text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"}
            onClick={(event) => event.stopPropagation()}
            type="button"
          >
            <ActionIcon aria-hidden="true" className="size-3.5" />
            {triggerText}
          </button>
        </PopoverPrimitive.Trigger>
      </JsonTooltip>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align={triggerText ? "start" : "end"}
          className="z-50 w-80 rounded-xl border border-border bg-card p-4 text-foreground shadow-lg outline-none"
          onClick={(event) => event.stopPropagation()}
          sideOffset={6}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <ActionIcon aria-hidden="true" className="size-3.5 shrink-0 text-primary" />
              <p className="truncate text-[13px] font-semibold">
                {heading}
              </p>
            </div>
            <PopoverPrimitive.Close asChild>
              <button
                aria-label="Close"
                className="flex size-6 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                type="button"
              >
                <X aria-hidden="true" className="size-3.5" />
              </button>
            </PopoverPrimitive.Close>
          </div>
          <p className="mt-2 text-[10px] leading-[1.35] text-muted-foreground">
            {action === "add"
              ? `Add ${arrayParent ? "an item" : "a property"} to ${pathLabel(parentPath)} without changing the source input.`
              : action === "edit-key"
                ? `Rename ${objectPath} without changing its value, type, or position.`
                : `Update ${pathLabel(path)} without changing its key or position.`}
          </p>

          <div className="mt-3 flex flex-col gap-2">
            {action === "add" ? (
              <>
                <div className="grid gap-1">
                  <Label className="text-[10px]" htmlFor={`${id}-parent`}>Parent path</Label>
                  <Input
                    className="font-mono"
                    id={`${id}-parent`}
                    readOnly
                    size="xs"
                    value={pathLabel(parentPath)}
                  />
                </div>
                {arrayParent ? (
                  <div className="grid gap-1">
                    <Label className="text-[10px]" htmlFor={`${id}-position`}>Insert position</Label>
                    <Select
                      onValueChange={(next) => setInsertIndex(Number(next))}
                      value={String(insertIndex)}
                    >
                      <SelectTrigger id={`${id}-position`} size="xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">At beginning</SelectItem>
                        {parentItems.map((_, index) => (
                          <SelectItem key={index} value={String(index + 1)}>
                            After item {index}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="grid gap-1">
                    <Label className={`text-[10px] ${keyError ? "text-destructive" : ""}`} htmlFor={`${id}-key`}>Property key</Label>
                    <Input
                      aria-invalid={Boolean(keyError)}
                      id={`${id}-key`}
                      onChange={(event) => setPropertyKey(event.target.value)}
                      size="xs"
                      value={propertyKey}
                    />
                    {keyError ? <p className="text-[9px] text-destructive">{keyError}</p> : null}
                  </div>
                )}
              </>
            ) : action === "edit-key" ? (
              <>
                <div className="grid gap-1">
                  <Label className="text-[10px]" htmlFor={`${id}-current-key`}>Current key</Label>
                  <Input
                    className="font-mono"
                    id={`${id}-current-key`}
                    readOnly
                    size="xs"
                    value={currentKey}
                  />
                  <p className="text-[9px] text-muted-foreground">Object path: {objectPath}</p>
                </div>
                <div className="grid gap-1">
                  <Label className={`text-[10px] ${keyError ? "text-destructive" : ""}`} htmlFor={`${id}-new-key`}>New key</Label>
                  <Input
                    aria-invalid={Boolean(keyError)}
                    autoFocus
                    id={`${id}-new-key`}
                    onChange={(event) => setPropertyKey(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && keyAvailable) {
                        event.preventDefault();
                        confirm();
                      }
                    }}
                    size="xs"
                    value={propertyKey}
                  />
                  <p className={`text-[9px] ${keyError ? "text-destructive" : "text-muted-foreground"}`}>
                    {keyError ?? "Keys must be unique within this object."}
                  </p>
                </div>
              </>
            ) : (
              <div className="grid gap-1">
                <Label className="text-[10px]" htmlFor={`${id}-existing`}>Existing value</Label>
                <Input
                  className="font-mono"
                  id={`${id}-existing`}
                  readOnly
                  size="xs"
                  value={JSON.stringify(value) ?? String(value)}
                />
              </div>
            )}

            {action !== "edit-key" ? (
              <div className="grid gap-1">
                <Label className="text-[10px]" htmlFor={`${id}-type`}>
                  {action === "add" ? "JSON type" : "New JSON type"}
                </Label>
                <Select
                  onValueChange={(next) => setNextType(next as JsonValueType)}
                  value={nextType}
                >
                  <SelectTrigger className="capitalize" id={`${id}-type`} size="xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {JSON_VALUE_TYPES.map((type) => (
                      <SelectItem className="capitalize" key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {action === "add" && (nextType === "string" || nextType === "number") ? (
              <div className="grid gap-1">
                <Label className="text-[10px]" htmlFor={`${id}-value`}>Initial value</Label>
                <Input
                  aria-invalid={Boolean(valueError)}
                  id={`${id}-value`}
                  inputMode={nextType === "number" ? "decimal" : undefined}
                  onChange={(event) => setDraft(event.target.value)}
                  size="xs"
                  value={draft}
                />
                {valueError ? <p className="text-[9px] text-destructive">{valueError}</p> : null}
              </div>
            ) : action === "add" && nextType === "boolean" ? (
              <div className="grid gap-1">
                <Label className="text-[10px]" htmlFor={`${id}-value`}>Initial value</Label>
                <Select onValueChange={setDraft} value={draft || "false"}>
                  <SelectTrigger id={`${id}-value`} size="xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">false</SelectItem>
                    <SelectItem value="true">true</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {action === "change-type" ? (
              <div className="flex gap-2 rounded-lg border border-border bg-muted/60 p-2.5 text-[10px] leading-[1.3] text-muted-foreground">
                <CircleAlert aria-hidden="true" className="mt-px size-3.5 shrink-0" />
                Compatible values convert automatically. Object and Array create an empty container.
              </div>
            ) : action === "edit-key" && keyAvailable ? (
              <div className="flex gap-2 rounded-lg bg-success-soft p-2.5 text-[10px] leading-[1.3] text-foreground">
                <CircleCheck aria-hidden="true" className="mt-px size-3.5 shrink-0 text-success" />
                <div>
                  <p className="font-semibold">Key is available</p>
                  <p className="mt-0.5 text-muted-foreground">
                    The value and <span className="capitalize">{jsonValueType(value)}</span> type stay unchanged.
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <PopoverPrimitive.Close asChild>
              <Button size="xs" type="button" variant="outline">Cancel</Button>
            </PopoverPrimitive.Close>
            <Button
              disabled={Boolean(keyError) || Boolean(valueError) || sameType || sameKey || (!arrayParent && !objectParent && action === "add")}
              onClick={confirm}
              size="xs"
              type="button"
            >
              {action === "edit-key" ? <Check aria-hidden="true" /> : <ActionIcon aria-hidden="true" />}
              {action === "add"
                ? addActionLabel
                : action === "edit-key"
                  ? "Rename key"
                  : "Change type"}
            </Button>
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

function JsonTreeActions({
  editor,
  label,
  onDelete,
  onDuplicate,
  path,
  rootValue,
  value,
}: {
  editor: JsonEditorController;
  label: string;
  onDelete: () => void;
  onDuplicate: () => void;
  path: JsonTreePath;
  rootValue: unknown;
  value: unknown;
}) {
  return (
    <div className="ml-auto flex shrink-0 items-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100">
      {typeof path.at(-1) === "string" ? (
        <JsonNodeActionPopover
          action="edit-key"
          editor={editor}
          label={label}
          path={path}
          rootValue={rootValue}
          value={value}
        />
      ) : null}
      <JsonNodeActionPopover
        action="change-type"
        editor={editor}
        label={label}
        path={path}
        rootValue={rootValue}
        value={value}
      />
      <JsonTooltip label="Duplicate">
        <button
          aria-label={`Duplicate ${label}`}
          className="flex size-6 items-center justify-center text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          onClick={(event) => {
            event.stopPropagation();
            onDuplicate();
          }}
          type="button"
        >
          <CopyPlus aria-hidden="true" className="size-3.5" />
        </button>
      </JsonTooltip>
      <JsonNodeActionPopover
        action="add"
        editor={editor}
        label={label}
        path={path}
        rootValue={rootValue}
        value={value}
      />
      <JsonTooltip label="Delete">
        <button
          aria-label={`Delete ${label}`}
          className="flex size-6 items-center justify-center text-muted-foreground hover:text-destructive focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          type="button"
        >
          <Trash2 aria-hidden="true" className="size-3.5" />
        </button>
      </JsonTooltip>
    </div>
  );
}

function deleteJsonNode(value: unknown, path: JsonTreePath): unknown {
  if (path.length === 0) return value;
  const parentPath = path.slice(0, -1);
  const segment = path[path.length - 1];
  return updateJsonAtPath(value, parentPath, (parent) => {
    if (Array.isArray(parent) && typeof segment === "number") {
      return parent.filter((_, index) => index !== segment);
    }
    if (parent !== null && typeof parent === "object" && typeof segment === "string") {
      return Object.fromEntries(
        Object.entries(parent as Record<string, unknown>).filter(([key]) => key !== segment),
      );
    }
    return parent;
  });
}

function duplicateJsonNode(value: unknown, path: JsonTreePath): unknown {
  if (path.length === 0) return value;
  const parentPath = path.slice(0, -1);
  const segment = path[path.length - 1];
  return updateJsonAtPath(value, parentPath, (parent) => {
    if (Array.isArray(parent) && typeof segment === "number") {
      const next = [...parent];
      next.splice(segment + 1, 0, structuredClone(parent[segment]));
      return next;
    }
    if (parent !== null && typeof parent === "object" && typeof segment === "string") {
      const object = parent as Record<string, unknown>;
      const duplicateKey = uniqueJsonKey(object, `${segment}Copy`);
      return Object.fromEntries(
        Object.entries(object).flatMap(([key, child]) =>
          key === segment
            ? [[key, child], [duplicateKey, structuredClone(child)]]
            : [[key, child]],
        ),
      );
    }
    return parent;
  });
}

function renameJsonObjectKey(
  value: unknown,
  path: JsonTreePath,
  nextKey: string,
): unknown {
  const currentKey = path.at(-1);
  if (typeof currentKey !== "string") return value;
  return updateJsonAtPath(value, path.slice(0, -1), (parent) => {
    if (parent === null || typeof parent !== "object" || Array.isArray(parent)) {
      return parent;
    }
    return Object.fromEntries(
      Object.entries(parent).map(([key, child]) =>
        key === currentKey ? [nextKey, child] : [key, child],
      ),
    );
  });
}

const JSON_TOKEN_PATTERN =
  /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*")(\s*:)?|\b(true|false|null)\b|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/g;

export function highlightJson(json: string): ReactNode[] {
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
  const pending: { path: JsonTreePath; query: string; value: unknown }[] = [
    { path: ROOT_JSON_TREE_PATH, query, value },
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
      if (current.query && !nodeMatches(String(key), child, current.query)) continue;
      pending.push({
        path: [...current.path, key],
        query:
          current.query && String(key).toLocaleLowerCase().includes(current.query)
            ? ""
            : current.query,
        value: child,
      });
    }
  }

  return { limit, paths, truncated: pending.length > 0 };
}

function matchingTreePaths(value: unknown, query: string) {
  if (!query) return [];
  const matches: JsonTreePath[] = [];
  const pending: { path: JsonTreePath; value: unknown }[] = [
    { path: ROOT_JSON_TREE_PATH, value },
  ];

  while (pending.length > 0) {
    const current = pending.pop()!;
    const label = current.path.length
      ? String(current.path[current.path.length - 1])
      : "root";
    const scalar = current.value === null || typeof current.value !== "object";
    if (
      label.toLocaleLowerCase().includes(query) ||
      (scalar && String(current.value).toLocaleLowerCase().includes(query))
    ) {
      matches.push(current.path);
    }
    if (!scalar) {
      const entries = Array.isArray(current.value)
        ? current.value.map((child, index) => [index, child] as const)
        : Object.entries(current.value as Record<string, unknown>);
      for (let index = entries.length - 1; index >= 0; index -= 1) {
        const [key, child] = entries[index];
        pending.push({ path: [...current.path, key], value: child });
      }
    }
  }

  return matches;
}

function matchingTextOffsets(value: string, query: string) {
  if (!query) return [];
  const normalizedValue = value.toLocaleLowerCase();
  const matches: number[] = [];
  let searchFrom = 0;
  while (searchFrom < normalizedValue.length) {
    const match = normalizedValue.indexOf(query, searchFrom);
    if (match === -1) break;
    matches.push(match);
    searchFrom = match + query.length;
  }
  return matches;
}

function JsonTreeNode({
  currentSearchPath,
  depth = 0,
  defaultOpenDepth,
  dragState,
  editMode,
  editor,
  expansion,
  isArrayItem = false,
  label,
  onCopy,
  onAddRootProperty,
  onSelect,
  path = ROOT_JSON_TREE_PATH,
  query,
  reorderDisabled = false,
  rootValue,
  searchMatchPaths,
  selectedPath,
  showNodeCopyActions,
  value,
  visiblePaths,
}: {
  currentSearchPath?: JsonTreePath;
  defaultOpenDepth?: number;
  depth?: number;
  dragState?: OrderableItemState;
  editMode?: JsonEditMode;
  editor?: JsonEditorController;
  expansion: TreeExpansion;
  isArrayItem?: boolean;
  label: string;
  onAddRootProperty?: () => void;
  onCopy: (value: string, label: string) => void;
  onSelect?: (selection: JsonTreeSelection) => void;
  path?: JsonTreePath;
  query: string;
  reorderDisabled?: boolean;
  rootValue: unknown;
  searchMatchPaths?: ReadonlySet<string>;
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
  const nodeType = Array.isArray(value)
    ? "array"
    : value === null
      ? "null"
      : typeof value;
  const typeBadgeClassName =
    nodeType === "string"
      ? "bg-success-soft text-syntax-string"
      : nodeType === "number"
        ? "bg-warning-soft text-warning"
        : nodeType === "boolean"
          ? "bg-accent text-primary"
          : nodeType === "null"
            ? "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300"
            : "bg-muted text-muted-foreground";
  const [open, setOpen] = useState(
    expansion.open ??
      (defaultOpenDepth === undefined
        ? depth === 0 || Array.isArray(value)
        : depth <= defaultOpenDepth),
  );
  const [valueError, setValueError] = useState<string | null>(null);
  const isRoot = depth === 0;
  const isEditing = Boolean(editMode && editor);
  const displayedLabel = isRoot ? "" : label;
  const treeItemLabel = isRoot ? "root" : isArrayItem ? `[${label}]` : label;
  const isSelected = Boolean(selectedPath && pathsEqual(path, selectedPath));
  const isSearchMatch = Boolean(searchMatchPaths?.has(pathKey(path)));
  const isCurrentSearchMatch = Boolean(
    currentSearchPath && pathsEqual(path, currentSearchPath),
  );
  const copyLabel = isRoot ? "Root node" : `${label} node`;
  const descendantQuery =
    query && displayedLabel.toLocaleLowerCase().includes(query) ? "" : query;
  const matchingEntries = entries?.filter(([key, child]) => {
    const childPath = [...path, Array.isArray(value) ? Number(key) : key];
    return (
      nodeMatches(key, child, descendantQuery) &&
      (!visiblePaths || visiblePaths.has(pathKey(childPath)))
    );
  }) ?? null;
  const canExpand = Boolean(matchingEntries?.length);
  const rowIndent = treeRowIndent(depth);

  useEffect(() => {
    if (expansion.open !== undefined) setOpen(expansion.open);
  }, [expansion.open, expansion.version]);

  useEffect(() => {
    if (query && canExpand) setOpen(true);
  }, [canExpand, query]);

  useEffect(() => setValueError(null), [value]);

  function selectNode() {
    onSelect?.({ key: isRoot ? "root" : label, path, value });
  }

  function updateValue(nextValue: unknown) {
    editor?.onValueChange(
      updateJsonAtPath(rootValue, path, () => nextValue),
    );
  }

  function duplicateNode() {
    editor?.onValueChange(
      duplicateJsonNode(rootValue, path),
    );
  }

  function deleteNode() {
    editor?.onValueChange(
      deleteJsonNode(rootValue, path),
    );
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

  const selectedClassName = isSearchMatch
    ? "bg-accent"
    : "bg-transparent hover:bg-muted/60 focus-visible:bg-muted/60";
  const currentSearchClassName = isCurrentSearchMatch
    ? "border-l-[3px] border-primary"
    : "";
  const keyText = isRoot ? (entries ? "root" : "") : displayedLabel;
  const keyLabel = keyText ? (
    <span
      className={`${isEditing ? "min-w-0 max-w-[92px] shrink truncate" : ""} font-[650] ${valueError ? "text-destructive" : "text-foreground"}`}
    >
      {keyText}
    </span>
  ) : null;
  const keyControl = keyLabel && valueError ? (
    <JsonTooltip label={valueError}>{keyLabel}</JsonTooltip>
  ) : keyLabel;
  const dragHandle = editMode === "tree" && dragState && !isRoot ? (
    <button
      {...dragState.attributes}
      {...dragState.listeners}
      aria-label={`Reorder ${treeItemLabel}`}
      className="flex size-6 shrink-0 cursor-grab items-center justify-center text-input hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring active:cursor-grabbing"
      disabled={dragState.disabled}
      onClick={(event) => event.stopPropagation()}
      ref={dragState.setActivatorNodeRef}
      type="button"
    >
      <GripVertical aria-hidden="true" className="size-[13px]" />
    </button>
  ) : (
    <GripVertical
      aria-hidden="true"
      className="size-[13px] shrink-0 text-input group-hover:text-primary group-focus-within:text-primary"
    />
  );
  const copyButtonLabel = `Copy ${isRoot ? "root" : label} value`;
  const copyButton = showNodeCopyActions ? (
    <JsonTooltip label={copyButtonLabel}>
      <Button
        aria-label={copyButtonLabel}
        className="relative ml-auto shrink-0 text-muted-foreground opacity-0 before:absolute before:inset-[-6px] before:content-[''] group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
        onClick={(event) => {
          event.stopPropagation();
          onCopy(JSON.stringify(value, null, 2) ?? String(value), copyLabel);
        }}
        size="icon-xs"
        type="button"
        variant="ghost"
      >
        <Copy aria-hidden="true" className="size-3.5" />
      </Button>
    </JsonTooltip>
  ) : null;

  if (!entries) {
    const displayedValue = nodeType === "string" ? JSON.stringify(value) : String(value);
    const ValueIcon = isArrayItem
      ? Brackets
      : nodeType === "string" && /(url|uri|href|link)/i.test(label)
        ? Link
        : nodeType === "string"
          ? Type
          : nodeType === "boolean"
            ? ToggleRight
            : nodeType === "null"
              ? CircleSlash2
              : Hash;
    const iconClassName =
      isArrayItem || nodeType === "string"
        ? "text-syntax-string"
        : nodeType === "number"
          ? "text-warning"
          : nodeType === "boolean"
            ? "text-primary"
            : "text-violet-700 dark:text-violet-400";
    return (
      <div
        aria-label={treeItemLabel}
        aria-selected={onSelect ? isSelected : undefined}
        className={`group flex w-full items-center gap-[7px] rounded-sm pr-1.5 font-mono text-[11px] leading-4 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${isEditing ? "h-9 min-w-0" : "h-7 min-w-max"} ${rowIndent} ${selectedClassName} ${currentSearchClassName} ${dragState?.isDragging ? "bg-accent shadow-sm" : ""}`}
        data-json-search-current={isCurrentSearchMatch || undefined}
        onClick={selectNode}
        onFocus={selectNode}
        onKeyDown={handleKeyDown}
        role="treeitem"
        tabIndex={isRoot ? 0 : -1}
      >
        {dragHandle}
        <ValueIcon
          aria-hidden="true"
          className={`size-3.5 shrink-0 ${iconClassName}`}
        />
        {keyControl}
        <span
          className={`inline-flex shrink-0 items-center rounded-sm px-[5px] py-0.5 text-[8px] leading-none font-[650] ${typeBadgeClassName}`}
        >
          {nodeType.toUpperCase()}
        </span>
        {isEditing ? (
          <JsonScalarEditor
            label={treeItemLabel}
            onChange={updateValue}
            onErrorChange={setValueError}
            type={nodeType}
            value={value}
          />
        ) : (
          <span
            className={
              nodeType === "string"
                ? "text-syntax-string"
                : nodeType === "number"
                  ? "text-warning"
                  : nodeType === "boolean"
                    ? "text-primary"
                    : "text-violet-700 dark:text-violet-400"
            }
          >
            {displayedValue}
          </span>
        )}
        {editMode === "tree" && editor && !isRoot ? (
          <JsonTreeActions
            editor={editor}
            label={treeItemLabel}
            onDelete={deleteNode}
            onDuplicate={duplicateNode}
            path={path}
            rootValue={rootValue}
            value={value}
          />
        ) : editMode === "form" ? null : copyButton}
      </div>
    );
  }

  const countLabel = Array.isArray(value)
    ? `[${entries.length} item${entries.length === 1 ? "" : "s"}]`
    : `{${entries.length} key${entries.length === 1 ? "" : "s"}}`;

  return (
    <div className={`w-full font-mono text-[11px] leading-4 text-foreground ${isEditing ? "min-w-0" : "min-w-max"}`}>
      <div
        aria-expanded={canExpand ? open : undefined}
        aria-label={treeItemLabel}
        aria-selected={onSelect ? isSelected : undefined}
        className={`group flex h-7 w-full items-center gap-[7px] rounded-sm pr-1.5 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${isEditing ? "min-w-0" : "min-w-max"} ${rowIndent} ${selectedClassName} ${currentSearchClassName} ${dragState?.isDragging ? "bg-accent shadow-sm" : ""}`}
        data-json-search-current={isCurrentSearchMatch || undefined}
        onClick={selectNode}
        onFocus={selectNode}
        onKeyDown={handleKeyDown}
        role="treeitem"
        tabIndex={isRoot ? 0 : -1}
      >
        {dragHandle}
        <button
          aria-expanded={open}
          aria-label={`${open ? "Collapse" : "Expand"} ${isRoot ? "root" : label}`}
          className="relative flex size-3.5 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground before:absolute before:-inset-[5px] before:content-[''] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-40"
          disabled={!canExpand}
          onClick={(event) => {
            event.stopPropagation();
            setOpen((current) => !current);
          }}
          type="button"
        >
          {open ? (
            <ChevronDown aria-hidden="true" className="size-3.5" />
          ) : (
            <ChevronRight aria-hidden="true" className="size-3.5" />
          )}
        </button>
        {keyControl}
        <span
          className={`inline-flex shrink-0 items-center rounded-sm px-[5px] py-0.5 text-[8px] leading-none font-[650] ${typeBadgeClassName}`}
        >
          {nodeType.toUpperCase()}
        </span>
        <span className="text-muted-foreground">{countLabel}</span>
        {editMode === "tree" && editor && !isRoot ? (
          <JsonTreeActions
            editor={editor}
            label={treeItemLabel}
            onDelete={deleteNode}
            onDuplicate={duplicateNode}
            path={path}
            rootValue={rootValue}
            value={value}
          />
        ) : editMode === "form" ? null : copyButton}
      </div>
      {open && (canExpand || (isRoot && (onAddRootProperty || editMode === "tree"))) ? (
        <div
          className="mt-0.5 flex w-full flex-col gap-0.5"
          role="group"
        >
          {editMode === "tree" && editor && matchingEntries ? (
            <OrderableList
              ariaLabel={`Items in ${treeItemLabel}`}
              className="flex w-full min-w-0 flex-col gap-0.5"
              disabled={reorderDisabled}
              getId={([key]) => pathKey([
                ...path,
                Array.isArray(value) ? Number(key) : key,
              ])}
              getLabel={([key]) => Array.isArray(value) ? `item ${key}` : key}
              items={matchingEntries}
              onReorder={(orderedEntries) => {
                const reorderedValue = Array.isArray(value)
                  ? orderedEntries.map(([, child]) => child)
                  : Object.fromEntries(orderedEntries);
                editor.onValueChange(
                  updateJsonAtPath(rootValue, path, () => reorderedValue),
                );
              }}
              renderItem={([key, child], state) => {
                const childPath = [
                  ...path,
                  Array.isArray(value) ? Number(key) : key,
                ] as const;
                return (
                  <JsonTreeNode
                    currentSearchPath={currentSearchPath}
                    depth={depth + 1}
                    defaultOpenDepth={defaultOpenDepth}
                    dragState={state}
                    editMode={editMode}
                    editor={editor}
                    expansion={expansion}
                    isArrayItem={Array.isArray(value)}
                    label={key}
                    onCopy={onCopy}
                    onSelect={onSelect}
                    path={childPath}
                    query={descendantQuery}
                    reorderDisabled={reorderDisabled}
                    rootValue={rootValue}
                    searchMatchPaths={searchMatchPaths}
                    selectedPath={selectedPath}
                    showNodeCopyActions={showNodeCopyActions}
                    value={child}
                    visiblePaths={visiblePaths}
                  />
                );
              }}
            />
          ) : matchingEntries?.map(([key, child]) => {
              const childPath = [...path, Array.isArray(value) ? Number(key) : key] as const;
              return (
                <JsonTreeNode
                  currentSearchPath={currentSearchPath}
                  depth={depth + 1}
                  defaultOpenDepth={defaultOpenDepth}
                  editMode={editMode}
                  editor={editor}
                  expansion={expansion}
                  isArrayItem={Array.isArray(value)}
                  key={pathKey(childPath)}
                  label={key}
                  onCopy={onCopy}
                  onSelect={onSelect}
                  path={childPath}
                  query={descendantQuery}
                  reorderDisabled={reorderDisabled}
                  rootValue={rootValue}
                  searchMatchPaths={searchMatchPaths}
                  selectedPath={selectedPath}
                  showNodeCopyActions={showNodeCopyActions}
                  value={child}
                  visiblePaths={visiblePaths}
                />
              );
            })}
          {isRoot && editMode === "tree" && editor ? (
            <JsonNodeActionPopover
              action="add"
              editor={editor}
              label="root"
              path={path}
              rootValue={rootValue}
              triggerText={Array.isArray(value) ? "Add root item" : "Add root property"}
              value={value}
            />
          ) : isRoot && onAddRootProperty ? (
            <button
              className="flex h-7 w-fit items-center gap-[7px] rounded-sm pr-1.5 pl-[26px] font-sans text-[11px] font-semibold text-primary hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              onClick={onAddRootProperty}
              type="button"
            >
              <Plus aria-hidden="true" className="size-3.5" />
              Add root property
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function JsonResultRenderer({
  artifactValue,
  className = "",
  defaultOpenDepth,
  downloadName = "smarttools-result.json",
  editor,
  formattedValue,
  headerActions,
  label = "JSON result",
  maxVisibleEntries,
  onSearchMatchIndexChange,
  onSearchQueryChange,
  onCopy,
  onAddRootProperty,
  onSelect,
  onViewChange,
  persistentSearch = false,
  searchMatchIndex: controlledSearchMatchIndex,
  searchQuery: controlledSearchQuery,
  selectedPath,
  showArtifactActions = true,
  showNodeCopyActions = true,
  value,
  view: controlledView,
}: {
  artifactValue?: string;
  className?: string;
  defaultOpenDepth?: number;
  downloadName?: string;
  editor?: JsonEditorController;
  formattedValue?: string;
  headerActions?: ReactNode;
  label?: string;
  maxVisibleEntries?: number;
  onSearchMatchIndexChange?: (index: number) => void;
  onSearchQueryChange?: (query: string) => void;
  onCopy?: (value: string, label: string) => void;
  onAddRootProperty?: () => void;
  onSelect?: (selection: JsonTreeSelection) => void;
  onViewChange?: (view: JsonResultView) => void;
  persistentSearch?: boolean;
  searchMatchIndex?: number;
  searchQuery?: string;
  selectedPath?: JsonTreePath;
  showArtifactActions?: boolean;
  showNodeCopyActions?: boolean;
  value: unknown;
  view?: JsonResultView;
}) {
  const resultId = useId().replaceAll(":", "");
  const [internalView, setInternalView] = useState<JsonResultView>("tree");
  const view = controlledView ?? internalView;
  const [searchOpen, setSearchOpen] = useState(false);
  const [internalQuery, setInternalQuery] = useState("");
  const [internalSearchMatchIndex, setInternalSearchMatchIndex] = useState(0);
  const query = controlledSearchQuery ?? internalQuery;
  const searchMatchIndex =
    controlledSearchMatchIndex ?? internalSearchMatchIndex;
  const [expansion, setExpansion] = useState<TreeExpansion>({ version: 0 });
  const [internalSelectedPath, setInternalSelectedPath] = useState<JsonTreePath | undefined>(
    selectedPath,
  );
  const views: readonly JsonResultView[] = editor
    ? ["tree", "formatted", "code", "form"]
    : ["tree", "formatted"];
  const isStructuredView = view === "tree" || view === "form";
  const formatted = formattedValue ?? JSON.stringify(value, null, 2) ?? String(value);
  const highlightedFormatted = useMemo(() => highlightJson(formatted), [formatted]);
  const formattedLines = useMemo(() => formatted.split(/\r\n|\r|\n/), [formatted]);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const formattedMatches = useMemo(() => {
    if (!normalizedQuery) return [];
    const matches: number[] = [];
    formattedLines.forEach((line, lineIndex) => {
      const normalizedLine = line.toLocaleLowerCase();
      let searchFrom = 0;
      while (searchFrom < normalizedLine.length) {
        const matchIndex = normalizedLine.indexOf(normalizedQuery, searchFrom);
        if (matchIndex === -1) break;
        matches.push(lineIndex);
        searchFrom = matchIndex + normalizedQuery.length;
      }
    });
    return matches;
  }, [formattedLines, normalizedQuery]);
  const treeMatches = useMemo(
    () => matchingTreePaths(value, normalizedQuery),
    [normalizedQuery, value],
  );
  const codeMatches = useMemo(
    () => matchingTextOffsets(editor?.code ?? "", normalizedQuery),
    [editor?.code, normalizedQuery],
  );
  const activeSearchCount = view === "formatted"
    ? formattedMatches.length
    : view === "code"
      ? codeMatches.length
      : treeMatches.length;
  const resolvedSearchMatchIndex = activeSearchCount
    ? Math.min(searchMatchIndex, activeSearchCount - 1)
    : 0;
  const currentFormattedMatchLine =
    formattedMatches[resolvedSearchMatchIndex];
  const currentTreeSearchPath = treeMatches[resolvedSearchMatchIndex];
  const currentCodeSearchOffset = codeMatches[resolvedSearchMatchIndex];
  const formattedMatchLines = useMemo(
    () => new Set(formattedMatches),
    [formattedMatches],
  );
  const treeMatchPaths = useMemo(
    () => new Set(treeMatches.map(pathKey)),
    [treeMatches],
  );
  const artifact = artifactValue ?? formatted;
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

  useEffect(() => {
    if (!persistentSearch || !normalizedQuery) return;
    if (view === "code") {
      const input = document.getElementById(`${resultId}-code-editor`);
      if (input instanceof HTMLTextAreaElement && currentCodeSearchOffset !== undefined) {
        input.setSelectionRange(
          currentCodeSearchOffset,
          currentCodeSearchOffset + normalizedQuery.length,
        );
      }
      return;
    }
    const match = view === "formatted"
      ? document.getElementById(`${resultId}-formatted-line-${currentFormattedMatchLine}`)
      : document.querySelector(
          `#${resultId}-${view} [data-json-search-current=true]`,
        );
    match?.scrollIntoView({ block: "nearest" });
  }, [currentCodeSearchOffset, currentFormattedMatchLine, currentTreeSearchPath, normalizedQuery, persistentSearch, resultId, searchMatchIndex, view]);

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

  function updateSearchQuery(nextQuery: string) {
    if (controlledSearchQuery === undefined) setInternalQuery(nextQuery);
    onSearchQueryChange?.(nextQuery);
  }

  function updateSearchMatchIndex(nextIndex: number) {
    if (controlledSearchMatchIndex === undefined) {
      setInternalSearchMatchIndex(nextIndex);
    }
    onSearchMatchIndexChange?.(nextIndex);
  }

  function activateView(nextView: JsonResultView) {
    if (controlledView === undefined) setInternalView(nextView);
    updateSearchMatchIndex(0);
    onViewChange?.(nextView);
    if (!persistentSearch && nextView !== "tree") {
      updateSearchQuery("");
      setSearchOpen(false);
    }
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
    <TooltipProvider>
      <section
        aria-label={label}
        className={`flex min-h-0 flex-1 flex-col overflow-hidden bg-card ${className}`}
        data-testid="json-result-renderer"
      >
      <header className="flex min-h-[46px] shrink-0 items-center justify-between gap-3 border-b border-border px-[14px] max-[42rem]:flex-col max-[42rem]:items-stretch max-[42rem]:gap-0 max-[42rem]:pb-2">
        <Select
          onValueChange={(nextView) => activateView(nextView as JsonResultView)}
          value={view}
        >
          <SelectTrigger
            aria-label="JSON result view"
            className="w-[132px] shrink-0 capitalize"
            id={`${resultId}-view-select`}
            size="xs"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {views.map((nextView) => (
              <SelectItem className="capitalize" key={nextView} value={nextView}>
                {nextView === "formatted" ? "Text" : nextView}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div
          className={`flex min-w-0 flex-1 flex-wrap items-center justify-end gap-3 max-[42rem]:w-full ${
            isStructuredView
              ? "max-[42rem]:grid max-[42rem]:grid-cols-[minmax(0,1fr)_auto_auto]"
              : "max-[42rem]:justify-end"
          }`}
        >
          {persistentSearch ? (
            <div
              className={`flex min-w-0 shrink items-center gap-[7px] rounded-lg border border-border bg-muted px-[9px] focus-within:border-primary max-[42rem]:w-auto max-[42rem]:flex-1 ${normalizedQuery ? "h-[34px] w-[218px]" : "h-8 w-[190px]"}`}
              data-testid="json-search-control"
            >
              <Search
                aria-hidden="true"
                className="size-3.5 shrink-0 text-muted-foreground"
              />
              <Input
                aria-label="Search JSON result"
                autoFocus={!persistentSearch}
                className="h-full min-w-0 flex-1 appearance-none border-0 bg-transparent !p-0 font-sans !text-caption shadow-none focus-visible:ring-0 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
                onChange={(event) => {
                  updateSearchQuery(event.target.value);
                  updateSearchMatchIndex(0);
                }}
                placeholder="Search keys or values"
                type="search"
                value={query}
              />
              {normalizedQuery ? (
                <div className="ml-auto flex shrink-0 items-center gap-[7px]">
                  <span
                    aria-live="polite"
                    className="shrink-0 font-mono text-[10px] text-foreground"
                  >
                    {`${activeSearchCount ? resolvedSearchMatchIndex + 1 : 0} / ${activeSearchCount}`}
                  </span>
                  <div className="flex shrink-0 items-center">
                    <JsonTooltip label="Previous match">
                      <button
                        aria-label="Previous JSON search match"
                        className="flex size-6 shrink-0 items-center justify-center p-0 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-40"
                        disabled={activeSearchCount === 0}
                        onClick={() =>
                          updateSearchMatchIndex(
                            (searchMatchIndex - 1 + activeSearchCount) % activeSearchCount,
                          )
                        }
                        type="button"
                      >
                        <ChevronUp aria-hidden="true" className="size-3.5" />
                      </button>
                    </JsonTooltip>
                    <JsonTooltip label="Next match">
                      <button
                        aria-label="Next JSON search match"
                        className="flex size-6 shrink-0 items-center justify-center p-0 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-40"
                        disabled={activeSearchCount === 0}
                        onClick={() =>
                          updateSearchMatchIndex(
                            (searchMatchIndex + 1) % activeSearchCount,
                          )
                        }
                        type="button"
                      >
                        <ChevronDown aria-hidden="true" className="size-3.5" />
                      </button>
                    </JsonTooltip>
                  </div>
                </div>
              ) : null}
            </div>
          ) : isStructuredView && searchOpen ? (
            <div className="relative flex min-w-0 items-center gap-1 max-[42rem]:flex-1">
              <Input
                aria-label="Search JSON result"
                autoFocus
                className="h-11 w-[210px] appearance-none font-sans text-[11px] max-[42rem]:w-full [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
                onChange={(event) => updateSearchQuery(event.target.value)}
                placeholder="Search keys or values"
                type="search"
                value={query}
              />
              <Button
                aria-label="Close JSON search"
                className="size-11"
                onClick={() => {
                  updateSearchQuery("");
                  setSearchOpen(false);
                }}
                size="icon"
                type="button"
                variant="ghost"
              >
                <X aria-hidden="true" className="size-4" />
              </Button>
            </div>
          ) : isStructuredView ? (
            <JsonTooltip label="Search JSON result">
              <Button
                aria-label="Search JSON result"
                className="size-11 shrink-0"
                onClick={() => setSearchOpen(true)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <Search aria-hidden="true" className="size-4" />
              </Button>
            </JsonTooltip>
          ) : null}
          {isStructuredView ? (
            <ButtonGroup aria-label="Tree expansion controls" className="shrink-0">
              <JsonTooltip label="Expand all">
                <Button
                  aria-label="Expand all JSON nodes"
                  onClick={() => setAll(true)}
                  size="icon-xs"
                  type="button"
                  variant="outline"
                >
                  <ChevronsDown aria-hidden="true" />
                </Button>
              </JsonTooltip>
              <JsonTooltip label="Collapse all">
                <Button
                  aria-label="Collapse all JSON nodes"
                  onClick={() => setAll(false)}
                  size="icon-xs"
                  type="button"
                  variant="outline"
                >
                  <ChevronsUp aria-hidden="true" />
                </Button>
              </JsonTooltip>
            </ButtonGroup>
          ) : null}
          {editor ? (
            <ButtonGroup aria-label="JSON edit history" className="shrink-0">
              <JsonTooltip label="Undo">
                <Button
                  aria-label="Undo JSON edit"
                  disabled={!editor.canUndo}
                  onClick={editor.onUndo}
                  size="icon-xs"
                  type="button"
                  variant="outline"
                >
                  <Undo2 aria-hidden="true" />
                </Button>
              </JsonTooltip>
              <JsonTooltip label="Redo">
                <Button
                  aria-label="Redo JSON edit"
                  disabled={!editor.canRedo}
                  onClick={editor.onRedo}
                  size="icon-xs"
                  type="button"
                  variant="outline"
                >
                  <Redo2 aria-hidden="true" />
                </Button>
              </JsonTooltip>
            </ButtonGroup>
          ) : null}
          {headerActions}
          {showArtifactActions ? (
            <>
              <JsonTooltip label="Copy JSON result">
                <Button
                  aria-label="Copy JSON result"
                  className="size-11 shrink-0 text-muted-foreground max-[42rem]:col-start-2 max-[42rem]:row-start-2"
                  onClick={() => void copyValue(artifact, "JSON result")}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <Copy aria-hidden="true" className="size-4" />
                </Button>
              </JsonTooltip>
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

      {isStructuredView && editor ? (
        <div
          aria-labelledby={`${resultId}-view-select`}
          className="flex min-h-0 flex-1 flex-col"
          id={`${resultId}-${view}`}
          role="tabpanel"
        >
          <div className="min-h-0 flex-1 overflow-auto p-1.5">
            {normalizedQuery && !nodeMatches("root", value, normalizedQuery) ? (
              <p className="p-4 text-center text-sm text-muted-foreground" role="status">
                No keys or values match “{query}”.
              </p>
            ) : (
              <div
                aria-label={view === "form" ? "JSON value editor" : "JSON tree editor"}
                className="w-full min-w-0"
                role="tree"
              >
                <JsonTreeNode
                  currentSearchPath={persistentSearch ? currentTreeSearchPath : undefined}
                  defaultOpenDepth={defaultOpenDepth}
                  editMode={view}
                  editor={editor}
                  expansion={expansion}
                  label="root"
                  onCopy={copyValue}
                  onSelect={handleSelect}
                  query={normalizedQuery}
                  reorderDisabled={Boolean(normalizedQuery || treeView?.truncated)}
                  rootValue={value}
                  searchMatchPaths={persistentSearch ? treeMatchPaths : undefined}
                  selectedPath={resolvedSelectedPath}
                  showNodeCopyActions={false}
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
        </div>
      ) : view === "tree" ? (
        <div
          aria-labelledby={`${resultId}-view-select`}
          className="min-h-0 flex-1 overflow-auto p-1.5"
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
                currentSearchPath={persistentSearch ? currentTreeSearchPath : undefined}
                defaultOpenDepth={defaultOpenDepth}
                expansion={expansion}
                label="root"
                onAddRootProperty={onAddRootProperty}
                onCopy={copyValue}
                onSelect={handleSelect}
                query={normalizedQuery}
                rootValue={value}
                searchMatchPaths={persistentSearch ? treeMatchPaths : undefined}
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
      ) : view === "formatted" ? (
        <div
          aria-labelledby={`${resultId}-view-select`}
          className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto bg-muted/20 p-4"
          id={`${resultId}-formatted`}
          role="tabpanel"
          tabIndex={0}
        >
          <pre className="whitespace-pre-wrap break-all font-mono text-xs leading-4 text-foreground">
            {persistentSearch ? formattedLines.map((line, lineIndex) => {
              const isMatch = formattedMatchLines.has(lineIndex);
              const isCurrentMatch = currentFormattedMatchLine === lineIndex;
              return (
                <span
                  className={`block min-w-0 rounded-sm ${
                    isMatch ? "bg-accent" : ""
                  } ${isCurrentMatch ? "border-l-[3px] border-primary pl-1" : ""}`}
                  data-formatted-match={isMatch || undefined}
                  id={`${resultId}-formatted-line-${lineIndex}`}
                  key={lineIndex}
                >
                  {line ? highlightJson(line) : "\u00a0"}
                </span>
              );
            }) : highlightedFormatted}
          </pre>
        </div>
      ) : view === "code" && editor ? (
        <div
          aria-labelledby={`${resultId}-view-select`}
          className="flex min-h-0 flex-1 flex-col"
          id={`${resultId}-code`}
          role="tabpanel"
        >
          <div className={`relative min-h-0 flex-1 overflow-hidden ${editor.codeError ? "ring-1 ring-inset ring-destructive" : ""}`}>
            <SourceTextarea
              aria-describedby={editor.codeError ? `${resultId}-code-error` : undefined}
              aria-invalid={Boolean(editor.codeError)}
              className="h-full min-h-0"
              gutter
              highlightedValue={highlightJson(editor.code)}
              id={`${resultId}-code-editor`}
              onChange={editor.onCodeChange}
              value={editor.code}
              wrap="soft"
            />
            {editor.codeError ? (
              <p
                className="pointer-events-none absolute right-3 bottom-2 max-w-[min(80%,28rem)] truncate rounded-sm bg-card px-2 py-1 text-[10px] text-destructive shadow-sm"
                id={`${resultId}-code-error`}
                role="alert"
              >
                {editor.codeError}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
      </section>
    </TooltipProvider>
  );
}
