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
  Checkbox,
  Input,
  Select,
  StatusBadge,
  ToolPageHeader
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
  ShieldCheck,
  Download,
  Percent,
  CheckCircle,
  HelpCircle,
  ChevronRight,
  AlertTriangle,
  Receipt,
  UserCheck
} from "lucide-react";
import { DataBridge, DataBridgeKeys, VendorProfile, PaymentItem } from "../../lib/shared/dataBridge";

interface TrackerData1099 {
  reportingYear: number;
  payments: PaymentItem[];
}

const DEFAULT_NEC: TrackerData1099 = {
  reportingYear: 2026,
  payments: [
    { id: "pay-1", date: new Date().toISOString().substring(0, 10), vendorId: "vendor-1", amount: 1500.00, paymentMethod: "Zelle", category: "Services", description: "Design Consulting Consult", includeIn1099: true }
  ]
};

const SAMPLE_NEC: TrackerData1099 = {
  reportingYear: 2026,
  payments: [
    { id: "pay-1", date: "2026-02-15", vendorId: "vendor-1", amount: 450.00, paymentMethod: "Zelle", category: "Services", description: "Design Consult Setup", includeIn1099: true },
    { id: "pay-2", date: "2026-05-18", vendorId: "vendor-1", amount: 1200.00, paymentMethod: "ACH", category: "Services", description: "Figma Typography milestones", includeIn1099: true },
    { id: "pay-3", date: "2026-08-20", vendorId: "vendor-new", amount: 50.00, paymentMethod: "Cash", category: "Rent", description: "Desk rent AVL Office block", includeIn1099: false }
  ]
};

const FALLBACK_VENDOR: VendorProfile = {
  id: "vendor-1",
  legalName: "Devon Lane",
  businessName: "Devon Dev LLC",
  email: "devon@lanestudio.com",
  phone: "+1 (555) 441-2820",
  addressLine1: "192 Silver Maple Ave, Seattle, WA 98101",
  entityType: "LLC",
  w9Status: "Received",
  notes: "Ruby-on-Rails setup developer."
};

export default function NecTrackerPage({ onTrackClick }: { onTrackClick?: (item: string) => void }) {
  const [data, setData] = useState<TrackerData1099>(() => {
    return DataBridge.get<TrackerData1099>(DataBridgeKeys.NEC_DRAFT, DEFAULT_NEC);
  });

  const [vendors] = useState<VendorProfile[]>(() => {
    const loaded = DataBridge.getW9Vendors();
    return loaded.length > 0 ? loaded : [FALLBACK_VENDOR];
  });
  const [activeTab, setActiveTab] = useState<"ledger" | "verification">("ledger");

  // Seed the shared vendor list so 1099 rows always resolve on first render.
  useEffect(() => {
    if (DataBridge.getW9Vendors().length === 0) {
      DataBridge.saveW9Vendors(vendors);
    }
  }, [vendors]);

  // Save payments draft
  useEffect(() => {
    DataBridge.set(DataBridgeKeys.NEC_DRAFT, data);

    // Compute stats for tax estimators
    const totalPayments = data.payments.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    // Unique contractors count
    const activeContIds = new Set(data.payments.map(p => p.vendorId));

    // Check threshold counts
    let thresholdCrossed = 0;
    activeContIds.forEach(id => {
      const vendorSums = data.payments
        .filter(p => p.vendorId === id && p.includeIn1099)
        .reduce((sum, current) => sum + Number(current.amount || 0), 0);
      if (vendorSums >= 600) {
        thresholdCrossed++;
      }
    });

    DataBridge.set(DataBridgeKeys.NEC_SUMMARY, {
      year: data.reportingYear,
      totalPayments,
      contractorsCount: activeContIds.size,
      aboveThresholdCount: thresholdCrossed
    });
  }, [data]);

  const handleAddPayment = () => {
    const newPay: PaymentItem = {
      id: `pay-${Date.now()}`,
      date: new Date().toISOString().substring(0, 10),
      vendorId: vendors[0]?.id || "vendor-1",
      amount: 0,
      paymentMethod: "Zelle",
      category: "Services",
      description: "",
      includeIn1099: true
    };
    setData({
      ...data,
      payments: [...data.payments, newPay]
    });
    onTrackClick("nec_payment_added");
  };

  const handleRemovePayment = (id: string) => {
    setData({
      ...data,
      payments: data.payments.filter(p => p.id !== id)
    });
    onTrackClick("nec_payment_removed");
  };

  const handlePaymentChange = (id: string, field: keyof PaymentItem, val: any) => {
    const updated = data.payments.map(p => {
      if (p.id === id) {
        return {
          ...p,
          [field]: field === "amount" ? (val === "" ? "" : Number(val)) : val
        };
      }
      return p;
    });
    setData({ ...data, payments: updated });
  };

  const handleLoadSample = () => {
    setData(SAMPLE_NEC);
    onTrackClick("nec_sample_loaded");
  };

  const handleClearDraft = () => {
    if (confirm("Are you sure you want to clear payment tracking history?")) {
      setData(DEFAULT_NEC);
      onTrackClick("nec_draft_cleared");
    }
  };

  // Reconciled stats
  const getTotalsByVendor = () => {
    const sums: Record<string, number> = {};
    data.payments.forEach(p => {
      if (p.includeIn1099) {
        sums[p.vendorId] = (sums[p.vendorId] || 0) + Number(p.amount || 0);
      }
    });
    return sums;
  };

  const vendorSumsIn1099 = getTotalsByVendor();

  const getStats = () => {
    const totalsSum = data.payments.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    const in1099Sum = data.payments.filter(p => p.includeIn1099).reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

    const activeContIds = new Set(data.payments.map(p => p.vendorId));
    const listCrossed = Object.entries(vendorSumsIn1099).filter(([id, val]) => val >= 600).map(([id]) => id);

    return {
      totalsSum,
      in1099Sum,
      contractorsCount: activeContIds.size,
      aboveThresholdCount: listCrossed.length,
      listCrossedIds: listCrossed
    };
  };

  const stats = getStats();

  const handleExportCSV = () => {
    onTrackClick("nec_csv_exported");
    let content = "Date,Contractor Legal Name,Amount Paid,Payment Method,Deduction Classification,Description,Included In 1099\n";
    data.payments.forEach((item) => {
      const v = vendors.find(vend => vend.id === item.vendorId);
      const name = v ? v.legalName : "Unknown Contractor";
      content += `"${item.date}","${name.replace(/"/g, '""')}",${item.amount},"${item.paymentMethod}","${item.category}","${item.description.replace(/"/g, '""')}",${item.includeIn1099 ? "Yes" : "No"}\n`;
    });

    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `annual-1099NEC-ledger-${data.reportingYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    onTrackClick("nec_print_clicked");
    window.print();
  };

  return (
    <div className="grow w-full font-sans max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" id="nec-tracker-wrapper">

      <ToolPageHeader
        actions={(
          <>
            <Button onClick={handleLoadSample} size="sm" variant="secondary">
              <RefreshCw className="size-3.5" />
              <span>Load Sample</span>
            </Button>
            <Button onClick={handleClearDraft} size="sm" variant="danger-subtle">
              Clear Fields
            </Button>
          </>
        )}
        className="print:hidden"
        description="Monitor independent subcontractor payout caps, track verification thresholds, and download compliance checklists."
        eyebrow={<StatusBadge variant="warning">IRS Form 1099-NEC Threshold Tracker</StatusBadge>}
        title="1099-NEC Contractor Payments Tracker"
      />

      {/* Threshold stats alerts row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 print:hidden">
        <div className="bg-white p-5 border border-slate-200 rounded-2xl">
          <span className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Total payments ledger</span>
          <p className="text-2xl font-black text-slate-900">${stats.totalsSum.toLocaleString()}</p>
        </div>

        <div className="bg-white p-5 border border-slate-200 rounded-2xl flex justify-between items-center">
          <div>
            <span className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Crossing IRS $600 threshold</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-amber-600">{stats.aboveThresholdCount}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">contractors</span>
            </div>
          </div>
          {stats.aboveThresholdCount > 0 && (
            <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 border border-amber-200 shrink-0">
              <AlertTriangle className="w-5 h-5 animate-bounce-slow" />
            </div>
          )}
        </div>

        <div className="bg-white p-5 border border-slate-200 rounded-2xl">
          <span className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1 font-sans">Eligible 1099 payouts</span>
          <p className="text-2xl font-black text-emerald-600">${stats.in1099Sum.toLocaleString()}</p>
        </div>
      </div>

      {/* Split Columns Editor & Live Render */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* PAYMENT LEDGER INPUTS */}
        <div className="lg:col-span-7 space-y-6 print:hidden">

          <Card className="space-y-6">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
                    Contractor Payments Log ledger
                  </span>
                </div>
              </div>

              <Button
                type="button"
                onClick={handleAddPayment}
                size="sm"
                variant="strong"
              >
                <Plus className="size-3.5" />
                <span>Log Payment</span>
              </Button>
            </div>

            <div className="space-y-4">
              {data.payments.map((pay) => (
                <div key={pay.id} className="p-4 bg-slate-50 border rounded-xl space-y-3 relative">
                  <Button
                    type="button"
                    onClick={() => handleRemovePayment(pay.id)}
                    aria-label="Remove payment"
                    className="absolute right-2 top-2 text-muted-foreground hover:text-destructive"
                    size="icon"
                    variant="ghost"
                  >
                    <Trash2 className="size-4" />
                  </Button>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-black text-slate-400 uppercase mb-1" htmlFor={`nec-payment-${pay.id}-date`}>Payment Date *</label>
                      <Input
                        type="date"
                        className="font-semibold"
                        id={`nec-payment-${pay.id}-date`}
                        value={pay.date}
                        onChange={(e) => handlePaymentChange(pay.id, "date", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-slate-400 uppercase mb-1" htmlFor={`nec-payment-${pay.id}-vendor`}>Contractor Name *</label>
                      <Select
                        className="font-bold"
                        id={`nec-payment-${pay.id}-vendor`}
                        value={pay.vendorId}
                        onChange={(e) => handlePaymentChange(pay.id, "vendorId", e.target.value)}
                      >
                        {vendors.map(v => (
                          <option key={v.id} value={v.id}>{v.legalName}</option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-slate-400 uppercase mb-1" htmlFor={`nec-payment-${pay.id}-amount`}>Amount ($) *</label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        className="font-black"
                        id={`nec-payment-${pay.id}-amount`}
                        value={pay.amount || ""}
                        onChange={(e) => handlePaymentChange(pay.id, "amount", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-slate-500 uppercase mb-1" htmlFor={`nec-payment-${pay.id}-method`}>Payment Route</label>
                      <Select
                        className="font-semibold"
                        id={`nec-payment-${pay.id}-method`}
                        value={pay.paymentMethod}
                        onChange={(e) => handlePaymentChange(pay.id, "paymentMethod", e.target.value)}
                      >
                        <option value="Zelle">Zelle Deposit</option>
                        <option value="ACH">Direct Wire ACH</option>
                        <option value="Check">Business Check</option>
                        <option value="PayPal">PayPal Balance</option>
                        <option value="Cash">Cash Ledger</option>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
                    <div className="md:col-span-8">
                      <Input
                        aria-label="Payment memo"
                        type="text"
                        placeholder="Additional memo reference (e.g. Design Consulting consult)..."
                        value={pay.description}
                        onChange={(e) => handlePaymentChange(pay.id, "description", e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-4 flex items-center justify-end text-[10px] font-black text-slate-500">
                      <Checkbox
                        checked={pay.includeIn1099}
                        label="Include in 1099 NEC"
                        onChange={(e) => handlePaymentChange(pay.id, "includeIn1099", e.target.checked)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Compliance notice block */}
          <AlertBanner title="IRS 1099-NEC Threshold warnings" variant="warning">
            <p>
              Under IRC rules, paying any non-incorporated contractor (Sole proprietors, Single-Member LLCs) $600 or more during a fiscal year requires filing Form 1099-NEC with both the IRS and the contractor by January 31st of the following calendar year.
            </p>
          </AlertBanner>

        </div>

        {/* PRINT SUITE AND SUMMARY COMPLIANCE VERIFICATION REPORTS */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-20 leading-relaxed font-sans">

          <Card className="space-y-3 p-4 print:hidden">
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold border-b pb-2">
              <span>REPORT EXPORT BAR</span>
              <StatusBadge variant="warning">IRS compliant format</StatusBadge>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={handlePrint}
                className="w-full"
                type="button"
                variant="strong"
              >
                <Printer className="size-4" />
                <span>Save Report PDF</span>
              </Button>
              <Button
                onClick={handleExportCSV}
                className="w-full"
                type="button"
                variant="secondary"
              >
                <Download className="size-4" />
                <span>Export CSV Sheet</span>
              </Button>
            </div>
          </Card>

          {/* Formulated paper template sheet */}
          <div className="relative group border border-slate-200 shadow-2xl rounded-2xl overflow-hidden">
            <div className="p-8 bg-white min-h-[750px] font-sans text-slate-800 font-semibold" id="receipt-print-area">

              <div className="border-b-2 border-slate-900 pb-4 mb-6">
                <span className="text-[11px] font-black text-slate-400 block uppercase font-mono tracking-wider">ANNUAL CONTRACTOR COMPLIANCE VERIFICATIONS</span>
                <h1 className="text-lg font-black text-slate-950 leading-tight">
                  FORM 1099-NEC REPORTING AUDIT LEDGER
                </h1>
                <p className="text-[10px] text-slate-400 font-bold font-mono">
                  TAX YEAR COMPLIANT REPORTING PERIOD {data.reportingYear}
                </p>
              </div>

              {/* Status parameters */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 border rounded-lg p-3 text-xs">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-extrabold block">Eligible 1099 payments</span>
                  <p className="text-slate-900 font-black font-mono text-sm mt-0.5">${stats.in1099Sum.toLocaleString()}</p>
                </div>
                <div className="bg-slate-50 border rounded-lg p-3 text-xs text-right">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-extrabold block">Threshold filers alert</span>
                  <p className="text-amber-700 font-black font-mono text-sm mt-0.5">{stats.aboveThresholdCount} contractors</p>
                </div>
              </div>

              {/* Threshold alerts contractors listing table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs mb-6">
                <div className="bg-slate-100/50 px-3 py-2 border-b text-[11px] font-black text-slate-900 uppercase">
                  Contractor annual payout sums (Crossing $600 IRS Cap)
                </div>

                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[11px] text-slate-400 font-black uppercase">
                    <tr className="border-b">
                      <th className="py-2 px-3">Contractor Name</th>
                      <th className="py-2 px-3">Company Type / DBA</th>
                      <th className="py-2 px-3 text-right">Deduction Sum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendors.map(vend => {
                      const sum = vendorSumsIn1099[vend.id] || 0;
                      return (
                        <tr key={vend.id} className="border-b last:border-0 border-slate-100">
                          <td className="py-3 px-3 font-extrabold text-slate-950">
                            {vend.legalName}
                            {sum >= 600 && (
                              <span className="block text-[11px] text-amber-600 font-bold uppercase tracking-wide pt-0.5">
                                ⚠ filing Required (Exceeds $600 Cap)
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-bold">
                              {vend.entityType} {vend.businessName ? `(${vend.businessName})` : ""}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-black text-slate-900">
                            ${sum.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Complete ledgers payment records lists */}
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs mb-6">
                <div className="bg-slate-100/50 px-3 py-2 border-b text-[11px] font-black text-slate-900 uppercase">
                  complete Ledger Payment record logs
                </div>
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b text-[11px] text-slate-400 font-black uppercase">
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Contractor Name</th>
                      <th className="py-2 px-3 text-right">Sum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.payments.map((p, idx) => {
                      const vDetail = vendors.find(vend => vend.id === p.vendorId);
                      return (
                        <tr key={p.id || idx} className="border-b last:border-0 border-slate-100">
                          <td className="py-2.5 px-3 font-mono text-slate-500">{p.date}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-700">
                            {vDetail ? vDetail.legalName : "Unknown contractor"}
                            {p.description && <span className="block text-[11px] text-slate-400 font-medium">{p.description}</span>}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">
                            ${Number(p.amount || 0).toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Declarations Sign-offs */}
              <div className="border-t pt-6 mt-12 text-center text-xs text-slate-600 leading-relaxed font-semibold">
                <p className="font-extrabold text-slate-900 uppercase">Form 1099-NEC Reconciliations declaration</p>
                <p className="text-[10px] text-slate-400 max-w-xl mx-auto pt-2">
                  I hereby certify that this summary ledger is consistent with registered bank disbursements paid to contracted personnel in compliance with IRS Form 1099-NEC threshold definitions.
                </p>

                <div className="grid grid-cols-2 gap-8 mt-8 max-w-sm mx-auto">
                  <div className="space-y-1">
                    <div className="border-b border-slate-300 h-8" />
                    <span className="block text-[11px] uppercase font-bold text-slate-400">Payer Signature</span>
                  </div>
                  <div className="space-y-1">
                    <div className="border-b border-slate-350 h-8" />
                    <span className="block text-[11px] uppercase font-bold text-slate-400 font-mono">reconciled date</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
