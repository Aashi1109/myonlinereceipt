/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  FileText,
  Clock,
  Trash2,
  RefreshCw,
  Printer,
  ChevronRight,
  Sparkles,
  Award,
  BookOpen,
  Info,
  Check,
  CheckCircle,
  Eye,
  PenTool,
  AlertCircle,
  X,
  FileDown,
  Settings,
  Plus,
  ShieldAlert,
  Grid
} from "lucide-react";
import { InvoiceData } from "./types";
import {
  getInitialBlankInvoice,
  getSampleInvoice,
} from "./utils/sampleData";
import { calculateInvoiceTotals, formatCurrency } from "./utils/calculations";
import InvoiceForm from "./components/InvoiceForm";
import FAQSection from "./components/FAQSection";
import RelatedTools from "./components/RelatedTools";
import SEOContent from "./components/SEOContent";

// Import PaperworkKit 6 Toolkit Generator Modules
import ReceiptGeneratorPage from "./components/receipt/ReceiptGeneratorPage";
import ExpenseReportPage from "./components/expense/ExpenseReportPage";
import MileageLogPage from "./components/mileage/MileageLogPage";
import QuarterlyTaxEstimatorPage from "./components/tax/QuarterlyTaxEstimatorPage";
import W9RequestPage from "./components/w9/W9RequestPage";
import NecTrackerPage from "./components/nec1099/NecTrackerPage";

// Template system modules
import { TemplateService } from "./lib/templates/templateService";
import { InvoiceTemplate, LayoutFamily, TemplateCategory } from "./lib/templates/templateTypes";
import TemplateSelector from "./components/TemplateSelector";
import InvoicePreviewRenderer from "./components/InvoicePreviewRenderer";
import TemplateListTable from "./components/admin/TemplateListTable";
import TemplateEditor from "./components/admin/TemplateEditor";
import AdminAuthGate from "./components/admin/AdminAuthGate";
import FullPagePreviewer from "./components/admin/FullPagePreviewer";

// Mock analytics hook
function trackEvent(eventName: string, payload: any = {}) {
  console.log(`[Analytics Event] "${eventName}" tracked:`, payload);
}

export default function App() {
  const [invoiceData, setInvoiceData] = useState<InvoiceData>(getInitialBlankInvoice());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<"edit" | "preview">("edit");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle">("idle");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal / Confirm overlay gates
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showSampleConfirm, setShowSampleConfirm] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeModuleName, setUpgradeModuleName] = useState("");

  const formSectionRef = useRef<HTMLDivElement>(null);

  // -------------------------------------------------------------
  // TEMPLATE SYSTEM & SPA ROUTING STATE
  // -------------------------------------------------------------
  const [route, setRoute] = useState<string>(() => window.location.hash || "#invoice-generator");
  const [isAdminAuthorized, setIsAdminAuthorized] = useState<boolean>(() => {
    return sessionStorage.getItem("paperwork_kit_admin_authorized") === "true";
  });
  
  // Public selected template configuration
  const [selectedTemplate, setSelectedTemplate] = useState<InvoiceTemplate>(() => {
    return TemplateService.getDefaultTemplate();
  });

  // Template creation step wizard
  const [showNewWizard, setShowNewWizard] = useState(false);
  const [newTplName, setNewTplName] = useState("");
  const [newTplCategory, setNewTplCategory] = useState<TemplateCategory>("classic");
  const [newTplLayout, setNewTplLayout] = useState<LayoutFamily>("classic");

  // Sync hash changes
  useEffect(() => {
    const handleHashChange = () => {
      setRoute(window.location.hash || "#invoice-generator");
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Scroll to top smoothly on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [route]);

  // Sync default template upon public page visits
  useEffect(() => {
    if (route === "#invoice-generator" || !route || !route.startsWith("#admin")) {
      const def = TemplateService.getDefaultTemplate();
      setSelectedTemplate(def);
    }
  }, [route]);

  // -------------------------------------------------------------
  // PERSISTENCE LOCAL STORAGE
  // -------------------------------------------------------------
  useEffect(() => {
    trackEvent("invoice_generator_loaded", { time: new Date().toISOString() });
    
    try {
      const saved = localStorage.getItem("paperwork_kit_invoice_draft");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.business && parsed.client) {
          setInvoiceData(parsed);
          showToast("Previous draft restored from your browser logs");
        } else {
          setShowThemeSelector(true);
        }
      } else {
        setShowThemeSelector(true);
      }
    } catch (e) {
      console.error("Failed to load invoice draft from localStorage", e);
      setShowThemeSelector(true);
    }
  }, []);

  // Sync draft back to LocalStorage on changes
  useEffect(() => {
    if (!invoiceData) return;
    setSaveStatus("saving");
    
    const handler = setTimeout(() => {
      try {
        localStorage.setItem("paperwork_kit_invoice_draft", JSON.stringify(invoiceData));
        setSaveStatus("saved");
      } catch (err) {
        console.error("Storage error:", err);
      }
    }, 400);

    return () => clearTimeout(handler);
  }, [invoiceData]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // Auto scroll down to form
  const handleStartInvoice = () => {
    formSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Population routines with confirmation dialogs
  const triggerLoadSampleConfirm = () => {
    setShowSampleConfirm(true);
  };

  const handleLoadSample = () => {
    const sample = getSampleInvoice();
    setInvoiceData(sample);
    setErrors({});
    setShowSampleConfirm(false);
    trackEvent("sample_invoice_loaded");
    showToast("Blue Ridge Web Studio demo loaded. Ready to customize!");
  };

  const triggerClearDraftConfirm = () => {
    setShowClearConfirm(true);
  };

  const handleClearDraft = () => {
    const blank = getInitialBlankInvoice();
    setInvoiceData(blank);
    setErrors({});
    setShowClearConfirm(false);
    localStorage.removeItem("paperwork_kit_invoice_draft");
    trackEvent("invoice_draft_cleared");
    showToast("Invoice board cleared. Storage reset successfully.");
    setShowThemeSelector(true);
  };

  // Upgrade triggers for Monetization Access
  const triggerUpgradeModal = (itemName: string) => {
    setUpgradeModuleName(itemName);
    setShowUpgradeModal(true);
    trackEvent("upgrade_prompt_clicked", { item: itemName });
  };

  // Perform full visual validation rules checks before triggering outputs
  const validateInvoice = (): boolean => {
    const newErrors: Record<string, string> = {};

    // 1. Seller business validation
    if (!invoiceData.business.name.trim()) {
      newErrors["business.name"] = "Your Business Name is required to formulate the seller heading.";
    }
    if (invoiceData.business.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invoiceData.business.email)) {
      newErrors["business.email"] = "Please supply a valid business email format.";
    }

    // 2. Client validation
    if (!invoiceData.client.name.trim()) {
      newErrors["client.name"] = "Client Name is required for core billing attributes.";
    }
    if (invoiceData.client.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invoiceData.client.email)) {
      newErrors["client.email"] = "Please supply a valid email format for clients.";
    }

    // 3. Invoice meta verification
    if (!invoiceData.invoice.invoiceNumber.trim()) {
      newErrors["invoice.invoiceNumber"] = "Invoice Number is required for legal tracking logs.";
    }
    if (!invoiceData.invoice.invoiceDate) {
      newErrors["invoice.invoiceDate"] = "Invoice issue Date cannot be left empty.";
    }
    if (!invoiceData.invoice.dueDate) {
      newErrors["invoice.dueDate"] = "Invoice Due Date cannot be left empty.";
    }

    // Warn if due date occurs logically earlier than issue date
    if (invoiceData.invoice.invoiceDate && invoiceData.invoice.dueDate) {
      const issue = new Date(invoiceData.invoice.invoiceDate);
      const due = new Date(invoiceData.invoice.dueDate);
      if (due < issue) {
        newErrors["invoice.dueDate"] = "Warning: The payment due date occurs earlier than the invoice issue date.";
      }
    }

    // 4. Validate lines
    if (!invoiceData.lineItems || invoiceData.lineItems.length === 0) {
      newErrors["lineItems"] = "Provide at least one individual service or item row.";
    } else {
      invoiceData.lineItems.forEach((item, index) => {
        if (!item.description.trim()) {
          newErrors[`lineItems[${index}].description`] = "Description cannot be blank.";
        }
        if (item.quantity === "" as any || Number(item.quantity) < 0) {
          newErrors[`lineItems[${index}].quantity`] = "Quantity must be 0 or larger.";
        }
        if (item.unitPrice === "" as any || Number(item.unitPrice) < 0) {
          newErrors[`lineItems[${index}].unitPrice`] = "Rate must be 0 or larger.";
        }
      });
    }

    setErrors(newErrors);

    // If there are errors, scroll to the form section or notify
    const keyCount = Object.keys(newErrors).length;
    if (keyCount > 0) {
      showToast(`Please resolve ${keyCount} validation warning(s) before exporting.`);
      formSectionRef.current?.scrollIntoView({ behavior: "smooth" });
      return false;
    }

    return true;
  };

  // Core programmatic outputs
  const handlePrint = () => {
    trackEvent("invoice_print_clicked");
    if (validateInvoice()) {
      window.print();
    }
  };

  const handleDownloadPDF = () => {
    trackEvent("invoice_pdf_downloaded", {
      invoiceNumber: invoiceData.invoice.invoiceNumber,
      client: invoiceData.client.name,
    });

    if (validateInvoice()) {
      window.print();
    }
  };

  // Render Administrative View Router helper
  const renderWorkspaceLayout = () => {
    if (route.startsWith("#admin/templates/edit/")) {
      const editId = route.replace("#admin/templates/edit/", "");
      return (
        <TemplateEditor
          templateId={editId}
          onBack={() => {
            setRoute("#admin/templates");
            window.location.hash = "#admin/templates";
          }}
          showToast={showToast}
        />
      );
    }

    if (route.startsWith("#admin/templates/preview/")) {
      const previewId = route.replace("#admin/templates/preview/", "");
      return (
        <FullPagePreviewer
          templateId={previewId}
          onBack={() => {
            setRoute("#admin/templates");
            window.location.hash = "#admin/templates";
          }}
        />
      );
    }

    return (
      <TemplateListTable
        onEdit={(id) => {
          setRoute(`#admin/templates/edit/${id}`);
          window.location.hash = `#admin/templates/edit/${id}`;
        }}
        onPreview={(id) => {
          setRoute(`#admin/templates/preview/${id}`);
          window.location.hash = `#admin/templates/preview/${id}`;
        }}
        onCreateNew={() => setShowNewWizard(true)}
        showToast={showToast}
      />
    );
  };

  // Wizard New submission action
  const handleCreateNewTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTplName.trim()) {
      showToast("Theme Name cannot be empty.");
      return;
    }

    try {
      const defaultTpl = TemplateService.getDefaultTemplate();
      const created = TemplateService.createTemplate({
        name: newTplName,
        slug: newTplName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
        description: `Bespoke PaperworkKit small business template styled under category ${newTplCategory}.`,
        category: newTplCategory,
        layoutFamily: newTplLayout,
        version: 1,
        status: "draft",
        isDefault: false,
        documentType: "invoice",
        config: JSON.parse(JSON.stringify(defaultTpl.config)),
      });

      setShowNewWizard(false);
      setNewTplName("");
      setRoute(`#admin/templates/edit/${created.id}`);
      window.location.hash = `#admin/templates/edit/${created.id}`;
      showToast(`Bespoke design "${created.name}" created! Customise properties.`);
    } catch (err: any) {
      showToast(`Slug Conflict: ${err.message}`);
    }
  };

  // -------------------------------------------------------------
  // RENDER SELECTIONS
  // -------------------------------------------------------------
  const showAdminGate = route.startsWith("#admin") && !isAdminAuthorized;
  const showAdminInterface = route.startsWith("#admin") && isAdminAuthorized;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between selection:bg-slate-950 selection:text-white" id="app-root">
      
      {/* 0. ROOT ALERTS FLOAT TOASTS */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-slate-900/90 backdrop-blur-md text-white border border-slate-800/80 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 z-55 animate-slide-in text-xs font-semibold no-print max-w-sm">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. SEAMLESS ADMIN PASSWORD CREDENTIAL CHECKER */}
      {showAdminGate && (
        <AdminAuthGate
          onSuccess={() => setIsAdminAuthorized(true)}
          onCancel={() => {
            setRoute("#invoice-generator");
            window.location.hash = "#invoice-generator";
          }}
        />
      )}

      {/* ==============================================
          ROUTE MUX: ADMINISTRATIVE WORKSPACE VS PUBLIC GENERATOR
          ============================================== */}

      {showAdminInterface ? (
        <div className="min-h-screen flex flex-col flex-1">
          {renderWorkspaceLayout()}
        </div>
      ) : (
        <>
          {/* HEADER / LOGO BAR */}
          <header className="bg-white border-b border-slate-205 sticky top-0 z-40 no-print font-sans" id="app-header-nav">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
              <div className="flex items-center gap-2 select-none">
                <a href="#invoice-generator" className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-xs">
                    PK
                  </div>
                  <span className="font-extrabold text-slate-900 text-lg tracking-tight">
                    Paperwork<span className="text-blue-600">Kit</span>
                  </span>
                </a>
              </div>

              <nav className="hidden lg:flex items-center gap-5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <a 
                  href="#invoice-generator" 
                  className={`py-1 cursor-pointer transition-all ${
                    route === "#invoice-generator" || route === ""
                      ? "text-blue-600 border-b-2 border-blue-600 font-extrabold" 
                      : "hover:text-slate-950"
                  }`}
                >
                  Invoices
                </a>
                <a 
                  href="#receipt-generator" 
                  className={`py-1 cursor-pointer transition-all ${
                    route === "#receipt-generator" 
                      ? "text-blue-600 border-b-2 border-blue-600 font-extrabold" 
                      : "hover:text-slate-950"
                  }`}
                >
                  Receipts
                </a>
                <a 
                  href="#expense-report-generator" 
                  className={`py-1 cursor-pointer transition-all ${
                    route === "#expense-report-generator" 
                      ? "text-blue-600 border-b-2 border-blue-600 font-extrabold" 
                      : "hover:text-slate-950"
                  }`}
                >
                  Expenses
                </a>
                <a 
                  href="#mileage-log-generator" 
                  className={`py-1 cursor-pointer transition-all ${
                    route === "#mileage-log-generator" 
                      ? "text-blue-600 border-b-2 border-blue-600 font-extrabold" 
                      : "hover:text-slate-950"
                  }`}
                >
                  Mileage Log
                </a>
                <a 
                  href="#quarterly-tax-estimator" 
                  className={`py-1 cursor-pointer transition-all ${
                    route === "#quarterly-tax-estimator" 
                      ? "text-blue-600 border-b-2 border-blue-600 font-extrabold" 
                      : "hover:text-slate-950"
                  }`}
                >
                  Estimator
                </a>
                <a 
                  href="#w9-request-template" 
                  className={`py-1 cursor-pointer transition-all ${
                    route === "#w9-request-template" 
                      ? "text-blue-600 border-b-2 border-blue-600 font-extrabold" 
                      : "hover:text-slate-950"
                  }`}
                >
                  W-9 Request
                </a>
                <a 
                  href="#1099-nec-tracker" 
                  className={`py-1 cursor-pointer transition-all ${
                    route === "#1099-nec-tracker" 
                      ? "text-blue-600 border-b-2 border-blue-600 font-extrabold" 
                      : "hover:text-slate-950"
                  }`}
                >
                  Tracker 1099
                </a>
                <a 
                  href="#admin/templates" 
                  className={`py-1 cursor-pointer transition-all flex items-center gap-1 ${
                    route.startsWith("#admin") 
                      ? "text-blue-600 border-b-2 border-blue-600 font-extrabold" 
                      : "hover:text-slate-950"
                  }`}
                >
                  <Settings className="w-3 h-3 text-blue-600 shrink-0" />
                  <span>Themes</span>
                </a>
              </nav>

              <div className="flex items-center gap-2">
                <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] text-slate-400 font-mono font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {saveStatus === "saving" ? "Saving..." : "Draft saved in browser"}
                  </span>
                </span>
                <button
                  onClick={triggerClearDraftConfirm}
                  type="button"
                  className="text-xs font-bold text-rose-600 hover:text-rose-950 bg-rose-50 hover:bg-rose-100/60 border border-rose-200/50 px-3 py-1.5 rounded-lg transition duration-150 cursor-pointer"
                  title="Reset current invoice board"
                >
                  Clear Board
                </button>
              </div>
            </div>
          </header>
          
          {/* MOBILE FAST ACCESS TOOLS NAVIGATION */}
          <div className="lg:hidden bg-slate-50 border-b border-slate-200 py-2.5 overflow-x-auto scrollbar-none sticky top-16 z-30 no-print flex items-center gap-2.5 px-4 font-sans text-xs">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider shrink-0 mr-1 select-none">Tools:</span>
            <a 
              href="#invoice-generator" 
              className={`px-3 py-1.5 rounded-lg font-bold shrink-0 transition-all ${
                route === "#invoice-generator" || route === ""
                  ? "bg-blue-600 text-white shadow-xs" 
                  : "bg-white text-slate-600 border border-slate-200 hover:text-slate-900"
              }`}
            >
              Invoices
            </a>
            <a 
              href="#receipt-generator" 
              className={`px-3 py-1.5 rounded-lg font-bold shrink-0 transition-all ${
                route === "#receipt-generator" 
                  ? "bg-blue-600 text-white shadow-xs" 
                  : "bg-white text-slate-600 border border-slate-200 hover:text-slate-900"
              }`}
            >
              Receipts
            </a>
            <a 
              href="#expense-report-generator" 
              className={`px-3 py-1.5 rounded-lg font-bold shrink-0 transition-all ${
                route === "#expense-report-generator" 
                  ? "bg-blue-600 text-white shadow-xs" 
                  : "bg-white text-slate-600 border border-slate-200 hover:text-slate-900"
              }`}
            >
              Expenses
            </a>
            <a 
              href="#mileage-log-generator"  
              className={`px-3 py-1.5 rounded-lg font-bold shrink-0 transition-all ${
                route === "#mileage-log-generator" 
                  ? "bg-blue-600 text-white shadow-xs" 
                  : "bg-white text-slate-600 border border-slate-200 hover:text-slate-900"
              }`}
            >
              Mileage Log
            </a>
            <a 
              href="#quarterly-tax-estimator" 
              className={`px-3 py-1.5 rounded-lg font-bold shrink-0 transition-all ${
                route === "#quarterly-tax-estimator" 
                  ? "bg-blue-600 text-white shadow-xs" 
                  : "bg-white text-slate-600 border border-slate-200 hover:text-slate-900"
              }`}
            >
              Estimator
            </a>
            <a 
              href="#w9-request-template" 
              className={`px-3 py-1.5 rounded-lg font-bold shrink-0 transition-all ${
                route === "#w9-request-template" 
                  ? "bg-blue-600 text-white shadow-xs" 
                  : "bg-white text-slate-600 border border-slate-200 hover:text-slate-900"
              }`}
            >
              W-9 Request
            </a>
            <a 
              href="#1099-nec-tracker" 
              className={`px-3 py-1.5 rounded-lg font-bold shrink-0 transition-all ${
                route === "#1099-nec-tracker" 
                  ? "bg-blue-600 text-white shadow-xs" 
                  : "bg-white text-slate-600 border border-slate-200 hover:text-slate-900"
              }`}
            >
              Tracker 1099
            </a>
            <a 
              href="#admin/templates" 
              className={`px-3 py-1.5 rounded-lg font-bold shrink-0 transition-all flex items-center gap-1 ${
                route.startsWith("#admin") 
                  ? "bg-slate-900 text-white shadow-xs" 
                  : "bg-white text-slate-500 border border-slate-200 hover:text-slate-950"
              }`}
            >
              <Settings className="w-3" />
              <span>Themes</span>
            </a>
          </div>

          {/* TOOL ROUTE MUX */}
          {route === "#receipt-generator" ? (
            <ReceiptGeneratorPage onTrackClick={trackEvent} />
          ) : route === "#expense-report-generator" ? (
            <ExpenseReportPage onTrackClick={trackEvent} />
          ) : route === "#mileage-log-generator" ? (
            <MileageLogPage onTrackClick={trackEvent} />
          ) : route === "#quarterly-tax-estimator" ? (
            <QuarterlyTaxEstimatorPage onTrackClick={trackEvent} />
          ) : route === "#w9-request-template" ? (
            <W9RequestPage onTrackClick={trackEvent} />
          ) : route === "#1099-nec-tracker" ? (
            <NecTrackerPage onTrackClick={trackEvent} />
          ) : (
            <>
              {/* HERO SECTION BLOCK */}
              <section className="bg-white border-b border-slate-100 no-print" id="hero-marketing-intro">
                <div className="max-w-4xl mx-auto px-4 py-12 md:py-16 text-center space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-[10px] font-extrabold text-blue-700 tracking-wider uppercase border border-blue-105">
                    <Sparkles className="w-3 h-3 text-blue-600 fill-blue-600 animate-pulse" />
                    <span>US-Focused Small Business Toolkit</span>
                  </div>
                  <h1 className="text-3xl md:text-5xl font-black text-slate-950 tracking-tight leading-none uppercase font-sans">
                    Free Invoice Generator <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-905 via-neutral-700 to-slate-950 font-sans tracking-tight">
                      For Contractors &amp; Small Businesses
                    </span>
                  </h1>
                  <p className="text-slate-500 font-medium max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
                    Create professional invoice documents in minutes, preview layout outputs live on screen, and download vector PDF file exports immediately. 
                    No signups required, no payment cards loaded, and absolute offline privacy.
                  </p>

                  <div className="pt-2 flex flex-wrap justify-center gap-3">
                    <button
                      onClick={handleStartInvoice}
                      className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-750 text-white font-extrabold text-sm tracking-wide shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-98 transition-all duration-150 cursor-pointer"
                      type="button"
                    >
                      Start Invoice Now
                    </button>
                    <button
                      onClick={triggerLoadSampleConfirm}
                      className="px-6 py-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-sm border border-zinc-200 flex items-center gap-2 active:scale-98 transition duration-150 cursor-pointer"
                      type="button"
                    >
                      <RefreshCw className="w-4 h-4 text-zinc-500" />
                      <span>Load Sample Demo</span>
                    </button>
                  </div>
                </div>
              </section>

              {/* MAIN LAYOUT SPLIT WRAPPER PANEL */}
              <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full grow" id="invoice-generator" ref={formSectionRef}>
                
                {/* Validation Errors Header Banner */}
                {Object.keys(errors).length > 0 && (
                  <div className="max-w-6xl mx-auto mb-6 p-4 bg-orange-50 border border-orange-200 rounded-2xl flex items-start gap-3 no-print animate-fade-in">
                    <AlertCircle className="w-5 h-5 text-orange-700 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="font-extrabold text-orange-800 text-sm">Validation alerts identify pending fields</span>
                      <p className="text-xs text-orange-755 font-medium leading-snug">
                        The generator highlighted fields needing attention in red before a PDF can be formatted securely. Check row descriptions, missing client values, or date configurations below.
                      </p>
                    </div>
                  </div>
                )}

                {/* Mobile View Toggle Switch tab headers */}
                <div className="flex md:hidden bg-zinc-100 p-1 rounded-xl mb-6 border border-zinc-200/50 no-print" id="mobile-view-tabs">
                  <button
                    type="button"
                    className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                      activeMobileTab === "edit" ? "bg-white text-slate-950 shadow-xs" : "text-slate-500 hover:text-slate-800"
                    }`}
                    onClick={() => setActiveMobileTab("edit")}
                  >
                    <PenTool className="w-4 h-4" />
                    <span>1. Edit Details</span>
                  </button>
                  <button
                    type="button"
                    className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                      activeMobileTab === "preview" ? "bg-white text-slate-950 shadow-xs" : "text-slate-500 hover:text-slate-800"
                    }`}
                    onClick={() => setActiveMobileTab("preview")}
                  >
                    <Eye className="w-4 h-4" />
                    <span>2. Live Preview</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  
                  {/* LEFT COLUMN: THE EDIT FORM */}
                  <div
                    className={`lg:col-span-7 space-y-6 ${
                      activeMobileTab === "edit" ? "block" : "hidden md:block"
                    } no-print`}
                    id="editor-panel"
                  >
                    {/* Collapsible Template Selector Header */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between no-print shadow-xs" id="collapsible-theme-bar">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-slate-100 text-slate-800 rounded-xl">
                          <Grid className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-900 text-sm">Theme Design Layout: <span className="text-blue-600 underline decoration-2 decoration-blue-200">{selectedTemplate.name}</span></h4>
                          <p className="text-[11px] text-slate-500 font-medium select-none">
                            {showThemeSelector ? "Choose an aesthetic layout format below" : "Click 'Change Layout' to swap layout formats."}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowThemeSelector(!showThemeSelector)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition duration-150 cursor-pointer ${
                          showThemeSelector 
                            ? "bg-slate-50 text-slate-700 border-slate-350 hover:bg-slate-100 shadow-3xs" 
                            : "bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-sm"
                        }`}
                      >
                        {showThemeSelector ? "Hide Themes" : "Change Layout"}
                      </button>
                    </div>

                    {showThemeSelector && (
                      <div className="animate-fade-in no-print" id="collapsible-template-selector">
                        <TemplateSelector
                          selectedTemplateId={selectedTemplate.id}
                          onSelect={(tpl) => {
                            setSelectedTemplate(tpl);
                            setInvoiceData(prev => ({ ...prev, template: tpl.slug }));
                            showToast(`Swapped layout to "${tpl.name}" config!`);
                          }}
                        />
                      </div>
                    )}

                    <InvoiceForm
                      data={invoiceData}
                      onChange={setInvoiceData}
                      errors={errors}
                    />
                  </div>

              {/* RIGHT COLUMN: LIVE PREVIEW & CONTROLS */}
              <div
                className={`lg:col-span-5 space-y-6 lg:sticky lg:top-20 leading-relaxed ${
                  activeMobileTab === "preview" ? "block font-sans" : "hidden md:block"
                }`}
                id="preview-panel"
              >
                {/* Quick static Action bar triggers */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-3xs space-y-3 no-print" id="action-buttons-container">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-bold pb-2 border-b border-slate-100">
                    <span>PDF GENERATION PIPELINE</span>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-150 px-2.5 py-0.5 rounded-full font-sans uppercase font-black">
                      Ready to print
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 font-semibold text-xs">
                    <button
                      onClick={handleDownloadPDF}
                      type="button"
                      className="w-full py-3 bg-slate-900 hover:bg-black text-white font-extrabold rounded-xl shadow-xs transition duration-150 flex items-center justify-center gap-1.5 active:scale-98 cursor-pointer"
                    >
                      <FileDown className="w-4 h-4" />
                      <span>Download PDF</span>
                    </button>
                    <button
                      onClick={handlePrint}
                      type="button"
                      className="w-full py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-850 font-bold rounded-xl border border-zinc-200 transition duration-150 flex items-center justify-center gap-1.5 active:scale-98 cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print Invoice</span>
                    </button>
                  </div>

                  <div className="text-[11px] text-zinc-500 text-center leading-normal">
                    Clicking <span className="font-semibold text-zinc-800">Download PDF</span> launches the browser print dialog. Set Destination as <span className="font-semibold text-zinc-800">"Save to PDF"</span>. Ensure backgrounds are visible!
                  </div>
                </div>

                {/* Simulated US Letter Frame rendering active theme dynamically */}
                <div className="relative group transition-all duration-200">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-slate-200 via-neutral-100 to-slate-200 rounded-2xl blur-xs opacity-50 group-hover:opacity-75 transition duration-500 print:hidden" />
                  <div className="relative overflow-hidden bg-white border border-slate-205 rounded-2xl shadow-xl">
                    <InvoicePreviewRenderer 
                      data={invoiceData} 
                      template={selectedTemplate} 
                    />
                  </div>
                </div>
              </div>

            </div>
          </main>
        </>
      )}

          {/* FOOTER & FAQ BLOCKS */}
          <footer className="bg-white border-t border-slate-200 mt-16 py-12 no-print font-sans" id="main-faq-footer">
            <SEOContent />
            <FAQSection />
            <RelatedTools onTrackClick={(itemName) => {
              if (itemName === "upgrade_pro_clicked" || itemName.includes("pro_only")) {
                triggerUpgradeModal("PaperworkKit Pro");
              } else {
                trackEvent(itemName);
              }
            }} />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-550 space-y-4 pt-10 border-t border-slate-100/60 font-semibold leading-relaxed">
              <p>© {new Date().getFullYear()} PaperworkKit Toolkit. Developed with absolute privacy, zero tracking databases, and high-fidelity layouts.</p>
              <div className="flex justify-center gap-6 text-[11px] font-semibold text-slate-400">
                <button type="button" onClick={() => triggerUpgradeModal("about_footer")} className="hover:text-slate-600">About Builder</button>
                <button type="button" onClick={() => triggerUpgradeModal("privacy_footer")} className="hover:text-slate-600">Privacy Policy</button>
                <button type="button" onClick={() => triggerUpgradeModal("terms_footer")} className="hover:text-slate-600 font-sans">Terms of Use</button>
                <button type="button" onClick={() => triggerUpgradeModal("contact_footer")} className="hover:text-slate-600 font-sans">Contact Us</button>
              </div>
            </div>
          </footer>
        </>
      )}

      {/* ==============================================
          CONFIRMATION OVERLAYS / SCREEN OVERLAY MODALS
          ============================================== */}
      
      {/* 1. Modal for Overwriting Draft (Load Sample Preview) */}
      {showSampleConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-55" id="confirm-sample-modal">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-xl space-y-4 animate-fade-in text-slate-900">
            <div className="flex items-center gap-3 select-none">
              <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                <RefreshCw className="w-5 h-5 animate-spin-reverse" />
              </div>
              <h4 className="font-extrabold text-slate-900 text-lg">Load Sample Invoice?</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              This routine will replace all current contents on your board with fictional details representing Blue Ridge Web Studio. Any custom edits you made will be overwritten.
            </p>
            <div className="flex justify-end gap-2 pt-2 text-xs font-semibold">
              <button
                type="button"
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 font-bold rounded-lg transition text-slate-700 cursor-pointer"
                onClick={() => setShowSampleConfirm(false)}
              >
                No, Keep Editing
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-slate-900 hover:bg-black font-extrabold rounded-lg text-white transition shadow-xs cursor-pointer"
                onClick={handleLoadSample}
              >
                Yes, Load Sample
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal for Clearing Current Board state */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-55" id="confirm-clear-modal">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-xl space-y-4 animate-fade-in text-slate-900">
            <div className="flex items-center gap-3 select-none">
              <div className="w-10 h-10 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-rose-600">
                <Trash2 className="w-5 h-5" />
              </div>
              <h4 className="font-extrabold text-slate-900 text-lg animate-pulse-none">Clear All Invoice Data?</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-semibold">
              This action removes the current draft from this browser's memory forever. Make sure you have exported any desired PDFs before confirming. There is no undo.
            </p>
            <div className="flex justify-end gap-2 pt-2 text-xs font-bold">
              <button
                type="button"
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 font-bold rounded-lg transition text-slate-700 cursor-pointer"
                onClick={() => setShowClearConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-rose-600 hover:bg-rose-750 font-extrabold rounded-lg text-white transition shadow-xs cursor-pointer"
                onClick={handleClearDraft}
              >
                Clear Everything
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. New Template step-wizard creation overlay */}
      {showNewWizard && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-55 font-sans" id="create-new-tpl-dialog">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xl max-w-md w-full animate-fade-in text-slate-800 space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 text-blue-600 bg-blue-50 border rounded-lg flex items-center justify-center select-none">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900 tracking-tight leading-none">Create Bespoke Dynamic Theme</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider pt-0.5">Define metadata coordinates</p>
              </div>
            </div>

            <form onSubmit={handleCreateNewTemplate} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Theme Title Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Detailed Landscaping Design"
                  value={newTplName}
                  onChange={(e) => setNewTplName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-250 bg-slate-50 text-xs rounded-xl focus:outline-none focus:ring-1 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Category badge</label>
                  <select
                    value={newTplCategory}
                    onChange={(e) => setNewTplCategory(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-250 rounded-xl bg-white text-xs font-bold text-slate-800"
                  >
                    <option value="classic">Classic</option>
                    <option value="modern">Modern</option>
                    <option value="simple">Simple</option>
                    <option value="service">Service</option>
                    <option value="creative">Creative</option>
                    <option value="professional">Professional</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Layout base grid</label>
                  <select
                    value={newTplLayout}
                    onChange={(e) => setNewTplLayout(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-250 rounded-xl bg-white text-xs font-bold text-slate-800"
                  >
                    <option value="classic">Classic grid</option>
                    <option value="modern">Modern airy</option>
                    <option value="compact font-mono">Compact dense</option>
                    <option value="bold">Bold colorful</option>
                    <option value="minimal">Minimal white</option>
                    <option value="service">Service cards</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewWizard(false);
                    setNewTplName("");
                  }}
                  className="flex-1 py-2 border border-slate-205 hover:bg-slate-50 rounded-xl text-slate-650 text-center cursor-pointer font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-center cursor-pointer font-black"
                >
                  Create & Edit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Monetization Waiting List Pro Modal popup */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-55" id="upgrade-waiting-list-modal">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 border border-slate-205 shadow-2xl space-y-6 animate-fade-in text-slate-900 relative">
            <button
              onClick={() => setShowUpgradeModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 p-2 cursor-pointer"
              title="Close modal"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-3 font-sans">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto text-xl font-bold shadow-md select-none">
                PK
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-blue-50 text-[9px] font-extrabold text-blue-700 border border-blue-200 tracking-wider uppercase">
                  Coming Soon • Early Bird Pro Access
                </div>
                <h4 className="font-black text-slate-950 text-xl tracking-tight">Unlock Premium Business Modules</h4>
              </div>
              <p className="text-xs text-slate-550 leading-relaxed max-w-sm mx-auto font-medium">
                We are currently building advanced cloud integration tools. Be the first to secure early bird rates by joining our priority waitlist.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3 font-sans">
              <div className="flex items-start gap-3 text-xs leading-relaxed text-slate-705 font-semibold">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold text-slate-900">What is being queued:</span>
                  <p className="text-slate-500 text-[11px] font-medium leading-normal pt-0.5">
                    Automatic cloud vaults, background tracking receipts, W-9 PDF template trackers, IRS compliant calculators, and visual monthly stats spreadsheets.
                  </p>
                </div>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setShowUpgradeModal(false);
                showToast("Excellent! You’ve successfully joined our early priority waiting list.");
              }}
              className="space-y-3 font-sans"
            >
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Your Email Coordinates</label>
                <input
                  required
                  type="email"
                  placeholder="e.g. contracting-dev@yourdomain.com"
                  className="w-full text-xs border border-slate-300 rounded-xl px-4 py-3 placeholder:text-zinc-400 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900/10 bg-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-slate-900 hover:bg-black font-extrabold text-xs text-white rounded-xl transition duration-150 shadow-md active:scale-98 cursor-pointer"
              >
                Join Early Priority Waiting List
              </button>
            </form>

            <div className="text-[10px] text-slate-400 text-center font-semibold">
              Join free today. We respect absolute inbox privacy. Zero spam promise.
            </div>
          </div>
        </div>
      )}

      {/* MOBILE STICKY ACTION NAV BAR */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 p-3 flex gap-2 md:hidden no-print z-40 shadow-lg" id="sticky-action-bar">
        {activeMobileTab === "edit" ? (
          <>
            <button
              onClick={() => setActiveMobileTab("preview")}
              type="button"
              className="flex-1 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition active:scale-98 border border-zinc-200 cursor-pointer"
            >
              <Eye className="w-4 h-4 text-zinc-600" />
              <span>Preview Invoice</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              type="button"
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-750 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md active:scale-98 cursor-pointer"
            >
              <FileDown className="w-4 h-4" />
              <span>Get PDF Copy</span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setActiveMobileTab("edit")}
              type="button"
              className="flex-1 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition active:scale-98 border border-zinc-200 cursor-pointer"
            >
              <PenTool className="w-4 h-4 text-zinc-600" />
              <span>Go Back To Edit</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              type="button"
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md active:scale-98 cursor-pointer"
            >
              <FileDown className="w-4 h-4" />
              <span>Download PDF</span>
            </button>
          </>
        )}
      </div>

    </div>
  );
}
