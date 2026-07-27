import {
  Button,
  EmptyState,
  Field,
  Input,
  Select,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
  buttonVariants,
} from "@smarttools/ui";
import { Ellipsis, FilePenLine, Plus, Upload } from "lucide-react";
import Link from "next/link";
import { requirePagePermission } from "../../../../lib/admin/access";
import { listTemplates } from "../../../../lib/admin/data";
const updatedAtFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
});
export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{
    mode?: string;
    query?: string;
    status?: string;
    type?: string;
  }>;
}) {
  await requirePagePermission("templates", "view");
  const [templates, filters] = await Promise.all([listTemplates(), searchParams]);
  const query = filters.query?.trim().toLowerCase() ?? "";
  const visibleTemplates = templates.filter((template) => {
    const isAdvanced = template.layoutFamily === "advanced";
    return (
      (!query ||
        template.name.toLowerCase().includes(query) ||
        template.slug.toLowerCase().includes(query)) &&
      (!filters.type || filters.type === "all" || template.documentType === filters.type) &&
      (!filters.status || filters.status === "all" || template.status === filters.status) &&
      (!filters.mode ||
        filters.mode === "all" ||
        (filters.mode === "advanced" ? isAdvanced : !isAdvanced))
    );
  });

  return (
    <div className="mx-auto w-full max-w-[84rem] pb-8">
      <header className="mb-5 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-caption text-xs font-semibold uppercase tracking-[0.06em] text-primary">
            Template operations
          </p>
          <h1 className="mt-2 font-heading text-[26px] font-semibold tracking-tight text-foreground">
            Templates
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage reusable document layouts across every document type.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link
            className={buttonVariants({ className: "rounded-full", variant: "secondary" })}
            href="/admin/templates/import"
          >
            <Upload aria-hidden="true" className="size-4" />
            Import JSON
          </Link>
          <Link
            className={buttonVariants({ className: "rounded-full px-5" })}
            href="/admin/templates/new"
          >
            <Plus aria-hidden="true" className="size-4" />
            Create template
          </Link>
        </div>
      </header>

      <form className="mb-5 grid gap-3 rounded-xl border border-border bg-card p-4 shadow-sm md:grid-cols-[minmax(16rem,1fr)_13rem_12rem_13rem_auto] md:items-end">
        <Field htmlFor="template-query" label="Search templates">
          <Input
            defaultValue={filters.query}
            name="query"
            placeholder="Name or slug"
          />
        </Field>
        <Field htmlFor="template-type" label="Document type">
          <Select defaultValue={filters.type ?? "all"} name="type">
            <option value="all">All document types</option>
            <option value="invoice">Invoice</option>
            <option value="receipt">Receipt</option>
            <option value="expense-report">Expense report</option>
            <option value="mileage-log">Mileage log</option>
            <option value="quarterly-tax-estimator">Tax estimator</option>
            <option value="w9-request">W-9 request</option>
            <option value="1099-nec-tracker">1099-NEC tracker</option>
          </Select>
        </Field>
        <Field htmlFor="template-status" label="Status">
          <Select defaultValue={filters.status ?? "all"} name="status">
            <option value="all">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </Select>
        </Field>
        <Field htmlFor="template-mode" label="Editor">
          <Select defaultValue={filters.mode ?? "all"} name="mode">
            <option value="all">Standard + advanced</option>
            <option value="standard">Standard</option>
            <option value="advanced">Advanced</option>
          </Select>
        </Field>
        <Button className="rounded-lg" type="submit" variant="secondary">
          Apply
        </Button>
      </form>

      {visibleTemplates.length ? (
        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm" aria-label="Template catalog">
          <Table>
            <TableHeader>
              <TableRow className="h-11 hover:bg-transparent">
                <TableHead className="min-w-64 px-[18px]">Template</TableHead>
                <TableHead className="w-40">Document type</TableHead>
                <TableHead className="w-32">Editor</TableHead>
                <TableHead className="w-32">Status</TableHead>
                <TableHead className="w-40">Updated</TableHead>
                <TableHead className="w-14"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleTemplates.map((template) => {
                const isAdvanced = template.layoutFamily === "advanced";

                return (
                  <TableRow className="h-[68px]" key={template.id}>
                    <TableCell className="px-[18px]">
                      <Link className="group block" href={`/admin/templates/${template.id}/manage`}>
                        <span className="block font-heading text-[13px] font-semibold text-foreground group-hover:text-primary">
                          {template.name}
                        </span>
                        <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground">
                          /{template.slug}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex rounded-full border border-border bg-muted px-2.5 py-1 font-caption text-xs capitalize text-foreground">
                        {template.documentType.replaceAll("-", " ")}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs font-semibold capitalize">
                      {isAdvanced ? "Advanced" : "Standard"}
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell>
                      <time className="font-caption text-xs text-muted-foreground" dateTime={template.updatedAt.toISOString()}>
                        {updatedAtFormatter.format(template.updatedAt)}
                      </time>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        aria-label={`Edit details for ${template.name}`}
                        className="inline-grid size-9 place-items-center rounded-lg text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                        href={`/admin/templates/${template.id}/manage`}
                      >
                        <Ellipsis aria-hidden="true" className="size-[18px]" />
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow className="h-12 hover:bg-transparent">
                <TableCell className="px-[18px] font-caption text-[11px] text-muted-foreground" colSpan={6}>
                  {visibleTemplates.length} of {templates.length} templates
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </section>
      ) : (
        <EmptyState
          action={
            <Link className={buttonVariants()} href="/admin/templates/new">
              Create template
            </Link>
          }
          description={templates.length ? "Adjust the filters to see more templates." : "Create a draft or import an existing template to get started."}
          title={templates.length ? "No matching templates" : "No templates found"}
        />
      )}

      <div className="mt-4 flex justify-end">
        <Link className="inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline" href="/admin/templates/new/advanced">
          <FilePenLine aria-hidden="true" className="size-4" />
          Create an advanced template
        </Link>
      </div>
    </div>
  );
}
