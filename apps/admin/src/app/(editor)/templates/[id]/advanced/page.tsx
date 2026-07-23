import {
  AdvancedDocumentTemplateSchema,
  type AdvancedDocumentTemplate,
} from "@smarttools/invoice-templates";
import { notFound } from "next/navigation";
import { requirePagePermission } from "../../../../../lib/access";
import { getTemplate } from "../../../../../lib/data";
import AdvancedTemplateEditor from "./_components/AdvancedTemplateEditor";

export default async function AdvancedTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePagePermission("templates", "view");
  const template = await getTemplate((await params).id);
  if (!template || template.layoutFamily !== "advanced") notFound();

  const normalized = {
    ...template,
    description: template.description ?? "",
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
  if (!AdvancedDocumentTemplateSchema.safeParse(normalized).success) notFound();

  return (
    <AdvancedTemplateEditor template={normalized as AdvancedDocumentTemplate} />
  );
}
