"use client";

import type { ResolvedTool, ToolApp } from "@smarttools/tool-catalog";
import {
  OrderableList,
  type OrderableItemState,
} from "@smarttools/ui/components/OrderableList";
import { Switch } from "@smarttools/ui/components/switch";
import {
  Button,
  Card,
  Field,
  Input,
  StatusBadge,
  Textarea,
} from "@smarttools/ui";
import {
  Braces,
  Calculator,
  ChartNoAxesColumnIncreasing,
  ClipboardList,
  FileText,
  GripVertical,
  ReceiptText,
  Route,
  TriangleAlert,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import {
  archiveToolAction,
  reorderToolsAction,
  toggleToolAction,
  updateToolAction,
} from "../../../actions";

const TOOL_ICONS: Readonly<Record<string, LucideIcon>> = {
  "1099-nec-tracker": UsersRound,
  "expense-report": ChartNoAxesColumnIncreasing,
  "invoice-generator": FileText,
  "json-formatter": Braces,
  "mileage-log": Route,
  "quarterly-tax-estimator": Calculator,
  "receipt-generator": ReceiptText,
  "w9-request": ClipboardList,
};

const GROUPS: readonly {
  app: ToolApp;
  description: string;
  title: string;
}[] = [
  {
    app: "paperwork",
    title: "Paperwork",
    description: "Drag to control the order shown in the Paperwork catalog.",
  },
  {
    app: "devtools",
    title: "Developer tools",
    description: "Drag to control the order shown in the Devtools catalog.",
  },
  {
    app: "media",
    title: "Media tools",
    description: "Drag to control the order shown in the Media catalog.",
  },
];

function sortByOrder(tools: readonly ResolvedTool[]) {
  return [...tools].sort((left, right) => left.order - right.order);
}

function ToolStatus({ tool }: { tool: ResolvedTool }) {
  if (tool.archived) return <StatusBadge variant="archived">Archived</StatusBadge>;
  if (!tool.slug) return <StatusBadge variant="warning">Setup required</StatusBadge>;
  if (tool.enabled) return <StatusBadge variant="success">Active</StatusBadge>;
  return <StatusBadge>Disabled</StatusBadge>;
}

function ToolToggle({ tool }: { tool: ResolvedTool }) {
  const [checked, setChecked] = useState(tool.enabled);
  const [isPending, startTransition] = useTransition();

  useEffect(() => setChecked(tool.enabled), [tool.enabled]);

  function handleCheckedChange(enabled: boolean) {
    const previous = checked;
    setChecked(enabled);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("toolId", tool.id);
      formData.set("enabled", String(enabled));
      try {
        await toggleToolAction(formData);
      } catch {
        setChecked(previous);
      }
    });
  }

  return (
    <Switch
      aria-label={`${checked ? "Disable" : "Enable"} ${tool.name}`}
      checked={checked}
      disabled={isPending}
      onCheckedChange={handleCheckedChange}
      size="lg"
    />
  );
}

function ToolConfiguration({
  onClose,
  tool,
}: {
  onClose: () => void;
  tool: ResolvedTool;
}) {
  return (
    <div className="border-t border-border bg-muted/40 px-5 py-5 sm:px-6">
      <form action={updateToolAction} className="grid gap-4 lg:grid-cols-2">
        <input name="toolId" type="hidden" value={tool.id} />
        <input name="archived" type="hidden" value="true" />
        <Field
          className={tool.slug ? "lg:col-span-2" : undefined}
          htmlFor={`${tool.id}-name`}
          label="Name"
          required
        >
          <Input
            defaultValue={tool.name}
            id={`${tool.id}-name`}
            maxLength={160}
            name="name"
            required
          />
        </Field>
        {!tool.slug ? (
          <Field
            description="Use lowercase letters, numbers, and single hyphens."
            htmlFor={`${tool.id}-slug`}
            label="Slug"
            required
          >
            <Input
              id={`${tool.id}-slug`}
              name="slug"
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              placeholder="lowercase-single-hyphens"
              required
            />
          </Field>
        ) : null}
        <Field
          className="lg:col-span-2"
          htmlFor={`${tool.id}-description`}
          label="Description"
          required
        >
          <Textarea
            defaultValue={tool.description}
            id={`${tool.id}-description`}
            maxLength={2000}
            name="description"
            required
          />
        </Field>
        <div className="flex flex-wrap items-center gap-2 lg:col-span-2">
          <Button type="submit">Save configuration</Button>
          <Button onClick={onClose} type="button" variant="secondary">
            Cancel
          </Button>
          <Button
            className="sm:ml-auto"
            formAction={archiveToolAction}
            formNoValidate
            type="submit"
            variant="danger-subtle"
          >
            Archive tool
          </Button>
        </div>
      </form>
    </div>
  );
}

function ToolRow({
  orderable,
  tool,
}: {
  orderable: OrderableItemState;
  tool: ResolvedTool;
}) {
  const [isConfiguring, setIsConfiguring] = useState(false);
  const Icon = tool.slug ? (TOOL_ICONS[tool.componentKey] ?? FileText) : TriangleAlert;
  const isSetupRequired = !tool.slug && !tool.archived;

  return (
    <div
      className={`${isSetupRequired ? "bg-amber-50/70" : "bg-card"} ${
        tool.archived ? "text-muted-foreground" : ""
      } ${orderable.isDragging ? "shadow-lg ring-1 ring-primary/20" : ""}`}
    >
      <div className="grid min-h-24 gap-4 px-4 py-4 sm:px-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <button
            {...orderable.attributes}
            {...orderable.listeners}
            aria-label={`Reorder ${tool.name}`}
            className="grid size-9 shrink-0 cursor-grab touch-none place-items-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
            disabled={orderable.disabled}
            ref={orderable.setActivatorNodeRef}
            type="button"
          >
            <GripVertical aria-hidden="true" size={18} />
          </button>
          <span
            aria-hidden="true"
            className={`grid size-11 shrink-0 place-items-center rounded-xl ${
              isSetupRequired
                ? "bg-amber-200/70 text-amber-800"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <Icon size={22} strokeWidth={1.8} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="truncate text-base font-extrabold tracking-tight text-foreground">
                {tool.name}
              </span>
              <code
                className={`max-w-full break-all rounded-md border px-2 py-0.5 font-mono text-[0.6875rem] font-semibold leading-4 ${
                  isSetupRequired
                    ? "border-amber-200 bg-amber-100 text-amber-800"
                    : "border-border bg-muted text-muted-foreground"
                }`}
              >
                {tool.slug ?? "No slug"}
              </code>
            </span>
            <span
              className={`mt-0.5 block text-sm leading-5 ${
                isSetupRequired ? "font-semibold text-amber-800" : "text-muted-foreground"
              }`}
            >
              {tool.description}
            </span>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3 md:justify-end md:flex-nowrap">
          <ToolStatus tool={tool} />
          {!tool.archived && tool.slug ? <ToolToggle tool={tool} /> : null}
          {tool.archived ? (
            <form action={archiveToolAction}>
              <input name="toolId" type="hidden" value={tool.id} />
              <input name="archived" type="hidden" value="false" />
              <Button type="submit" variant="secondary">
                Restore
              </Button>
            </form>
          ) : (
            <Button
              aria-expanded={isConfiguring}
              onClick={() => setIsConfiguring((open) => !open)}
              type="button"
              variant={isSetupRequired ? undefined : "ghost"}
            >
              {isSetupRequired ? "Finish setup" : "Configure"}
            </Button>
          )}
        </div>
      </div>
      {isConfiguring && !tool.archived ? (
        <ToolConfiguration onClose={() => setIsConfiguring(false)} tool={tool} />
      ) : null}
    </div>
  );
}

function ToolGroup({
  app,
  description,
  title,
  tools,
}: {
  app: ToolApp;
  description: string;
  title: string;
  tools: readonly ResolvedTool[];
}) {
  const [items, setItems] = useState(() => sortByOrder(tools));
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => setItems(sortByOrder(tools)), [tools]);

  function handleReorder(nextItems: ResolvedTool[]) {
    const previousItems = items;
    setItems(nextItems);
    setMessage("Saving order…");
    startTransition(async () => {
      try {
        await reorderToolsAction(app, nextItems.map((tool) => tool.id));
        setMessage("Order saved.");
      } catch {
        setItems(previousItems);
        setMessage("Order could not be saved. Try again.");
      }
    });
  }

  return (
    <section aria-labelledby={`${app}-tools-heading`}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight" id={`${app}-tools-heading`}>
            {title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <p aria-live="polite" className="text-sm text-muted-foreground" role="status">
          {message}
        </p>
      </div>
      <Card className="overflow-hidden p-0">
        <OrderableList
          ariaLabel={`${title} order`}
          className="divide-y divide-border"
          disabled={isPending || items.length < 2}
          getId={(tool) => tool.id}
          items={items}
          onReorder={handleReorder}
          renderItem={(tool, orderable) => (
            <ToolRow orderable={orderable} tool={tool} />
          )}
        />
      </Card>
    </section>
  );
}

export function ToolList({ tools }: { tools: readonly ResolvedTool[] }) {
  return (
    <div className="space-y-8">
      {GROUPS.map((group) => {
        const groupTools = tools.filter((tool) => tool.app === group.app);
        return groupTools.length ? (
          <ToolGroup key={group.app} tools={groupTools} {...group} />
        ) : null;
      })}
    </div>
  );
}
