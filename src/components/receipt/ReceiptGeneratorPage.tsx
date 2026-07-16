/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  FileText,
  Clock,
  Printer,
  FileDown,
  RefreshCw,
  Plus,
  Trash2,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Download,
  Percent,
  CheckCircle,
  HelpCircle,
  Info,
  ChevronRight
} from "lucide-react";
import { DataBridge, DataBridgeKeys, BusinessProfile, ClientProfile, ReceiptSummary } from "../../lib/shared/dataBridge";

interface ReceiptItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxable: boolean;
}

interface ReceiptData {
  business: BusinessProfile;
  customer: ClientProfile;
  receiptNumber: string;
  receiptDate: string;
  receiptTime: string;
  relatedInvoiceNumber: string;
  transactionId: string;
  paymentStatus: "Paid" | "Partially Paid" | "Refunded";
  receiptType: "Service" | "Product" | "Rent" | "Contractor" | "Deposit" | "Refund";
  lineItems: ReceiptItem[];
  discountType: "none" | "percent" | "fixed";
  discountValue: number;
  salesTaxRate: number;
  salesTaxLabel: string;
  tip: number;
  additionalFee: number;
  amountRefunded: number;
  paymentMethod: string;
  paymentNote: string;
  receivedBy: string;
  notes: string;
  thankYouMessage: string;
}

const DEFAULT_RECEIPT_DATA: ReceiptData = {
  business: {
    name: "",
    contactName: "",
    email: "",
    phone: "",
    website: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    zipCode: "",
    country: "US",
    taxId: ""
  },
  customer: {
    name: "",
    company: "",
    email: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    zipCode: "",
    country: "US"
  },
  receiptNumber: `RCP-${new Date().getFullYear()}-001`,
  receiptDate: new Date().toISOString().substring(0, 10),
  receiptTime: "12:00",
  relatedInvoiceNumber: "",
  transactionId: "",
  paymentStatus: "Paid",
  receiptType: "Service",
  lineItems: [
    { id: "item-1", description: "Design Consulting Consult", quantity: 1, unitPrice: 150.00, taxable: false }
  ],
  discountType: "none",
  discountValue: 0,
  salesTaxRate: 0,
  salesTaxLabel: "State Sales Tax",
  tip: 0,
  additionalFee: 0,
  amountRefunded: 0,
  paymentMethod: "Card",
  paymentNote: "",
  receivedBy: "",
  notes: "Thank you for supporting small businesses!",
  thankYouMessage: "Paid in full. We appreciate your prompt payment."
};

const SAMPLE_RECEIPT_DATA: ReceiptData = {
  business: {
    name: "Blue Ridge Web Studio",
    contactName: "Alex Mercer",
    email: "billing@blueridgeweb.com",
    phone: "+1 (555) 789-1234",
    website: "www.blueridgeweb.com",
    addressLine1: "404 Ridge Point Lane",
    addressLine2: "Suite 300",
    city: "Asheville",
    state: "NC",
    zipCode: "28801",
    country: "US",
    taxId: "81-4492318"
  },
  customer: {
    name: "Sarah Jenkins",
    company: "Acme Retail Co.",
    email: "sarah.j@acmeretail.com",
    phone: "+1 (555) 123-0099",
    addressLine1: "822 Broad Street",
    addressLine2: "Apt B",
    city: "Charlotte",
    state: "NC",
    zipCode: "28202",
    country: "US"
  },
  receiptNumber: `RCP-2026-618`,
  receiptDate: new Date().toISOString().substring(0, 10),
  receiptTime: "14:15",
  relatedInvoiceNumber: "INV-2026-441",
  transactionId: "TXN-881249A",
  paymentStatus: "Paid",
  receiptType: "Service",
  lineItems: [
    { id: "item-1", description: "Vite Bundler Configuration Service", quantity: 1, unitPrice: 400.00, taxable: false },
    { id: "item-2", description: "Inter font typography setup and components integration", quantity: 3, unitPrice: 75.00, taxable: false }
  ],
  discountType: "percent",
  discountValue: 10,
  salesTaxRate: 4.75,
  salesTaxLabel: "North Carolina Sales Tax",
  tip: 50.00,
  additionalFee: 5.00,
  amountRefunded: 0,
  paymentMethod: "Zelle",
  paymentNote: "Transferred from Sarah Chase Account",
  receivedBy: "Alex Mercer",
  notes: "Standard web project milestones signed off by development partners.",
  thankYouMessage: "Thank you for your business!"
};

export default function ReceiptGeneratorPage({ onTrackClick }: { onTrackClick: (item: string) => void }) {
  const [data, setData] = useState<ReceiptData>(() => {
    return DataBridge.get<ReceiptData>(DataBridgeKeys.RECEIPT_DRAFT, DEFAULT_RECEIPT_DATA);
  });
  
  const [selectedTheme, setSelectedTheme] = useState<"classic" | "modern" | "compact" | "rent" | "contractor">("classic");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [importAvailable, setImportAvailable] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);

  // Auto-save draft
  useEffect(() => {
    DataBridge.set(DataBridgeKeys.RECEIPT_DRAFT, data);
  }, [data]);

  // Check if Invoice Draft is present
  useEffect(() => {
    const inv = DataBridge.getInvoiceDraft();
    if (inv && inv.business && inv.business.name) {
      setImportAvailable(true);
    }
  }, []);

  const handleImportInvoice = () => {
    const inv = DataBridge.getInvoiceDraft();
    if (!inv) return;

    // Map InvoiceData to ReceiptData
    const mapped: ReceiptData = {
      ...DEFAULT_RECEIPT_DATA,
      business: { ...inv.business },
      customer: {
        name: inv.client.name,
        company: inv.client.company,
        email: inv.client.email,
        phone: inv.client.phone,
        addressLine1: inv.client.addressLine1,
        addressLine2: inv.client.addressLine2,
        city: inv.client.city,
        state: inv.client.state,
        zipCode: inv.client.zipCode,
        country: inv.client.country,
      },
      relatedInvoiceNumber: inv.invoice.invoiceNumber,
      lineItems: inv.lineItems.map((item, idx) => ({
        id: item.id || `item-${idx}`,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxable: item.taxable || false
      })),
      discountType: inv.totalsConfig.discountType === "percent" ? "percent" : inv.totalsConfig.discountType === "fixed" ? "fixed" : "none",
      discountValue: inv.totalsConfig.discountValue,
      salesTaxRate: inv.totalsConfig.taxRate,
      salesTaxLabel: inv.totalsConfig.taxLabel || "State Sales Tax",
      additionalFee: inv.totalsConfig.shippingFee || 0,
      paymentMethod: inv.payment.methods?.[0] ? 
        inv.payment.methods[0].substring(0,1).toUpperCase() + inv.payment.methods[0].substring(1) : "Bank Transfer",
      thankYouNote: "Thank you for your prompt payment of invoice " + inv.invoice.invoiceNumber,
    } as any;

    setData(mapped);
    setShowImportConfirm(false);
    onTrackClick("import_invoice_completed");
    alert("Draft invoice values imported successfully!");
  };

  const handleLoadSample = () => {
    setData(SAMPLE_RECEIPT_DATA);
    setErrors({});
    onTrackClick("receipt_sample_loaded");
  };

  const handleClearDraft = () => {
    if (confirm("Are you sure you want to clear current receipt entries?")) {
      setData(DEFAULT_RECEIPT_DATA);
      setErrors({});
      onTrackClick("receipt_draft_cleared");
    }
  };

  // Add Item line
  const handleAddItem = () => {
    const newItem: ReceiptItem = {
      id: `item-${Date.now()}`,
      description: "",
      quantity: 1,
      unitPrice: 0,
      taxable: false
    };
    setData({
      ...data,
      lineItems: [...data.lineItems, newItem]
    });
    onTrackClick("receipt_item_added");
  };

  // Remove Item line
  const handleRemoveItem = (id: string) => {
    setData({
      ...data,
      lineItems: data.lineItems.filter(item => item.id !== id)
    });
    onTrackClick("receipt_item_removed");
  };

  // Safe item updates
  const handleItemChange = (id: string, field: keyof ReceiptItem, val: any) => {
    const updated = data.lineItems.map(item => {
      if (item.id === id) {
        return {
          ...item,
          [field]: field === "quantity" || field === "unitPrice" ? (val === "" ? "" : Number(val)) : val
        };
      }
      return item;
    });
    setData({ ...data, lineItems: updated });
  };

  // Calculations
  const calculateTotals = () => {
    const subtotal = data.lineItems.reduce((acc, current) => {
      return acc + (Number(current.quantity || 0) * Number(current.unitPrice || 0));
    }, 0);

    let discountAmount = 0;
    if (data.discountType === "percent") {
      discountAmount = (subtotal * Number(data.discountValue || 0)) / 100;
    } else if (data.discountType === "fixed") {
      discountAmount = Number(data.discountValue || 0);
    }

    const discountedSubtotal = Math.max(0, subtotal - discountAmount);
    
    // Tax is calculated on taxable subtotal items
    const taxableSubtotal = data.lineItems.reduce((acc, current) => {
      if (current.taxable) {
        const itemLine = Number(current.quantity || 0) * Number(current.unitPrice || 0);
        return acc + itemLine;
      }
      return acc;
    }, 0);
    // Adjusted taxable portion for discounts proportionally
    const discountRatio = subtotal > 0 ? (subtotal - discountAmount) / subtotal : 1;
    const adjustedTaxableTotal = taxableSubtotal * discountRatio;
    const taxAmount = (adjustedTaxableTotal * Number(data.salesTaxRate || 0)) / 100;

    const total = discountedSubtotal + taxAmount + Number(data.tip || 0) + Number(data.additionalFee || 0);
    
    const balanceDue = data.paymentStatus === "Partially Paid" ? Math.max(0, total - data.amountRefunded) : 0;

    return {
      subtotal,
      discountAmount,
      taxAmount,
      total,
      balanceDue
    };
  };

  const totals = calculateTotals();

  const validateReceipt = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!data.business.name.trim()) {
      newErrors["business.name"] = "Seller / Provider Name is required to generate receipts.";
    }
    if (!data.customer.name.trim()) {
      newErrors["customer.name"] = "Client / Payer Name is required.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validate fields prior to print or download
  const handlePrint = () => {
    onTrackClick("receipt_print_clicked");
    if (validateReceipt()) {
      window.print();
    } else {
      const el = document.getElementById("receipt-mobile-tabs") || document.getElementById("receipt-seo-section");
      el?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleCopySummary = () => {
    const formattedAmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(totals.total);
    const summary = `Receipt ${data.receiptNumber} confirms payment of ${formattedAmt} from ${data.customer.name || "Customer" } to ${data.business.name || "Seller"} on ${data.receiptDate}. Payment Method: ${data.paymentMethod}.`;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    onTrackClick("receipt_copy_summary_clicked");
  };

  return (
    <div className="grow w-full font-sans max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" id="receipt-generator-wrapper">
      
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b border-zinc-200/60 pb-6 no-print">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase tracking-wider">
              Legitimate Records Tool
            </span>
            {importAvailable && (
              <button
                onClick={() => setShowImportConfirm(true)}
                className="text-[10px] bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 transition"
                type="button"
              >
                <RefreshCw className="w-2.5 h-2.5 border-b-2 overflow-hidden border-rose-50 rounded" />
                <span>Import Invoice Draft</span>
              </button>
            )}
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase">
            Receipt Generator
          </h2>
          <p className="text-zinc-500 font-medium text-xs md:text-sm">
            Formulate payment records for your small business. Zero tracking, secure local downloads only.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleLoadSample}
            className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs border border-zinc-200 rounded-lg flex items-center gap-1.5 transition active:scale-98 cursor-pointer"
            type="button"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sample Demo</span>
          </button>
          <button
            onClick={handleClearDraft}
            className="px-4 py-2 text-xs font-bold text-rose-600 hover:text-rose-950 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-lg transition cursor-pointer"
            type="button"
          >
            Clear Fields
          </button>
        </div>
      </div>

      {/* 2. Notification Overlay if Importing Invoice */}
      {showImportConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-55">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                <RefreshCw className="w-5 h-5 animate-spin-reverse" />
              </div>
              <h4 className="font-extrabold text-slate-900 text-lg">Import Active Invoice Draft?</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-semibold">
              This action transfers your business details, client details, line items, and totals from the active invoice draft into your receipt maker. Any existing unsaved receipt data will be updated.
            </p>
            <div className="flex justify-end gap-2 pt-2 text-xs font-semibold">
              <button
                type="button"
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 font-bold rounded-lg text-slate-705"
                onClick={() => setShowImportConfirm(false)}
              >
                Keep Blank
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-slate-900 hover:bg-black text-white font-extrabold rounded-lg shadow-xs"
                onClick={handleImportInvoice}
              >
                Yes, Populate From Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Mobile tab switcher */}
      <div className="flex md:hidden bg-zinc-100 p-1 rounded-xl mb-6 border border-zinc-200/50 no-print" id="receipt-mobile-tabs">
        <button
          type="button"
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${activeTab === "edit" ? "bg-white text-slate-950 shadow-xs" : "text-slate-500"}`}
          onClick={() => setActiveTab("edit")}
        >
          1. Edit Fields
        </button>
        <button
          type="button"
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${activeTab === "preview" ? "bg-white text-slate-950 shadow-xs" : "text-slate-500"}`}
          onClick={() => setActiveTab("preview")}
        >
          2. Live Design Preview
        </button>
      </div>

      {/* 4. Split Screen Editor & Live Rendered Frame */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Editor Fields Column */}
        <div className={`lg:col-span-7 space-y-6 ${activeTab === "edit" ? "block" : "hidden md:block"} no-print`}>
          
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-3xs p-6 space-y-6">
            
            {/* Business (Seller) Segment */}
            <div>
              <h3 className="text-sm font-black text-slate-450 uppercase tracking-widest border-b border-zinc-100 pb-2 mb-4">
                1. Seller / Provider Info
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Company / Seller Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Blue Ridge Web Studio"
                    className={`w-full text-xs font-semibold border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-slate-900 ${
                      errors["business.name"] ? "border-red-500 bg-red-50/20 ring-1 ring-red-200" : "border-zinc-250 bg-zinc-50"
                    }`}
                    value={data.business.name}
                    onChange={(e) => {
                      setData({ ...data, business: { ...data.business, name: e.target.value } });
                      if (errors["business.name"]) setErrors(prev => ({ ...prev, "business.name": "" }));
                    }}
                  />
                  {errors["business.name"] && (
                    <p className="text-[10px] font-bold text-red-500 mt-1">{errors["business.name"]}</p>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Tax ID / EIN (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 12-3456789"
                    className="w-full text-xs font-semibold border border-zinc-250 bg-zinc-50 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    value={data.business.taxId || ""}
                    onChange={(e) => setData({ ...data, business: { ...data.business, taxId: e.target.value } })}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Address Location</label>
                  <input
                    type="text"
                    placeholder="e.g. 404 Ridge Point Lane"
                    className="w-full text-xs font-semibold border border-zinc-250 bg-zinc-50 rounded-lg px-3 py-2 mb-2 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    value={data.business.addressLine1}
                    onChange={(e) => setData({ ...data, business: { ...data.business, addressLine1: e.target.value } })}
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="City"
                      className="w-full text-xs font-semibold border border-zinc-250 bg-zinc-50 rounded-lg px-2 py-2 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      value={data.business.city}
                      onChange={(e) => setData({ ...data, business: { ...data.business, city: e.target.value } })}
                    />
                    <input
                      type="text"
                      placeholder="State"
                      className="w-full text-xs font-semibold border border-zinc-250 bg-zinc-50 rounded-lg px-2 py-2 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      value={data.business.state}
                      onChange={(e) => setData({ ...data, business: { ...data.business, state: e.target.value } })}
                    />
                    <input
                      type="text"
                      placeholder="Zip Code"
                      className="w-full text-xs font-semibold border border-zinc-250 bg-zinc-50 rounded-lg px-2 py-2 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      value={data.business.zipCode}
                      onChange={(e) => setData({ ...data, business: { ...data.business, zipCode: e.target.value } })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Sender Email</label>
                  <input
                    type="email"
                    placeholder="e.g. info@domain.com"
                    className="w-full text-xs font-semibold border border-zinc-250 bg-zinc-50 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    value={data.business.email}
                    onChange={(e) => setData({ ...data, business: { ...data.business, email: e.target.value } })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Support Phone</label>
                  <input
                    type="text"
                    placeholder="+1 (555) 000-0000"
                    className="w-full text-xs font-semibold border border-zinc-250 bg-zinc-50 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    value={data.business.phone}
                    onChange={(e) => setData({ ...data, business: { ...data.business, phone: e.target.value } })}
                  />
                </div>
              </div>
            </div>

            {/* Customer (Payer) Segment */}
            <div>
              <h3 className="text-sm font-black text-slate-450 uppercase tracking-widest border-b border-zinc-100 pb-2 mb-4">
                2. Payer / Client Info
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Client Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sarah Jenkins"
                    className={`w-full text-xs font-semibold border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-slate-900 ${
                      errors["customer.name"] ? "border-red-500 bg-red-50/20 ring-1 ring-red-200" : "border-zinc-250 bg-zinc-50"
                    }`}
                    value={data.customer.name}
                    onChange={(e) => {
                      setData({ ...data, customer: { ...data.customer, name: e.target.value } });
                      if (errors["customer.name"]) setErrors(prev => ({ ...prev, "customer.name": "" }));
                    }}
                  />
                  {errors["customer.name"] && (
                    <p className="text-[10px] font-bold text-red-500 mt-1">{errors["customer.name"]}</p>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Company / Association</label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Corp"
                    className="w-full text-xs font-semibold border border-zinc-250 bg-zinc-50 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    value={data.customer.company}
                    onChange={(e) => setData({ ...data, customer: { ...data.customer, company: e.target.value } })}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Billing Street Address</label>
                  <input
                    type="text"
                    placeholder="822 Broad Street"
                    className="w-full text-xs font-semibold border border-zinc-250 bg-zinc-50 rounded-lg px-3 py-2 mb-2 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    value={data.customer.addressLine1}
                    onChange={(e) => setData({ ...data, customer: { ...data.customer, addressLine1: e.target.value } })}
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="City"
                      className="w-full text-xs font-semibold border border-zinc-250 bg-zinc-50 rounded-lg px-2 py-2 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      value={data.customer.city}
                      onChange={(e) => setData({ ...data, customer: { ...data.customer, city: e.target.value } })}
                    />
                    <input
                      type="text"
                      placeholder="State"
                      className="w-full text-xs font-semibold border border-zinc-250 bg-zinc-50 rounded-lg px-2 py-2 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      value={data.customer.state}
                      onChange={(e) => setData({ ...data, customer: { ...data.customer, state: e.target.value } })}
                    />
                    <input
                      type="text"
                      placeholder="Zip Code"
                      className="w-full text-xs font-semibold border border-zinc-250 bg-zinc-50 rounded-lg px-2 py-2 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      value={data.customer.zipCode}
                      onChange={(e) => setData({ ...data, customer: { ...data.customer, zipCode: e.target.value } })}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Receipt Details Segment */}
            <div>
              <h3 className="text-sm font-black text-slate-450 uppercase tracking-widest border-b border-zinc-100 pb-2 mb-4">
                3. Receipt Coordinates
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Receipt Number *</label>
                  <input
                    type="text"
                    className="w-full text-xs font-bold border border-zinc-250 bg-zinc-50 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    value={data.receiptNumber}
                    onChange={(e) => setData({ ...data, receiptNumber: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Receipt Date *</label>
                  <input
                    type="date"
                    className="w-full text-xs font-semibold border border-zinc-250 bg-zinc-50 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    value={data.receiptDate}
                    onChange={(e) => setData({ ...data, receiptDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Receipt Category</label>
                  <select
                    className="w-full text-xs font-bold border border-zinc-250 bg-white rounded-lg px-2 py-2 text-slate-800"
                    value={data.receiptType}
                    onChange={(e) => setData({ ...data, receiptType: e.target.value as any })}
                  >
                    <option value="Service">Service Receipt</option>
                    <option value="Product">Product Receipt</option>
                    <option value="Rent">Rent Statement</option>
                    <option value="Contractor">Subcontractor Receipt</option>
                    <option value="Deposit">Deposit Confirmed</option>
                    <option value="Refund">Refund statement</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Related Invoice #</label>
                  <input
                    type="text"
                    placeholder="e.g. INV-2026-001"
                    className="w-full text-xs font-semibold border border-zinc-250 bg-zinc-50 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    value={data.relatedInvoiceNumber}
                    onChange={(e) => setData({ ...data, relatedInvoiceNumber: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Transaction/Ref ID</label>
                  <input
                    type="text"
                    placeholder="e.g. TXN-99812A"
                    className="w-full text-xs font-semibold border border-zinc-250 bg-zinc-50 rounded-lg px-3 py-2"
                    value={data.transactionId}
                    onChange={(e) => setData({ ...data, transactionId: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Payment Status</label>
                  <select
                    className="w-full text-xs font-bold border border-zinc-250 bg-white rounded-lg px-2 py-2 text-slate-800"
                    value={data.paymentStatus}
                    onChange={(e) => setData({ ...data, paymentStatus: e.target.value as any })}
                  >
                    <option value="Paid">Fully Paid</option>
                    <option value="Partially Paid">Partially Refunded</option>
                    <option value="Refunded">Fully Refunded</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Line Items Grid Rows */}
            <div>
              <div className="flex items-center justify-between border-b border-zinc-100 pb-2 mb-4">
                <h3 className="text-sm font-black text-slate-450 uppercase tracking-widest">
                  4. Items &amp; Services Paid
                </h3>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="text-xs bg-slate-900 hover:bg-black text-white px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Line</span>
                </button>
              </div>

              <div className="space-y-3">
                {data.lineItems.map((item, idx) => (
                  <div key={item.id} className="flex flex-col md:flex-row gap-3 p-3 bg-zinc-50 border border-zinc-200/60 rounded-xl relative">
                    <div className="grow">
                      <label className="block text-[9px] font-black text-slate-405 uppercase tracking-wider mb-0.5">Description *</label>
                      <input
                        type="text"
                        placeholder="e.g. Strategic Development Consultation"
                        className="w-full text-xs font-medium border border-zinc-250 bg-white rounded-lg px-2.5 py-1.5 focus:outline-none"
                        value={item.description}
                        onChange={(e) => handleItemChange(item.id, "description", e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2 w-full md:w-auto shrink-0 md:max-w-xs">
                      <div>
                        <label className="block text-[9px] font-black text-slate-405 uppercase tracking-wider mb-0.5">Qty</label>
                        <input
                          type="number"
                          min="1"
                          className="w-full text-xs font-bold border border-zinc-250 bg-white rounded-lg px-2 py-1.5 text-center focus:outline-none"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(item.id, "quantity", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-405 uppercase tracking-wider mb-0.5">Rate ($)</label>
                        <input
                          type="number"
                          placeholder="0.00"
                          className="w-full text-xs font-bold border border-zinc-250 bg-white rounded-lg px-2 py-1.5 focus:outline-none"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(item.id, "unitPrice", e.target.value)}
                        />
                      </div>
                      <div className="flex flex-col items-center justify-center pt-2">
                        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">Tax</span>
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-slate-900 border-zinc-300 rounded focus:ring-0"
                          checked={item.taxable}
                          onChange={(e) => handleItemChange(item.id, "taxable", e.target.checked)}
                        />
                      </div>
                    </div>
                    {data.lineItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="absolute right-2 top-2 md:relative md:self-end md:top-auto md:right-auto text-zinc-400 hover:text-red-600 p-1.5"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Calculations & payment settings */}
            <div>
              <h3 className="text-sm font-black text-slate-450 uppercase tracking-widest border-b border-zinc-100 pb-2 mb-4">
                5. Total Adjustments &amp; Paid Route
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Discount Type</label>
                  <select
                    className="w-full text-xs font-bold border border-zinc-250 bg-white rounded-lg px-2 py-2 text-slate-800"
                    value={data.discountType}
                    onChange={(e) => setData({ ...data, discountType: e.target.value as any, discountValue: 0 })}
                  >
                    <option value="none">No Discount</option>
                    <option value="percent">Percentage (%)</option>
                    <option value="fixed">Fixed Amount ($)</option>
                  </select>
                </div>
                {data.discountType !== "none" && (
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                      {data.discountType === "percent" ? "Percentage Off (%)" : "Amount Deducted ($)"}
                    </label>
                    <input
                      type="number"
                      className="w-full text-xs font-bold border border-zinc-250 bg-zinc-50 rounded-lg px-3 py-2"
                      value={data.discountValue}
                      onChange={(e) => setData({ ...data, discountValue: Math.max(0, Number(e.target.value)) })}
                    />
                  </div>
                )}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Sales Tax rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full text-xs font-bold border border-zinc-250 bg-zinc-50 rounded-lg px-3 py-2"
                    value={data.salesTaxRate}
                    onChange={(e) => setData({ ...data, salesTaxRate: Math.max(0, Number(e.target.value)) })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">sales tax Label</label>
                  <input
                    type="text"
                    className="w-full text-xs font-semibold border border-zinc-250 bg-zinc-50 rounded-lg px-3 py-2"
                    value={data.salesTaxLabel}
                    onChange={(e) => setData({ ...data, salesTaxLabel: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Tip / Gratuity ($)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    className="w-full text-xs font-bold border border-zinc-250 bg-zinc-50 rounded-lg px-3 py-2"
                    value={data.tip}
                    onChange={(e) => setData({ ...data, tip: Math.max(0, Number(e.target.value)) })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Additional Fee ($)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    className="w-full text-xs font-bold border border-zinc-250 bg-zinc-50 rounded-lg px-3 py-2"
                    value={data.additionalFee}
                    onChange={(e) => setData({ ...data, additionalFee: Math.max(0, Number(e.target.value)) })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Payment Method</label>
                  <select
                    className="w-full text-xs font-bold border border-zinc-250 bg-white rounded-lg px-2 py-2 text-slate-800"
                    value={data.paymentMethod}
                    onChange={(e) => setData({ ...data, paymentMethod: e.target.value })}
                  >
                    <option value="Card">Credit/Debit Card</option>
                    <option value="Cash">Cash Handover</option>
                    <option value="Check">Business Check</option>
                    <option value="Zelle">Zelle Transfer</option>
                    <option value="Venmo">Venmo App</option>
                    <option value="PayPal">PayPal Balance</option>
                    <option value="Bank Transfer">Bank Wire ACH</option>
                    <option value="Other">Other Mode</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Received By</label>
                  <input
                    type="text"
                    placeholder="Staff/Agent Name"
                    className="w-full text-xs font-semibold border border-zinc-250 bg-zinc-50 rounded-lg px-3 py-2"
                    value={data.receivedBy}
                    onChange={(e) => setData({ ...data, receivedBy: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Custom Notes terms */}
            <div>
              <h3 className="text-sm font-black text-slate-450 uppercase tracking-widest border-b border-zinc-100 pb-2 mb-4">
                6. Custom Footnotes
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Memo / Internal Notes</label>
                  <textarea
                    rows={2}
                    className="w-full text-xs font-medium border border-zinc-250 bg-zinc-50 rounded-lg p-3 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    placeholder="Details about project sign-offs, milestones compliance or policy notes."
                    value={data.notes}
                    onChange={(e) => setData({ ...data, notes: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Thank-You Sign-off Message</label>
                  <input
                    type="text"
                    className="w-full text-xs font-semibold border border-zinc-250 bg-zinc-50 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    value={data.thankYouMessage}
                    onChange={(e) => setData({ ...data, thankYouMessage: e.target.value })}
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Core Safe usage and policy disclaimer to satisfy policy constraint */}
          <div className="bg-emerald-50 border border-emerald-250 rounded-2xl p-4 flex gap-3">
            <Info className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-850 space-y-1">
              <span className="font-extrabold block">Official Legal Compliance Note</span>
              <p className="font-medium leading-relaxed">
                This receipt generator is explicitly designed for documented payments between registered freelancers, business entities, and clients. 
                Keep copies of bank clearance references and avoid creating visual brand replication layout sheets.
              </p>
            </div>
          </div>

        </div>

        {/* Live design theme selector + Visual render block */}
        <div className={`lg:col-span-5 space-y-6 lg:sticky lg:top-20 leading-relaxed ${activeTab === "preview" ? "block" : "hidden md:block"}`}>
          
          <div className="bg-white rounded-2xl p-4 border border-zinc-200/80 shadow-3xs space-y-3 no-print">
            <div className="flex items-center justify-between text-[11px] text-zinc-500 font-bold border-b border-zinc-100 pb-2">
              <span>RECEIPT VISUAL LAYOUT</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-black tracking-wide font-sans text-[9px] uppercase">
                Ready in US-Format
              </span>
            </div>

            {/* Design preset layout options */}
            <div className="grid grid-cols-5 gap-1 pt-1 text-[10px] font-bold">
              {[
                { key: "classic", label: "Classic" },
                { key: "modern", label: "Modern" },
                { key: "compact", label: "Compact" },
                { key: "rent", label: "Rent" },
                { key: "contractor", label: "contractor" }
              ].map((themeOpt) => (
                <button
                  key={themeOpt.key}
                  onClick={() => setSelectedTheme(themeOpt.key as any)}
                  className={`py-1.5 rounded-lg border uppercase transition-colors font-extrabold ${selectedTheme === themeOpt.key ? "bg-slate-900 border-slate-900 text-white" : "border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-600"}`}
                  type="button"
                >
                  {themeOpt.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={handlePrint}
                className="py-3 bg-slate-950 hover:bg-black text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-3xs hover:-translate-y-0.5 transition active:scale-98"
                type="button"
              >
                <Printer className="w-4 h-4" />
                <span>Print / Save PDF</span>
              </button>
              <button
                onClick={handleCopySummary}
                className="py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-805 border border-zinc-250 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer"
                type="button"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600 animate-pulse" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? "Copied!" : "Copy Summary"}</span>
              </button>
            </div>
            <p className="text-[10px] text-zinc-500 font-medium text-center">
              Print outputs generate vector-scalable standard Letter size paper versions immediately.
            </p>
          </div>

          {/* Letter layout block preview */}
          <div className="relative group transition-all duration-200 shadow-2xl rounded-2xl border border-zinc-250">
            <div className={`p-8 bg-white min-h-[750px] font-sans text-slate-800 ${selectedTheme === "compact" ? "max-w-md mx-auto" : ""}`} id="receipt-print-area">
              
              {/* Receipt Header Style layout matching selected theme */}
              <div className="flex justify-between items-start border-b border-zinc-200 pb-5 mb-6">
                <div>
                  <span className="text-[10px] uppercase font-black tracking-widest text-[#0066cc]">
                    {data.receiptType} RECEIPT
                  </span>
                  <h1 className="text-xl font-black text-slate-950 uppercase tracking-tight leading-none mt-1">
                    {data.business.name || "YOUR BUSINESS NAME"}
                  </h1>
                  {data.business.taxId && (
                    <span className="block text-[9px] font-mono font-bold text-zinc-400 mt-1">
                      EIN/TAX ID: {data.business.taxId}
                    </span>
                  )}
                  {data.business.addressLine1 && (
                    <p className="text-[10px] text-zinc-500 font-semibold leading-relaxed mt-2 max-w-sm">
                      {data.business.addressLine1}, {data.business.city}, {data.business.state} {data.business.zipCode}
                    </p>
                  )}
                  {data.business.email && (
                    <span className="block text-[10px] text-zinc-500 font-mono font-medium">{data.business.email}</span>
                  )}
                </div>

                <div className="text-right">
                  <div className="inline-block px-3 py-1 rounded bg-zinc-100 text-[10px] font-black text-slate-900 border border-zinc-200">
                    {data.paymentStatus.toUpperCase()}
                  </div>
                  <div className="text-[11px] font-black text-slate-900 mt-3 font-mono">
                     {data.receiptNumber}
                  </div>
                  <div className="text-[10px] text-zinc-500 font-bold font-mono mt-1">
                    {data.receiptDate} {data.receiptTime}
                  </div>
                </div>
              </div>

              {/* Sender / Payer billing mapping layout boxes */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="bg-zinc-50/60 p-3 rounded-lg border border-zinc-100">
                  <span className="text-[9px] uppercase font-black tracking-widest text-zinc-400 block mb-1">
                    Received From
                  </span>
                  <span className="font-extrabold text-slate-900 block text-xs">
                    {data.customer.name || "------------------"}
                  </span>
                  {data.customer.company && (
                    <span className="text-[10px] text-zinc-500 block font-bold">
                      {data.customer.company}
                    </span>
                  )}
                  {data.customer.addressLine1 && (
                    <p className="text-[10px] text-zinc-500 mt-1.5 leading-snug">
                      {data.customer.addressLine1}, {data.customer.city}, {data.customer.state} {data.customer.zipCode}
                    </p>
                  )}
                </div>

                <div className="bg-zinc-50/60 p-3 rounded-lg border border-zinc-100 space-y-1 text-xs">
                  <span className="text-[9px] uppercase font-black tracking-widest text-zinc-400 block pb-0.5">
                    Payment Parameters
                  </span>
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-zinc-500">Method:</span>
                    <span className="text-slate-950 font-black">{data.paymentMethod}</span>
                  </div>
                  {data.transactionId && (
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-zinc-500">Ref ID:</span>
                      <span className="font-extrabold text-[#0066cc]">{data.transactionId}</span>
                    </div>
                  )}
                  {data.relatedInvoiceNumber && (
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-zinc-500">Invoice:</span>
                      <span className="text-slate-800 font-extrabold">{data.relatedInvoiceNumber}</span>
                    </div>
                  )}
                  {data.receivedBy && (
                    <div className="flex justify-between text-[10px] font-semibold pt-1">
                      <span className="text-zinc-400 block text-[9px] uppercase font-bold">Processed By</span>
                      <span className="text-slate-700 block">{data.receivedBy}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Items Render Table */}
              <div className="border border-zinc-200 rounded-xl overflow-hidden mb-6">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-zinc-50 text-[10px] font-black uppercase text-zinc-405 border-b border-zinc-200">
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 text-center w-16">Qty</th>
                      <th className="py-2.5 px-3 text-right w-24">Rate</th>
                      <th className="py-2.5 px-3 text-right w-28">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.lineItems.map((item, idx) => (
                      <tr key={item.id || idx} className="border-b border-zinc-100 last:border-b-0">
                        <td className="py-3 px-3 font-semibold text-slate-900 leading-snug">
                          {item.description || "Uncategorized Item Description"}
                          {item.taxable && <span className="text-[8px] bg-sky-50 text-sky-700 border border-sky-200 px-1.5 py-0.2 rounded-full font-bold ml-1">TAXABLE</span>}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-zinc-500">
                          {item.quantity}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-semibold">
                          ${Number(item.unitPrice || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                          ${(Number(item.quantity || 0) * Number(item.unitPrice || 0)).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Receipt Totals Summary Box */}
              <div className="grid grid-cols-12 gap-4 items-start pt-2">
                <div className="col-span-6 space-y-3">
                  {data.notes && (
                    <div className="bg-zinc-50/60 p-2.5 rounded-lg border border-zinc-100">
                      <span className="text-[8px] uppercase tracking-wider text-zinc-400 font-extrabold block mb-0.5">Note Memo</span>
                      <p className="text-[10px] text-zinc-600 leading-normal font-medium">{data.notes}</p>
                    </div>
                  )}
                  {data.paymentNote && (
                    <span className="block text-[9px] font-mono text-zinc-400 italic">
                      Payment info: {data.paymentNote}
                    </span>
                  )}
                </div>

                <div className="col-span-6 space-y-1.5 text-xs text-right font-semibold">
                  <div className="flex justify-between font-mono">
                    <span className="text-zinc-500">Subtotal:</span>
                    <span className="text-slate-800">${totals.subtotal.toFixed(2)}</span>
                  </div>

                  {data.discountType !== "none" && (
                    <div className="flex justify-between text-rose-600 font-mono">
                      <span>Discount ({data.discountType === "percent" ? `${data.discountValue}%` : "Fixed"}):</span>
                      <span>-${totals.discountAmount.toFixed(2)}</span>
                    </div>
                  )}

                  {data.salesTaxRate > 0 && (
                    <div className="flex justify-between font-mono">
                      <span className="text-zinc-500">{data.salesTaxLabel} ({data.salesTaxRate}%):</span>
                      <span className="text-slate-800">${totals.taxAmount.toFixed(2)}</span>
                    </div>
                  )}

                  {data.tip > 0 && (
                    <div className="flex justify-between font-mono">
                      <span className="text-zinc-500">Tip / Gratuity:</span>
                      <span className="text-slate-800">${Number(data.tip).toFixed(2)}</span>
                    </div>
                  )}

                  {data.additionalFee > 0 && (
                    <div className="flex justify-between font-mono">
                      <span className="text-zinc-500">Additional Fee:</span>
                      <span className="text-slate-800">${Number(data.additionalFee).toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2.5 border-t border-zinc-200 mt-2">
                    <span className="text-xs uppercase font-black text-slate-905">Total Paid:</span>
                    <span className="text-lg font-black text-slate-950 font-mono">
                      ${totals.total.toFixed(2)}
                    </span>
                  </div>

                  {data.amountRefunded > 0 && (
                    <div className="flex justify-between text-yellow-700 font-mono text-[11px] pt-1">
                      <span>Refunded portion:</span>
                      <span>-${Number(data.amountRefunded).toFixed(2)}</span>
                    </div>
                  )}

                  {totals.balanceDue > 0 && (
                    <div className="flex justify-between text-zinc-650 font-mono text-[11px]">
                      <span>Effective Settled:</span>
                      <span>${totals.balanceDue.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Thank you sign-off footer */}
              <div className="text-center pt-12 mt-12 border-t border-zinc-100">
                <p className="text-xs font-black text-slate-950 tracking-tight uppercase">
                  {data.thankYouMessage}
                </p>
                <span className="block text-[8px] text-zinc-400/80 font-mono uppercase tracking-widest mt-1">
                  Receipt generated by PaperworkKit Security Engine. Shared under offline-first protocols.
                </span>
              </div>

            </div>
          </div>

        </div>

      </div>

      {/* 5. Frequently Asked Questions (FAQ) Section - SEO Content */}
      <div className="mt-16 border-t border-zinc-200/80 pt-12 space-y-6 max-w-4xl mx-auto no-print" id="receipt-seo-section">
        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight text-center font-sans">
          Frequently Answered Inquiries (FAQ)
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-zinc-600 leading-relaxed font-semibold">
          <div className="space-y-1">
            <h4 className="font-extrabold text-slate-900">Are standard receipts created here totally free?</h4>
            <p className="font-medium">
              Yes, absolutely! Unlike cloud suites, PaperworkKit does not request payment details or impose draft limits. 
              You can issue PDF documents free forever.
            </p>
          </div>
          <div className="space-y-1">
            <h4 className="font-extrabold text-slate-900">Can I convert a paid invoice directly into a receipt?</h4>
            <p className="font-medium">
              Certainly! Using our smart local data bridge, click "Import Invoice Draft" to pull previous project line items and seller setups instantly.
            </p>
          </div>
          <div className="space-y-1">
            <h4 className="font-extrabold text-slate-900">Is my customer's privacy preserved securely?</h4>
            <p className="font-medium">
              100% yes. Your inputs never float to backup cloud vaults. Everything processes offline in your sandbox browser.
            </p>
          </div>
          <div className="space-y-1">
            <h4 className="font-extrabold text-slate-900">Under what conditions should I use this receipt tool?</h4>
            <p className="font-medium">
              Only for genuine settled transactions from your own contracting business block. Keep legal compliance folders secure.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
