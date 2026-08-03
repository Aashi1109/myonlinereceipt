import {
  getToolContentRow,
  getToolIcon,
  isDatabaseConfigured,
  type ToolContentRow,
  type ToolIconRow,
} from "@smarttools/database";
import { StatusBadge } from "@smarttools/ui";
import {
  FileText,
  Image,
  LayoutDashboard,
  Search,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePagePermission } from "../../../../../lib/admin/access";
import { iconUploadsConfigured } from "../../../../../lib/admin/adminMutations";
import { getAdminTools } from "../../../../../lib/tool-framework/manifest";
import { ToolContentForm } from "./components/ToolContentForm";
import {
  ActivationPanel,
  DeveloperHandoff,
} from "./components/ToolConfigurationPanels";
import { ToolIconPanel } from "./components/ToolIconPanel";
import { inheritedContent, loadToolSpec } from "./toolSpec";

type ConfigurationSection = "overview" | "catalog" | "content" | "assets";

const SECTIONS: readonly {
  readonly key: ConfigurationSection;
  readonly label: string;
  readonly icon: LucideIcon;
}[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "catalog", label: "Catalog & SEO", icon: Search },
  { key: "content", label: "Content document", icon: FileText },
  { key: "assets", label: "Icon & activation", icon: Image },
];

function selectedSection(value: string | string[] | undefined): ConfigurationSection {
  const section = Array.isArray(value) ? value[0] : value;
  return SECTIONS.some((candidate) => candidate.key === section)
    ? (section as ConfigurationSection)
    : "overview";
}

function publishedAtLabel(row: ToolContentRow | null): string | null {
  if (!row?.publishedAt) return null;
  return `${row.publishedAt.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

export default async function ToolContentPage({
  params,
  searchParams,
}: {
  params: Promise<{ toolId: string }>;
  searchParams: Promise<{ section?: string | string[] }>;
}) {
  await requirePagePermission("tools", "view");
  const toolId = decodeURIComponent((await params).toolId);
  const section = selectedSection((await searchParams).section);

  const tools = await getAdminTools();
  const tool = tools.find((candidate) => candidate.id === toolId);
  if (!tool) notFound();

  const configured = isDatabaseConfigured();
  const [contentRow, iconRow, spec]: [
    ToolContentRow | null,
    ToolIconRow | null,
    Awaited<ReturnType<typeof loadToolSpec>>,
  ] = await Promise.all([
    configured ? getToolContentRow(toolId) : Promise.resolve(null),
    configured ? getToolIcon(toolId) : Promise.resolve(null),
    loadToolSpec(toolId),
  ]);
  const inherited = inheritedContent(spec, tool.name, tool.description);
  const inheritedView = {
    category: inherited.category,
    keywords: inherited.keywords,
    seoTitle: inherited.seoTitle,
    seoDescription: inherited.seoDescription,
    contentDoc: inherited.content,
  };
  const stored = {
    category: contentRow?.category ?? null,
    keywords: contentRow?.keywords ?? null,
    seoTitle: contentRow?.seoTitle ?? null,
    seoDescription: contentRow?.seoDescription ?? null,
    contentDoc: contentRow?.contentDoc ?? null,
    published: Boolean(contentRow?.publishedAt),
    publishedAtLabel: publishedAtLabel(contentRow),
    hasRow: contentRow !== null,
  };
  const publicHref = tool.slug ? `/${tool.app}/${tool.slug}` : null;
  const definitionKey = tool.id.split(".").slice(1).join(".");
  const scaffoldCommand = `pnpm tool:new ${definitionKey} --app ${tool.app} --category ${inherited.category || "<category>"}`;

  return (
    <div className="mx-auto grid w-full max-w-[1240px] gap-5 pb-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link className="text-xs font-semibold text-primary hover:underline" href="/admin/tools">
            ← Back to tool catalog
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2.5">
            <h1 className="font-heading text-[26px] font-semibold tracking-[-0.01875rem]">{tool.name}</h1>
            <StatusBadge variant={tool.enabled ? "success" : tool.hasDefinition ? "neutral" : "warning"}>
              {tool.enabled ? "Visible" : tool.hasDefinition ? "Hidden" : "Waiting for code"}
            </StatusBadge>
            <StatusBadge variant={stored.published ? "info" : "warning"}>{stored.published ? "Database content live" : "Draft content"}</StatusBadge>
          </div>
          <p className="mt-1 max-w-3xl text-sm leading-5 text-muted-foreground">
            Configure catalog content, supporting documentation, icon assets, and public availability without changing the tool&apos;s code-owned behavior.
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="font-caption text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Stable tool ID</p>
          <code className="font-mono text-xs text-foreground">{tool.id}</code>
        </div>
      </header>

      <nav aria-label="Tool configuration sections" className="overflow-x-auto border-y border-border bg-card px-1">
        <div className="flex min-w-max gap-1">
          {SECTIONS.map(({ icon: Icon, key, label }) => (
            <Link
              aria-current={section === key ? "page" : undefined}
              className={`relative inline-flex min-h-12 items-center gap-2 px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset ${section === key ? "font-semibold text-primary after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-primary" : "text-muted-foreground hover:text-foreground"}`}
              href={`/admin/tools/${encodeURIComponent(tool.id)}?section=${key}`}
              key={key}
            >
              <Icon aria-hidden="true" className="size-4" />{label}
            </Link>
          ))}
        </div>
      </nav>

      <main className="rounded-xl border border-border bg-card p-5 shadow-[0_2px_4px_#00000008,0_12px_32px_#0000000a] sm:p-6">
        {section === "overview" ? (
          <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.72fr)]">
            <section>
              <div className="border-b border-border pb-5">
                <h2 className="font-heading text-xl font-semibold">Configuration overview</h2>
                <p className="mt-1 text-sm text-muted-foreground">Code owns execution and identity. This workspace owns the database layer.</p>
              </div>
              <dl className="grid gap-x-5 gap-y-5 pt-5 sm:grid-cols-2">
                <div>
                  <dt className="font-caption text-[10px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">Suite</dt>
                  <dd className="mt-1 font-mono text-xs">{tool.app}</dd>
                </div>
                <div>
                  <dt className="font-caption text-[10px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">Published slug</dt>
                  <dd className="mt-1 font-mono text-xs">{tool.slug ?? "Not set"}</dd>
                </div>
                <div>
                  <dt className="font-caption text-[10px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">Definition</dt>
                  <dd className="mt-1"><StatusBadge variant={spec ? "success" : "warning"}>{spec ? "definition.ts deployed" : "Definition missing"}</StatusBadge></dd>
                </div>
                <div>
                  <dt className="font-caption text-[10px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">Content source</dt>
                  <dd className="mt-1"><StatusBadge variant={stored.published ? "info" : "neutral"}>{stored.published ? "Database override" : "Shipped code"}</StatusBadge></dd>
                </div>
              </dl>
              <div className="mt-6 border-t border-border pt-5">
                <h3 className="text-sm font-semibold">What remains code-owned</h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Input geometry, settings, execution host, trigger behavior, capabilities, result labels, and the stable tool ID are declared in the tool folder and deployed with the application.</p>
              </div>
            </section>
            <DeveloperHandoff command={scaffoldCommand} />
          </div>
        ) : null}

        {section === "catalog" ? (
          <ToolContentForm inherited={inheritedView} relatedTools={[]} section="catalog" stored={stored} toolId={tool.id} />
        ) : null}

        {section === "content" ? (
          <ToolContentForm
            inherited={inheritedView}
            relatedTools={tools.filter((candidate) => candidate.id !== tool.id).map((candidate) => ({ id: candidate.id, name: candidate.name }))}
            section="content"
            stored={stored}
            toolId={tool.id}
          />
        ) : null}

        {section === "assets" ? (
          <div className="grid gap-8 lg:grid-cols-2 lg:divide-x lg:divide-border">
            <ToolIconPanel iconRow={iconRow} name={tool.name} toolId={tool.id} uploadsEnabled={iconUploadsConfigured()} />
            <div className="lg:pl-8">
              <ActivationPanel
                enabled={tool.enabled}
                hasDefinition={tool.hasDefinition}
                hasStoredContent={stored.hasRow}
                published={stored.published}
                publishedAtLabel={stored.publishedAtLabel}
                publicHref={publicHref}
                toolId={tool.id}
              />
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
