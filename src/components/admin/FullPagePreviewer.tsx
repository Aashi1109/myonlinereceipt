/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from "react";
import { TemplateService } from "../../lib/templates/templateService";
import InvoicePreviewRenderer from "../InvoicePreviewRenderer";
import { 
  simpleInvoiceSample, 
  serviceInvoiceSample, 
  manyLineItemsInvoiceSample, 
  partialPaymentInvoiceSample, 
  longTextInvoiceSample 
} from "../../lib/invoice/sampleInvoiceData";
import { ArrowLeft, Printer, Database, FileCheck } from "lucide-react";
import { InvoiceData } from "../../types";

interface FullPagePreviewerProps {
  templateId: string;
  onBack: () => void;
}

export default function FullPagePreviewer({
  templateId,
  onBack,
}: FullPagePreviewerProps) {
  const [activeSample, setActiveSample] = useState<"simple" | "service" | "many" | "partial" | "long font">("service");

  const template = useMemo(() => {
    return TemplateService.getTemplateById(templateId);
  }, [templateId]);

  const activeData = useMemo<InvoiceData>(() => {
    switch (activeSample) {
      case "simple": return simpleInvoiceSample;
      case "many": return manyLineItemsInvoiceSample;
      case "partial": return partialPaymentInvoiceSample;
      case "long font": return longTextInvoiceSample;
      default: return serviceInvoiceSample;
    }
  }, [activeSample]);

  if (!template) {
    return (
      <div className="p-8 text-center text-red-650 font-bold">
        Error: Template config with ID "{templateId}" could not be recognized.
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans" id="fullpage-layout-tester">
      
      {/* Dynamic Controls Nav */}
      <header className="flex justify-between items-center bg-white px-6 py-3.5 border-b border-slate-200 shrink-0 no-print shadow-xs z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 hover:bg-slate-150 rounded-lg text-slate-500 cursor-pointer transition-colors"
            type="button"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm font-black text-slate-900 tracking-tight leading-none uppercase">
              Full-screen render proofing: {template.name}
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide pt-0.5">
              Testing layout scalability & line page splits
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Database className="w-3.5 h-3.5" />
              Dataset:
            </span>
            <select
              value={activeSample}
              onChange={(e) => setActiveSample(e.target.value as any)}
              className="px-3 py-1 border border-slate-250 rounded-lg text-xs bg-slate-55/40 text-slate-800 font-bold"
            >
              <option value="simple">Simple consulting fee (1 item)</option>
              <option value="service">Standard maintenance run</option>
              <option value="many">Load stress-test items (8 items)</option>
              <option value="partial">Pre-deposit partial bills</option>
              <option value="long font">Long names overflow stresses</option>
            </select>
          </div>

          <button
            onClick={handlePrint}
            type="button"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all text-center cursor-pointer"
          >
            <Printer className="w-4 h-4 animate-bounce-none" />
            <span>Print / Save Vector PDF</span>
          </button>
        </div>
      </header>

      {/* Main Preview Board */}
      <main className="flex-1 overflow-y-auto py-8 px-4 flex justify-center bg-slate-205/60 select-none">
        <div className="w-full max-w-[800px] bg-white border border-slate-300 shadow-2xl rounded-2xl overflow-hidden h-fit">
          <InvoicePreviewRenderer
            data={activeData}
            template={template}
          />
        </div>
      </main>

    </div>
  );
}
