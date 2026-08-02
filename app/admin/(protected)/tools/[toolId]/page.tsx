import {
  getToolContentRow,
  getToolIcon,
  isDatabaseConfigured,
  type ToolContentRow,
  type ToolIconRow,
} from "@smarttools/database";
import { SectionCard, SectionHeading, StatusBadge } from "@smarttools/ui";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePagePermission } from "../../../../../lib/admin/access";
import { getAdminTools } from "../../../../../lib/tool-framework/manifest";
import { iconUploadsConfigured } from "../../../../../lib/admin/adminMutations";
import { ToolContentForm } from "./components/ToolContentForm";
import { ToolIconPanel } from "./components/ToolIconPanel";
import { inheritedContent, loadToolSpec } from "./toolSpec";

function publishedAtLabel(row: ToolContentRow | null): string | null {
  if (!row?.publishedAt) return null;
  return `${row.publishedAt.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

export default async function ToolContentPage({
  params,
}: {
  params: Promise<{ toolId: string }>;
}) {
  await requirePagePermission("tools", "view");
  const toolId = decodeURIComponent((await params).toolId);

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

  return (
    <div className="grid gap-6 pb-10">
      <div>
        <Link
          className="text-xs font-semibold text-primary hover:underline"
          href="/admin/tools"
        >
          ← Back to the tool catalog
        </Link>
        <h1 className="mt-2 font-heading text-[26px] font-semibold tracking-[-0.01875rem]">
          {tool.name}
        </h1>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">
          Everything on this page is the database-owned layer for a tool that
          already ships as a folder. The tool itself is created with{" "}
          <code>pnpm tool:new &lt;key&gt;</code> and a deploy.
        </p>
      </div>

      <SectionCard>
        <SectionHeading
          description="Identity comes from code and from the first insert; it is not editable here."
          title="Identity"
        />
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold text-muted-foreground">Tool id</dt>
            <dd className="font-mono text-[13px]">{tool.id}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-muted-foreground">Suite</dt>
            <dd className="font-mono text-[13px]">{tool.app}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-muted-foreground">Slug</dt>
            <dd className="font-mono text-[13px]">{tool.slug ?? "not set"}</dd>
            <p className="mt-1 text-[11px] text-muted-foreground">
              The slug is the published URL. It is applied once and frozen
              afterwards by a database trigger, so it cannot be changed here or
              anywhere else.
            </p>
          </div>
          <div>
            <dt className="text-xs font-semibold text-muted-foreground">
              Definition
            </dt>
            <dd>
              <StatusBadge variant={spec ? "success" : "warning"}>
                {spec ? "Ships a definition.ts" : "No definition found"}
              </StatusBadge>
            </dd>
            {spec ? null : (
              <p className="mt-1 text-[11px] text-muted-foreground">
                No <code>tools/&lt;key&gt;/definition.ts</code> was found for
                this tool, so there are no code values to inherit.
              </p>
            )}
          </div>
        </dl>
      </SectionCard>

      <ToolContentForm
        inherited={{
          category: inherited.category,
          keywords: inherited.keywords,
          seoTitle: inherited.seoTitle,
          seoDescription: inherited.seoDescription,
          contentDoc: inherited.content,
        }}
        stored={{
          category: contentRow?.category ?? null,
          keywords: contentRow?.keywords ?? null,
          seoTitle: contentRow?.seoTitle ?? null,
          seoDescription: contentRow?.seoDescription ?? null,
          contentDoc: contentRow?.contentDoc ?? null,
          published: Boolean(contentRow?.publishedAt),
          publishedAtLabel: publishedAtLabel(contentRow),
          hasRow: contentRow !== null,
        }}
        toolId={tool.id}
      />

      <ToolIconPanel
        iconRow={iconRow}
        name={tool.name}
        toolId={tool.id}
        uploadsEnabled={iconUploadsConfigured()}
      />
    </div>
  );
}
