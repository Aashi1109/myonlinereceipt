/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  FileText,
  DollarSign,
  Compass,
  Layers,
  Sparkles,
  ClipboardCheck,
  Zap,
  CheckCircle2,
} from "lucide-react";

interface ToolItem {
  id: string;
  title: string;
  description: string;
  icon: any;
  status: "coming_soon" | "pro_only" | "free" | "live";
  hash: string;
}

export default function RelatedTools({ onTrackClick }: { onTrackClick: (itemName: string) => void }) {
  const tools: ToolItem[] = [
    {
      id: "receipt-gen",
      title: "Receipt Generator",
      description: "Instantly convert files or paid invoices into clean consumer receipts for recordkeeping.",
      icon: FileText,
      status: "live",
      hash: "#receipt-generator"
    },
    {
      id: "expense-rep",
      title: "Expense Report Generator",
      description: "Subdivide operating receipts and invoice exports into standard reimbursement files.",
      icon: ClipboardCheck,
      status: "live",
      hash: "#expense-report-generator"
    },
    {
      id: "mileage-log",
      title: "Mileage Log Tracker",
      description: "Log vehicle distances for standard corporate tax write-offs in compliance with IRS rules.",
      icon: Compass,
      status: "live",
      hash: "#mileage-log-generator"
    },
    {
      id: "quarterly-tax",
      title: "Quarterly Tax Estimator",
      description: "Calculate your estimated US self-employment and income tax burdens without spreadsheets.",
      icon: DollarSign,
      status: "live",
      hash: "#quarterly-tax-estimator"
    },
    {
      id: "w9-template",
      title: "W-9 Request Template",
      description: "Securely prompt contractor identification details and export clean W-9 PDF files.",
      icon: Layers,
      status: "live",
      hash: "#w9-request-template"
    },
    {
      id: "1099-tracker",
      title: "1099-NEC Tracker",
      description: "Aggregate external payouts and easily report vendor taxes at the end of the year.",
      icon: Sparkles,
      status: "live",
      hash: "#1099-nec-tracker"
    },
  ];

  const valueAero = [
    "Securely save and auto-fill business metadata",
    "Remove 'Generated with PaperworkKit' PDF footnotes",
    "Track paid, late, and pending statuses effortlessly",
    "Consolidate annual reports into safe CSV spreadsheets",
    "E-mail generated invoices to clients with tracking triggers",
  ];

  return (
    <div className="space-y-12 max-w-6xl mx-auto my-16 px-4" id="toolkit-sections">
      {/* Monetization / Pro Plan Preview Block */}
      <div className="bg-slate-900 text-white rounded-3xl p-8 md:p-10 relative overflow-hidden shadow-xl" id="monetization-banner">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 w-64 h-64 bg-slate-800 rounded-full opacity-30 pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 -mb-24 w-96 h-96 bg-zinc-800 rounded-full opacity-20 pointer-events-none" />

        <div className="max-w-2xl relative z-10 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800 text-xs font-semibold text-zinc-100 border border-zinc-700">
            <Zap className="w-3 h-3 text-blue-400 fill-blue-400" />
            <span>EXCELLENT UPGRADE OPTIONS</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight font-sans">
            Streamline Your Business with PaperworkKit Pro
          </h2>
          <p className="text-zinc-400 text-sm md:text-base leading-relaxed">
            Draft free invoices as long as you want. When your independent freelance practice or contractor operations expand, unlock advanced time-saving features:
          </p>

          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-sm text-zinc-300">
            {valueAero.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <CheckCircle2 className="w-4.5 h-4.5 text-zinc-400 shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <div className="pt-4 flex flex-wrap gap-4 items-center">
            <button
              type="button"
              className="px-5 py-2.5 rounded-xl bg-white text-slate-900 font-semibold text-sm hover:bg-slate-100 transition shadow-sm active:scale-98"
              onClick={() => onTrackClick("upgrade_pro_clicked")}
            >
              Learn More &amp; Join Waiting List
            </button>
            <span className="text-xs text-zinc-400 font-mono">No credit card required • Early Bird Access</span>
          </div>
        </div>
      </div>

      {/* Grid of future tools */}
      <div className="space-y-6" id="related-tools-block">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h3 className="text-xl md:text-2xl font-extrabold text-slate-900 font-sans tracking-tight">
            Comprehensive Paperwork Toolkit
          </h3>
          <p className="text-slate-500 text-sm">
            Simplify administrative workflows with professional single-click small business generators.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => {
            const IconComp = tool.icon;
            return (
              <a
                key={tool.id}
                href={tool.hash}
                onClick={() => {
                  onTrackClick(`related_tool_${tool.id}_clicked`);
                }}
                className="bg-zinc-50 border border-zinc-200/60 rounded-2xl p-5 hover:border-slate-300 transition duration-200 hover:shadow-xs cursor-pointer group flex flex-col justify-between"
                id={`tool-card-${tool.id}`}
              >
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-lg bg-white border border-zinc-200 flex items-center justify-center text-zinc-705 shadow-3xs group-hover:bg-slate-900 group-hover:text-white transition-colors duration-200">
                    <IconComp className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-slate-800 text-sm tracking-tight">{tool.title}</h4>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[9px] font-black uppercase text-emerald-700 tracking-wider shrink-0">
                        Live Free
                      </span>
                    </div>
                    <p className="text-xs text-slate-550 leading-relaxed mt-1.5 font-medium">
                      {tool.description}
                    </p>
                  </div>
                </div>
                <div className="text-xs text-blue-600 font-extrabold group-hover:translate-x-1 transition-transform duration-200 pt-4 flex items-center gap-1">
                  Launch Generator &rarr;
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
