import { getManagedTools } from "@smarttools/control-plane";
import { EmptyState, ToolPageHeader } from "@smarttools/ui";
import { requirePagePermission } from "../../../../lib/admin/access";
import { ToolList } from "./components/ToolList";

export default async function ToolsPage() {
  await requirePagePermission("tools", "view");
  const tools = await getManagedTools();

  return (
    <>
      <ToolPageHeader
        description="Configure code-registered tools and drag them into catalog order."
        title="Tools"
      />
      {tools.length ? (
        <ToolList tools={tools} />
      ) : (
        <EmptyState
          description="Tools appear here after they are registered in the code manifest."
          title="No tools registered"
        />
      )}
    </>
  );
}
