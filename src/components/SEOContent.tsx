/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ShieldCheck, Sparkles, Receipt, FileCheck } from "lucide-react";

export default function SEOContent() {
  const values = [
    {
      icon: ShieldCheck,
      title: "No Inconvenient Signups",
      description: "Produce client-ready invoices immediately without remembering another passcode or verifying emails.",
    },
    {
      icon: Receipt,
      title: "Compliant for US Businesses",
      description: "Includes designated inputs for line item sales taxes, custom terms, late payment penalties, and EIN IDs.",
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
    <div className="max-w-6xl mx-auto px-4 my-12 space-y-12" id="seo-content-block">
      {/* Visual core values grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {values.map((v, i) => {
          const Icon = v.icon;
          return (
            <div key={i} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-3xs flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 self-start text-zinc-700">
                <Icon className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-semibold text-slate-900 text-sm">{v.title}</h4>
                <p className="text-xs text-slate-500 leading-relaxed">{v.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Deep copywriting SEO section */}
      <div className="bg-zinc-50 border border-zinc-200/50 rounded-2xl p-6 md:p-8 space-y-6">
        <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
          How to Generate Professional Business Invoices Online
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-slate-600 leading-relaxed">
          <div className="space-y-2">
            <h3 className="font-bold text-slate-800">1. Key Contractor Records</h3>
            <p>
              Always include your full legal business name or contact alias, contact phone coordinates, physical location address (optional, but highly standard), and business EIN numbers if you prefer not to share private Social Security numbers.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-slate-800">2. Itemized Deliverable Breakdowns</h3>
            <p>
              Write highly detailed description entries for client-facing tasks (e.g. state 'WordPress Performance Optimization' instead of simply 'Web Services'). Specify quantities and flat rates so both parties know exactly what is being audited.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-slate-800">3. Setting Pragmatic Due Terms</h3>
            <p>
              Select payment guidelines like Net 15 or Net 30, which trigger payment dates exactly 15 or 30 days starting from the baseline invoice date. Setting late fees helps secure faster processing times for smaller companies.
            </p>
          </div>
        </div>

        {/* Legal disclaimer */}
        <div className="border-t border-zinc-200/60 pt-4 text-[11px] text-slate-500 leading-relaxed max-w-3xl">
          <span className="font-semibold text-slate-700">Disclaimer:</span> This free toolkit is provided for general paperwork generation and scheduling support. It does not constitute Certified Public Accounting (CPA) auditing, financial consulting, tax preparation, or official legal counsel. You remain solely responsible for validating local state-level sales tax obligations or contractor declarations before transmitting formal agreements.
        </div>
      </div>
    </div>
  );
}
