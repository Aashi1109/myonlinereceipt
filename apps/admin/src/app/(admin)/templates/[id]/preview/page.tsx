import { InvoiceTemplatePreview } from "@smarttools/invoice-templates/preview";
import type { InvoiceTemplate } from "@smarttools/invoice-templates";
import { ToolPageHeader } from "@smarttools/ui";
import { notFound } from "next/navigation";
import { requirePagePermission } from "../../../../../lib/access";
import { getTemplate } from "../../../../../lib/data";

export default async function TemplatePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePagePermission("templates", "view");
  const template = await getTemplate((await params).id);
  if (!template) notFound();
  const preview = {
    ...template,
    description: template.description ?? "",
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  } as InvoiceTemplate;

  return (
    <>
      <ToolPageHeader
        description="Uses the shared invoice-template preview renderer."
        title={`${template.name} preview`}
      />
      <InvoiceTemplatePreview template={preview} />
    </>
  );
}
