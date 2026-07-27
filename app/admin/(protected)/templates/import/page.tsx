import { buttonVariants } from "@smarttools/ui";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { requirePagePermission } from "../../../../../lib/admin/access";
import ImportTemplateForm from "./ImportTemplateForm";

export default async function ImportTemplatePage() {
  await requirePagePermission("templates", "create");

  return (
    <div className="min-h-dvh w-full bg-muted pb-8">
      <header className="flex min-h-16 items-center gap-3 border-b border-border bg-card px-4 sm:px-6">
        <Link
          aria-label="Back to templates"
          className={buttonVariants({ className: "size-9 rounded-lg", size: "icon", variant: "ghost" })}
          href="/admin/templates"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
        </Link>
        <div>
          <h1 className="font-heading text-base font-semibold text-foreground">Import template JSON</h1>
          <p className="font-caption text-[11px] text-muted-foreground">Validated locally before upload</p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl p-5 sm:p-7">
        <div className="mb-6">
          <p className="font-caption text-xs font-semibold uppercase tracking-[0.06em] text-primary">
            Template operations
          </p>
          <h2 className="mt-2 font-heading text-3xl font-semibold tracking-tight text-foreground">
            Import a reusable document template
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Load a SmartTools template export, review its JSON, and create a new draft without changing existing templates.
          </p>
        </div>

        <ImportTemplateForm />
      </div>
    </div>
  );
}
