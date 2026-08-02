"use client";

import { SmartToolsFooter } from "@/components/smarttools/SmartToolsFooter";
import {
  AccountNavigation,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  ToolPageShell,
} from "@smarttools/ui";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeftRight,
  ArrowUpRight,
  CheckCircle2,
  Globe2,
  ListChecks,
  LockKeyhole,
  ShieldCheck,
  Undo2,
} from "lucide-react";
import { type ComponentType } from "react";

import {
  ToolRuntimeProvider,
  useToolRuntime,
} from "@/lib/tool-runtime/useToolRuntime";
import type {
  ToolLifecycle,
  ToolDefinition,
  ToolPageComponentProps,
  ToolRuntimeSpec,
  ToolSettings,
} from "@/lib/tool-runtime/types";

type UniversalWorkbenchProps<
  Input,
  Settings extends ToolSettings,
  Result,
> = Omit<ToolPageComponentProps, "definitionKey"> & {
  definition: ToolDefinition;
  runtimeSpec: ToolRuntimeSpec<Input, Settings, Result>;
  StatusMeta?: ComponentType;
  Toolbar: ComponentType;
  Workspace: ComponentType;
};

const SUPPORT_ITEMS = [
  {
    icon: AlertTriangle,
    iconClassName: "text-amber-700",
    eyebrow: "Limitations",
    title: "Know the boundaries",
    description:
      "Check supported formats, limits, and edge cases before relying on the result.",
  },
  {
    icon: ShieldCheck,
    iconClassName: "text-primary",
    eyebrow: "Privacy",
    title: "Your data stays local",
    description:
      "Inputs and generated output stay in this browser unless a network action is stated.",
  },
  {
    icon: ListChecks,
    iconClassName: "text-primary",
    eyebrow: "How to use",
    title: "Complete the task safely",
    description:
      "Add input, choose the needed options, run the tool, then verify the result.",
  },
] as const;

function ConfirmationDialog({
  changes,
  confirmLabel,
  description,
  onCancel,
  onConfirm,
  title,
}: {
  changes: readonly string[];
  confirmLabel: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
}) {
  return (
    <AlertDialog open>
      <AlertDialogContent
        className="max-w-md border-amber-500/40"
        data-testid="tool-confirmation-overlay"
        onEscapeKeyDown={(event) => {
          event.preventDefault();
          onCancel();
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {changes.length > 0 ? (
          <ul className="max-h-32 space-y-1 overflow-auto rounded-md bg-muted p-3 font-mono text-xs">
            {changes.map((change) => (
              <li key={change}>{change}</li>
            ))}
          </ul>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function WorkbenchFrame<
  Input,
  Settings extends ToolSettings,
  Result,
>({
  account,
  category,
  definition,
  description,
  relatedTools = [],
  StatusMeta,
  title,
  Toolbar,
  Workspace,
}: Omit<UniversalWorkbenchProps<Input, Settings, Result>, "runtimeSpec">) {
  const runtime = useToolRuntime<Input, Settings, Result>();
  const isBusy = runtime.lifecycle === "running";
  const status =
    runtime.notice ||
    runtime.error ||
    runtime.issues[0]?.message ||
    lifecycleLabel(definition, runtime.lifecycle);
  const isMedia = definition.app === "media";
  const usesNetwork = Boolean(definition.capabilities.network);
  const compactToolbar = definition.toolbarSize !== "default";
  const productHref = isMedia ? "/media" : "/devtools";
  const productName = isMedia ? "Media tools" : "Developer tools";
  const privacyBadge = usesNetwork
    ? "USES ONLINE SERVICE"
    : isMedia
      ? "PRIVATE FILE PROCESSING"
      : "PRIVATE IN BROWSER";
  const PrivacyIcon = usesNetwork ? Globe2 : LockKeyhole;
  const capabilityBadge =
    definition.labels.primaryAction?.toUpperCase() ??
    (isMedia ? "FILE TOOL" : "BROWSER TOOL");

  return (
    <ToolPageShell
      badge={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Badge className="border-0 bg-accent text-primary" variant="secondary">
            {capabilityBadge}
          </Badge>
          <Badge className="border-0 bg-accent text-primary" variant="secondary">
            <PrivacyIcon aria-hidden="true" className="size-3" />
            {privacyBadge}
          </Badge>
        </div>
      }
      breadcrumbCurrent={title}
      category={category}
      description={description}
      eyebrow={isMedia ? "MEDIA TOOL" : "DEVELOPER TOOL"}
      footer={<SmartToolsFooter />}
      headerActions={<AccountNavigation {...account} />}
      productHref={productHref}
      productName={productName}
      skipHref="#tool-workspace"
      skipLabel="Skip to tool workspace"
      showCategoryInBreadcrumb
      title={title}
      workspaceClassName="pb-4"
      workspaceId="tool-page-content"
    >
      <section
        aria-busy={isBusy || undefined}
        className="relative flex h-[calc(100dvh-72px)] w-full flex-col overflow-hidden rounded-lg border border-input bg-card"
        data-definition-key={definition.definitionKey}
        data-testid="tool-workspace"
        id="tool-workspace"
        tabIndex={-1}
      >
        <header
          aria-label={`${title} actions`}
          className={`flex shrink-0 items-center border-b border-border px-4 py-2 ${
            compactToolbar ? "min-h-14" : "min-h-16"
          }`}
          data-testid="tool-action-toolbar"
          role="toolbar"
        >
          <Toolbar />
        </header>

        <section
          aria-label={`${title} workspace`}
          className="relative min-h-0 min-w-0 flex-1 overflow-hidden"
          data-testid="tool-workspace-content"
        >
          <Workspace />
        </section>

        <footer
          aria-live="polite"
          className="flex min-h-10 shrink-0 items-center justify-between gap-4 border-t border-border px-4 font-mono text-[11px] text-muted-foreground max-[40rem]:flex-col max-[40rem]:items-start max-[40rem]:py-2"
          data-testid="tool-status-line"
          role="status"
        >
          <span
            className={`inline-flex min-w-0 items-center gap-2 font-semibold ${
              runtime.lifecycle === "completed" ? "text-emerald-600" : ""
            }`}
          >
            {runtime.lifecycle === "completed" ? (
              <CheckCircle2 aria-hidden="true" className="size-4 text-emerald-600" />
            ) : runtime.lifecycle === "invalid" ||
              runtime.lifecycle === "failed" ? (
              <AlertCircle aria-hidden="true" className="size-4 text-destructive" />
            ) : null}
            <span className="truncate">{status}</span>
            {runtime.canUndo && !runtime.pendingConfirmation ? (
              <Button
                className="h-7 px-2 text-[11px]"
                onClick={runtime.undo}
                size="sm"
                type="button"
                variant="ghost"
              >
                <Undo2 aria-hidden="true" className="size-3.5" />
                Undo
              </Button>
            ) : null}
          </span>
          <span className="shrink-0">
            {StatusMeta ? (
              <StatusMeta />
            ) : (
              runtime.facts
                .map((fact) => `${fact.label}: ${fact.value}`)
                .join(" · ")
            )}
          </span>
        </footer>

        {runtime.pendingConfirmation ? (
          <ConfirmationDialog
            changes={runtime.lastChanges}
            confirmLabel={runtime.pendingConfirmation.confirmLabel}
            description={runtime.pendingConfirmation.description}
            onCancel={runtime.cancelPendingCommand}
            onConfirm={runtime.confirmPendingCommand}
            title={runtime.pendingConfirmation.title}
          />
        ) : null}
      </section>

      <section
        aria-labelledby="before-you-continue-heading"
        className="mt-4 border-t border-border pt-4"
        data-testid="tool-support"
      >
        <p
          className="font-caption text-[11px] font-extrabold tracking-[0.08em] text-primary uppercase"
          id="before-you-continue-heading"
        >
          Before you continue
        </p>
        <div className="mt-3 grid grid-cols-3 gap-3 max-[52rem]:grid-cols-1">
          {SUPPORT_ITEMS.map((item) => {
            const Icon = item.icon;
            const title =
              usesNetwork && item.eyebrow === "Privacy"
                ? "The hostname leaves your browser"
                : item.title;
            const description =
              usesNetwork && item.eyebrow === "Privacy"
                ? "This lookup sends the hostname to the public DNS provider shown in the workspace."
                : item.description;
            return (
            <article
              className="h-[114px] overflow-hidden rounded-lg border border-border bg-muted/55 px-4 py-3"
              key={item.eyebrow}
            >
              <p className="flex items-center gap-2 font-caption text-[11px] font-extrabold tracking-[0.06em] uppercase">
                <Icon
                  aria-hidden="true"
                  className={`size-4 ${item.iconClassName}`}
                />
                {item.eyebrow}
              </p>
              <h2 className="mt-1.5 text-base font-semibold leading-5">{title}</h2>
              <p className="mt-0.5 text-sm leading-5 text-muted-foreground">
                {description}
              </p>
            </article>
            );
          })}
        </div>

        <div className="mt-4 flex min-h-20 items-center justify-between gap-6 py-3 max-[52rem]:items-start max-[52rem]:flex-col">
          <div>
            <p className="flex items-center gap-2 font-caption text-[11px] font-extrabold tracking-[0.06em] uppercase">
              <ArrowLeftRight aria-hidden="true" className="size-4 text-primary" />
              Related tools
            </p>
            <h2 className="mt-1 text-sm font-bold">Continue with a related tool</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Continue with a focused tool that matches your next step.
            </p>
          </div>
          <nav
            aria-label={`Related ${category} tools`}
            className="flex shrink-0 flex-wrap justify-end gap-2 max-[52rem]:justify-start"
          >
            {relatedTools.map((tool) => (
              <Button
                className="h-9 rounded-lg"
                asChild
                key={tool.href}
                size="sm"
                variant="outline"
              >
                <a href={tool.href}>
                  {tool.label}
                  <ArrowUpRight aria-hidden="true" className="size-3.5" />
                </a>
              </Button>
            ))}
          </nav>
        </div>
      </section>
    </ToolPageShell>
  );
}

function lifecycleLabel(
  definition: ToolDefinition,
  lifecycle: ToolLifecycle,
) {
  switch (lifecycle) {
    case "empty":
      return definition.labels.empty;
    case "running":
      return definition.labels.running;
    case "ready":
      return `Ready to ${(definition.labels.primaryAction ?? "run the tool").toLowerCase()}.`;
    case "completed":
      return definition.labels.ready;
    case "invalid":
      return "Input needs attention.";
    case "failed":
      return "Action failed.";
  }
}

export function UniversalWorkbench<
  Input,
  Settings extends ToolSettings,
  Result,
>({
  runtimeSpec,
  ...props
}: UniversalWorkbenchProps<Input, Settings, Result>) {
  return (
    <ToolRuntimeProvider spec={runtimeSpec}>
      <WorkbenchFrame {...props} />
    </ToolRuntimeProvider>
  );
}
