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
  Mail,
  UserCheck,
  Building,
  Briefcase
} from "lucide-react";
import { DataBridge, DataBridgeKeys, VendorProfile } from "../../lib/shared/dataBridge";

const ENTITY_TYPES = ["Individual", "LLC", "Partnership", "Corporation", "Unknown"];
const W9_STATUS_OPTIONS = ["Not Requested", "Requested", "Received", "Needs Review", "Not Applicable"];

const DEFAULT_VENDORS: VendorProfile[] = [
  {
    id: "vendor-1",
    legalName: "Devon Lane",
    businessName: "Devon Dev LLC",
    email: "devon@lanestudio.com",
    phone: "+1 (555) 441-2820",
    addressLine1: "192 Silver Maple Ave, Seattle, WA 98101",
    entityType: "LLC",
    w9Status: "Received",
    notes: "Contract Ruby-on-Rails setup milestone developer."
  }
];

export default function W9RequestPage({ onTrackClick }: { onTrackClick: (item: string) => void }) {
  const [vendors, setVendors] = useState<VendorProfile[]>(() => {
    return DataBridge.get<VendorProfile[]>(DataBridgeKeys.W9_VENDORS, DEFAULT_VENDORS);
  });
  
  const [selectedVendorId, setSelectedVendorId] = useState<string>("vendor-1");
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form states for creating/editing vendor
  const [formName, setFormName] = useState("");
  const [formBiz, setFormBiz] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formEntity, setFormEntity] = useState<any>("Individual");
  const [formStatus, setFormStatus] = useState<any>("Not Requested");
  const [formNotes, setFormNotes] = useState("");

  const [activeTab, setActiveTab] = useState<"onboarding" | "email">("onboarding");

  // Sync state to memory
  useEffect(() => {
    DataBridge.saveW9Vendors(vendors);
  }, [vendors]);

  // Load details to editor upon selection
  const activeVendor = vendors.find(v => v.id === selectedVendorId) || vendors[0];

  useEffect(() => {
    if (activeVendor) {
      setFormName(activeVendor.legalName);
      setFormBiz(activeVendor.businessName);
      setFormEmail(activeVendor.email);
      setFormPhone(activeVendor.phone);
      setFormAddress(activeVendor.addressLine1);
      setFormEntity(activeVendor.entityType);
      setFormStatus(activeVendor.w9Status);
      setFormNotes(activeVendor.notes);
    }
  }, [selectedVendorId, activeVendor]);

  const handleUpdateVendorDetail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setErrors({ formName: "Contractor Legal Name is required to formulate profiles." });
      return;
    }
    setErrors({});
    
    const updated = vendors.map(v => {
      if (v.id === selectedVendorId) {
        return {
          ...v,
          legalName: formName,
          businessName: formBiz,
          email: formEmail,
          phone: formPhone,
          addressLine1: formAddress,
          entityType: formEntity,
          w9Status: formStatus,
          notes: formNotes
        };
      }
      return v;
    });

    setVendors(updated);
    alert("Contractor profile parameters updated!");
    onTrackClick("w9_vendor_updated");
  };

  const handleCreateNewVendor = () => {
    const fresh: VendorProfile = {
      id: `vendor-${Date.now()}`,
      legalName: "New Contractor Partner",
      businessName: "",
      email: "",
      phone: "",
      addressLine1: "",
      entityType: "Individual",
      w9Status: "Not Requested",
      notes: ""
    };

    setVendors([...vendors, fresh]);
    setSelectedVendorId(fresh.id);
    onTrackClick("w9_vendor_created");
  };

  const handleRemoveVendor = (id: string) => {
    if (vendors.length <= 1) {
      alert("Keep at least one contractor listing to maintain profile alignment.");
      return;
    }
    if (confirm("Are you sure you want to remove this contractor from onboarding tracks?")) {
      const remaining = vendors.filter(v => v.id !== id);
      setVendors(remaining);
      setSelectedVendorId(remaining[0].id);
      onTrackClick("w9_vendor_removed");
    }
  };

  // Generate compliance W9 request email blueprint
  const getEmailSubject = () => {
    return `W-9 request needed for onboarding verification - ${activeVendor?.businessName || "Contractor Milestone Partners"}`;
  };

  const getEmailBody = () => {
    return `Hello ${activeVendor?.legalName || "Contractor Partner"},

We hope you are doing well.

To comply with US Internal Revenue Service regulations and complete your vendor account onboarding file setup, we require a signed IRS Form W-9 (Request for Taxpayer Identification Number and Certification).

Please find instructions below:
1. Obtain/download a copy of Form W-9 from the official IRS website (irs.gov/pub/irs-pdf/fw9.pdf).
2. Complete all Sections in Part I and Part II (including Legal Name, Tax Classification LLV/Individual coordinates, EIN/SSN Number, and an authentic Signature).
3. Safely email a secure PDF copy back to us at your earliest convenience prior to the close of current milestone cycles.

Note: All payments above $600 with independent contractors in our tax year require active W-9 records to process subsequent annual Form 1099-NEC vouchers correctly.

Let us know if you have any questions regarding these compliance items.

Best regards,
Onboarding & Verification Solutions
PaperworkKit Toolkit Suite`;
  };

  const handleCopyEmailText = () => {
    const copyString = `Subject: ${getEmailSubject()}\n\n${getEmailBody()}`;
    navigator.clipboard.writeText(copyString);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2500);
    onTrackClick("w9_email_copied_clicked");
  };

  return (
    <div className="grow w-full font-sans max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" id="w9-onboarding-wrapper">
      
      {/* Page Header banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b border-zinc-200/60 pb-6">
        <div>
          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-black uppercase tracking-wider block w-fit mb-1">
            IRS Form 1099 Vendor Verification
          </span>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase">
            W-9 Request &amp; Onboarding Tracker
          </h2>
          <p className="text-zinc-500 font-medium text-xs md:text-sm">
            Maintain compliance folders for self-employed subcontractor entities, track verification status states, and request records.
          </p>
        </div>

        <div>
          <button
            onClick={handleCreateNewVendor}
            className="px-4 py-2.5 bg-slate-900 hover:bg-black text-white font-black text-xs rounded-xl flex items-center gap-1.5 transition active:scale-98 cursor-pointer shadow-3xs"
            type="button"
          >
            <Plus className="w-4 h-4" />
            <span>Onboard Contractor</span>
          </button>
        </div>
      </div>

      {/* Main split panels layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* CONTRACTOR LIST SIDEBAR ROW */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-3xs p-4 space-y-3">
            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1 font-sans">Active Contractor Profiles</span>
            
            <div className="space-y-1.5 max-h-[350px] overflow-y-auto">
              {vendors.map((vend) => (
                <div
                  key={vend.id}
                  onClick={() => setSelectedVendorId(vend.id)}
                  className={`p-3 rounded-xl border transition-all duration-150 cursor-pointer flex justify-between items-center ${selectedVendorId === vend.id ? "bg-slate-50 border-slate-900/60" : "bg-white border-zinc-200 hover:bg-zinc-50/50"}`}
                >
                  <div className="text-xs">
                    <span className="font-extrabold text-slate-950 block">{vend.legalName}</span>
                    {vend.businessName && <span className="text-[10px] text-zinc-450 block font-semibold">{vend.businessName}</span>}
                  </div>

                  <div className="flex gap-2 items-center shrink-0">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wide border ${
                      vend.w9Status === "Received" ? "bg-emerald-50 text-emerald-700 border-emerald-250" :
                      vend.w9Status === "Requested" ? "bg-amber-50 text-amber-700 border-amber-250" :
                      "bg-zinc-50 text-zinc-450 border-zinc-200"
                    }`}>
                      {vend.w9Status}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveVendor(vend.id);
                      }}
                      className="text-zinc-350 hover:text-rose-600 transition p-1"
                      title="Remove profile"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* EDITOR OR COMPLIANCE EMAIL GENERATION */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Tab sub headers */}
          <div className="flex bg-zinc-150 p-1 rounded-xl border border-zinc-200" id="w9-tabs">
            <button
              onClick={() => setActiveTab("onboarding")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${activeTab === "onboarding" ? "bg-white text-slate-950 shadow-xs" : "text-zinc-500"}`}
              type="button"
            >
              <UserCheck className="w-4 h-4" />
              <span>1. Formulate Profile Metadata</span>
            </button>
            <button
              onClick={() => setActiveTab("email")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${activeTab === "email" ? "bg-white text-slate-950 shadow-xs" : "text-zinc-500"}`}
              type="button"
            >
              <Mail className="w-4 h-4" />
              <span>2. Copy W-9 compliance request Email</span>
            </button>
          </div>

          {activeTab === "onboarding" ? (
            <form onSubmit={handleUpdateVendorDetail} className="bg-white rounded-2xl border p-6 space-y-4 shadow-3xs">
              <h3 className="text-xs font-black text-slate-450 uppercase tracking-widest border-b pb-2">
                Verification credentials formulation
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Contractor Legal Name *</label>
                  <input
                    type="text"
                    required
                    className={`w-full text-xs font-bold border rounded-lg px-3 py-2 ${
                      errors.formName ? "border-red-500 bg-red-50/20 ring-1 ring-red-200" : "bg-zinc-50/50"
                    }`}
                    value={formName}
                    onChange={(e) => {
                      setFormName(e.target.value);
                      if (errors.formName) setErrors({});
                    }}
                  />
                  {errors.formName ? (
                    <p className="text-[10px] font-bold text-red-500 mt-1">{errors.formName}</p>
                  ) : (
                    <span className="text-[9px] text-zinc-400 block mt-0.5">As registered on their IRS filing documents.</span>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Business DBA Name (if matching)</label>
                  <input
                    type="text"
                    className="w-full text-xs font-semibold border rounded-lg px-3 py-2 bg-zinc-50/50"
                    value={formBiz}
                    onChange={(e) => setFormBiz(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Email Coordinates</label>
                  <input
                    type="email"
                    className="w-full text-xs font-medium border rounded-lg px-3 py-2 bg-zinc-50/50"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Support Phone</label>
                  <input
                    type="text"
                    className="w-full text-xs border rounded-lg px-3 py-2 bg-zinc-50/50"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Street address</label>
                  <input
                    type="text"
                    className="w-full text-xs font-semibold border rounded-lg px-3 py-2 bg-zinc-50/50"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Tax Classification Entity</label>
                  <select
                    className="w-full text-xs font-bold border bg-white rounded-lg px-2 py-2 text-slate-800"
                    value={formEntity}
                    onChange={(e) => setFormEntity(e.target.value as any)}
                  >
                    {ENTITY_TYPES.map(ent => (
                      <option key={ent} value={ent}>{ent} / Sole Proprietor</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">W-9 Request compliance status</label>
                  <select
                    className="w-full text-xs font-black border bg-white rounded-lg px-2 py-2 text-slate-850"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                  >
                    {W9_STATUS_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Notes / Project association description</label>
                  <input
                    type="text"
                    className="w-full text-xs border rounded-lg px-3 py-2 bg-zinc-50/50"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-3 border-t text-right">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white font-extrabold text-xs rounded-xl shadow-3xs cursor-pointer transition active:scale-98"
                >
                  Save Profile updates
                </button>
              </div>
            </form>
          ) : (
            <div className="bg-white rounded-2xl border p-6 space-y-4 shadow-3xs">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-xs font-black text-slate-450 uppercase tracking-widest leading-none">
                  Compliance email template generator
                </h3>
                <button
                  onClick={handleCopyEmailText}
                  className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 border border-zinc-250 text-zinc-800 font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer select-none"
                  type="button"
                >
                  {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-600 animate-pulse" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedEmail ? "CopiedSubjectBody!" : "Copy Subject + Body"}</span>
                </button>
              </div>

              {/* Subject block */}
              <div className="bg-zinc-50 p-3 rounded-lg border text-xs">
                <span className="block text-[9px] text-zinc-400 font-black uppercase mb-1">Email Subject Line</span>
                <p className="font-extrabold text-slate-900 font-mono select-all">
                  {getEmailSubject()}
                </p>
              </div>

              {/* Body block */}
              <div className="bg-zinc-50 p-4 rounded-lg border text-xs leading-relaxed font-semibold">
                <span className="block text-[9px] text-zinc-400 font-black uppercase mb-1">Email Body Description</span>
                <p className="whitespace-pre-line text-slate-705 font-mono select-all">
                  {getEmailBody()}
                </p>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
