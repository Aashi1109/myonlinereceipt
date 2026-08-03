"use client";

import { AlertBanner, Button, StatusBadge } from "@smarttools/ui";
import { Check, Clipboard, Code2, ExternalLink, Power } from "lucide-react";
import { useActionState, useState, type ReactElement } from "react";
import { toggleToolAction } from "../../../../actions";
import {
  publishToolContentAction,
  type ToolContentActionState,
} from "../../actions";

const IDLE: ToolContentActionState = { status: "idle", message: "" };

export function DeveloperHandoff({ command }: { readonly command: string }): ReactElement {
  const [copied, setCopied] = useState(false);

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-xl bg-surface-ink text-on-ink shadow-[0_12px_36px_#0000001a]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <span className="flex items-center gap-2 font-caption text-[10px] font-semibold uppercase tracking-[0.06em] text-on-ink-muted">
          <Code2 aria-hidden="true" className="size-4 text-primary" />
          Developer handoff
        </span>
        <Button
          aria-label="Copy scaffold command"
          className="border-white/15 bg-white/10 text-on-ink hover:bg-white/15"
          onClick={copy}
          size="icon-xs"
          type="button"
          variant="secondary"
        >
          {copied ? <Check aria-hidden="true" /> : <Clipboard aria-hidden="true" />}
        </Button>
      </div>
      <code className="block overflow-x-auto whitespace-pre px-4 py-5 font-mono text-[12px] leading-6 text-on-ink">
        {command}
      </code>
      <p className="border-t border-white/10 px-4 py-3 text-xs leading-5 text-on-ink-muted">
        Run locally, implement the generated definition and execution file, then deploy. The saved database configuration survives the seed.
      </p>
    </section>
  );
}

export function ActivationPanel({
  enabled,
  hasDefinition,
  hasStoredContent,
  published,
  publishedAtLabel,
  publicHref,
  toolId,
}: {
  readonly enabled: boolean;
  readonly hasDefinition: boolean;
  readonly hasStoredContent: boolean;
  readonly published: boolean;
  readonly publishedAtLabel: string | null;
  readonly publicHref: string | null;
  readonly toolId: string;
}): ReactElement {
  const [state, action, pending] = useActionState(publishToolContentAction, IDLE);
  const canEnable = hasDefinition && Boolean(publicHref);

  return (
    <section className="grid gap-5">
      <div className="border-b border-border pb-5">
        <h2 className="font-heading text-xl font-semibold">Activation</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Publishing chooses the content source. Enabling controls public catalog visibility.
        </p>
      </div>

      {state.status !== "idle" ? (
        <AlertBanner variant={state.status === "success" ? "success" : "error"}>{state.message}</AlertBanner>
      ) : null}

      <div className="divide-y divide-border border-y border-border">
        <div className="flex flex-wrap items-center gap-3 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Database content</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {published && publishedAtLabel ? `Published ${publishedAtLabel}` : "Code values remain live until the saved draft is published."}
            </p>
          </div>
          <StatusBadge variant={published ? "success" : "warning"}>{published ? "Published" : "Draft"}</StatusBadge>
          <form action={action}>
            <input name="toolId" type="hidden" value={toolId} />
            <Button disabled={pending || (!published && !hasStoredContent)} name="published" size="sm" type="submit" value={published ? "false" : "true"} variant={published ? "secondary" : "default"}>
              {published ? "Return to draft" : "Publish saved content"}
            </Button>
          </form>
        </div>

        <div className="flex flex-wrap items-center gap-3 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Public availability</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {hasDefinition ? "The code definition is deployed." : "Deploy the tool definition before enabling it."}
            </p>
          </div>
          <StatusBadge variant={enabled ? "success" : hasDefinition ? "neutral" : "warning"}>{enabled ? "Visible" : hasDefinition ? "Hidden" : "Waiting for code"}</StatusBadge>
          <form action={toggleToolAction}>
            <input name="toolId" type="hidden" value={toolId} />
            <input name="enabled" type="hidden" value={String(!enabled)} />
            <Button disabled={!canEnable && !enabled} size="sm" type="submit" variant={enabled ? "secondary" : "default"}>
              <Power aria-hidden="true" />{enabled ? "Disable tool" : "Enable tool"}
            </Button>
          </form>
        </div>
      </div>

      {enabled && publicHref ? (
        <a className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-primary hover:underline" href={publicHref} rel="noreferrer" target="_blank">
          Open public tool <ExternalLink aria-hidden="true" className="size-4" />
        </a>
      ) : null}
    </section>
  );
}
