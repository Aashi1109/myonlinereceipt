/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  Upload,
  User,
  Building,
  Calendar,
  Layers,
  FileSpreadsheet,
  Plus,
  Trash2,
  Copy,
  PlusCircle,
  HelpCircle,
  CheckCircle2,
} from "lucide-react";
import { InvoiceData, InvoiceLineItem } from "../types";

interface InvoiceFormProps {
  data: InvoiceData;
  onChange: (newData: InvoiceData) => void;
  errors: Record<string, string>;
}

export default function InvoiceForm({ data, onChange, errors }: InvoiceFormProps) {
  const [showOptionalBiz, setShowOptionalBiz] = useState(false);
  const [showOptionalClient, setShowOptionalClient] = useState(false);

  // Auto-expand optional sections if they contain validation errors on submit
  React.useEffect(() => {
    const hasBizOptionalErrors = Object.keys(errors).some(
      (k) => k.startsWith("business.") && k !== "business.name"
    );
    if (hasBizOptionalErrors) {
      setShowOptionalBiz(true);
    }
  }, [errors]);

  React.useEffect(() => {
    const hasClientOptionalErrors = Object.keys(errors).some(
      (k) => k.startsWith("client.") && k !== "client.name"
    );
    if (hasClientOptionalErrors) {
      setShowOptionalClient(true);
    }
  }, [errors]);

  // Deep update helpers
  const updateBusiness = (fields: Partial<typeof data.business>) => {
    onChange({
      ...data,
      business: { ...data.business, ...fields },
    });
  };

  const updateClient = (fields: Partial<typeof data.client>) => {
    onChange({
      ...data,
      client: { ...data.client, ...fields },
    });
  };

  const updateInvoiceMeta = (fields: Partial<typeof data.invoice>) => {
    const updatedMeta = { ...data.invoice, ...fields };

    // Automatically update due date when terms or date is changed
    if (fields.paymentTerms || fields.invoiceDate) {
      const terms = fields.paymentTerms !== undefined ? fields.paymentTerms : data.invoice.paymentTerms;
      const baseDateStr = fields.invoiceDate !== undefined ? fields.invoiceDate : data.invoice.invoiceDate;

      if (terms !== "Custom" && baseDateStr) {
        let daysOffset = 0;
        if (terms === "Net 7") daysOffset = 7;
        else if (terms === "Net 15") daysOffset = 15;
        else if (terms === "Net 30") daysOffset = 30;
        else if (terms === "Net 45") daysOffset = 45;

        try {
          const date = new Date(baseDateStr + "T00:00:00");
          if (!isNaN(date.getTime())) {
            date.setDate(date.getDate() + daysOffset);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            updatedMeta.dueDate = `${year}-${month}-${day}`;
          }
        } catch (e) {
          // Fallback if parsing fails
        }
      }
    }

    onChange({
      ...data,
      invoice: updatedMeta,
    });
  };

  const updateTotalsConfig = (fields: Partial<typeof data.totalsConfig>) => {
    onChange({
      ...data,
      totalsConfig: { ...data.totalsConfig, ...fields },
    });
  };

  const updatePaymentInfo = (fields: Partial<typeof data.payment>) => {
    onChange({
      ...data,
      payment: { ...data.payment, ...fields },
    });
  };

  const updateNotesTerms = (fields: Partial<typeof data.notes>) => {
    onChange({
      ...data,
      notes: { ...data.notes, ...fields },
    });
  };

  // Logo operations
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1.5 * 1024 * 1024) {
      alert("Please upload a logo image smaller than 1.5MB to ensure safe offline browser state storage.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      updateBusiness({ logo: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    updateBusiness({ logo: "" });
  };

  // Line item operations
  const handleLineItemChange = (id: string, field: keyof InvoiceLineItem, value: any) => {
    const updatedItems = data.lineItems.map((item) => {
      if (item.id === id) {
        if (field === "quantity" || field === "unitPrice") {
          return { ...item, [field]: value === "" ? "" : Number(value) };
        }
        return { ...item, [field]: value };
      }
      return item;
    });
    onChange({ ...data, lineItems: updatedItems });
  };

  const addLineItem = () => {
    const newItem: InvoiceLineItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      description: "",
      quantity: 1,
      unitPrice: 0,
      taxable: true,
    };
    onChange({
      ...data,
      lineItems: [...data.lineItems, newItem],
    });
  };

  const duplicateLineItem = (item: InvoiceLineItem) => {
    const newItem: InvoiceLineItem = {
      ...item,
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      description: item.description ? `${item.description} (Copy)` : "",
    };
    onChange({
      ...data,
      lineItems: [...data.lineItems, newItem],
    });
  };

  const removeLineItem = (id: string) => {
    if (data.lineItems.length <= 1) {
      // Keep at least one empty line item
      const freshItem: InvoiceLineItem = {
        id: "default-item-1",
        description: "",
        quantity: 1,
        unitPrice: 0,
        taxable: true,
      };
      onChange({ ...data, lineItems: [freshItem] });
      return;
    }
    onChange({
      ...data,
      lineItems: data.lineItems.filter((it) => it.id !== id),
    });
  };

  // Payment method trigger checkboxes
  const handleMethodCheckbox = (methodId: string) => {
    const current = data.payment.methods || [];
    const isChecked = current.includes(methodId);
    let updated: string[];
    if (isChecked) {
      updated = current.filter((m) => m !== methodId);
    } else {
      updated = [...current, methodId];
    }
    updatePaymentInfo({ methods: updated });
  };

  // Quick insert chips for terms & conditions
  const quickNotes = [
    "Thank you for your business.",
    "Please include the invoice number with your payment.",
    "Late payments may be subject to a 1.5% structural monthly interest fee.",
    "This invoice is representing consulting services rendered.",
  ];

  const handleInsertNote = (text: string) => {
    const orig = data.notes.notes ? data.notes.notes.trim() : "";
    const delimiter = orig ? " " : "";
    updateNotesTerms({ notes: `${orig}${delimiter}${text}` });
  };

  return (
    <div className="space-y-8" id="invoice-editor-form">
      {/* 1. SELLER BUSINESS BLOCK */}
      <section className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-3xs" id="biz-editor-section">
        <div className="flex items-center gap-2 pb-4 mb-5 border-b border-slate-100">
          <Building className="w-5 h-5 text-zinc-500" />
          <h3 className="font-bold text-slate-800 text-lg">Your Business (Seller)</h3>
        </div>

        <div className="space-y-4">
          {/* Logo uploader row */}
          <div className="flex flex-col sm:flex-row gap-4 items-center bg-zinc-50 p-4 rounded-xl border border-zinc-200/60">
            {data.business.logo ? (
              <div className="relative group w-24 h-16 rounded-lg bg-white overflow-hidden border border-zinc-200 flex items-center justify-center">
                <img
                  src={data.business.logo}
                  alt="Business Logo Preview"
                  className="max-w-full max-h-full object-contain"
                  referrerPolicy="no-referrer"
                />
                <button
                  type="button"
                  onClick={removeLogo}
                  className="absolute inset-0 bg-red-900/80 text-white font-bold text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                >
                  Delete Logo
                </button>
              </div>
            ) : (
              <label className="w-24 h-16 rounded-lg border-2 border-dashed border-zinc-300 hover:border-slate-500 transition-colors bg-white flex flex-col items-center justify-center cursor-pointer group shrink-0">
                <Upload className="w-5 h-5 text-zinc-400 group-hover:text-zinc-600" />
                <span className="text-[10px] text-zinc-500 font-semibold mt-1">Add Logo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </label>
            )}
            <div className="text-center sm:text-left space-y-1">
              <span className="text-xs font-bold text-slate-700">Company Logo Accent</span>
              <p className="text-[11px] text-slate-500 max-w-sm">
                Optional. Recommended: horizontal layout (.png, .jpg), max file size 1.5MB. Renders client-side for absolute security.
              </p>
            </div>
          </div>

          {/* Business details inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="biz-name" className="block text-xs font-bold text-slate-700 mb-1">
                Business Name <span className="text-red-500 font-sans">*</span>
              </label>
              <input
                id="biz-name"
                type="text"
                placeholder="e.g. Blue Ridge Web Studio"
                value={data.business.name || ""}
                onChange={(e) => updateBusiness({ name: e.target.value })}
                className={`w-full text-sm border px-3 py-2 rounded-lg bg-white placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-slate-900/10 ${
                  errors["business.name"] ? "border-red-500 ring-2 ring-red-100" : "border-slate-200"
                }`}
              />
              {errors["business.name"] && (
                <p className="text-[11px] font-bold text-red-500 mt-1">{errors["business.name"]}</p>
              )}
            </div>

            {/* Address fields */}
            <div className="md:col-span-2">
              <label htmlFor="biz-addr-1" className="block text-xs font-bold text-slate-700 mb-1">
                Address Line 1
              </label>
              <input
                id="biz-addr-1"
                type="text"
                placeholder="42 Wall St"
                value={data.business.addressLine1 || ""}
                onChange={(e) => updateBusiness({ addressLine1: e.target.value })}
                className="w-full text-sm border border-slate-200 px-3 py-2 rounded-lg bg-white "
              />
            </div>

            <div>
              <label htmlFor="biz-city" className="block text-xs font-bold text-slate-700 mb-1">
                City
              </label>
              <input
                id="biz-city"
                type="text"
                placeholder="Asheville"
                value={data.business.city || ""}
                onChange={(e) => updateBusiness({ city: e.target.value })}
                className="w-full text-sm border border-slate-200 px-3 py-2 rounded-lg bg-white "
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="biz-state" className="block text-xs font-bold text-slate-700 mb-1">
                  State
                </label>
                <input
                  id="biz-state"
                  type="text"
                  placeholder="NC"
                  value={data.business.state || ""}
                  onChange={(e) => updateBusiness({ state: e.target.value })}
                  className="w-full text-sm border border-slate-200 px-3 py-2 rounded-lg bg-white "
                />
              </div>
              <div>
                <label htmlFor="biz-zip" className="block text-xs font-bold text-slate-700 mb-1">
                  ZIP Code
                </label>
                <input
                  id="biz-zip"
                  type="text"
                  placeholder="28801"
                  value={data.business.zipCode || ""}
                  onChange={(e) => updateBusiness({ zipCode: e.target.value })}
                  className="w-full text-sm border border-slate-200 px-3 py-2 rounded-lg bg-white "
                />
              </div>
            </div>
          </div>

          {/* Optional fields disclose button */}
          <div>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 select-none hover:text-slate-950 transition duration-150 cursor-pointer"
              onClick={() => setShowOptionalBiz(!showOptionalBiz)}
            >
              <span>{showOptionalBiz ? "Hide" : "Show"} optional business fields</span>
              <span className="font-mono text-[10px] bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded-sm ml-1 text-slate-600">
                {showOptionalBiz ? "-" : "+"}
              </span>
            </button>

            {showOptionalBiz && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 rounded-xl bg-zinc-50 border border-zinc-200/50 animate-fade-in">
                <div>
                  <label htmlFor="biz-contact" className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact Name
                  </label>
                  <input
                    id="biz-contact"
                    type="text"
                    placeholder="Sarah Jenkins"
                    value={data.business.contactName || ""}
                    onChange={(e) => updateBusiness({ contactName: e.target.value })}
                    className="w-full text-sm border border-slate-200 px-3 py-1.5 rounded-lg bg-white "
                  />
                </div>

                <div>
                  <label htmlFor="biz-taxid" className="block text-xs font-semibold text-slate-700 mb-1">
                    Tax ID / EIN
                  </label>
                  <input
                    id="biz-taxid"
                    type="text"
                    placeholder="Employer Identification Number"
                    value={data.business.taxId || ""}
                    onChange={(e) => updateBusiness({ taxId: e.target.value })}
                    className="w-full text-sm border border-slate-200 px-3 py-1.5 rounded-lg bg-white "
                  />
                </div>

                <div>
                  <label htmlFor="biz-email" className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    id="biz-email"
                    type="email"
                    placeholder="sarah@blueridgeweb.com"
                    value={data.business.email || ""}
                    onChange={(e) => updateBusiness({ email: e.target.value })}
                    className={`w-full text-sm border px-3 py-1.5 rounded-lg bg-white ${
                      errors["business.email"] ? "border-red-500" : "border-slate-200"
                    }`}
                  />
                  {errors["business.email"] && (
                    <p className="text-[10px] font-bold text-red-500 mt-1">{errors["business.email"]}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="biz-phone" className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    id="biz-phone"
                    type="text"
                    placeholder="(828) 555-0192"
                    value={data.business.phone || ""}
                    onChange={(e) => updateBusiness({ phone: e.target.value })}
                    className="w-full text-sm border border-slate-200 px-3 py-1.5 rounded-lg bg-white "
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="biz-web" className="block text-xs font-semibold text-slate-700 mb-1">
                    Website URL
                  </label>
                  <input
                    id="biz-web"
                    type="text"
                    placeholder="blueridgeweb.com"
                    value={data.business.website || ""}
                    onChange={(e) => updateBusiness({ website: e.target.value })}
                    className="w-full text-sm border border-slate-200 px-3 py-1.5 rounded-lg bg-white "
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="biz-addr-2" className="block text-xs font-semibold text-slate-700 mb-1">
                    Address Line 2 (Suite, Floor etc.)
                  </label>
                  <input
                    id="biz-addr-2"
                    type="text"
                    placeholder="Suite 400"
                    value={data.business.addressLine2 || ""}
                    onChange={(e) => updateBusiness({ addressLine2: e.target.value })}
                    className="w-full text-sm border border-slate-200 px-3 py-1.5 rounded-lg bg-white "
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 2. BILL TO CLIENT BLOCK */}
      <section className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-3xs" id="client-editor-section">
        <div className="flex items-center gap-2 pb-4 mb-5 border-b border-slate-100">
          <User className="w-5 h-5 text-zinc-500" />
          <h3 className="font-bold text-slate-800 text-lg">Bill To (Client)</h3>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="client-name" className="block text-xs font-bold text-slate-700 mb-1">
                Client Name / Company <span className="text-red-500 font-sans">*</span>
              </label>
              <input
                id="client-name"
                type="text"
                placeholder="e.g. Acme Home Services or John Smith"
                value={data.client.name || ""}
                onChange={(e) => updateClient({ name: e.target.value })}
                className={`w-full text-sm border px-3 py-2 rounded-lg bg-white ${
                  errors["client.name"] ? "border-red-500 ring-2 ring-red-100" : "border-slate-200"
                }`}
              />
              {errors["client.name"] && (
                <p className="text-[11px] font-bold text-red-500 mt-1">{errors["client.name"]}</p>
              )}
            </div>

            {/* Address fields */}
            <div className="md:col-span-2">
              <label htmlFor="client-addr-1" className="block text-xs font-bold text-slate-700 mb-1">
                Client Address Line 1
              </label>
              <input
                id="client-addr-1"
                type="text"
                placeholder="100 Pine Street"
                value={data.client.addressLine1 || ""}
                onChange={(e) => updateClient({ addressLine1: e.target.value })}
                className="w-full text-sm border border-slate-200 px-3 py-2 rounded-lg bg-white "
              />
            </div>

            <div>
              <label htmlFor="client-city" className="block text-xs font-bold text-slate-700 mb-1">
                City
              </label>
              <input
                id="client-city"
                type="text"
                placeholder="San Francisco"
                value={data.client.city || ""}
                onChange={(e) => updateClient({ city: e.target.value })}
                className="w-full text-sm border border-slate-200 px-3 py-2 rounded-lg bg-white "
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="client-state" className="block text-xs font-bold text-slate-700 mb-1">
                  State
                </label>
                <input
                  id="client-state"
                  type="text"
                  placeholder="CA"
                  value={data.client.state || ""}
                  onChange={(e) => updateClient({ state: e.target.value })}
                  className="w-full text-sm border border-slate-200 px-3 py-2 rounded-lg bg-white "
                />
              </div>
              <div>
                <label htmlFor="client-zip" className="block text-xs font-bold text-slate-700 mb-1">
                  ZIP Code
                </label>
                <input
                  id="client-zip"
                  type="text"
                  placeholder="94111"
                  value={data.client.zipCode || ""}
                  onChange={(e) => updateClient({ zipCode: e.target.value })}
                  className="w-full text-sm border border-slate-200 px-3 py-2 rounded-lg bg-white "
                />
              </div>
            </div>
          </div>

          {/* Optional client fields disclose */}
          <div>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 select-none hover:text-slate-950 transition duration-150 cursor-pointer"
              onClick={() => setShowOptionalClient(!showOptionalClient)}
            >
              <span>{showOptionalClient ? "Hide" : "Show"} optional client fields</span>
              <span className="font-mono text-[10px] bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded-sm ml-1 text-slate-600">
                {showOptionalClient ? "-" : "+"}
              </span>
            </button>

            {showOptionalClient && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 rounded-xl bg-zinc-50 border border-zinc-200/50 animate-fade-in">
                <div>
                  <label htmlFor="client-company" className="block text-xs font-semibold text-slate-700 mb-1">
                    Client Company
                  </label>
                  <input
                    id="client-company"
                    type="text"
                    placeholder="Acme Corporates Inc."
                    value={data.client.company || ""}
                    onChange={(e) => updateClient({ company: e.target.value })}
                    className="w-full text-sm border border-slate-200 px-3 py-1.5 rounded-lg bg-white "
                  />
                </div>

                <div>
                  <label htmlFor="client-email" className="block text-xs font-semibold text-slate-700 mb-1">
                    Client Email
                  </label>
                  <input
                    id="client-email"
                    type="email"
                    placeholder="billing@acmehomeservices.com"
                    value={data.client.email || ""}
                    onChange={(e) => updateClient({ email: e.target.value })}
                    className={`w-full text-sm border px-3 py-1.5 rounded-lg bg-white ${
                      errors["client.email"] ? "border-red-500" : "border-slate-200"
                    }`}
                  />
                  {errors["client.email"] && (
                    <p className="text-[10px] font-bold text-red-500 mt-1">{errors["client.email"]}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="client-phone" className="block text-xs font-semibold text-slate-700 mb-1">
                    Client Phone
                  </label>
                  <input
                    id="client-phone"
                    type="text"
                    placeholder="(415) 888-9900"
                    value={data.client.phone || ""}
                    onChange={(e) => updateClient({ phone: e.target.value })}
                    className="w-full text-sm border border-slate-200 px-3 py-1.5 rounded-lg bg-white "
                  />
                </div>

                <div>
                  <label htmlFor="client-addr-2" className="block text-xs font-semibold text-slate-700 mb-1">
                    Client Address Line 2
                  </label>
                  <input
                    id="client-addr-2"
                    type="text"
                    placeholder="Floor 12"
                    value={data.client.addressLine2 || ""}
                    onChange={(e) => updateClient({ addressLine2: e.target.value })}
                    className="w-full text-sm border border-slate-200 px-3 py-1.5 rounded-lg bg-white "
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 3. INVOICE META DETAILS BLOCK */}
      <section className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-3xs" id="meta-editor-section">
        <div className="flex items-center gap-2 pb-4 mb-5 border-b border-slate-100">
          <Calendar className="w-5 h-5 text-zinc-500" />
          <h3 className="font-bold text-slate-800 text-lg">Invoice Metadata</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="inv-num" className="block text-xs font-bold text-slate-700 mb-1">
              Invoice Number <span className="text-red-500 font-sans">*</span>
            </label>
            <input
              id="inv-num"
              type="text"
              placeholder={`INV-${new Date().getFullYear()}-001`}
              value={data.invoice.invoiceNumber || ""}
              onChange={(e) => updateInvoiceMeta({ invoiceNumber: e.target.value })}
              className={`w-full text-sm border px-3 py-2 rounded-lg bg-white ${
                errors["invoice.invoiceNumber"] ? "border-red-500 ring-2 ring-red-100" : "border-slate-200"
              }`}
            />
            {errors["invoice.invoiceNumber"] && (
              <p className="text-[11px] font-bold text-red-500 mt-1">{errors["invoice.invoiceNumber"]}</p>
            )}
          </div>

          <div>
            <label htmlFor="inv-terms" className="block text-xs font-bold text-slate-700 mb-1">
              Payment Terms
            </label>
            <select
              id="inv-terms"
              value={data.invoice.paymentTerms || "Net 30"}
              onChange={(e) => updateInvoiceMeta({ paymentTerms: e.target.value })}
              className="w-full text-sm border border-slate-200 px-3 py-2 rounded-lg bg-white"
            >
              <option value="Due on Receipt">Due on Receipt</option>
              <option value="Net 7">Net 7 (7 Days)</option>
              <option value="Net 15">Net 15 (15 Days)</option>
              <option value="Net 30">Net 30 (30 Days)</option>
              <option value="Net 45">Net 45 (45 Days)</option>
              <option value="Custom">Custom Terms (Select Date Manually)</option>
            </select>
          </div>

          <div>
            <label htmlFor="inv-date-issue" className="block text-xs font-bold text-slate-700 mb-1">
              Invoice Date <span className="text-red-500 font-sans">*</span>
            </label>
            <input
              id="inv-date-issue"
              type="date"
              value={data.invoice.invoiceDate || ""}
              onChange={(e) => updateInvoiceMeta({ invoiceDate: e.target.value })}
              className={`w-full text-sm border px-3 py-2 rounded-lg bg-white ${
                errors["invoice.invoiceDate"] ? "border-red-500 ring-2 ring-red-100" : "border-slate-200"
              }`}
            />
            {errors["invoice.invoiceDate"] && (
              <p className="text-[11px] font-bold text-red-500 mt-1">{errors["invoice.invoiceDate"]}</p>
            )}
          </div>

          <div>
            <label htmlFor="inv-date-due" className="block text-xs font-bold text-slate-700 mb-1">
              Due Date <span className="text-red-500 font-sans">*</span>
            </label>
            <input
              id="inv-date-due"
              type="date"
              value={data.invoice.dueDate || ""}
              onChange={(e) => updateInvoiceMeta({ dueDate: e.target.value })}
              disabled={data.invoice.paymentTerms !== "Custom"}
              className={`w-full text-sm border px-3 py-2 rounded-lg bg-white ${
                data.invoice.paymentTerms !== "Custom" ? "bg-slate-50 text-slate-500 cursor-not-allowed" : ""
              } ${errors["invoice.dueDate"] ? "border-red-500 ring-2 ring-red-100" : "border-slate-200"}`}
            />
            {data.invoice.paymentTerms !== "Custom" && (
              <span className="text-[10px] text-slate-500 block mt-1">Calculated automatically based on terms</span>
            )}
            {errors["invoice.dueDate"] && (
              <p className="text-[11px] font-bold text-red-500 mt-1">{errors["invoice.dueDate"]}</p>
            )}
          </div>

          {/* Optional sub-fields PO / Project */}
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-3 mt-1">
            <div>
              <label htmlFor="inv-project" className="block text-xs font-semibold text-slate-700 mb-1">
                Project Name (Optional)
              </label>
              <input
                id="inv-project"
                type="text"
                placeholder="e.g. Q2 System Migration"
                value={data.invoice.projectName || ""}
                onChange={(e) => updateInvoiceMeta({ projectName: e.target.value })}
                className="w-full text-sm border border-slate-200 px-3 py-1.5 rounded-lg bg-white "
              />
            </div>

            <div>
              <label htmlFor="inv-po" className="block text-xs font-semibold text-slate-700 mb-1">
                Purchase Order (PO) Number (Optional)
              </label>
              <input
                id="inv-po"
                type="text"
                placeholder="e.g. PO-8874-AC"
                value={data.invoice.poNumber || ""}
                onChange={(e) => updateInvoiceMeta({ poNumber: e.target.value })}
                className="w-full text-sm border border-slate-200 px-3 py-1.5 rounded-lg bg-white "
              />
            </div>
          </div>
        </div>
      </section>

      {/* 4. LINE ITEMS INVOICED BLOCK */}
      <section className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-3xs" id="items-editor-section">
        <div className="flex justify-between items-center pb-4 mb-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-zinc-500" />
            <h3 className="font-bold text-slate-800 text-lg">Line Items Table</h3>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-black py-1.5 px-3 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-lg transition duration-150 cursor-pointer"
            onClick={addLineItem}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Row</span>
          </button>
        </div>

        {errors["lineItems"] && (
          <div className="p-3 mb-4 bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs font-bold font-sans">
            {errors["lineItems"]}
          </div>
        )}

        {/* Dynamic Items list */}
        <div className="space-y-4">
          {/* Header titles for large viewports */}
          <div className="hidden md:grid grid-cols-12 gap-3 pb-2 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            <div className="col-span-6">Description <span className="text-red-500">*</span></div>
            <div className="col-span-2 text-center">Qty <span className="text-red-500">*</span></div>
            <div className="col-span-2 text-center">Unit Price ($) <span className="text-red-500">*</span></div>
            <div className="col-span-1 text-center">Tax</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>

          <div className="space-y-4 md:space-y-2">
            {data.lineItems.map((item, index) => {
              const amount = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
              const hasErr = errors[`lineItems[${index}].description`] || errors[`lineItems[${index}].quantity`] || errors[`lineItems[${index}].unitPrice`];

              return (
                <div
                  key={item.id}
                  className={`grid grid-cols-1 md:grid-cols-12 gap-3 p-4 md:p-0 rounded-xl border md:border-0 border-slate-100 bg-zinc-50/50 md:bg-transparent ${
                    hasErr ? "border-red-300 ring-2 ring-red-50" : ""
                  }`}
                  id={`form-line-item-${index}`}
                >
                  {/* Item Description */}
                  <div className="col-span-1 md:col-span-6 ">
                    <label className="block md:hidden text-[10px] font-bold text-slate-500 pb-1">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Website maintenance / Performance testing"
                      value={item.description || ""}
                      onChange={(e) => handleLineItemChange(item.id, "description", e.target.value)}
                      className={`w-full text-xs border rounded-lg px-2.5 py-1.5 bg-white ${
                        errors[`lineItems[${index}].description`] ? "border-red-500" : "border-slate-200"
                      }`}
                    />
                    {errors[`lineItems[${index}].description`] && (
                      <span className="text-[10px] font-bold text-red-500 mt-1 block">
                        {errors[`lineItems[${index}].description`]}
                      </span>
                    )}
                  </div>

                  {/* Quantity */}
                  <div className="col-span-1 md:col-span-2">
                    <label className="block md:hidden text-[10px] font-bold text-slate-500 pb-1">
                      Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="1"
                      value={item.quantity === null || item.quantity === undefined ? "" : item.quantity}
                      onChange={(e) => handleLineItemChange(item.id, "quantity", e.target.value)}
                      className={`w-full text-xs text-center border rounded-lg px-2 py-1.5 bg-white ${
                        errors[`lineItems[${index}].quantity`] ? "border-red-500" : "border-slate-200"
                      }`}
                    />
                    {errors[`lineItems[${index}].quantity`] && (
                      <span className="text-[10px] font-bold text-red-500 mt-1 block">
                        {errors[`lineItems[${index}].quantity`]}
                      </span>
                    )}
                  </div>

                  {/* Unit price */}
                  <div className="col-span-1 md:col-span-2">
                    <label className="block md:hidden text-[10px] font-bold text-slate-500 pb-1">
                      Unit Price ($) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0.00"
                      value={item.unitPrice === null || item.unitPrice === undefined ? "" : item.unitPrice}
                      onChange={(e) => handleLineItemChange(item.id, "unitPrice", e.target.value)}
                      className={`w-full text-xs text-right border rounded-lg px-2.5 py-1.5 bg-white ${
                        errors[`lineItems[${index}].unitPrice`] ? "border-red-500" : "border-slate-200"
                      }`}
                    />
                    {errors[`lineItems[${index}].unitPrice`] && (
                      <span className="text-[10px] font-bold text-red-500 mt-1 block">
                        {errors[`lineItems[${index}].unitPrice`]}
                      </span>
                    )}
                  </div>

                  {/* Taxable boolean Checkbox */}
                  <div className="col-span-1 md:col-span-1 flex items-center justify-between md:justify-center py-1 border-t md:border-0 border-zinc-100">
                    <span className="block md:hidden text-[10px] font-semibold text-slate-500">Taxable:</span>
                    <input
                      type="checkbox"
                      checked={item.taxable || false}
                      onChange={(e) => handleLineItemChange(item.id, "taxable", e.target.checked)}
                      id={`line-item-taxable-${item.id}`}
                      className="w-4 h-4 text-slate-900 border-zinc-300 rounded-sm focus:ring-slate-900"
                    />
                  </div>

                  {/* Duplicate & deletion actions */}
                  <div className="col-span-1 md:col-span-1 flex items-center justify-end gap-1 border-t md:border-0 border-zinc-100 pt-2.5 md:pt-0">
                    <button
                      type="button"
                      title="Duplicate row"
                      onClick={() => duplicateLineItem(item)}
                      className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 hover:text-slate-950 transition duration-100 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Delete row"
                      onClick={() => removeLineItem(item.id)}
                      className="p-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg text-rose-600 hover:text-rose-950 transition duration-100 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. DISCOUNTS TAX AND FEES DETAILS BLOCK */}
      <section className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-3xs" id="discounts-tax-section">
        <div className="flex items-center gap-2 pb-4 mb-5 border-b border-slate-100">
          <FileSpreadsheet className="w-5 h-5 text-zinc-500" />
          <h3 className="font-bold text-slate-800 text-lg">Discounts, Taxes &amp; Fees</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Discount Trigger type */}
          <div>
            <label htmlFor="disc-type" className="block text-xs font-bold text-slate-700 mb-1">
              Discount Type
            </label>
            <select
              id="disc-type"
              value={data.totalsConfig.discountType || "none"}
              onChange={(e) => updateTotalsConfig({ discountType: e.target.value as any })}
              className="w-full text-sm border border-slate-200 px-3 py-2 rounded-lg bg-white"
            >
              <option value="none">No Discount</option>
              <option value="percent">Percentage (%)</option>
              <option value="fixed">Fixed Flat Dollar ($)</option>
            </select>
          </div>

          {/* Discount value input */}
          {data.totalsConfig.discountType !== "none" && (
            <div>
              <label htmlFor="disc-val" className="block text-xs font-bold text-slate-700 mb-1">
                Discount Value {data.totalsConfig.discountType === "percent" ? "(%)" : "($)"}
              </label>
              <input
                id="disc-val"
                type="number"
                min="0"
                step="any"
                placeholder="0"
                value={data.totalsConfig.discountValue === null || data.totalsConfig.discountValue === undefined ? "" : data.totalsConfig.discountValue}
                onChange={(e) => updateTotalsConfig({ discountValue: e.target.value === "" ? 0 : Number(e.target.value) })}
                className="w-full text-sm border border-slate-200 px-3 py-2 rounded-lg bg-white"
              />
            </div>
          )}

          {/* Tax rate description */}
          <div>
            <label htmlFor="tax-lbl" className="block text-xs font-bold text-slate-700 mb-1">
              Sales Tax Label
            </label>
            <input
              id="tax-lbl"
              type="text"
              placeholder="Sales Tax"
              value={data.totalsConfig.taxLabel || ""}
              onChange={(e) => updateTotalsConfig({ taxLabel: e.target.value })}
              className="w-full text-sm border border-slate-200 px-3 py-2 rounded-lg bg-white"
            />
          </div>

          <div>
            <label htmlFor="tax-rt" className="block text-xs font-bold text-slate-700 mb-1">
              Sales Tax Rate (%)
            </label>
            <input
              id="tax-rt"
              type="number"
              min="0"
              max="100"
              step="any"
              placeholder="0.00"
              value={data.totalsConfig.taxRate === null || data.totalsConfig.taxRate === undefined ? "" : data.totalsConfig.taxRate}
              onChange={(e) => updateTotalsConfig({ taxRate: e.target.value === "" ? 0 : Number(e.target.value) })}
              className="w-full text-sm border border-slate-200 px-3 py-2 rounded-lg bg-white"
            />
          </div>

          {/* Shipping fee & amount pre-paid */}
          <div>
            <label htmlFor="shipping-fee" className="block text-xs font-bold text-slate-700 mb-1">
              Shipping / Handling Fee ($)
            </label>
            <input
              id="shipping-fee"
              type="number"
              min="0"
              step="any"
              placeholder="0.00"
              value={data.totalsConfig.shippingFee === null || data.totalsConfig.shippingFee === undefined ? "" : data.totalsConfig.shippingFee}
              onChange={(e) => updateTotalsConfig({ shippingFee: e.target.value === "" ? 0 : Number(e.target.value) })}
              className="w-full text-sm border border-slate-200 px-3 py-2 rounded-lg bg-white font-sans"
            />
          </div>

          <div>
            <label htmlFor="amt-paid" className="block text-xs font-bold text-slate-700 mb-1">
              Amount Paid already ($) (for Partial Payments)
            </label>
            <input
              id="amt-paid"
              type="number"
              min="0"
              step="any"
              placeholder="0.00"
              value={data.totalsConfig.amountPaid === null || data.totalsConfig.amountPaid === undefined ? "" : data.totalsConfig.amountPaid}
              onChange={(e) => updateTotalsConfig({ amountPaid: e.target.value === "" ? 0 : Number(e.target.value) })}
              className="w-full text-sm border border-slate-200 px-3 py-2 rounded-lg bg-white"
            />
          </div>
        </div>
      </section>

      {/* 6. PAYMENT INSTRUCTIONS METHODS ACCORDION */}
      <section className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-3xs" id="payments-editor-section">
        <div className="flex items-center gap-2 pb-4 mb-5 border-b border-slate-100">
          <CheckCircle2 className="w-5 h-5 text-zinc-500" />
          <h3 className="font-bold text-slate-800 text-lg">Payment Methods &amp; Instructions</h3>
        </div>

        <div className="space-y-4">
          <div>
            <span className="block text-xs font-bold text-slate-700 mb-2">Accepted Payment Options</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "bank", label: "Bank Transfer" },
                { id: "check", label: "Check" },
                { id: "paypal", label: "PayPal" },
                { id: "venmo", label: "Venmo" },
                { id: "zelle", label: "Zelle" },
                { id: "card", label: "Credit Card" },
                { id: "cash", label: "Cash" },
              ].map((m) => {
                const checked = (data.payment.methods || []).includes(m.id);
                return (
                  <label
                    key={m.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold cursor-pointer select-none transition ${
                      checked
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleMethodCheckbox(m.id)}
                      className="sr-only"
                    />
                    <span>{m.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="pay-inst" className="block text-xs font-bold text-slate-700 mb-1">
              Payment Instructions Text (Displays on PDF)
            </label>
            <textarea
              id="pay-inst"
              rows={3}
              placeholder="Direct bank wire details, PayPal ID emails, or instructions for paper check delivery address..."
              value={data.payment.instructions || ""}
              onChange={(e) => updatePaymentInfo({ instructions: e.target.value })}
              className="w-full text-sm border border-slate-200 px-3 py-2 rounded-lg bg-white "
            />
          </div>
        </div>
      </section>

      {/* 7. GENERAL NOTES TERMS BLOCK WITH QUICK INSERT CHIPS */}
      <section className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-3xs" id="notes-terms-section">
        <div className="flex items-center gap-2 pb-4 mb-5 border-b border-slate-100">
          <PlusCircle className="w-5 h-5 text-zinc-500" />
          <h3 className="font-bold text-slate-800 text-lg">Terms, Notes &amp; Late Fees</h3>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
              <label htmlFor="notes-textarea" className="block text-xs font-bold text-slate-700">
                Notes / Scope of Work Details
              </label>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-400 font-semibold">Quick insert:</span>
              </div>
            </div>

            {/* Quick insert chips */}
            <div className="flex flex-wrap gap-1 mb-2">
              {quickNotes.map((note, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleInsertNote(note)}
                  className="px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:text-black cursor-pointer transition text-[9px] font-semibold text-slate-500 truncate max-w-[150px] sm:max-w-none"
                  title={note}
                >
                  + {note.replace(/(\.|\?)/g, "").substr(0, 20)}...
                </button>
              ))}
            </div>

            <textarea
              id="notes-textarea"
              rows={3}
              placeholder="Add personal updates, detail delivery receipts, or custom descriptions..."
              value={data.notes.notes || ""}
              onChange={(e) => updateNotesTerms({ notes: e.target.value })}
              className="w-full text-sm border border-slate-200 px-3 py-2 rounded-lg bg-white "
            />
          </div>

          <div>
            <label htmlFor="terms-textarea" className="block text-xs font-bold text-slate-700 mb-1">
              Terms &amp; Business Agreements
            </label>
            <textarea
              id="terms-textarea"
              rows={3}
              placeholder="e.g. Terms Net 30 default agreement terms. All payments are due by dates assigned."
              value={data.notes.terms || ""}
              onChange={(e) => updateNotesTerms({ terms: e.target.value })}
              className="w-full text-sm border border-slate-200 px-3 py-2 rounded-lg bg-white"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
