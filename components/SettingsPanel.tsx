"use client";

import {
  Button,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
  Select,
  Switch,
  Textarea,
} from "@smarttools/ui";
import { Plus, Trash2 } from "lucide-react";
import { type KeyboardEvent, type ReactNode, useId } from "react";
import type { FieldKind, FieldSpec, SettingRow, SettingsSpec, WatermarkPosition } from "@/lib/tool-framework/settings";
import { cn } from "@smarttools/ui/lib/utils";

export interface SettingsPanelProps {
  className?: string;
  disabled?: boolean;
  layout?: "grid" | "stack";
  onChange: (key: string, value: unknown) => void;
  pane?: "main" | "side";
  spec: SettingsSpec;
  values: Readonly<Record<string, unknown>>;
}

interface FieldRenderContext {
  disabled: boolean;
  id: string;
  onChange: (value: unknown) => void;
  value: unknown;
}

type FieldRendererRegistry = {
  [Kind in FieldKind]: (field: Extract<FieldSpec, { kind: Kind }>, context: FieldRenderContext) => ReactNode;
};

interface FieldFrameProps {
  children: ReactNode;
  help?: string;
  id: string;
  label: string;
}

function FieldFrame({ children, help, id, label }: FieldFrameProps) {
  return (
    <div className="grid gap-1.5">
      <Label className="font-caption text-[11px] font-semibold uppercase tracking-[0.025rem] text-muted-foreground" htmlFor={id}>
        {label}
      </Label>
      {children}
      {help ? (
        <p className="text-xs leading-5 text-muted-foreground" id={`${id}-help`}>
          {help}
        </p>
      ) : null}
    </div>
  );
}

function stringValue(value: unknown, fallback: string): string { return typeof value === "string" ? value : fallback; }

function numberValue(value: unknown, fallback: number): number { return typeof value === "number" && Number.isFinite(value) ? value : fallback; }

function rowsValue(value: unknown, fallback: readonly SettingRow[]): readonly SettingRow[] {
  if (!Array.isArray(value)) return fallback;
  const rows: SettingRow[] = [];
  for (const entry of value) {
    if (
      typeof entry !== "object" ||
      entry === null ||
      !("key" in entry) ||
      !("value" in entry) ||
      typeof entry.key !== "string" ||
      typeof entry.value !== "string"
    ) {
      return fallback;
    }
    rows.push({ key: entry.key, value: entry.value });
  }
  return rows;
}

const POSITIONS: readonly { label: string; value: WatermarkPosition }[] = [
  { label: "Top left", value: "top-left" },
  { label: "Top center", value: "top-center" },
  { label: "Top right", value: "top-right" },
  { label: "Middle left", value: "middle-left" },
  { label: "Middle center", value: "middle-center" },
  { label: "Middle right", value: "middle-right" },
  { label: "Bottom left", value: "bottom-left" },
  { label: "Bottom center", value: "bottom-center" },
  { label: "Bottom right", value: "bottom-right" },
];

function movePosition(event: KeyboardEvent<HTMLButtonElement>, index: number, onChange: (value: unknown) => void) {
  const row = Math.floor(index / 3);
  const column = index % 3;
  const nextIndex = {
    ArrowDown: Math.min(row + 1, 2) * 3 + column,
    ArrowLeft: row * 3 + Math.max(column - 1, 0),
    ArrowRight: row * 3 + Math.min(column + 1, 2),
    ArrowUp: Math.max(row - 1, 0) * 3 + column,
    End: POSITIONS.length - 1,
    Home: 0,
  }[event.key];
  if (nextIndex === undefined) return;
  event.preventDefault();
  if (nextIndex === index) return;
  onChange(POSITIONS[nextIndex].value);
  event.currentTarget.parentElement
    ?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
    [nextIndex]?.focus();
}

const FIELD_RENDERERS: FieldRendererRegistry = {
  text: (field, context) => (
    <FieldFrame help={field.help} id={context.id} label={field.label}>
      <Input
        aria-describedby={field.help ? `${context.id}-help` : undefined}
        disabled={context.disabled}
        id={context.id}
        maxLength={field.maxLength}
        onChange={(event) => context.onChange(event.currentTarget.value)}
        placeholder={field.placeholder}
        value={stringValue(context.value, field.default)}
      />
    </FieldFrame>
  ),
  textarea: (field, context) => (
    <FieldFrame help={field.help} id={context.id} label={field.label}>
      <Textarea
        aria-describedby={field.help ? `${context.id}-help` : undefined}
        disabled={context.disabled}
        id={context.id}
        onChange={(event) => context.onChange(event.currentTarget.value)}
        rows={field.rows}
        value={stringValue(context.value, field.default)}
      />
    </FieldFrame>
  ),
  password: (field, context) => (
    <FieldFrame help={field.help} id={context.id} label={field.label}>
      <Input
        aria-describedby={field.help ? `${context.id}-help` : undefined}
        disabled={context.disabled}
        id={context.id}
        onChange={(event) => context.onChange(event.currentTarget.value)}
        placeholder={field.placeholder}
        type="password"
        value={stringValue(context.value, field.default)}
      />
    </FieldFrame>
  ),
  number: (field, context) => (
    <FieldFrame help={field.help} id={context.id} label={field.label}>
      <div className="flex items-center gap-2">
        <Input
          aria-describedby={field.help ? `${context.id}-help` : undefined}
          disabled={context.disabled}
          id={context.id}
          max={field.max}
          min={field.min}
          onChange={(event) =>
            context.onChange(
              Number.isNaN(event.currentTarget.valueAsNumber)
                ? event.currentTarget.value
                : event.currentTarget.valueAsNumber,
            )
          }
          step={field.step}
          type="number"
          value={
            typeof context.value === "number" || typeof context.value === "string"
              ? context.value
              : field.default
          }
        />
        {field.suffix ? (
          <span className="shrink-0 text-sm text-muted-foreground">
            {field.suffix}
          </span>
        ) : null}
      </div>
    </FieldFrame>
  ),
  slider: (field, context) => {
    const value = numberValue(context.value, field.default);
    return (
      <FieldFrame help={field.help} id={context.id} label={field.label}>
        <div className="flex items-center gap-3">
          <Input
            aria-describedby={field.help ? `${context.id}-help` : undefined}
            disabled={context.disabled}
            id={context.id}
            max={field.max}
            min={field.min}
            onChange={(event) => context.onChange(event.currentTarget.valueAsNumber)}
            step={field.step}
            type="range"
            value={value}
          />
          <output className="min-w-12 text-right font-mono text-xs" htmlFor={context.id}>
            {value}{field.suffix}
          </output>
        </div>
      </FieldFrame>
    );
  },
  toggle: (field, context) => (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <Label className="font-sans text-sm font-semibold text-foreground" htmlFor={context.id}>
          {field.label}
        </Label>
        {field.help ? (
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground" id={`${context.id}-help`}>
            {field.help}
          </p>
        ) : null}
      </div>
      <Switch
        aria-describedby={field.help ? `${context.id}-help` : undefined}
        className="shrink-0"
        checked={typeof context.value === "boolean" ? context.value : field.default}
        disabled={context.disabled}
        id={context.id}
        onCheckedChange={context.onChange}
      />
    </div>
  ),
  select: (field, context) => (
    <FieldFrame help={field.help} id={context.id} label={field.label}>
      <Select
        aria-describedby={field.help ? `${context.id}-help` : undefined}
        className="w-full"
        disabled={context.disabled}
        id={context.id}
        onChange={(event) => context.onChange(event.currentTarget.value)}
        value={stringValue(context.value, field.default)}
      >
        {field.choices.map((choice) => (
          <option key={choice.value} value={choice.value}>{choice.label}</option>
        ))}
      </Select>
    </FieldFrame>
  ),
  preset: (field, context) => (
    <fieldset className="grid gap-2">
      <legend className="font-caption text-xs font-medium text-muted-foreground">{field.label}</legend>
      <RadioGroup
        aria-describedby={field.help ? `${context.id}-help` : undefined}
        disabled={context.disabled}
        onValueChange={context.onChange}
        value={stringValue(context.value, field.default)}
      >
        {field.choices.map((choice) => {
          const choiceId = `${context.id}-${choice.value}`;
          return (
            <div className="flex items-start gap-3 rounded-lg border border-border p-3" key={choice.value}>
              <RadioGroupItem id={choiceId} value={choice.value} />
              <Label className="grid cursor-pointer gap-0.5" htmlFor={choiceId}>
                <span>{choice.label}</span>
                {choice.detail ? <span className="font-normal text-muted-foreground">{choice.detail}</span> : null}
              </Label>
            </div>
          );
        })}
      </RadioGroup>
      {field.help ? <p className="text-xs leading-5 text-muted-foreground" id={`${context.id}-help`}>{field.help}</p> : null}
    </fieldset>
  ),
  color: (field, context) => {
    const value = stringValue(context.value, field.default);
    return (
      <FieldFrame help={field.help} id={context.id} label={field.label}>
        <div className="flex items-center gap-2">
          <Input
            aria-describedby={field.help ? `${context.id}-help` : undefined}
            className="w-16 px-2"
            disabled={context.disabled}
            id={context.id}
            onChange={(event) => context.onChange(event.currentTarget.value)}
            type="color"
            value={value === "transparent" ? "#000000" : value}
          />
          <div className="min-w-0 flex-1">
            <Label className="sr-only" htmlFor={`${context.id}-value`}>{field.label} value</Label>
            <Input
              disabled={context.disabled}
              id={`${context.id}-value`}
              onChange={(event) => context.onChange(event.currentTarget.value)}
              value={value}
            />
          </div>
          {field.allowTransparent ? (
            <Button disabled={context.disabled} onClick={() => context.onChange("transparent")} type="button" variant="outline">
              Transparent
            </Button>
          ) : null}
        </div>
      </FieldFrame>
    );
  },
  date: (field, context) => (
    <FieldFrame help={field.help} id={context.id} label={field.label}>
      <Input
        aria-describedby={field.help ? `${context.id}-help` : undefined}
        disabled={context.disabled}
        id={context.id}
        onChange={(event) => context.onChange(event.currentTarget.value)}
        type="date"
        value={stringValue(context.value, field.default)}
      />
    </FieldFrame>
  ),
  position: (field, context) => {
    const value = stringValue(context.value, field.default);
    return (
      <fieldset className="grid gap-2">
        <legend className="font-caption text-xs font-medium text-muted-foreground">{field.label}</legend>
        <div aria-describedby={field.help ? `${context.id}-help` : undefined} aria-label={field.label} className="grid w-fit grid-cols-3 gap-1" role="radiogroup">
          {POSITIONS.map((position, index) => (
            <Button
              aria-checked={position.value === value}
              aria-label={position.label}
              className="size-11 p-0"
              disabled={context.disabled}
              key={position.value}
              onClick={() => context.onChange(position.value)}
              onKeyDown={(event) => movePosition(event, index, context.onChange)}
              role="radio"
              tabIndex={position.value === value ? 0 : -1}
              type="button"
              variant={position.value === value ? "default" : "outline"}
            >
              <span aria-hidden="true" className="size-2 rounded-full bg-current" />
            </Button>
          ))}
        </div>
        {field.help ? <p className="text-xs leading-5 text-muted-foreground" id={`${context.id}-help`}>{field.help}</p> : null}
      </fieldset>
    );
  },
  pages: (field, context) => {
    // "all" / "odd" / "even" stay as the keyword the user typed; only an
    // explicit page list is rendered as a comma-separated expression.
    const asExpression = (selection: typeof field.default): string =>
      Array.isArray(selection) ? selection.join(",") : String(selection);
    const value = Array.isArray(context.value)
      ? context.value.join(",")
      : stringValue(context.value, asExpression(field.default));
    return (
      <FieldFrame help={field.help} id={context.id} label={field.label}>
        <Input
          aria-describedby={field.help ? `${context.id}-help` : undefined}
          disabled={context.disabled}
          id={context.id}
          onChange={(event) => context.onChange(event.currentTarget.value)}
          placeholder="1,3,5-9, odd, even, or all"
          value={value}
        />
      </FieldFrame>
    );
  },
  rows: (field, context) => {
    const rows = rowsValue(context.value, field.default);
    return (
      <fieldset aria-describedby={field.help ? `${context.id}-help` : undefined} className="grid gap-3">
        <legend className="font-caption text-xs font-medium text-muted-foreground">{field.label}</legend>
        {rows.map((row, index) => {
          const keyId = `${context.id}-${index}-key`;
          const valueId = `${context.id}-${index}-value`;
          return (
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-2" key={`${context.id}-${index}`}>
              <div className="grid gap-1.5">
                <Label htmlFor={keyId}>{field.keyLabel}</Label>
                <Input disabled={context.disabled} id={keyId} onChange={(event) => context.onChange(rows.map((entry, rowIndex) => rowIndex === index ? { ...entry, key: event.currentTarget.value } : entry))} value={row.key} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={valueId}>{field.valueLabel}</Label>
                <Input disabled={context.disabled} id={valueId} onChange={(event) => context.onChange(rows.map((entry, rowIndex) => rowIndex === index ? { ...entry, value: event.currentTarget.value } : entry))} value={row.value} />
              </div>
              <Button aria-label={`Remove row ${index + 1}`} disabled={context.disabled} onClick={() => context.onChange(rows.filter((_, rowIndex) => rowIndex !== index))} size="icon" type="button" variant="ghost">
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
          );
        })}
        <Button className="w-fit" disabled={context.disabled} onClick={() => context.onChange([...rows, { key: "", value: "" }])} type="button" variant="outline">
          <Plus aria-hidden="true" /> Add row
        </Button>
        {field.help ? <p className="text-xs leading-5 text-muted-foreground" id={`${context.id}-help`}>{field.help}</p> : null}
      </fieldset>
    );
  },
};

export function SettingsPanel({
  className,
  disabled = false,
  layout = "stack",
  onChange,
  pane,
  spec,
  values,
}: SettingsPanelProps) {
  const idPrefix = useId();
  return (
    <div
      className={cn(
        layout === "grid"
          ? "grid grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-4"
          : "grid gap-5",
        className,
      )}
    >
      {Object.entries(spec.fields).map(([key, field]) => {
        if (
          pane &&
          (pane === "main" ? field.pane !== "main" : field.pane === "main")
        ) return null;
        if (field.visibleWhen && values[field.visibleWhen.key] !== field.visibleWhen.equals) return null;
        const context: FieldRenderContext = {
          disabled,
          id: `${idPrefix}-${key}`,
          onChange: (value) => onChange(key, value),
          value: values[key] ?? field.default,
        };
        return (
          <div
            className={
              layout !== "grid"
                ? undefined
                : field.span === "full"
                  ? "col-span-full"
                  : field.span === 2
                    ? "sm:col-span-2"
                    : undefined
            }
            key={key}
          >
            {FIELD_RENDERERS[field.kind](field as never, context)}
          </div>
        );
      })}
    </div>
  );
}
