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
  CheckCircle2,
  Paperclip,
  TrendingUp,
  MapPin
} from "lucide-react";
import { DataBridge, DataBridgeKeys, BusinessProfile, ClientProfile, ExpenseRow, MileageEntry } from "../../lib/shared/dataBridge";

interface ExpenseReportData {
  reportNumber: string;
  title: string;
  reportDate: string;
  startDate: string;
  endDate: string;
  purpose: string;
  projectName: string;
  department: string;
  submitter: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  client: {
    name: string;
    contact: string;
    email: string;
    address: string;
  };
  expenses: ExpenseRow[];
  mileageRows: MileageEntry[];
  advanceReceived: number;
}

const DEFAULT_REPORT: ExpenseReportData = {
  reportNumber: `EXP-${new Date().getFullYear()}-001`,
  title: "Monthly Operating Expenses",
  reportDate: new Date().toISOString().substring(0, 10),
  startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
  endDate: new Date().toISOString().substring(0, 10),
  purpose: "General Business Supplies",
  projectName: "",
  department: "Product Marketing",
  submitter: {
    name: "",
    email: "",
    phone: "",
    address: ""
  },
  client: {
    name: "",
    contact: "",
    email: "",
    address: ""
  },
  expenses: [
    { id: "row-1", date: new Date().toISOString().substring(0, 10), merchant: "Amazon Business", category: "Office supplies", description: "Heavy duty USB hubs & desk adapters", paymentMethod: "Card", amount: 89.90, tax: 6.20, tip: 0, reimbursable: true, billable: false, receiptAttached: true, receiptName: "amazon_usb_invoice_cover.png" }
  ],
  mileageRows: [],
  advanceReceived: 0
};

const SAMPLE_REPORT: ExpenseReportData = {
  reportNumber: `EXP-2026-039`,
  title: "Seattle Client Pitch Sprint",
  reportDate: new Date().toISOString().substring(0, 10),
  startDate: "2026-05-15",
  endDate: "2026-05-20",
  purpose: "Acme Retail Client Pitch & Onboarding Sprint",
  projectName: "Acme Brand Alignment",
  department: "Client Services",
  submitter: {
    name: "Alex Mercer",
    email: "alex@blueridgeweb.com",
    phone: "+1 (555) 789-1234",
    address: "404 Ridge Point Lane, Asheville, NC 28801"
  },
  client: {
    name: "Acme Retail Co.",
    contact: "Sarah Jenkins",
    email: "billing@acmeretail.com",
    address: "822 Broad Street, Charlotte, NC 28202"
  },
  expenses: [
    { id: "row-1", date: "2026-05-16", merchant: "Alaska Airlines", category: "Travel", description: "Roundtrip Flight Charlotte -> Seattle", paymentMethod: "Card", amount: 480.00, tax: 35.00, tip: 0, reimbursable: true, billable: true, receiptAttached: true, receiptName: "alaska_boarding_pass.pdf" },
    { id: "row-2", date: "2026-05-17", merchant: "The Westin Seattle", category: "Lodging", description: "4 Nights Room and Lodging Levy", paymentMethod: "Card", amount: 720.00, tax: 88.00, tip: 10.00, reimbursable: true, billable: true, receiptAttached: true, receiptName: "westin_invoice_8820.png" },
    { id: "row-3", date: "2026-05-18", merchant: "Metropolitan Grill", category: "Meals", description: "Lunch working session with Acme designers", paymentMethod: "Card", amount: 145.00, tax: 14.50, tip: 30.00, reimbursable: true, billable: false, receiptAttached: true, receiptName: "met_grill_rec.png" },
    { id: "row-4", date: "2026-05-19", merchant: "Figma Inc", category: "Software", description: "Pro plan subscription premium tier add-on", paymentMethod: "Personal funds", amount: 15.00, tax: 0, tip: 0, reimbursable: false, billable: false, receiptAttached: false }
  ],
  mileageRows: [
    { id: "mil-1", date: "2026-05-17", purpose: "Drive Asheville office to CLT Airport terminal", startLocation: "Asheville Office", destination: "CLT Airport Parking", miles: 110, rate: 0.67, amount: 73.70 }
  ],
  advanceReceived: 150.00
};

export default function ExpenseReportPage({ onTrackClick }: { onTrackClick: (item: string) => void }) {
  const [data, setData] = useState<ExpenseReportData>(() => {
    return DataBridge.get<ExpenseReportData>(DataBridgeKeys.EXPENSE_DRAFT, DEFAULT_REPORT);
  });
  
  const [selectedTheme, setSelectedTheme] = useState<"classic" | "client" | "travel" | "contractor" | "monthly">("classic");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [importAvailable, setImportAvailable] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);

  // Auto-save draft
  useEffect(() => {
    DataBridge.set(DataBridgeKeys.EXPENSE_DRAFT, data);
  }, [data]);

  // Sync with Quarterly Tax Estimator (deductible expenses aggregate)
  useEffect(() => {
    const totalDeductible = data.expenses.reduce((acc, current) => {
      // All business expenses are generally deductible regardless of client billing status, if they are self-employed expenses
      return acc + Number(current.amount || 0);
    }, 0);
    const milAmount = data.mileageRows.reduce((acc, current) => acc + (Number(current.miles || 0) * Number(current.rate || 0)), 0);
    
    // Save to shared expense summary key
    DataBridge.set("paperworkkit.expenseReport.summary", {
      reportNumber: data.reportNumber,
      title: data.title,
      dateRange: `${data.startDate} to ${data.endDate}`,
      totalAmount: totalDeductible + milAmount,
      reimbursableAmount: data.expenses.filter(e => e.reimbursable).reduce((acc, curr) => acc + curr.amount, 0)
    });
  }, [data]);

  // Check if Mileage Log draft is available for import
  useEffect(() => {
    const mileageData = DataBridge.get<any | null>(DataBridgeKeys.MILEAGE_DRAFT, null);
    if (mileageData && mileageData.trips && mileageData.trips.length > 0) {
      setImportAvailable(true);
    }
  }, []);

  const handleImportMileage = () => {
    const mileageData = DataBridge.get<any | null>(DataBridgeKeys.MILEAGE_DRAFT, null);
    if (!mileageData || !mileageData.trips) return;

    // Convert trips into Mileage entries suitable for the expense report
    const mapped: MileageEntry[] = mileageData.trips.map((trip: any, index: number) => ({
      id: trip.id || `mil-imported-${index}`,
      date: trip.date,
      purpose: trip.purpose,
      startLocation: trip.startLocation || "",
      destination: trip.destination || "",
      startOdometer: trip.startOdometer,
      endOdometer: trip.endOdometer,
      miles: Number(trip.miles || 0),
      rate: Number(trip.rate || 0.67),
      amount: Number(trip.amount || 0)
    }));

    setData({
      ...data,
      mileageRows: [...data.mileageRows, ...mapped]
    });
    setShowImportConfirm(false);
    onTrackClick("import_mileage_completed");
    alert(`Successfully imported ${mapped.length} trips from your active Mileage Log draft!`);
  };

  const handleLoadSample = () => {
    setData(SAMPLE_REPORT);
    onTrackClick("expense_sample_loaded");
  };

  const handleClearDraft = () => {
    if (confirm("Are you sure you want to clear this expense board?")) {
      setData(DEFAULT_REPORT);
      onTrackClick("expense_draft_cleared");
    }
  };

  const handleAddExpenseRow = () => {
    const newRow: ExpenseRow = {
      id: `row-${Date.now()}`,
      date: new Date().toISOString().substring(0, 10),
      merchant: "",
      category: "Meals",
      description: "",
      paymentMethod: "Card",
      amount: 0,
      tax: 0,
      tip: 0,
      reimbursable: true,
      billable: false,
      receiptAttached: false
    };
    setData({
      ...data,
      expenses: [...data.expenses, newRow]
    });
    onTrackClick("expense_item_added");
  };

  const handleAddMileageRow = () => {
    const newRow: MileageEntry = {
      id: `mil-${Date.now()}`,
      date: new Date().toISOString().substring(0, 10),
      purpose: "",
      startLocation: "",
      destination: "",
      miles: 0,
      rate: 0.67,
      amount: 0
    };
    setData({
      ...data,
      mileageRows: [...data.mileageRows, newRow]
    });
    onTrackClick("expense_mileage_row_added");
  };

  const handleRemoveExpenseRow = (id: string) => {
    setData({
      ...data,
      expenses: data.expenses.filter(r => r.id !== id)
    });
    onTrackClick("expense_item_removed");
  };

  const handleRemoveMileageRow = (id: string) => {
    setData({
      ...data,
      mileageRows: data.mileageRows.filter(r => r.id !== id)
    });
    onTrackClick("expense_mileage_row_removed");
  };

  const handleExpenseRowChange = (id: string, field: keyof ExpenseRow, val: any) => {
    const updated = data.expenses.map(item => {
      if (item.id === id) {
        return {
          ...item,
          [field]: field === "amount" || field === "tax" || field === "tip" ? (val === "" ? "" : Number(val)) : val
        };
      }
      return item;
    });
    setData({ ...data, expenses: updated });
  };

  const handleMileageRowChange = (id: string, field: keyof MileageEntry, val: any) => {
    const updated = data.mileageRows.map(item => {
      if (item.id === id) {
        const uItem = {
          ...item,
          [field]: field === "miles" || field === "rate" ? (val === "" ? "" : Number(val)) : val
        };
        uItem.amount = Number(uItem.miles || 0) * Number(uItem.rate || 0);
        return uItem;
      }
      return item;
    });
    setData({ ...data, mileageRows: updated });
  };

  // Calculations
  const calculateTotals = () => {
    const totalExpenses = data.expenses.reduce((acc, current) => acc + Number(current.amount || 0), 0);
    const totalReimbursable = data.expenses.filter(e => e.reimbursable).reduce((acc, current) => acc + Number(current.amount || 0), 0);
    const totalBillable = data.expenses.filter(e => e.billable).reduce((acc, current) => acc + Number(current.amount || 0), 0);
    
    // Mileage total
    const totalMileageAmount = data.mileageRows.reduce((acc, current) => acc + Number(current.amount || 0), 0);
    const totalMiles = data.mileageRows.reduce((acc, current) => acc + Number(current.miles || 0), 0);

    const checkCount = data.expenses.filter(e => e.receiptAttached).length;
    const totalsByCat: Record<string, number> = {};
    data.expenses.forEach(e => {
      totalsByCat[e.category] = (totalsByCat[e.category] || 0) + Number(e.amount || 0);
    });

    const netAmountDue = totalReimbursable + totalMileageAmount - Number(data.advanceReceived || 0);

    return {
      totalExpenses,
      totalReimbursable,
      totalBillable,
      totalMileageAmount,
      totalMiles,
      receiptCount: checkCount,
      netAmountDue,
      categoryGroups: totalsByCat
    };
  };

  const totals = calculateTotals();

  // Export CSV Action
  const handleExportCSV = () => {
    onTrackClick("expense_csv_exported");
    let content = "Date,Merchant,Category,Description,Payment Method,Amount,Tax,Tip,Reimbursable,Billable,Receipt Attached\n";
    data.expenses.forEach((item) => {
      content += `"${item.date}","${item.merchant.replace(/"/g, '""')}","${item.category}","${item.description.replace(/"/g, '""')}","${item.paymentMethod}",${item.amount},${item.tax},${item.tip},${item.reimbursable ? "Yes" : "No"},${item.billable ? "Yes" : "No"},${item.receiptAttached ? "Yes" : "No"}\n`;
    });
    
    if (data.mileageRows.length > 0) {
      content += "\nMILEAGE LOG ENTRIES\n";
      content += "Date,Purpose,Start Location,Destination,Miles,Rate,Amount\n";
      data.mileageRows.forEach((item) => {
        content += `"${item.date}","${item.purpose.replace(/"/g, '""')}","${item.startLocation.replace(/"/g, '""')}","${item.destination.replace(/"/g, '""')}",${item.miles},${item.rate},${item.amount}\n`;
      });
    }

    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `expense-report-${data.reportNumber}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const validateReport = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!data.submitter.name.trim()) {
      newErrors["submitter.name"] = "Submitter Legal Name is required before downloading reports.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePrint = () => {
    onTrackClick("expense_print_clicked");
    if (validateReport()) {
      window.print();
    } else {
      const el = document.getElementById("expense-mobile-tabs") || document.getElementById("expense-report-wrapper");
      el?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="grow w-full font-sans max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" id="expense-report-wrapper">
      
      {/* 1. Page Header banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b border-zinc-200/60 pb-6 no-print">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-black uppercase tracking-wider">
              Corporate Reimbursement Track
            </span>
            {importAvailable && (
              <button
                onClick={() => setShowImportConfirm(true)}
                className="text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 transition"
                type="button"
              >
                <Plus className="w-2.5 h-2.5 border-b border-zinc-200 rounded shrink-0" />
                <span>Import Mileage Logs</span>
              </button>
            )}
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase">
            Expense Report Generator
          </h2>
          <p className="text-zinc-500 font-medium text-xs md:text-sm">
            Categorize corporate purchases, reconcile item logs, and formulate reimbursable parameters.
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
            className="px-4 py-2 text-xs font-bold text-rose-600 hover:text-rose-950 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-lg transition cursor-pointer"
            type="button"
          >
            Clear Board
          </button>
        </div>
      </div>

      {/* 2. Import Dialog Popup overlay */}
      {showImportConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-55">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <MapPin className="w-5 h-5" />
              </div>
              <h4 className="font-extrabold text-slate-900 text-lg">Import Mileage Log Entries?</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-semibold">
              This routine reads your active Mileage Log draft values and safely appends them as mileage item rows inside this expense report board. No data will be overwritten.
            </p>
            <div className="flex justify-end gap-2 pt-2 text-xs font-semibold">
              <button
                type="button"
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 font-bold rounded-lg text-slate-705"
                onClick={() => setShowImportConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-slate-900 hover:bg-black text-white font-extrabold rounded-lg shadow-xs"
                onClick={handleImportMileage}
              >
                Yes, Append Mileage Rows
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Mobile tabs mapping */}
      <div className="flex md:hidden bg-zinc-100 p-1 rounded-xl mb-6 border border-zinc-200/50 no-print" id="expense-mobile-view-tabs">
        <button
          type="button"
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${activeTab === "edit" ? "bg-white text-slate-950 shadow-xs" : "text-slate-500"}`}
          onClick={() => setActiveTab("edit")}
        >
          1. Edit items
        </button>
        <button
          type="button"
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${activeTab === "preview" ? "bg-white text-slate-950 shadow-xs" : "text-slate-500"}`}
          onClick={() => setActiveTab("preview")}
        >
          2. PDF / Print View
        </button>
      </div>

      {/* 4. Split Screen layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: THE REPORT DATA INPUTS */}
        <div className={`lg:col-span-7 space-y-6 ${activeTab === "edit" ? "block" : "hidden md:block"} no-print`}>
          
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-3xs p-6 space-y-6">
            
            {/* Report Metadata segment */}
            <div>
              <h3 className="text-sm font-black text-slate-450 uppercase tracking-widest border-b border-zinc-100 pb-2 mb-4">
                1. Report Configuration
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Report Title / Purpose *</label>
                  <input
                    type="text"
                    required
                    className="w-full text-xs font-extrabold border border-zinc-250 bg-zinc-50 rounded-lg px-3 py-2"
                    value={data.title}
                    onChange={(e) => setData({ ...data, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Report Number *</label>
                  <input
                    type="text"
                    className="w-full text-xs font-bold border border-zinc-250 bg-zinc-50 rounded-lg px-3 py-2"
                    value={data.reportNumber}
                    onChange={(e) => setData({ ...data, reportNumber: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Report issue Date *</label>
                  <input
                    type="date"
                    className="w-full text-xs font-semibold border border-zinc-250 bg-zinc-50 rounded-lg px-3 py-2"
                    value={data.reportDate}
                    onChange={(e) => setData({ ...data, reportDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Period Start</label>
                  <input
                    type="date"
                    className="w-full text-xs font-semibold border border-zinc-250 bg-zinc-50 rounded-lg px-3 py-2"
                    value={data.startDate}
                    onChange={(e) => setData({ ...data, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Period End</label>
                  <input
                    type="date"
                    className="w-full text-xs font-semibold border border-zinc-250 bg-zinc-50 rounded-lg px-3 py-2"
                    value={data.endDate}
                    onChange={(e) => setData({ ...data, endDate: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Submitter Info Grid */}
            <div>
              <h3 className="text-sm font-black text-slate-450 uppercase tracking-widest border-b border-zinc-100 pb-2 mb-4">
                2. Submitter (Employee / Contractor)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Legal Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Alex Mercer"
                    className={`w-full text-xs font-semibold border rounded-lg px-3 py-2 ${
                      errors["submitter.name"] ? "border-red-500 bg-red-50/20 ring-1 ring-red-200" : "border-zinc-250 bg-zinc-50"
                    }`}
                    value={data.submitter.name}
                    onChange={(e) => {
                      setData({ ...data, submitter: { ...data.submitter, name: e.target.value } });
                      if (errors["submitter.name"]) setErrors(prev => ({ ...prev, "submitter.name": "" }));
                    }}
                  />
                  {errors["submitter.name"] && (
                    <p className="text-[10px] font-bold text-red-500 mt-1">{errors["submitter.name"]}</p>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Email Coordinates</label>
                  <input
                    type="email"
                    placeholder="alex@brand.com"
                    className="w-full text-xs font-semibold border border-zinc-250 bg-zinc-50 rounded-lg px-3 py-2"
                    value={data.submitter.email}
                    onChange={(e) => setData({ ...data, submitter: { ...data.submitter, email: e.target.value } })}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Corporate Department / Team</label>
                  <input
                    type="text"
                    placeholder="e.g. Client Solutions Group"
                    className="w-full text-xs font-semibold border border-zinc-250 bg-zinc-50 rounded-lg px-3 py-2"
                    value={data.department}
                    onChange={(e) => setData({ ...data, department: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Parent Association or Target Client Coordinates */}
            <div>
              <h3 className="text-sm font-black text-slate-450 uppercase tracking-widest border-b border-zinc-100 pb-2 mb-4">
                3. Reimbursement entity (Company / Client)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Company / client Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Retail Corp"
                    className="w-full text-xs font-semibold border border-zinc-250 bg-zinc-50 rounded-lg px-3 py-2"
                    value={data.client.name}
                    onChange={(e) => setData({ ...data, client: { ...data.client, name: e.target.value } })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Point of Contact</label>
                  <input
                    type="text"
                    placeholder="Sarah Jenkins"
                    className="w-full text-xs font-semibold border border-zinc-250 bg-zinc-50 rounded-lg px-3 py-2"
                    value={data.client.contact}
                    onChange={(e) => setData({ ...data, client: { ...data.client, contact: e.target.value } })}
                  />
                </div>
              </div>
            </div>

            {/* Expense Itemization table */}
            <div>
              <div className="flex items-center justify-between border-b border-zinc-100 pb-2 mb-4">
                <h3 className="text-sm font-black text-slate-450 uppercase tracking-widest">
                  4. Purchase Itemization
                </h3>
                <button
                  type="button"
                  onClick={handleAddExpenseRow}
                  className="text-xs bg-slate-900 hover:bg-black text-white px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Purchase</span>
                </button>
              </div>

              <div className="space-y-4">
                {data.expenses.map((row, index) => (
                  <div key={row.id} className="p-4 bg-zinc-50 border border-zinc-200/60 rounded-xl space-y-3 relative">
                    <button
                      type="button"
                      onClick={() => handleRemoveExpenseRow(row.id)}
                      className="absolute right-2 top-2 text-zinc-400 hover:text-rose-600 transition p-1"
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[9px] font-black text-slate-405 uppercase tracking-wider mb-0.5">Date *</label>
                        <input
                          type="date"
                          className="w-full text-xs border border-zinc-250 bg-white rounded-lg px-2 py-1.5 focus:outline-none"
                          value={row.date}
                          onChange={(e) => handleExpenseRowChange(row.id, "date", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-405 uppercase tracking-wider mb-0.5">Merchant / Vendor *</label>
                        <input
                          type="text"
                          placeholder="Amazon, Shell etc"
                          className="w-full text-xs font-semibold border border-zinc-250 bg-white rounded-lg px-2.5 py-1.5 focus:outline-none"
                          value={row.merchant}
                          onChange={(e) => handleExpenseRowChange(row.id, "merchant", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-405 uppercase tracking-wider mb-0.5">expense Category</label>
                        <select
                          className="w-full text-xs font-bold border border-zinc-250 bg-white rounded-lg px-1.5 py-1.5 text-slate-805"
                          value={row.category}
                          onChange={(e) => handleExpenseRowChange(row.id, "category", e.target.value)}
                        >
                          <option value="Meals">Meals / Dinner</option>
                          <option value="Travel">Flights / Travel</option>
                          <option value="Lodging">Lodging / Hotel</option>
                          <option value="Office supplies">office Supplies</option>
                          <option value="Software">software Subscription</option>
                          <option value="Equipment">Hardware &amp; Gear</option>
                          <option value="Phone/internet">Phone / Wifi</option>
                          <option value="Client materials">Client Materials</option>
                          <option value="Other">Other Expenses</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-455 uppercase tracking-wider mb-0.5">Purchase Amount ($) *</label>
                        <input
                          type="number"
                          placeholder="0.00"
                          className="w-full text-xs font-bold border border-zinc-250 bg-white rounded-lg px-2.5 py-1.5"
                          value={row.amount}
                          onChange={(e) => handleExpenseRowChange(row.id, "amount", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
                      <div className="md:col-span-6">
                        <input
                          type="text"
                          placeholder="Additional detailed notes..."
                          className="w-full text-xs border border-zinc-250 bg-white rounded-lg px-2 py-1.5 focus:outline-none"
                          value={row.description}
                          onChange={(e) => handleExpenseRowChange(row.id, "description", e.target.value)}
                        />
                      </div>
                      <div className="md:col-span-6 flex flex-wrap gap-4 items-center justify-end text-[10px] font-bold text-zinc-550">
                        <label className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            className="w-3.5 h-3.5 text-slate-900 border-zinc-300 rounded"
                            checked={row.reimbursable}
                            onChange={(e) => handleExpenseRowChange(row.id, "reimbursable", e.target.checked)}
                          />
                          <span>Reimbursable</span>
                        </label>
                        <label className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            className="w-3.5 h-3.5 text-slate-900 border-zinc-300 rounded"
                            checked={row.billable}
                            onChange={(e) => handleExpenseRowChange(row.id, "billable", e.target.checked)}
                          />
                          <span>Bill Client</span>
                        </label>
                        <label className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            className="w-3.5 h-3.5 text-slate-900 border-zinc-300 rounded"
                            checked={row.receiptAttached}
                            onChange={(e) => handleExpenseRowChange(row.id, "receiptAttached", e.target.checked)}
                          />
                          <span>Receipt File</span>
                        </label>
                      </div>
                    </div>

                    {row.receiptAttached && (
                      <div className="bg-white/80 border border-dashed border-zinc-200 px-3 py-1.5 rounded-lg text-[10px] text-zinc-500 font-mono flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Paperclip className="w-3 h-3 text-zinc-400" />
                          <span>Receipt reference: {row.receiptName || "purchase_receipt_reference.jpg"}</span>
                        </span>
                        <input
                          type="text"
                          required
                          placeholder="Edit label"
                          className="px-2 py-0.5 border border-zinc-200 rounded text-[9px]"
                          value={row.receiptName || ""}
                          onChange={(e) => handleExpenseRowChange(row.id, "receiptName", e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Mileage Block entries */}
            <div>
              <div className="flex items-center justify-between border-b border-zinc-100 pb-2 mb-4">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-black text-slate-450 uppercase tracking-widest">
                    5. Driven Mileage Rows
                  </h3>
                  <span className="text-[10px] bg-zinc-100 text-zinc-550 border px-2 py-0.5 rounded-full font-mono font-bold">
                    $.67 / mi
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAddMileageRow}
                  className="text-xs bg-slate-900 hover:bg-black text-white px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Mileage</span>
                </button>
              </div>

              {data.mileageRows.length === 0 ? (
                <div className="text-center py-6 bg-zinc-50 border border-dashed rounded-xl text-xs text-zinc-400 font-medium">
                  No mileage records registered. Reconcile trip logs using Phase 2 mileage sheet.
                </div>
              ) : (
                <div className="space-y-3">
                  {data.mileageRows.map((mRow) => (
                    <div key={mRow.id} className="bg-zinc-50/60 border rounded-lg p-3 relative flex flex-col md:flex-row gap-3">
                      <button
                        type="button"
                        onClick={() => handleRemoveMileageRow(mRow.id)}
                        className="absolute right-2 top-2 text-zinc-400 hover:text-rose-600 transition p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="grow grid grid-cols-2 md:grid-cols-4 gap-2">
                        <div>
                          <label className="block text-[8px] font-black text-zinc-400 uppercase">Date</label>
                          <input
                            type="date"
                            className="w-full text-xs border rounded px-2 py-1 bg-white"
                            value={mRow.date}
                            onChange={(e) => handleMileageRowChange(mRow.id, "date", e.target.value)}
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[8px] font-black text-zinc-400 uppercase">Trip Purpose</label>
                          <input
                            type="text"
                            placeholder="e.g. Travel to CLT Airport terminal"
                            className="w-full text-xs border rounded px-2 py-1 bg-white font-medium"
                            value={mRow.purpose}
                            onChange={(e) => handleMileageRowChange(mRow.id, "purpose", e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] font-black text-zinc-400 uppercase">Driven Miles</label>
                          <input
                            type="number"
                            min="0"
                            className="w-full text-xs border rounded px-2 py-1 bg-white font-black"
                            value={mRow.miles}
                            onChange={(e) => handleMileageRowChange(mRow.id, "miles", e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Float Adjustment advance */}
            <div>
              <h3 className="text-sm font-black text-slate-450 uppercase tracking-widest border-b border-zinc-100 pb-2 mb-4">
                6. Corporate Advance Received
              </h3>
              <div className="max-w-xs">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Pre-Paid Advance ($)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  className="w-full text-xs font-bold border border-zinc-250 bg-zinc-50 rounded-lg px-3 py-2"
                  value={data.advanceReceived}
                  onChange={(e) => setData({ ...data, advanceReceived: Math.max(0, Number(e.target.value)) })}
                />
              </div>
            </div>

          </div>

          {/* Compliance Info Banner */}
          <div className="bg-sky-50 border border-sky-250 rounded-2xl p-4 flex gap-3 text-sky-850">
            <Info className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1 font-semibold leading-relaxed">
              <span className="font-extrabold block">Reimbursement Policy Warning</span>
              <p className="font-medium">
                This document structures operating write-offs under IRS general business expense rules. 
                Keep files of actual payment receipts secure in local storage directories.
              </p>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: PREVIEW ACTION TRIGGER BAR */}
        <div className={`lg:col-span-5 space-y-6 lg:sticky lg:top-20 leading-relaxed ${activeTab === "preview" ? "block font-sans" : "hidden md:block"}`}>
          
          <div className="bg-white rounded-2xl p-4 border border-zinc-200 shadow-3xs space-y-3 no-print">
            <div className="flex items-center justify-between text-[11px] text-zinc-500 font-bold border-b border-zinc-100 pb-2">
              <span>REPORT ACTIONS PANEL</span>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 text-[9px] uppercase font-black rounded-full">
                Ready to Print
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handlePrint}
                className="py-3 bg-slate-900 hover:bg-black text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition hover:-translate-y-0.5 shadow-3xs active:scale-98"
                type="button"
              >
                <Printer className="w-4 h-4" />
                <span>Download PDF</span>
              </button>
              <button
                onClick={handleExportCSV}
                className="py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-805 border border-zinc-250 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer"
                type="button"
              >
                <Download className="w-4 h-4 text-zinc-500" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Simulated Printed Letter Sheet Page */}
          <div className="relative group transition-all duration-200 border border-zinc-250 shadow-2xl rounded-2xl">
            <div className="p-8 bg-white min-h-[750px] font-sans text-slate-800" id="receipt-print-area">
              
              <div className="flex justify-between items-start border-b border-zinc-200 pb-4 mb-6">
                <div>
                  <span className="text-[10px] font-black text-blue-600 block uppercase tracking-wider">
                    EXPENSE RECONCILIATION STATEMENT
                  </span>
                  <h1 className="text-xl font-black text-slate-950 uppercase mt-0.5">
                    {data.title || "EXPENSE REPORT"}
                  </h1>
                  <span className="text-[10px] text-zinc-500 font-bold block font-mono mt-1">
                    Report Period: {data.startDate} to {data.endDate}
                  </span>
                </div>

                <div className="text-right font-mono">
                  <div className="inline-block px-2.5 py-0.5 rounded bg-zinc-100 border border-zinc-200 font-sans font-bold text-[10px] text-slate-900 uppercase">
                    {data.reportNumber}
                  </div>
                  <span className="block text-[10px] text-zinc-400 mt-2 font-bold">Issue Date: {data.reportDate}</span>
                </div>
              </div>

              {/* Submitter & Client columns */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="bg-zinc-50/60 p-3 rounded-lg border border-zinc-100 text-xs">
                  <span className="text-[8px] uppercase tracking-wider text-zinc-400 font-extrabold block mb-0.5">Submitted By</span>
                  <span className="font-extrabold text-slate-900 block">{data.submitter.name || "------------------"}</span>
                  {data.department && <span className="text-[10px] text-zinc-500 font-bold block">Dept: {data.department}</span>}
                  {data.submitter.email && <span className="block font-mono text-zinc-400 text-[10px] pt-1">{data.submitter.email}</span>}
                </div>

                <div className="bg-zinc-50/60 p-3 rounded-lg border border-zinc-100 text-xs">
                  <span className="text-[8px] uppercase tracking-wider text-zinc-400 font-extrabold block mb-0.5">Assigned Entity</span>
                  <span className="font-extrabold text-slate-900 block">{data.client.name || "------------------"}</span>
                  {data.client.contact && <span className="text-[10px] text-zinc-500 font-bold block">Contact: {data.client.contact}</span>}
                  {data.projectName && (
                    <span className="text-[10px] text-blue-650 font-bold block pt-1 font-mono">
                      Project: {data.projectName}
                    </span>
                  )}
                </div>
              </div>

              {/* Purchases table */}
              <div className="border border-zinc-200 rounded-xl overflow-hidden mb-6 text-xs">
                <table className="w-full text-left">
                  <thead className="bg-zinc-50 border-b border-zinc-250 text-[10px] font-black uppercase text-zinc-405">
                    <tr>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Merchant</th>
                      <th className="py-2 px-3">Category</th>
                      <th className="py-2 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.expenses.map((row, idx) => (
                      <tr key={row.id || idx} className="border-b last:border-0 border-zinc-100">
                        <td className="py-3 px-3 font-mono font-medium text-zinc-500">{row.date}</td>
                        <td className="py-3 px-3 font-bold text-slate-900">
                          {row.merchant || "Vendor Purchase"}
                          {row.receiptAttached && (
                            <span className="block text-[8px] text-emerald-600 font-mono font-bold pt-0.5 uppercase tracking-wide">
                              ✓ Receipt Attached
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-100 text-zinc-650 font-bold">
                            {row.category}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                          ${Number(row.amount || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mileage Table (if entries present) */}
              {data.mileageRows.length > 0 && (
                <div className="border border-zinc-200 rounded-xl overflow-hidden mb-6 text-xs">
                  <div className="bg-zinc-100/50 px-3 py-2 border-b border-zinc-250 text-[10px] font-black text-slate-900 tracking-wider uppercase">
                    Driven Log Mileage write-offs
                  </div>
                  <table className="w-full text-left">
                    <thead className="bg-zinc-50/70 text-[9px] font-black text-zinc-400 uppercase">
                      <tr className="border-b border-zinc-200">
                        <th className="py-1.5 px-3">Date</th>
                        <th className="py-1.5 px-3">Purpose</th>
                        <th className="py-1.5 px-3 text-center">Miles</th>
                        <th className="py-1.5 px-3 text-right">Credit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.mileageRows.map((mRow, idx) => (
                        <tr key={mRow.id || idx} className="border-b last:border-b-0 border-zinc-100">
                          <td className="py-2 px-3 font-mono text-zinc-500">{mRow.date}</td>
                          <td className="py-2 px-3 font-semibold text-slate-800 leading-snug">{mRow.purpose}</td>
                          <td className="py-2 px-3 text-center font-bold text-zinc-505 font-mono">{mRow.miles} mi</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">${mRow.amount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Summary Totals reconciliations */}
              <div className="grid grid-cols-12 gap-4 pt-2">
                
                {/* Category breakdown summaries block */}
                <div className="col-span-6 space-y-1">
                  <span className="text-[8px] uppercase tracking-widest text-zinc-400 font-extrabold block mb-1">Expenses Sub-Category Groupings</span>
                  {Object.entries(totals.categoryGroups).map(([cat, val]) => (
                    <div key={cat} className="flex justify-between text-[10px] font-bold text-zinc-500 max-w-xs">
                      <span>{cat}:</span>
                      <span className="font-mono">${val.toFixed(2)}</span>
                    </div>
                  ))}
                  {totals.totalMiles > 0 && (
                    <div className="flex justify-between text-[10px] font-bold text-emerald-600 max-w-xs pt-1 border-t border-dashed">
                      <span>Mileage Log Credit:</span>
                      <span className="font-mono">${totals.totalMileageAmount.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                {/* Subtotals Block */}
                <div className="col-span-6 text-right space-y-2 text-xs font-semibold">
                  <div className="flex justify-between font-mono">
                    <span className="text-zinc-500">Receipts Total:</span>
                    <span className="text-slate-800">${totals.totalExpenses.toFixed(2)}</span>
                  </div>
                  {totals.totalMiles > 0 && (
                    <div className="flex justify-between font-mono">
                      <span className="text-zinc-500">Mileage Reconciled:</span>
                      <span className="text-slate-800">${totals.totalMileageAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {data.advanceReceived > 0 && (
                    <div className="flex justify-between font-mono text-rose-600">
                      <span>Advance pre-paid:</span>
                      <span>-${Number(data.advanceReceived).toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center border-t border-zinc-200 pt-2.5 mt-2">
                    <span className="text-xs uppercase font-black text-slate-905">Reimbursement Due</span>
                    <span className="text-lg font-black text-slate-950 font-mono">
                      ${totals.netAmountDue.toFixed(2)}
                    </span>
                  </div>
                </div>

              </div>

              {/* Approval / Auditor Signature lines */}
              <div className="grid grid-cols-2 gap-8 mt-12 pt-8 border-t border-zinc-100 text-center leading-normal">
                <div className="space-y-4">
                  <div className="border-b border-zinc-300 h-8" />
                  <span className="block text-[9px] uppercase font-bold text-zinc-400">Submitted By (Signature)</span>
                </div>
                <div className="space-y-4">
                  <div className="border-b border-zinc-300 h-8" />
                  <span className="block text-[9px] uppercase font-bold text-zinc-400">Approved &amp; Reviewed By</span>
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>

      {/* SEO Faq block */}
      <div className="mt-16 border-t border-zinc-200/80 pt-12 max-w-4xl mx-auto space-y-6 no-print" id="expense-seo-faq">
        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight text-center">
          Frequently Answered Corporate Questions
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-zinc-600 leading-relaxed font-semibold">
          <div className="space-y-1">
            <h4 className="font-extrabold text-slate-900">How do I export my expenses summary for tax write-offs later?</h4>
            <p className="font-medium">
              Simply click the "Export CSV" option to serialize all itemization metrics into standard xls sheets, or copy summaries into tax planner cards.
            </p>
          </div>
          <div className="space-y-1">
            <h4 className="font-extrabold text-slate-900">How does Pre-Paid Advance calculation behave?</h4>
            <p className="font-medium">
              If your corporate office already wired cash for travel flights, keying the advance will deduct it clearly from final balances due.
            </p>
          </div>
          <div className="space-y-1">
            <h4 className="font-extrabold text-slate-900">Are receipts files uploaded onto any cloud database?</h4>
            <p className="font-medium">
              No, absolutely none. Your assets remain local under immediate browser memory.
            </p>
          </div>
          <div className="space-y-1">
            <h4 className="font-extrabold text-slate-900">Is this software compliant with IRS publication guidelines?</h4>
            <p className="font-medium">
              It helps contractors itemize operational metrics clearly. Since it represents an organizer, always consult certified bookkeepers.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
