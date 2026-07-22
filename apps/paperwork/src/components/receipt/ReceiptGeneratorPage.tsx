"use client";

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  AlertBanner,
  Button,
  Card,
  Input,
  Select,
  StatusBadge,
  Textarea,
  ToolPageHeader,
} from "@smarttools/ui";
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

export default function ReceiptGeneratorPage({ onTrackClick }: { onTrackClick?: (item: string) => void }) {
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
      <ToolPageHeader
        actions={
          <>
            {importAvailable && (
              <Button
                onClick={() => setShowImportConfirm(true)}
                size="sm"
                type="button"
                variant="outline"
              >
                <RefreshCw className="size-3.5" />
                <span>Import Invoice Draft</span>
              </Button>
            )}
            <Button onClick={handleLoadSample} size="sm" type="button" variant="secondary">
              <RefreshCw className="size-3.5" />
              <span>Sample Demo</span>
            </Button>
            <Button
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={handleClearDraft}
              size="sm"
              type="button"
              variant="ghost"
            >
              Clear Fields
            </Button>
          </>
        }
        className="print:hidden"
        description="Formulate payment records for your small business. Zero tracking, secure local downloads only."
        eyebrow={<StatusBadge variant="success">Legitimate Records Tool</StatusBadge>}
        title="Receipt Generator"
      />

      {/* 2. Notification Overlay if Importing Invoice */}
      {showImportConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md space-y-4 rounded-2xl shadow-xl">
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
              <Button
                onClick={() => setShowImportConfirm(false)}
                size="sm"
                type="button"
                variant="secondary"
              >
                Keep Blank
              </Button>
              <Button
                onClick={handleImportInvoice}
                size="sm"
                type="button"
              >
                Yes, Populate From Invoice
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* 3. Mobile tab switcher */}
      <div className="flex md:hidden bg-slate-100 p-1 rounded-xl mb-6 border border-slate-200/50 print:hidden" id="receipt-mobile-tabs">
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
        <div className={`lg:col-span-7 space-y-6 ${activeTab === "edit" ? "block" : "hidden md:block"} print:hidden`}>

          <Card className="space-y-6 rounded-2xl p-6 shadow-sm">

            {/* Business (Seller) Segment */}
            <div>
              <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4">
                1. Seller / Provider Info
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1" htmlFor="receipt-seller-name">Company / Seller Name *</label>
                  <Input
                    aria-errormessage={errors["business.name"] ? "receipt-seller-name-error" : undefined}
                    type="text"
                    required
                    placeholder="e.g. Blue Ridge Web Studio"
                    aria-invalid={Boolean(errors["business.name"])}
                    className={`text-xs font-semibold ${errors["business.name"] ? "bg-destructive/5" : ""}`}
                    id="receipt-seller-name"
                    value={data.business.name}
                    onChange={(e) => {
                      setData({ ...data, business: { ...data.business, name: e.target.value } });
                      if (errors["business.name"]) setErrors(prev => ({ ...prev, "business.name": "" }));
                    }}
                  />
                  {errors["business.name"] && (
                    <p className="mt-1 text-[10px] font-bold text-destructive" id="receipt-seller-name-error" role="alert">{errors["business.name"]}</p>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1" htmlFor="receipt-seller-tax-id">Tax ID / EIN (Optional)</label>
                  <Input
                    type="text"
                    placeholder="e.g. 12-3456789"
                    className="text-xs font-semibold"
                    id="receipt-seller-tax-id"
                    value={data.business.taxId || ""}
                    onChange={(e) => setData({ ...data, business: { ...data.business, taxId: e.target.value } })}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1" htmlFor="receipt-seller-address">Address Location</label>
                  <Input
                    type="text"
                    placeholder="e.g. 404 Ridge Point Lane"
                    className="mb-2 text-xs font-semibold"
                    id="receipt-seller-address"
                    value={data.business.addressLine1}
                    onChange={(e) => setData({ ...data, business: { ...data.business, addressLine1: e.target.value } })}
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      aria-label="Seller city"
                      type="text"
                      placeholder="City"
                      className="text-xs font-semibold"
                      value={data.business.city}
                      onChange={(e) => setData({ ...data, business: { ...data.business, city: e.target.value } })}
                    />
                    <Input
                      aria-label="Seller state"
                      type="text"
                      placeholder="State"
                      className="text-xs font-semibold"
                      value={data.business.state}
                      onChange={(e) => setData({ ...data, business: { ...data.business, state: e.target.value } })}
                    />
                    <Input
                      aria-label="Seller ZIP code"
                      type="text"
                      placeholder="Zip Code"
                      className="text-xs font-semibold"
                      value={data.business.zipCode}
                      onChange={(e) => setData({ ...data, business: { ...data.business, zipCode: e.target.value } })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1" htmlFor="receipt-seller-email">Sender Email</label>
                  <Input
                    type="email"
                    placeholder="e.g. info@domain.com"
                    className="text-xs font-semibold"
                    id="receipt-seller-email"
                    value={data.business.email}
                    onChange={(e) => setData({ ...data, business: { ...data.business, email: e.target.value } })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1" htmlFor="receipt-seller-phone">Support Phone</label>
                  <Input
                    type="text"
                    placeholder="+1 (555) 000-0000"
                    className="text-xs font-semibold"
                    id="receipt-seller-phone"
                    value={data.business.phone}
                    onChange={(e) => setData({ ...data, business: { ...data.business, phone: e.target.value } })}
                  />
                </div>
              </div>
            </div>

            {/* Customer (Payer) Segment */}
            <div>
              <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4">
                2. Payer / Client Info
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1" htmlFor="receipt-client-name">Client Name *</label>
                  <Input
                    aria-errormessage={errors["customer.name"] ? "receipt-client-name-error" : undefined}
                    type="text"
                    required
                    placeholder="e.g. Sarah Jenkins"
                    aria-invalid={Boolean(errors["customer.name"])}
                    className={`text-xs font-semibold ${errors["customer.name"] ? "bg-destructive/5" : ""}`}
                    id="receipt-client-name"
                    value={data.customer.name}
                    onChange={(e) => {
                      setData({ ...data, customer: { ...data.customer, name: e.target.value } });
                      if (errors["customer.name"]) setErrors(prev => ({ ...prev, "customer.name": "" }));
                    }}
                  />
                  {errors["customer.name"] && (
                    <p className="mt-1 text-[10px] font-bold text-destructive" id="receipt-client-name-error" role="alert">{errors["customer.name"]}</p>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1" htmlFor="receipt-client-company">Company / Association</label>
                  <Input
                    type="text"
                    placeholder="e.g. Acme Corp"
                    className="text-xs font-semibold"
                    id="receipt-client-company"
                    value={data.customer.company}
                    onChange={(e) => setData({ ...data, customer: { ...data.customer, company: e.target.value } })}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1" htmlFor="receipt-client-address">Billing Street Address</label>
                  <Input
                    type="text"
                    placeholder="822 Broad Street"
                    className="mb-2 text-xs font-semibold"
                    id="receipt-client-address"
                    value={data.customer.addressLine1}
                    onChange={(e) => setData({ ...data, customer: { ...data.customer, addressLine1: e.target.value } })}
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      aria-label="Client city"
                      type="text"
                      placeholder="City"
                      className="text-xs font-semibold"
                      value={data.customer.city}
                      onChange={(e) => setData({ ...data, customer: { ...data.customer, city: e.target.value } })}
                    />
                    <Input
                      aria-label="Client state"
                      type="text"
                      placeholder="State"
                      className="text-xs font-semibold"
                      value={data.customer.state}
                      onChange={(e) => setData({ ...data, customer: { ...data.customer, state: e.target.value } })}
                    />
                    <Input
                      aria-label="Client ZIP code"
                      type="text"
                      placeholder="Zip Code"
                      className="text-xs font-semibold"
                      value={data.customer.zipCode}
                      onChange={(e) => setData({ ...data, customer: { ...data.customer, zipCode: e.target.value } })}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Receipt Details Segment */}
            <div>
              <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4">
                3. Receipt Coordinates
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1" htmlFor="receipt-number">Receipt Number *</label>
                  <Input
                    type="text"
                    className="text-xs font-bold"
                    id="receipt-number"
                    value={data.receiptNumber}
                    onChange={(e) => setData({ ...data, receiptNumber: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1" htmlFor="receipt-date">Receipt Date *</label>
                  <Input
                    type="date"
                    className="text-xs font-semibold"
                    id="receipt-date"
                    value={data.receiptDate}
                    onChange={(e) => setData({ ...data, receiptDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1" htmlFor="receipt-category">Receipt Category</label>
                  <Select
                    className="text-xs font-bold"
                    id="receipt-category"
                    value={data.receiptType}
                    onChange={(e) => setData({ ...data, receiptType: e.target.value as any })}
                  >
                    <option value="Service">Service Receipt</option>
                    <option value="Product">Product Receipt</option>
                    <option value="Rent">Rent Statement</option>
                    <option value="Contractor">Subcontractor Receipt</option>
                    <option value="Deposit">Deposit Confirmed</option>
                    <option value="Refund">Refund statement</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1" htmlFor="receipt-related-invoice">Related Invoice #</label>
                  <Input
                    type="text"
                    placeholder="e.g. INV-2026-001"
                    className="text-xs font-semibold"
                    id="receipt-related-invoice"
                    value={data.relatedInvoiceNumber}
                    onChange={(e) => setData({ ...data, relatedInvoiceNumber: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1" htmlFor="receipt-transaction-id">Transaction/Ref ID</label>
                  <Input
                    type="text"
                    placeholder="e.g. TXN-99812A"
                    className="text-xs font-semibold"
                    id="receipt-transaction-id"
                    value={data.transactionId}
                    onChange={(e) => setData({ ...data, transactionId: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1" htmlFor="receipt-payment-status">Payment Status</label>
                  <Select
                    className="text-xs font-bold"
                    id="receipt-payment-status"
                    value={data.paymentStatus}
                    onChange={(e) => setData({ ...data, paymentStatus: e.target.value as any })}
                  >
                    <option value="Paid">Fully Paid</option>
                    <option value="Partially Paid">Partially Refunded</option>
                    <option value="Refunded">Fully Refunded</option>
                  </Select>
                </div>
              </div>
            </div>

            {/* Line Items Grid Rows */}
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-4">
                <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">
                  4. Items &amp; Services Paid
                </h3>
                <Button
                  onClick={handleAddItem}
                  size="sm"
                  type="button"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Line</span>
                </Button>
              </div>

              <div className="space-y-3">
                {data.lineItems.map((item, idx) => (
                  <div key={item.id} className="flex flex-col md:flex-row gap-3 p-3 bg-slate-50 border border-slate-200/60 rounded-xl relative">
                    <div className="grow">
                      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-0.5" htmlFor={`receipt-item-${item.id}-description`}>Description *</label>
                      <Input
                        type="text"
                        placeholder="e.g. Strategic Development Consultation"
                        className="text-xs font-medium"
                        id={`receipt-item-${item.id}-description`}
                        value={item.description}
                        onChange={(e) => handleItemChange(item.id, "description", e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2 w-full md:w-auto shrink-0 md:max-w-xs">
                      <div>
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-0.5" htmlFor={`receipt-item-${item.id}-quantity`}>Qty</label>
                        <Input
                          type="number"
                          min="1"
                          className="text-center text-xs font-bold"
                          id={`receipt-item-${item.id}-quantity`}
                          value={item.quantity}
                          onChange={(e) => handleItemChange(item.id, "quantity", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-0.5" htmlFor={`receipt-item-${item.id}-rate`}>Rate ($)</label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          className="text-xs font-bold"
                          id={`receipt-item-${item.id}-rate`}
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(item.id, "unitPrice", e.target.value)}
                        />
                      </div>
                      <div className="flex flex-col items-center justify-center pt-2">
                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Tax</span>
                        <input
                          aria-label={`Taxable receipt item ${idx + 1}`}
                          type="checkbox"
                          className="size-4 rounded border-input accent-primary"
                          checked={item.taxable}
                          onChange={(e) => handleItemChange(item.id, "taxable", e.target.checked)}
                        />
                      </div>
                    </div>
                    {data.lineItems.length > 1 && (
                      <button
                        aria-label={`Remove receipt item ${idx + 1}`}
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="absolute right-2 top-2 md:relative md:self-end md:top-auto md:right-auto text-slate-400 hover:text-red-600 p-1.5"
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
              <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4">
                5. Total Adjustments &amp; Paid Route
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1" htmlFor="receipt-discount-type">Discount Type</label>
                  <Select
                    className="text-xs font-bold"
                    id="receipt-discount-type"
                    value={data.discountType}
                    onChange={(e) => setData({ ...data, discountType: e.target.value as any, discountValue: 0 })}
                  >
                    <option value="none">No Discount</option>
                    <option value="percent">Percentage (%)</option>
                    <option value="fixed">Fixed Amount ($)</option>
                  </Select>
                </div>
                {data.discountType !== "none" && (
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1" htmlFor="receipt-discount-value">
                      {data.discountType === "percent" ? "Percentage Off (%)" : "Amount Deducted ($)"}
                    </label>
                    <Input
                      type="number"
                      className="text-xs font-bold"
                      id="receipt-discount-value"
                      value={data.discountValue}
                      onChange={(e) => setData({ ...data, discountValue: Math.max(0, Number(e.target.value)) })}
                    />
                  </div>
                )}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1" htmlFor="receipt-tax-rate">Sales Tax rate (%)</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="text-xs font-bold"
                    id="receipt-tax-rate"
                    value={data.salesTaxRate}
                    onChange={(e) => setData({ ...data, salesTaxRate: Math.max(0, Number(e.target.value)) })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1" htmlFor="receipt-tax-label">sales tax Label</label>
                  <Input
                    type="text"
                    className="text-xs font-semibold"
                    id="receipt-tax-label"
                    value={data.salesTaxLabel}
                    onChange={(e) => setData({ ...data, salesTaxLabel: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1" htmlFor="receipt-tip">Tip / Gratuity ($)</label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    className="text-xs font-bold"
                    id="receipt-tip"
                    value={data.tip}
                    onChange={(e) => setData({ ...data, tip: Math.max(0, Number(e.target.value)) })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1" htmlFor="receipt-additional-fee">Additional Fee ($)</label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    className="text-xs font-bold"
                    id="receipt-additional-fee"
                    value={data.additionalFee}
                    onChange={(e) => setData({ ...data, additionalFee: Math.max(0, Number(e.target.value)) })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1" htmlFor="receipt-payment-method">Payment Method</label>
                  <Select
                    className="text-xs font-bold"
                    id="receipt-payment-method"
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
                  </Select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1" htmlFor="receipt-received-by">Received By</label>
                  <Input
                    type="text"
                    placeholder="Staff/Agent Name"
                    className="text-xs font-semibold"
                    id="receipt-received-by"
                    value={data.receivedBy}
                    onChange={(e) => setData({ ...data, receivedBy: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Custom Notes terms */}
            <div>
              <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4">
                6. Custom Footnotes
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1" htmlFor="receipt-notes">Memo / Internal Notes</label>
                  <Textarea
                    rows={2}
                    className="min-h-20 text-xs font-medium"
                    id="receipt-notes"
                    placeholder="Details about project sign-offs, milestones compliance or policy notes."
                    value={data.notes}
                    onChange={(e) => setData({ ...data, notes: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1" htmlFor="receipt-thank-you">Thank-You Sign-off Message</label>
                  <Input
                    type="text"
                    className="text-xs font-semibold"
                    id="receipt-thank-you"
                    value={data.thankYouMessage}
                    onChange={(e) => setData({ ...data, thankYouMessage: e.target.value })}
                  />
                </div>
              </div>
            </div>

          </Card>

          {/* Core Safe usage and policy disclaimer to satisfy policy constraint */}
          <AlertBanner title="Official Legal Compliance Note" variant="success">
            This receipt generator is explicitly designed for documented payments between registered freelancers, business entities, and clients.
            Keep copies of bank clearance references and avoid creating visual brand replication layout sheets.
          </AlertBanner>

        </div>

        {/* Live design theme selector + Visual render block */}
        <div className={`lg:col-span-5 space-y-6 lg:sticky lg:top-20 leading-relaxed ${activeTab === "preview" ? "block" : "hidden md:block"}`}>

          <Card className="space-y-3 rounded-2xl p-4 shadow-sm print:hidden">
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold border-b border-slate-100 pb-2">
              <span>RECEIPT VISUAL LAYOUT</span>
              <StatusBadge variant="success">Ready in US-Format</StatusBadge>
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
                  className={`py-1.5 rounded-lg border uppercase transition-colors font-extrabold ${selectedTheme === themeOpt.key ? "bg-slate-900 border-slate-900 text-white" : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600"}`}
                  type="button"
                >
                  {themeOpt.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button
                className="w-full"
                onClick={handlePrint}
                type="button"
              >
                <Printer className="w-4 h-4" />
                <span>Print / Save PDF</span>
              </Button>
              <Button
                className="w-full"
                onClick={handleCopySummary}
                type="button"
                variant="secondary"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600 animate-pulse" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? "Copied!" : "Copy Summary"}</span>
              </Button>
            </div>
            <p className="text-[10px] text-slate-500 font-medium text-center">
              Print outputs generate vector-scalable standard Letter size paper versions immediately.
            </p>
          </Card>

          {/* Letter layout block preview */}
          <div className="relative group transition-all duration-200 shadow-2xl rounded-2xl border border-slate-200">
            <div className={`p-8 bg-white min-h-[750px] font-sans text-slate-800 ${selectedTheme === "compact" ? "max-w-md mx-auto" : ""}`} id="receipt-print-area">

              {/* Receipt Header Style layout matching selected theme */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-5 mb-6">
                <div>
                  <span className="text-[10px] uppercase font-black tracking-widest text-[#0066cc]">
                    {data.receiptType} RECEIPT
                  </span>
                  <h1 className="text-xl font-black text-slate-950 uppercase tracking-tight leading-none mt-1">
                    {data.business.name || "YOUR BUSINESS NAME"}
                  </h1>
                  {data.business.taxId && (
                    <span className="block text-[11px] font-mono font-bold text-slate-400 mt-1">
                      EIN/TAX ID: {data.business.taxId}
                    </span>
                  )}
                  {data.business.addressLine1 && (
                    <p className="text-[10px] text-slate-500 font-semibold leading-relaxed mt-2 max-w-sm">
                      {data.business.addressLine1}, {data.business.city}, {data.business.state} {data.business.zipCode}
                    </p>
                  )}
                  {data.business.email && (
                    <span className="block text-[10px] text-slate-500 font-mono font-medium">{data.business.email}</span>
                  )}
                </div>

                <div className="text-right">
                  <div className="inline-block px-3 py-1 rounded bg-slate-100 text-[10px] font-black text-slate-900 border border-slate-200">
                    {data.paymentStatus.toUpperCase()}
                  </div>
                  <div className="text-[11px] font-black text-slate-900 mt-3 font-mono">
                     {data.receiptNumber}
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold font-mono mt-1">
                    {data.receiptDate} {data.receiptTime}
                  </div>
                </div>
              </div>

              {/* Sender / Payer billing mapping layout boxes */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="bg-slate-50/60 p-3 rounded-lg border border-slate-100">
                  <span className="text-[11px] uppercase font-black tracking-widest text-slate-400 block mb-1">
                    Received From
                  </span>
                  <span className="font-extrabold text-slate-900 block text-xs">
                    {data.customer.name || "------------------"}
                  </span>
                  {data.customer.company && (
                    <span className="text-[10px] text-slate-500 block font-bold">
                      {data.customer.company}
                    </span>
                  )}
                  {data.customer.addressLine1 && (
                    <p className="text-[10px] text-slate-500 mt-1.5 leading-snug">
                      {data.customer.addressLine1}, {data.customer.city}, {data.customer.state} {data.customer.zipCode}
                    </p>
                  )}
                </div>

                <div className="bg-slate-50/60 p-3 rounded-lg border border-slate-100 space-y-1 text-xs">
                  <span className="text-[11px] uppercase font-black tracking-widest text-slate-400 block pb-0.5">
                    Payment Parameters
                  </span>
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-slate-500">Method:</span>
                    <span className="text-slate-950 font-black">{data.paymentMethod}</span>
                  </div>
                  {data.transactionId && (
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-slate-500">Ref ID:</span>
                      <span className="font-extrabold text-[#0066cc]">{data.transactionId}</span>
                    </div>
                  )}
                  {data.relatedInvoiceNumber && (
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-slate-500">Invoice:</span>
                      <span className="text-slate-800 font-extrabold">{data.relatedInvoiceNumber}</span>
                    </div>
                  )}
                  {data.receivedBy && (
                    <div className="flex justify-between text-[10px] font-semibold pt-1">
                      <span className="text-slate-400 block text-[11px] uppercase font-bold">Processed By</span>
                      <span className="text-slate-700 block">{data.receivedBy}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Items Render Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b border-slate-200">
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 text-center w-16">Qty</th>
                      <th className="py-2.5 px-3 text-right w-24">Rate</th>
                      <th className="py-2.5 px-3 text-right w-28">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.lineItems.map((item, idx) => (
                      <tr key={item.id || idx} className="border-b border-slate-100 last:border-b-0">
                        <td className="py-3 px-3 font-semibold text-slate-900 leading-snug">
                          {item.description || "Uncategorized Item Description"}
                          {item.taxable && <span className="text-[11px] bg-sky-50 text-sky-700 border border-sky-200 px-1.5 py-0.2 rounded-full font-bold ml-1">TAXABLE</span>}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-500">
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
                    <div className="bg-slate-50/60 p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[11px] uppercase tracking-wider text-slate-400 font-extrabold block mb-0.5">Note Memo</span>
                      <p className="text-[10px] text-slate-600 leading-normal font-medium">{data.notes}</p>
                    </div>
                  )}
                  {data.paymentNote && (
                    <span className="block text-[11px] font-mono text-slate-400 italic">
                      Payment info: {data.paymentNote}
                    </span>
                  )}
                </div>

                <div className="col-span-6 space-y-1.5 text-xs text-right font-semibold">
                  <div className="flex justify-between font-mono">
                    <span className="text-slate-500">Subtotal:</span>
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
                      <span className="text-slate-500">{data.salesTaxLabel} ({data.salesTaxRate}%):</span>
                      <span className="text-slate-800">${totals.taxAmount.toFixed(2)}</span>
                    </div>
                  )}

                  {data.tip > 0 && (
                    <div className="flex justify-between font-mono">
                      <span className="text-slate-500">Tip / Gratuity:</span>
                      <span className="text-slate-800">${Number(data.tip).toFixed(2)}</span>
                    </div>
                  )}

                  {data.additionalFee > 0 && (
                    <div className="flex justify-between font-mono">
                      <span className="text-slate-500">Additional Fee:</span>
                      <span className="text-slate-800">${Number(data.additionalFee).toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2.5 border-t border-slate-200 mt-2">
                    <span className="text-xs uppercase font-black text-slate-900">Total Paid:</span>
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
                    <div className="flex justify-between text-slate-700 font-mono text-[11px]">
                      <span>Effective Settled:</span>
                      <span>${totals.balanceDue.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Thank you sign-off footer */}
              <div className="text-center pt-12 mt-12 border-t border-slate-100">
                <p className="text-xs font-black text-slate-950 tracking-tight uppercase">
                  {data.thankYouMessage}
                </p>
                <span className="block text-[11px] text-slate-400/80 font-mono uppercase tracking-widest mt-1">
                  Receipt generated by SmartTools Paperwork Security Engine. Shared under offline-first protocols.
                </span>
              </div>

            </div>
          </div>

        </div>

      </div>

      {/* 5. Frequently Asked Questions (FAQ) Section - SEO Content */}
      <div className="mt-16 border-t border-slate-200/80 pt-12 space-y-6 max-w-4xl mx-auto print:hidden" id="receipt-seo-section">
        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight text-center font-sans">
          Frequently Answered Inquiries (FAQ)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-600 leading-relaxed font-semibold">
          <div className="space-y-1">
            <h4 className="font-extrabold text-slate-900">Are standard receipts created here totally free?</h4>
            <p className="font-medium">
              Yes, absolutely! Unlike cloud suites, SmartTools Paperwork does not request payment details or impose draft limits.
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
