/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { ChevronDown, ChevronUp, HelpCircle } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
  id: string;
}

export default function FAQSection() {
  const [openId, setOpenId] = useState<string | null>("faq-1");

  const faqs: FAQItem[] = [
    {
      id: "faq-1",
      question: "Is this invoice generator free?",
      answer: "Yes, 100% free. You can create, preview, print, and download fully professional invoice PDFs instantly without creating an account or inputting credit card details. No watermarks on core templates.",
    },
    {
      id: "faq-2",
      question: "Do I need an account to save my draft?",
      answer: "No registration is required. Any information you fill out is saved automatically in your browser's local safety storage (localStorage). This means you can refresh the page, close your browser, or come back tomorrow without losing your progress.",
    },
    {
      id: "faq-3",
      question: "Can I customize the sales tax, currency, and discounts?",
      answer: "Yes. The builder has custom config structures supporting flat-rate or percentage-based discounts, optional itemized sales tax applicability (applying tax only to specified taxable services/goods), and shipping/handling fees. Currency for this toolkit is set to USD by default.",
    },
    {
      id: "faq-4",
      question: "Is my business data secure?",
      answer: "Absolutely. All generation operations take place directly on your computer (client-side in your safe browser frame). Your client lists, financial amounts, business names, and logos are never stored on external trackers or servers.",
    },
    {
      id: "faq-5",
      question: "Is this official tax or accounting advice?",
      answer: "No. This tool is designed to ease business document workflows for independent contractors, freelancers, and small business owners in the US. Please consult with a Certified Public Accountant (CPA) or legal counsel for professional accounting or tax regulations.",
    },
  ];

  const handleToggle = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <section className="bg-white border border-slate-100 rounded-2xl p-6 md:p-8 shadow-xs max-w-4xl mx-auto my-12" id="faq-section">
      <div className="flex items-center gap-3 mb-6">
        <HelpCircle className="w-6 h-6 text-zinc-600" />
        <h2 className="text-xl md:text-2xl font-bold text-slate-900 font-sans tracking-tight">
          Frequently Asked Questions
        </h2>
      </div>

      <div className="space-y-4">
        {faqs.map((faq) => {
          const isOpen = openId === faq.id;
          return (
            <div
              key={faq.id}
              className="border-b border-slate-100 pb-4 last:border-0 last:pb-0"
              id={`faq-item-${faq.id}`}
            >
              <button
                type="button"
                className="w-full flex justify-between items-center text-left font-medium text-slate-800 py-2 hover:text-zinc-900 focus:outline-hidden"
                onClick={() => handleToggle(faq.id)}
                aria-expanded={isOpen}
              >
                <span>{faq.question}</span>
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-slate-500 shrink-0 ml-4" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500 shrink-0 ml-4" />
                )}
              </button>
              {isOpen && (
                <div className="text-sm text-slate-600 leading-relaxed mt-2 pl-1 animate-fade-in">
                  {faq.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
