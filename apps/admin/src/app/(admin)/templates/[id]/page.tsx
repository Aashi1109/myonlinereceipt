import type { InvoiceTemplate } from "@smarttools/invoice-templates";
import { notFound } from "next/navigation";
import { requirePagePermission } from "../../../../lib/access";
import { getTemplate } from "../../../../lib/data";
import TemplateEditor from "./_components/TemplateEditor";

export default async function TemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePagePermission("templates", "view");
  const template = await getTemplate((await params).id);
  if (!template) notFound();

  return (
    <TemplateEditor
      template={
        {
          ...template,
          config: template.config,
          description: template.description ?? "",
          createdAt: template.createdAt.toISOString(),
          updatedAt: template.updatedAt.toISOString(),
        } as InvoiceTemplate
      }
    />
  );
}
