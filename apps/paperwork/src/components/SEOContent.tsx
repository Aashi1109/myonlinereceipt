/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Card, SectionCard, SectionHeading } from "@smarttools/ui";
import { FileCheck, Receipt, ShieldCheck, Sparkles } from "lucide-react";

export default function SEOContent() {
  const values = [
    {
      icon: ShieldCheck,
      title: "No Inconvenient Signups",
      description: "Produce client-ready invoices immediately without remembering another passcode or verifying emails.",
    },
    {
      icon: Receipt,
      title: "Designed for US Businesses",
      description: "Includes inputs for line-item sales taxes, custom terms, late-payment notes, and optional EIN details.",
    },
    {
      icon: FileCheck,
      title: "Auto-Saved Locally",
      description: "Any drafts you change are preserved in your client-side memory so that reload actions don't clear your data.",
    },
    {
      icon: Sparkles,
      title: "Polished Visual Layouts",
      description: "Formulate crisp PDF documents using either our Traditional Classic structure or Modern Clean layouts.",
    },
  ];

  return (
    <div className="mx-auto my-12 max-w-6xl space-y-12 px-4" id="seo-content-block">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {values.map((value) => {
          const Icon = value.icon;
          return (
            <Card className="flex gap-4 p-5 shadow-none" key={value.title}>
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
                <Icon aria-hidden="true" className="size-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground">{value.title}</h3>
                <p className="text-xs leading-5 text-muted-foreground">{value.description}</p>
              </div>
            </Card>
          );
        })}
      </div>

      <SectionCard className="bg-muted/40 shadow-none">
        <SectionHeading title="How to Generate Professional Business Invoices Online" />
        <div className="grid gap-6 text-sm leading-6 text-muted-foreground md:grid-cols-3">
          <div className="space-y-2">
            <h3 className="font-bold text-foreground">1. Key Contractor Records</h3>
            <p>
              Always include your full legal business name or contact alias, contact phone coordinates, physical location address (optional, but highly standard), and business EIN numbers if you prefer not to share private Social Security numbers.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-foreground">2. Itemized Deliverable Breakdowns</h3>
            <p>
              Write highly detailed description entries for client-facing tasks (e.g. state 'WordPress Performance Optimization' instead of simply 'Web Services'). Specify quantities and flat rates so both parties know exactly what is being audited.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-foreground">3. Setting Pragmatic Due Terms</h3>
            <p>
              Select payment guidelines like Net 15 or Net 30, which trigger payment dates exactly 15 or 30 days starting from the baseline invoice date. Setting late fees helps secure faster processing times for smaller companies.
            </p>
          </div>
        </div>
        <p className="max-w-3xl border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
          <span className="font-semibold text-foreground">Disclaimer:</span> This free toolkit is provided for general paperwork generation and scheduling support. It does not constitute Certified Public Accounting (CPA) auditing, financial consulting, tax preparation, or official legal counsel. You remain solely responsible for validating local state-level sales tax obligations or contractor declarations before transmitting formal agreements.
        </p>
      </SectionCard>
    </div>
  );
}
