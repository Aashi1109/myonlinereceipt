import {
  Button,
  Field,
  Input,
  Select,
  StatusBadge,
  Textarea,
  buttonVariants,
} from "@smarttools/ui";
import { ArrowLeft, Copy, Eye, FilePenLine } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePagePermission } from "../../../../../../lib/admin/access";
import { getTemplate } from "../../../../../../lib/admin/data";
import {
  archiveTemplateAction,
  defaultTemplateAction,
  duplicateTemplateAction,
  publishTemplateAction,
  updateTemplateMetadataAction,
} from "../../../../actions";

const categories = [
  "classic",
  "modern",
  "simple",
  "professional",
  "creative",
  "service",
] as const;
const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function ManageTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePagePermission("templates", "edit");
  const template = await getTemplate((await params).id);
  if (!template) notFound();

  const isAdvanced = template.layoutFamily === "advanced";
  const editorHref = isAdvanced
    ? `/admin/templates/${template.id}/advanced`
    : `/admin/templates/${template.id}`;
  const previewHref = isAdvanced
    ? editorHref
    : `/admin/templates/${template.id}/preview`;

  return (
    <div className="min-h-dvh w-full bg-muted pb-8">
      <header className="flex flex-col gap-4 border-b border-border bg-card px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            aria-label="Back to templates"
            className={buttonVariants({ className: "size-9 shrink-0 rounded-lg", size: "icon", variant: "ghost" })}
            href="/admin/templates"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate font-heading text-lg font-semibold text-foreground">{template.name}</h1>
              <StatusBadge
                className="min-h-6 px-2.5 text-[11px] capitalize"
                variant={
                  template.status === "published"
                    ? "success"
                    : template.status === "archived"
                      ? "archived"
                      : "warning"
                }
              >
                {template.status}
              </StatusBadge>
            </div>
            <p className="mt-1 font-caption text-[11px] text-muted-foreground">
              {template.documentType.replaceAll("-", " ")} · {isAdvanced ? "Advanced" : "Standard"} editor · /{template.slug}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className={buttonVariants({ className: "rounded-full", variant: "secondary" })} href={previewHref}>
            <Eye aria-hidden="true" className="size-4" />
            Preview
          </Link>
          <Link className={buttonVariants({ className: "rounded-full" })} href={editorHref}>
            <FilePenLine aria-hidden="true" className="size-4" />
            Open editor
          </Link>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl items-start gap-5 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_350px]">
        <main className="grid gap-5">
          <nav className="flex gap-1 border-b border-border" aria-label="Template sections">
            <span className="border-b-2 border-primary px-3.5 py-2.5 text-sm font-semibold text-foreground">Details</span>
            <span className="px-3.5 py-2.5 text-sm text-muted-foreground">Versions</span>
            <span className="px-3.5 py-2.5 text-sm text-muted-foreground">Usage</span>
          </nav>

          <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm" aria-labelledby="template-information-title">
            <div className="border-b border-border p-5">
              <h2 id="template-information-title" className="font-heading text-base font-semibold text-foreground">
                Template information
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Metadata used in the admin catalog and template picker.
              </p>
            </div>
            <form action={updateTemplateMetadataAction} className="grid gap-5 p-5">
              <input name="templateId" type="hidden" value={template.id} />
              <div className="grid gap-5 sm:grid-cols-2">
                <Field htmlFor="template-name" label="Template name" required>
                  <Input defaultValue={template.name} name="name" required />
                </Field>
                <Field description="Permanent" htmlFor="template-slug" label="Slug">
                  <Input className="bg-muted font-mono text-muted-foreground" readOnly value={template.slug} />
                </Field>
              </div>
              <Field htmlFor="template-description" label="Description" required>
                <Textarea className="min-h-24" defaultValue={template.description ?? ""} name="description" required />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field htmlFor="template-document-type" label="Document type">
                  <Input className="bg-muted capitalize text-muted-foreground" readOnly value={template.documentType.replaceAll("-", " ")} />
                </Field>
                <Field htmlFor="template-category" label="Category">
                  <Select defaultValue={template.category} name="category">
                    {categories.map((category) => (
                      <option key={category} value={category}>{category[0].toUpperCase() + category.slice(1)}</option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div className="flex justify-end border-t border-border pt-5">
                <Button type="submit">Save changes</Button>
              </div>
            </form>
          </section>

          <section className="rounded-xl border border-border bg-card p-5 shadow-sm" aria-labelledby="recent-activity-title">
            <h2 id="recent-activity-title" className="font-heading text-sm font-semibold text-foreground">Recent activity</h2>
            <div className="mt-4 grid gap-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span>Template updated</span>
                <time className="font-caption text-[11px] text-muted-foreground" dateTime={template.updatedAt.toISOString()}>
                  {dateFormatter.format(template.updatedAt)}
                </time>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Draft created</span>
                <time className="font-caption text-[11px] text-muted-foreground" dateTime={template.createdAt.toISOString()}>
                  {dateFormatter.format(template.createdAt)}
                </time>
              </div>
            </div>
          </section>
        </main>

        <aside className="grid gap-4 lg:sticky lg:top-0">
          <section className="rounded-xl border border-border bg-card p-5 shadow-sm" aria-labelledby="lifecycle-title">
            <h2 id="lifecycle-title" className="font-heading text-base font-semibold text-foreground">Lifecycle</h2>
            <div className="mt-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold capitalize text-foreground">{template.status}</p>
                <p className="mt-1 font-caption text-[10px] text-muted-foreground">
                  {template.status === "published" ? "Available in the document picker" : "Not available in the document picker"}
                </p>
              </div>
              <StatusBadge variant={template.status === "published" ? "success" : template.status === "archived" ? "archived" : "warning"}>
                v{template.version}
              </StatusBadge>
            </div>
            <div className="mt-5 rounded-lg bg-primary/10 p-4">
              <p className="font-mono text-2xl font-semibold text-primary">v{template.version}</p>
              <p className="mt-1 font-caption text-[11px] text-muted-foreground">current template version</p>
            </div>
            <div className="mt-5 grid gap-2">
              {template.status === "draft" ? (
                <form action={publishTemplateAction}>
                  <input name="templateId" type="hidden" value={template.id} />
                  <Button className="w-full" type="submit">Publish template</Button>
                </form>
              ) : null}
              {template.status === "published" && !template.isDefault ? (
                <form action={defaultTemplateAction}>
                  <input name="templateId" type="hidden" value={template.id} />
                  <Button className="w-full" type="submit" variant="secondary">Set as default</Button>
                </form>
              ) : null}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-5 shadow-sm" aria-labelledby="duplicate-title">
            <div className="flex items-center gap-2">
              <Copy aria-hidden="true" className="size-4 text-primary" />
              <h2 id="duplicate-title" className="font-heading text-sm font-semibold text-foreground">Duplicate template</h2>
            </div>
            <form action={duplicateTemplateAction} className="mt-4 grid gap-3">
              <input name="templateId" type="hidden" value={template.id} />
              <Field htmlFor="duplicate-name" label="Copy name" required>
                <Input defaultValue={`${template.name} Copy`} name="name" required />
              </Field>
              <Field htmlFor="duplicate-slug" label="Unique slug" required>
                <Input className="font-mono" defaultValue={`${template.slug}-copy`} name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required />
              </Field>
              <Button className="w-full" type="submit" variant="secondary">Duplicate template</Button>
            </form>
          </section>

          {template.status !== "archived" ? (
            <section className="rounded-xl border border-destructive bg-card p-5" aria-labelledby="archive-title">
              <h2 id="archive-title" className="font-heading text-sm font-semibold text-destructive">Archive template</h2>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Existing documents are unaffected. Archived templates cannot create new documents.
              </p>
              <form action={archiveTemplateAction} className="mt-4">
                <input name="templateId" type="hidden" value={template.id} />
                <Button type="submit" variant="destructive">Archive template</Button>
              </form>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
