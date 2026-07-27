import { getManagedTools } from "@smarttools/control-plane";
import { EmptyState, ToolPageHeader } from "@smarttools/ui";
import { PackageSearch } from "lucide-react";
import { requirePagePermission } from "../../../../lib/admin/access";
import { ToolList } from "./components/ToolList";

export default async function ToolsPage() {
  await requirePagePermission("tools", "view");
  const tools = await getManagedTools();

  return (
    <div className="flex min-h-0 flex-col lg:h-full">
      <ToolPageHeader
        className="mb-3 shrink-0 gap-2 pb-3 [&_h1]:text-[26px] [&_h1]:tracking-[-0.01875rem] [&_p]:mt-1 [&_p]:leading-5"
        description="Find, group, and publish tools without losing your place."
        title="Tool catalog"
      />
      {tools.length ? (
        <ToolList tools={tools} />
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
