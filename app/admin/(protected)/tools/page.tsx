import {
  getToolIcons,
  isDatabaseConfigured,
  type ToolIconRow,
} from "@smarttools/database";
import { AlertBanner, EmptyState, ToolPageHeader } from "@smarttools/ui";
import { PackageSearch } from "lucide-react";
import { requirePagePermission } from "../../../../lib/admin/access";
import { getAdminTools } from "../../../../lib/tool-framework/manifest";
import { NewToolDialog } from "./components/NewToolDialog";
import { ToolList } from "./components/ToolList";

export default async function ToolsPage() {
  await requirePagePermission("tools", "view");
  const [tools, icons]: [
    Awaited<ReturnType<typeof getAdminTools>>,
    Readonly<Record<string, ToolIconRow>>,
  ] = await Promise.all([
    getAdminTools(),
    isDatabaseConfigured() ? getToolIcons() : Promise.resolve({}),
  ]);

  return (
    <div className="flex min-h-0 flex-col lg:h-full">
      <ToolPageHeader
        actions={<NewToolDialog />}
        className="mb-3 shrink-0 gap-2 pb-3 [&_h1]:text-[26px] [&_h1]:tracking-[-0.01875rem] [&_p]:mt-1 [&_p]:leading-5"
        description="Find, group, and publish tools without losing your place."
        title="Tool catalog"
      />
      <AlertBanner className="mb-3 shrink-0" title="Tool code is created in code, not here">
        A tool runs because <code>tools/&lt;key&gt;/definition.ts</code> exists
        on disk; the catalog is discovered by a filesystem walk at migrate time,
        and a deployed app cannot write files. Create that half with{" "}
        <code>pnpm tool:new &lt;key&gt;</code>, then deploy. <em>New tool</em>{" "}
        creates the other half up front — the database configuration: name,
        description, slug, order, visibility, content, and icons.
      </AlertBanner>
      {tools.length ? (
        <ToolList icons={icons} tools={tools} />
      ) : (
        <EmptyState
          action={
            <a className="font-semibold text-primary hover:underline" href="/admin/design-system">
              View registration guide
            </a>
          }
          description="Register a tool in the code manifest, then reload this page to make it available here."
          icon={<PackageSearch aria-hidden="true" />}
          title="No tools registered"
        />
      )}
    </div>
  );
}
