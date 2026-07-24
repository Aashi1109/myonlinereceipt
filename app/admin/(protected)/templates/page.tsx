import type {
  AdvancedTemplateConfig,
  InvoiceTemplate,
} from "@smarttools/invoice-templates";
import { DOCUMENT_DEFINITIONS } from "@smarttools/invoice-templates";
import {
  InvoiceTemplatePreview,
  serviceInvoiceSample,
} from "@smarttools/invoice-templates/preview";
import {
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  SectionHeading,
  Select,
  StatusBadge,
  Textarea,
  ToolPageHeader,
  buttonVariants,
} from "@smarttools/ui";
import { EllipsisVertical, FilePenLine } from "lucide-react";
import Link from "next/link";
import { requirePagePermission } from "../../../../lib/admin/access";
import { listTemplates } from "../../../../lib/admin/data";
import {
  archiveTemplateAction,
  createAdvancedTemplateAction,
  createTemplateAction,
  defaultTemplateAction,
  duplicateTemplateAction,
  importTemplateAction,
  publishTemplateAction,
} from "../../actions";

const categories = ["classic", "modern", "simple", "professional", "creative", "service"];
const layouts = ["classic", "modern", "compact", "bold", "minimal", "service"];
const updatedAtFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
});
const popoverClassName =
  "m-auto w-[min(34rem,calc(100vw-2rem))] rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-xl backdrop:bg-foreground/20";
const cardActionClassName = "rounded-lg";
const menuActionClassName =
  "flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-bold text-secondary-foreground outline-none hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring";
const pageFormatLabels = {
  A4: "A4",
  LETTER: "Letter",
  RECEIPT_80MM: "80 mm",
  RECEIPT_58MM: "58 mm",
} as const;

export default async function TemplatesPage() {
  await requirePagePermission("templates", "view");
  const templates = await listTemplates();

  return (
    <>
      <ToolPageHeader
        actions={
          <div className="grid w-full grid-cols-2 gap-3 sm:flex sm:w-auto">
            <Button
              className="rounded-xl"
              popoverTarget="import-template"
              size="lg"
              variant="secondary"
            >
              Import JSON
            </Button>
            <Button
              className="rounded-xl"
              popoverTarget="create-template"
              size="lg"
              variant="secondary"
            >
              Standard template
            </Button>
            <Button
              className="col-span-2 rounded-xl sm:col-span-1"
              popoverTarget="create-advanced-template"
              size="lg"
            >
              <FilePenLine aria-hidden="true" size={17} />
              Advanced designer
            </Button>
          </div>
        }
        className="mb-8 border-none pb-0"
        description="Layouts and form presets for Paperwork documents."
        title="Templates"
      />

      <section
        aria-labelledby="create-advanced-template-title"
        className={popoverClassName}
        id="create-advanced-template"
        popover="auto"
        role="dialog"
      >
        <SectionHeading
          description="Start with a real pdfme canvas, then freely place, bind, and style every element."
          title={
            <span id="create-advanced-template-title">
              Create an advanced template
            </span>
          }
        />
        <form action={createAdvancedTemplateAction} className="grid gap-4">
          <Field htmlFor="advanced-template-name" label="Name" required>
            <Input id="advanced-template-name" name="name" required />
          </Field>
          <Field htmlFor="advanced-template-slug" label="Slug" required>
            <Input
              id="advanced-template-slug"
              name="slug"
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              required
            />
          </Field>
          <Field
            htmlFor="advanced-template-description"
            label="Description"
            required
          >
            <Textarea
              id="advanced-template-description"
              name="description"
              required
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field htmlFor="advanced-template-starter" label="Document and canvas">
              <Select id="advanced-template-starter" name="starter">
                {DOCUMENT_DEFINITIONS.flatMap((definition) =>
                  definition.allowedPageFormats.map((format) => (
                    <option
                      key={`${definition.documentType}:${format}`}
                      value={`${definition.documentType}:${format}`}
                    >
                      {definition.label} · {pageFormatLabels[format]}
                    </option>
                  )),
                )}
              </Select>
            </Field>
            <Field htmlFor="advanced-template-category" label="Category">
              <Select
                defaultValue="professional"
                id="advanced-template-category"
                name="category"
              >
                {categories.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              popoverTarget="create-advanced-template"
              popoverTargetAction="hide"
              variant="ghost"
            >
              Cancel
            </Button>
            <Button type="submit">
              <FilePenLine aria-hidden="true" size={16} />
              Open designer
            </Button>
          </div>
        </form>
      </section>

      <section
        aria-labelledby="create-template-title"
        className={popoverClassName}
        id="create-template"
        popover="auto"
        role="dialog"
      >
        <SectionHeading
          description="Start with a validated layout preset, then fine-tune its JSON."
          title={<span id="create-template-title">Create template</span>}
        />
        <form action={createTemplateAction} className="grid gap-4">
          <Field htmlFor="new-template-name" label="Name" required>
            <Input id="new-template-name" name="name" required />
          </Field>
          <Field htmlFor="new-template-slug" label="Slug" required>
            <Input
              id="new-template-slug"
              name="slug"
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              required
            />
          </Field>
          <Field htmlFor="new-template-description" label="Description" required>
            <Textarea id="new-template-description" name="description" required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field htmlFor="new-template-category" label="Category">
              <Select id="new-template-category" name="category">
                {categories.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </Select>
            </Field>
            <Field htmlFor="new-template-layout" label="Layout">
              <Select id="new-template-layout" name="layoutFamily">
                {layouts.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button popoverTarget="create-template" popoverTargetAction="hide" variant="ghost">
              Cancel
            </Button>
            <Button type="submit">Create draft</Button>
          </div>
        </form>
      </section>

      <section
        aria-labelledby="import-template-title"
        className={popoverClassName}
        id="import-template"
        popover="auto"
        role="dialog"
      >
        <SectionHeading
          description="Paste a previously exported SmartTools template."
          title={<span id="import-template-title">Import template JSON</span>}
        />
        <form action={importTemplateAction} className="grid gap-4">
          <Field htmlFor="import-template-json" label="Template JSON" required>
            <Textarea
              className="min-h-64 font-mono"
              id="import-template-json"
              maxLength={5_000_000}
              name="template"
              placeholder="Paste an exported template"
              required
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button popoverTarget="import-template" popoverTargetAction="hide" variant="ghost">
              Cancel
            </Button>
            <Button type="submit">Import as draft</Button>
          </div>
        </form>
      </section>

      {templates.length ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => {
            const isAdvanced = template.layoutFamily === "advanced";
            const config = template.config as InvoiceTemplate["config"];
            const advancedConfig = template.config as AdvancedTemplateConfig;
            const duplicatePopoverId = `duplicate-template-${template.id}`;
            const editHref = isAdvanced
              ? `/admin/templates/${template.id}/advanced`
              : `/admin/templates/${template.id}`;
            const previewHref = isAdvanced
              ? editHref
              : `/admin/templates/${template.id}/preview`;

            return (
              <Card
                className={`flex min-h-96 flex-col ${
                  template.isDefault ? "border-primary/30 ring-1 ring-primary/10" : ""
                }`}
                key={template.id}
              >
                <div className="flex min-h-7 flex-wrap items-center gap-2">
                  <StatusBadge
                    className="min-h-7 gap-1.5 px-3 text-xs capitalize"
                    variant={
                      template.status === "published"
                        ? "success"
                        : template.status === "archived"
                          ? "archived"
                          : "warning"
                    }
                  >
                    <span aria-hidden="true" className="size-2 rounded-full bg-current opacity-70" />
                    {template.status}
                  </StatusBadge>
                  {template.isDefault ? (
                    <StatusBadge className="min-h-7 gap-1.5 px-3 text-xs" variant="info">
                      <span aria-hidden="true" className="size-2 rounded-full bg-current opacity-70" />
                      Default
                    </StatusBadge>
                  ) : null}
                  {isAdvanced ? (
                    <>
                      <StatusBadge className="min-h-7 px-3 text-xs" variant="info">
                        Advanced
                      </StatusBadge>
                      <StatusBadge className="min-h-7 px-3 text-xs capitalize">
                        {template.documentType}
                      </StatusBadge>
                    </>
                  ) : null}
                </div>

                <div
                  className={`mt-5 h-44 overflow-hidden rounded-xl border bg-muted/50 p-2 ${
                    template.status === "draft" ? "border-dashed" : "border-border"
                  } ${template.status === "archived" ? "opacity-60" : ""}`}
                >
                  {isAdvanced ? (
                    <div className="grid h-full place-items-center rounded-lg bg-background">
                      <div className="text-center">
                        <span className="mx-auto grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
                          <FilePenLine aria-hidden="true" size={24} />
                        </span>
                        <p className="mt-3 text-sm font-extrabold capitalize text-foreground">
                          Freeform {template.documentType}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {advancedConfig.pageFormat.replaceAll("_", " ")} · pdfme
                        </p>
                      </div>
                    </div>
                  ) : (
                    <InvoiceTemplatePreview
                      data={serviceInvoiceSample}
                      template={{
                        config,
                        layoutFamily:
                          template.layoutFamily as InvoiceTemplate["layoutFamily"],
                        name: template.name,
                      }}
                      variant="thumbnail"
                    />
                  )}
                </div>

                <div className="mt-5">
                  <h2 className="text-xl font-extrabold tracking-tight text-foreground">
                    {template.name}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {template.status === "draft" ? "Edited" : "Updated"}{" "}
                    <time dateTime={template.updatedAt.toISOString()}>
                      {updatedAtFormatter.format(template.updatedAt)}
                    </time>{" "}
                    · {template.status === "draft" ? "unsaved to catalog" : `v${template.version}`}
                  </p>
                </div>

                <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
                  {template.status === "published" ? (
                    isAdvanced ? (
                      <>
                        <Link
                          className={buttonVariants({
                            className: cardActionClassName,
                            variant: "secondary",
                          })}
                          href={editHref}
                        >
                          Edit
                        </Link>
                        <Button
                          className={cardActionClassName}
                          popoverTarget={duplicatePopoverId}
                          variant="ghost"
                        >
                          Duplicate
                        </Button>
                        {!template.isDefault ? (
                          <form action={defaultTemplateAction}>
                            <input
                              name="templateId"
                              type="hidden"
                              value={template.id}
                            />
                            <Button
                              className={cardActionClassName}
                              type="submit"
                              variant="ghost"
                            >
                              Set default
                            </Button>
                          </form>
                        ) : null}
                      </>
                    ) : template.isDefault ? (
                      <>
                        <Button
                          className={cardActionClassName}
                          popoverTarget={duplicatePopoverId}
                          variant="secondary"
                        >
                          Duplicate
                        </Button>
                        <a
                          className={buttonVariants({
                            className: cardActionClassName,
                            variant: "ghost",
                          })}
                          href={`/api/admin/templates/${template.id}/export`}
                        >
                          Export
                        </a>
                      </>
                    ) : (
                      <>
                        <form action={defaultTemplateAction}>
                          <input name="templateId" type="hidden" value={template.id} />
                          <Button className={cardActionClassName} type="submit" variant="ghost">
                            Set default
                          </Button>
                        </form>
                        <Button
                          className={cardActionClassName}
                          popoverTarget={duplicatePopoverId}
                          variant="ghost"
                        >
                          Duplicate
                        </Button>
                      </>
                    )
                  ) : (
                    <>
                      <form action={publishTemplateAction}>
                        <input name="templateId" type="hidden" value={template.id} />
                        <Button className={cardActionClassName} type="submit">
                          Publish
                        </Button>
                      </form>
                      <Link
                        className={buttonVariants({
                          className: cardActionClassName,
                          variant: "ghost",
                        })}
                        href={editHref}
                      >
                        Edit
                      </Link>
                    </>
                  )}

                  <details className="group relative ml-auto">
                    <summary
                      className={buttonVariants({
                        className:
                          "cursor-pointer list-none rounded-xl text-slate-400 [&::-webkit-details-marker]:hidden",
                        size: "icon",
                        variant: "ghost",
                      })}
                    >
                      <EllipsisVertical aria-hidden="true" size={20} />
                      <span className="sr-only">More actions for {template.name}</span>
                    </summary>
                    <div className="absolute bottom-12 right-0 z-10 grid w-44 gap-1 rounded-xl border border-border bg-card p-2 shadow-lg">
                      {template.status === "published" ? (
                        <Link className={menuActionClassName} href={editHref}>
                          Edit
                        </Link>
                      ) : null}
                      <Link
                        className={menuActionClassName}
                        href={previewHref}
                      >
                        {isAdvanced ? "Preview in designer" : "Preview"}
                      </Link>
                      {!(template.status === "published" && template.isDefault) ? (
                        <a
                          className={menuActionClassName}
                          href={`/api/admin/templates/${template.id}/export`}
                        >
                          Export
                        </a>
                      ) : null}
                      {template.status !== "published" ? (
                        <button
                          className={menuActionClassName}
                          popoverTarget={duplicatePopoverId}
                          type="button"
                        >
                          Duplicate
                        </button>
                      ) : null}
                      {template.status !== "archived" ? (
                        <form action={archiveTemplateAction}>
                          <input name="templateId" type="hidden" value={template.id} />
                          <button
                            className={`${menuActionClassName} text-destructive hover:bg-destructive/5`}
                            type="submit"
                          >
                            Archive
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </details>
                </div>

                <section
                  aria-labelledby={`${duplicatePopoverId}-title`}
                  className={popoverClassName}
                  id={duplicatePopoverId}
                  popover="auto"
                  role="dialog"
                >
                  <SectionHeading
                    description="Create an editable draft without changing the original template."
                    title={<span id={`${duplicatePopoverId}-title`}>Duplicate {template.name}</span>}
                  />
                  <form action={duplicateTemplateAction} className="grid gap-4">
                    <input name="templateId" type="hidden" value={template.id} />
                    <Field htmlFor={`${template.id}-copy-name`} label="Name" required>
                      <Input
                        defaultValue={`${template.name} Copy`}
                        id={`${template.id}-copy-name`}
                        name="name"
                        required
                      />
                    </Field>
                    <Field htmlFor={`${template.id}-copy-slug`} label="Unique slug" required>
                      <Input
                        defaultValue={`${template.slug}-copy`}
                        id={`${template.id}-copy-slug`}
                        name="slug"
                        required
                      />
                    </Field>
                    <div className="flex justify-end gap-2">
                      <Button
                        popoverTarget={duplicatePopoverId}
                        popoverTargetAction="hide"
                        variant="ghost"
                      >
                        Cancel
                      </Button>
                      <Button type="submit">Duplicate</Button>
                    </div>
                  </form>
                </section>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          description="Create a draft or import an existing template to get started."
          title="No templates found"
        />
      )}
    </>
  );
}
