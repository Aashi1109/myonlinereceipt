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
  ShieldCheck,
  Download,
  Percent,
  CheckCircle,
  HelpCircle,
  Info,
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

export default function NecTrackerPage({ onTrackClick }: { onTrackClick: (item: string) => void }) {
  const [data, setData] = useState<TrackerData1099>(() => {
    return DataBridge.get<TrackerData1099>(DataBridgeKeys.NEC_DRAFT, DEFAULT_NEC);
  });
  
  const [vendors, setVendors] = useState<VendorProfile[]>([]);
  const [activeTab, setActiveTab] = useState<"ledger" | "verification">("ledger");

  // Load vendors from W9 request page to align select dropdowns
  useEffect(() => {
    const loaded = DataBridge.getW9Vendors();
    if (loaded && loaded.length > 0) {
      setVendors(loaded);
    } else {
      // Ensure fallback vendor if empty
      const fallback: VendorProfile = {
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
      setVendors([fallback]);
      DataBridge.saveW9Vendors([fallback]);
    }
  }, []);

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
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b border-zinc-200/60 pb-6 no-print">
        <div>
          <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black uppercase tracking-wider block w-fit mb-1 font-sans">
            IRS Form 1099-NEC Threshold Tracker
          </span>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase">
            1099-NEC Contractor Payments Tracker
          </h2>
          <p className="text-zinc-500 font-medium text-xs md:text-sm">
            Monitor independent subcontractor payout caps, track verification thresholds, and download compliance checklists.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleLoadSample}
            className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-805 font-bold text-xs border border-zinc-200 rounded-lg flex items-center gap-1.5 transition active:scale-98 cursor-pointer"
            type="button"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Load Sample</span>
          </button>
          <button
            onClick={handleClearDraft}
            className="px-4 py-2 text-xs font-bold text-rose-600 hover:text-rose-955 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-lg transition"
            type="button"
          >
            Clear Fields
          </button>
        </div>
      </div>

      {/* Threshold stats alerts row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 no-print">
        <div className="bg-white p-5 border border-zinc-200 rounded-2xl">
          <span className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Total payments ledger</span>
          <p className="text-2xl font-black text-slate-900">${stats.totalsSum.toLocaleString()}</p>
        </div>

        <div className="bg-white p-5 border border-zinc-200 rounded-2xl flex justify-between items-center">
          <div>
            <span className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Crossing IRS $600 threshold</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-amber-600">{stats.aboveThresholdCount}</span>
              <span className="text-[10px] font-bold text-zinc-400 uppercase">contractors</span>
            </div>
          </div>
          {stats.aboveThresholdCount > 0 && (
            <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 border border-amber-200 shrink-0">
              <AlertTriangle className="w-5 h-5 animate-bounce-slow" />
            </div>
          )}
        </div>

        <div className="bg-white p-5 border border-zinc-200 rounded-2xl">
          <span className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1 font-sans">Eligible 1099 payouts</span>
          <p className="text-2xl font-black text-emerald-600">${stats.in1099Sum.toLocaleString()}</p>
        </div>
      </div>

      {/* Split Columns Editor & Live Render */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* PAYMENT LEDGER INPUTS */}
        <div className="lg:col-span-7 space-y-6 no-print">
          
          <div className="bg-white rounded-2xl border p-6 space-y-6">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-black text-slate-455 uppercase tracking-widest">
                    Contractor Payments Log ledger
                  </span>
                </div>
              </div>
              
              <button
                type="button"
                onClick={handleAddPayment}
                className="text-xs bg-slate-900 hover:bg-black text-white font-black px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log Payment</span>
              </button>
            </div>

            <div className="space-y-4">
              {data.payments.map((pay) => (
                <div key={pay.id} className="p-4 bg-zinc-50 border rounded-xl space-y-3 relative">
                  <button
                    type="button"
                    onClick={() => handleRemovePayment(pay.id)}
                    className="absolute right-2 top-2 text-zinc-400 hover:text-rose-600 transition p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[8px] font-black text-zinc-405 uppercase mb-1">Payment Date *</label>
                      <input
                        type="date"
                        className="w-full text-xs font-semibold border rounded-lg px-2 py-1.5 bg-white focus:outline-none"
                        value={pay.date}
                        onChange={(e) => handlePaymentChange(pay.id, "date", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-black text-zinc-405 uppercase mb-1">Contractor Name *</label>
                      <select
                        className="w-full text-xs font-bold border bg-white rounded-lg px-1 py-1.5 text-slate-800"
                        value={pay.vendorId}
                        onChange={(e) => handlePaymentChange(pay.id, "vendorId", e.target.value)}
                      >
                        {vendors.map(v => (
                          <option key={v.id} value={v.id}>{v.legalName}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[8px] font-black text-zinc-405 uppercase mb-1">Amount ($) *</label>
                      <input
                        type="number"
                        placeholder="0.00"
                        className="w-full text-xs font-black border rounded-lg px-2 py-1.5"
                        value={pay.amount || ""}
                        onChange={(e) => handlePaymentChange(pay.id, "amount", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-black text-zinc-455 uppercase mb-1">Payment Route</label>
                      <select
                        className="w-full text-xs font-semibold border bg-white rounded-lg px-1.5 py-1.5 text-slate-705"
                        value={pay.paymentMethod}
                        onChange={(e) => handlePaymentChange(pay.id, "paymentMethod", e.target.value)}
                      >
                        <option value="Zelle">Zelle Deposit</option>
                        <option value="ACH">Direct Wire ACH</option>
                        <option value="Check">Business Check</option>
                        <option value="PayPal">PayPal Balance</option>
                        <option value="Cash">Cash Ledger</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
                    <div className="md:col-span-8">
                      <input
                        type="text"
                        placeholder="Additional memo reference (e.g. Design Consulting consult)..."
                        className="w-full text-xs border bg-white rounded px-2.5 py-1.5"
                        value={pay.description}
                        onChange={(e) => handlePaymentChange(pay.id, "description", e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-4 flex items-center justify-end text-[10px] font-black text-zinc-500">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-slate-900 border-zinc-300 rounded"
                          checked={pay.includeIn1099}
                          onChange={(e) => handlePaymentChange(pay.id, "includeIn1099", e.target.checked)}
                        />
                        <span>Include in 1099 NEC</span>
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Compliance notice block */}
          <div className="bg-amber-50 border border-amber-250 text-amber-850 p-4 rounded-xl flex gap-3 text-xs leading-relaxed font-semibold">
            <Info className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-extrabold block">IRS 1099-NEC Threshold warnings</span>
              <p className="font-medium">
                Under IRC rules, paying any non-incorporated contractor (Sole proprietors, Single-Member LLCs) $600 or more during a fiscal year requires filing Form 1099-NEC with both the IRS and the contractor by January 31st of the following calendar year.
              </p>
            </div>
          </div>

        </div>

        {/* PRINT SUITE AND SUMMARY COMPLIANCE VERIFICATION REPORTS */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-20 leading-relaxed font-sans">
          
          <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-3xs space-y-3 no-print">
            <div className="flex items-center justify-between text-[11px] text-zinc-500 font-bold border-b pb-2">
              <span>REPORT EXPORT BAR</span>
              <span className="px-2 py-0.5 bg-amber-50 text-amber-700 font-black border border-amber-200 rounded-full text-[9px] uppercase">
                IRS compliant format
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handlePrint}
                className="py-3 bg-slate-950 hover:bg-black text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer hover:-translate-y-0.5 transition shadow-3xs hover:shadow-md active:translate-y-0"
                type="button"
              >
                <Printer className="w-4 h-4" />
                <span>Save Report PDF</span>
              </button>
              <button
                onClick={handleExportCSV}
                className="py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-805 border border-zinc-250 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer"
                type="button"
              >
                <Download className="w-4 h-4 text-zinc-500" />
                <span>Export CSV Sheet</span>
              </button>
            </div>
          </div>

          {/* Formulated paper template sheet */}
          <div className="relative group border border-zinc-250 shadow-2xl rounded-2xl overflow-hidden">
            <div className="p-8 bg-white min-h-[750px] font-sans text-slate-800 font-semibold" id="receipt-print-area">
              
              <div className="border-b-2 border-slate-900 pb-4 mb-6">
                <span className="text-[9px] font-black text-zinc-400 block uppercase font-mono tracking-wider">ANNUAL CONTRACTOR COMPLIANCE VERIFICATIONS</span>
                <h1 className="text-lg font-black text-slate-950 leading-tight">
                  FORM 1099-NEC REPORTING AUDIT LEDGER
                </h1>
                <p className="text-[10px] text-zinc-405 font-bold font-mono">
                  TAX YEAR COMPLIANT REPORTING PERIOD {data.reportingYear}
                </p>
              </div>

              {/* Status parameters */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-zinc-50 border rounded-lg p-3 text-xs">
                  <span className="text-[8px] uppercase tracking-wider text-zinc-400 font-extrabold block">Eligible 1099 payments</span>
                  <p className="text-slate-900 font-black font-mono text-sm mt-0.5">${stats.in1099Sum.toLocaleString()}</p>
                </div>
                <div className="bg-zinc-50 border rounded-lg p-3 text-xs text-right">
                  <span className="text-[8px] uppercase tracking-wider text-zinc-400 font-extrabold block">Threshold filers alert</span>
                  <p className="text-amber-700 font-black font-mono text-sm mt-0.5">{stats.aboveThresholdCount} contractors</p>
                </div>
              </div>

              {/* Threshold alerts contractors listing table */}
              <div className="border border-zinc-200 rounded-xl overflow-hidden text-xs mb-6">
                <div className="bg-zinc-100/50 px-3 py-2 border-b text-[9px] font-black text-slate-900 uppercase">
                  Contractor annual payout sums (Crossing $600 IRS Cap)
                </div>
                
                <table className="w-full text-left">
                  <thead className="bg-zinc-50 text-[9px] text-zinc-400 font-black uppercase">
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
                        <tr key={vend.id} className="border-b last:border-0 border-zinc-100">
                          <td className="py-3 px-3 font-extrabold text-slate-950">
                            {vend.legalName}
                            {sum >= 600 && (
                              <span className="block text-[8px] text-amber-600 font-bold uppercase tracking-wide pt-0.5">
                                ⚠ filing Required (Exceeds $600 Cap)
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-100 text-zinc-650 font-bold">
                              {vend.entityType} {vend.businessName ? `(${vend.businessName})` : ""}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-black text-slate-905">
                            ${sum.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Complete ledgers payment records lists */}
              <div className="border border-zinc-200 rounded-xl overflow-hidden text-xs mb-6">
                <div className="bg-zinc-100/50 px-3 py-2 border-b text-[9px] font-black text-slate-900 uppercase">
                  complete Ledger Payment record logs
                </div>
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-zinc-50 border-b text-[9px] text-zinc-405 font-black uppercase">
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Contractor Name</th>
                      <th className="py-2 px-3 text-right">Sum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.payments.map((p, idx) => {
                      const vDetail = vendors.find(vend => vend.id === p.vendorId);
                      return (
                        <tr key={p.id || idx} className="border-b last:border-0 border-zinc-100">
                          <td className="py-2.5 px-3 font-mono text-zinc-500">{p.date}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-700">
                            {vDetail ? vDetail.legalName : "Unknown contractor"}
                            {p.description && <span className="block text-[9px] text-zinc-400 font-medium">{p.description}</span>}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-slate-905">
                            ${Number(p.amount || 0).toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Declarations Sign-offs */}
              <div className="border-t pt-6 mt-12 text-center text-xs text-zinc-550 leading-relaxed font-semibold">
                <p className="font-extrabold text-slate-850 uppercase">Form 1099-NEC Reconciliations declaration</p>
                <p className="text-[10px] text-zinc-400 max-w-xl mx-auto pt-2">
                  I hereby certify that this summary ledger is consistent with registered bank disbursements paid to contracted personnel in compliance with IRS Form 1099-NEC threshold definitions.
                </p>

                <div className="grid grid-cols-2 gap-8 mt-8 max-w-sm mx-auto">
                  <div className="space-y-1">
                    <div className="border-b border-zinc-300 h-8" />
                    <span className="block text-[8px] uppercase font-bold text-zinc-400">Payer Signature</span>
                  </div>
                  <div className="space-y-1">
                    <div className="border-b border-zinc-350 h-8" />
                    <span className="block text-[8px] uppercase font-bold text-zinc-400 font-mono">reconciled date</span>
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
