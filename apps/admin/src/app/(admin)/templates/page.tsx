import type { InvoiceTemplate } from "@smarttools/invoice-templates";
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
import { EllipsisVertical } from "lucide-react";
import Link from "next/link";
import { requirePagePermission } from "../../../lib/access";
import { listTemplates } from "../../../lib/data";
import {
  archiveTemplateAction,
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
            >
              Create template
            </Button>
          </div>
        }
        className="mb-8 border-none pb-0"
        description="Layouts and theming presets the invoice tool can render."
        title="Templates"
      />

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
              maxLength={500_000}
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
            const config = template.config as InvoiceTemplate["config"];
            const duplicatePopoverId = `duplicate-template-${template.id}`;

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
                </div>

                <div
                  className={`mt-5 h-44 overflow-hidden rounded-xl border bg-muted/50 p-2 ${
                    template.status === "draft" ? "border-dashed" : "border-border"
                  } ${template.status === "archived" ? "opacity-60" : ""}`}
                >
                  <InvoiceTemplatePreview
                    data={serviceInvoiceSample}
                    template={{
                      config,
                      layoutFamily: template.layoutFamily as InvoiceTemplate["layoutFamily"],
                      name: template.name,
                    }}
                    variant="thumbnail"
                  />
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
                    template.isDefault ? (
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
                          href={`/api/templates/${template.id}/export`}
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
                        href={`/templates/${template.id}`}
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
                        <Link className={menuActionClassName} href={`/templates/${template.id}`}>
                          Edit
                        </Link>
                      ) : null}
                      <Link
                        className={menuActionClassName}
                        href={`/templates/${template.id}/preview`}
                      >
                        Preview
                      </Link>
                      {!(template.status === "published" && template.isDefault) ? (
                        <a
                          className={menuActionClassName}
                          href={`/api/templates/${template.id}/export`}
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
