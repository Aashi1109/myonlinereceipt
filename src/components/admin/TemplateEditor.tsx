/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect } from "react";
import { InvoiceTemplate, InvoiceTemplateConfig, LayoutFamily, TemplateCategory } from "../../lib/templates/templateTypes";
import { TemplateService } from "../../lib/templates/templateService";
import { InvoiceTemplateConfigSchema } from "../../lib/templates/templateValidation";
import { 
  TemplateBasicInfoForm, 
  TemplateThemeEditor, 
  TemplateTypographyEditor, 
  TemplatePageEditor, 
  TemplateHeaderEditor, 
  TemplateVisibilityEditor, 
  TemplateLabelsEditor, 
  TemplateWatermarkEditor, 
  TemplateSectionOrderEditor 
} from "./FormGroups";
import InvoicePreviewRenderer from "../InvoicePreviewRenderer";
import { 
  simpleInvoiceSample, 
  serviceInvoiceSample, 
  manyLineItemsInvoiceSample, 
  partialPaymentInvoiceSample, 
  longTextInvoiceSample 
} from "../../lib/invoice/sampleInvoiceData";
import { 
  ArrowLeft, 
  Save, 
  CheckCircle, 
  Copy, 
  FileDown, 
  Archive, 
  Undo,
  Laptop,
  Smartphone,
  FileText,
  Database,
  Code,
  FileCheck,
  AlertTriangle
} from "lucide-react";
import { InvoiceData } from "../../types";

interface TemplateEditorProps {
  templateId: string;
  onBack: () => void;
  showToast: (msg: string) => void;
}

export default function TemplateEditor({
  templateId,
  onBack,
  showToast,
}: TemplateEditorProps) {
  // DB & Original states
  const originalTemplate = useMemo(() => {
    const t = TemplateService.getTemplateById(templateId);
    if (!t) {
      throw new Error(`Template not found: ${templateId}`);
    }
    return t;
  }, [templateId]);

  // Working States
  const [name, setName] = useState(originalTemplate.name);
  const [slug, setSlug] = useState(originalTemplate.slug);
  const [description, setDescription] = useState(originalTemplate.description);
  const [category, setCategory] = useState<TemplateCategory>(originalTemplate.category);
  const [layoutFamily, setLayoutFamily] = useState<LayoutFamily>(originalTemplate.layoutFamily);
  const [status, setStatus] = useState(originalTemplate.status);
  const [config, setConfig] = useState<InvoiceTemplateConfig>(() => JSON.parse(JSON.stringify(originalTemplate.config)));
  
  // JSON view models
  const [tab, setTab] = useState<"fields" | "json">("fields");
  const [jsonText, setJsonText] = useState(() => JSON.stringify(originalTemplate.config, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Preview States
  const [activeSample, setActiveSample] = useState<"simple" | "service" | "many" | "partial" | "long">("service");
  const [previewPaneSize, setPreviewPaneSize] = useState<"desktop" | "pdf">("desktop");

  // Keep JSON string in sync with config edits when fields tab is active
  useEffect(() => {
    if (tab === "fields") {
      setJsonText(JSON.stringify(config, null, 2));
      setJsonError(null);
    }
  }, [config, tab]);

  // Working active sample dataset
  const activeInvoiceData = useMemo<InvoiceData>(() => {
    switch (activeSample) {
      case "simple": return simpleInvoiceSample;
      case "many": return manyLineItemsInvoiceSample;
      case "partial": return partialPaymentInvoiceSample;
      case "long": return longTextInvoiceSample;
      default: return serviceInvoiceSample;
    }
  }, [activeSample]);

  // Combined temporary active template for live previews
  const activePreviewTemplate = useMemo<InvoiceTemplate>(() => {
    return {
      ...originalTemplate,
      name,
      slug,
      description,
      category,
      layoutFamily,
      config,
    };
  }, [originalTemplate, name, slug, description, category, layoutFamily, config]);

  // Save Operations
  const handleSaveDraft = () => {
    try {
      TemplateService.updateTemplate(templateId, {
        name,
        slug,
        description,
        category,
        layoutFamily,
        config,
        status: "draft",
      });
      showToast("Draft settings saved local-first!");
    } catch (e: any) {
      showToast(`Save failed: ${e.message}`);
    }
  };

  const handlePublish = () => {
    // 1. Zod config check
    const check = InvoiceTemplateConfigSchema.safeParse(config);
    if (!check.success) {
      const errorMsg = check.error.issues.map(err => `${err.path.join(".")}: ${err.message}`).join(" | ");
      setJsonError(errorMsg);
      showToast("Validation Error - Cannot publish invalid config");
      return;
    }

    // 2. Perform database update
    try {
      const updated = TemplateService.updateTemplate(templateId, {
        name,
        slug,
        description,
        category,
        layoutFamily,
        config,
        status: "published",
        version: originalTemplate.version + 1,
        publishedAt: new Date().toISOString(),
      });
      showToast(`Success! "${updated.name}" is now published.`);
      onBack();
    } catch (e: any) {
      showToast(`Error: ${e.message}`);
    }
  };

  const handleDuplicate = () => {
    try {
      const copy = TemplateService.duplicateTemplate(templateId);
      showToast(`Created draft duplicate: ${copy.name}`);
      onBack();
    } catch (e: any) {
      showToast(`Duplication error: ${e.message}`);
    }
  };

  const handleArchive = () => {
    if (window.confirm("Are you sure you want to archive this template? It will be removed from the public selector.")) {
      try {
        TemplateService.updateTemplate(templateId, { status: "archived", isDefault: false });
        showToast("Template archived.");
        onBack();
      } catch (e: any) {
        showToast(`Archive failed: ${e.message}`);
      }
    }
  };

  const handleReset = () => {
    if (window.confirm("Revert unsaved workspace changes back to your last saved state?")) {
      setName(originalTemplate.name);
      setSlug(originalTemplate.slug);
      setDescription(originalTemplate.description);
      setCategory(originalTemplate.category);
      setLayoutFamily(originalTemplate.layoutFamily);
      setConfig(JSON.parse(JSON.stringify(originalTemplate.config)));
      setJsonText(JSON.stringify(originalTemplate.config, null, 2));
      setJsonError(null);
      showToast("Workspace modifications discarded.");
    }
  };

  const handleExportJSON = () => {
    try {
      const payload = TemplateService.exportTemplateJson(activePreviewTemplate);
      const blob = new Blob([payload], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `template-${slug}-draft.json`;
      a.click();
      showToast("Downloaded Draft JSON configuration!");
    } catch (e: any) {
      showToast(`Export failed: ${e.message}`);
    }
  };

  // Validate raw JSON pastes
  const handleApplyRawJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      const check = InvoiceTemplateConfigSchema.safeParse(parsed);
      if (check.success) {
        setConfig(parsed);
        setJsonError(null);
        showToast("Raw config parsed & applied to live workspace successfully!");
      } else {
        const errorMsg = check.error.issues.map(err => `${err.path.join(".")}: ${err.message}`).join("\n");
        setJsonError(errorMsg);
        showToast("Schema Mismatch: Invalid config keys.");
      }
    } catch (err: any) {
      setJsonError(`JSON Parse Error: ${err.message}`);
      showToast("Formatting Error - check raw braces");
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-100 select-none font-sans" id="template-editor-workplace">
      
      {/* Sticky Action Header Bar */}
      <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200 shrink-0 no-print shadow-xs z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            type="button"
            title="Back to Template List"
            className="p-1.5 hover:bg-slate-150 rounded-lg text-slate-500 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              window.location.hash = "#invoice-generator";
            }}
            type="button"
            className="flex items-center gap-1 text-[10.5px] font-bold text-slate-505 hover:text-slate-900 cursor-pointer transition-colors px-2 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200"
            title="Return to the user generator tools dashboard"
          >
            <span>Exit to Tools</span>
          </button>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-black text-slate-900 tracking-tight leading-none">
                Editing: {name}
              </h1>
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                status === "published" ? "bg-emerald-50 text-emerald-700 border-emerald-255" : "bg-blue-50 text-blue-700 border-blue-255"
              }`}>
                {status}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Layout Family: {layoutFamily} • slug: /{slug}</p>
          </div>
        </div>

        {/* Action controllers */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={handleReset}
            type="button"
            title="Discard changes"
            className="p-2 rounded-xl border border-slate-205 hover:bg-slate-50 text-slate-600 font-bold text-xs flex items-center gap-1 cursor-pointer"
          >
            <Undo className="w-4 h-4" />
            <span>Reset</span>
          </button>
          <button
            onClick={handleExportJSON}
            type="button"
            className="p-2 rounded-xl border border-slate-205 hover:bg-slate-50 text-slate-600 font-bold text-xs flex items-center gap-1 cursor-pointer"
          >
            <FileDown className="w-4 h-4" />
            <span>Export</span>
          </button>
          <button
            onClick={handleDuplicate}
            type="button"
            className="p-2 rounded-xl border border-slate-205 hover:bg-slate-50 text-slate-600 font-bold text-xs flex items-center gap-1 cursor-pointer"
          >
            <Copy className="w-4 h-4" />
            <span>Copy</span>
          </button>
          <button
            onClick={handleArchive}
            type="button"
            className="p-2 rounded-xl border border-rose-205 hover:bg-rose-50 text-rose-600 font-bold text-xs flex items-center gap-1 cursor-pointer"
          >
            <Archive className="w-4 h-4" />
            <span>Archive</span>
          </button>
          <button
            onClick={handleSaveDraft}
            type="button"
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-950 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Draft</span>
          </button>
          <button
            onClick={handlePublish}
            type="button"
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-750 text-white font-black text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Publish version</span>
          </button>
        </div>
      </header>

      {/* Main Dual Panel Arena */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* ================= LEFT HALF: FORMS AND WORKSPACE SETTINGS ================= */}
        <section className="w-1/2 overflow-y-auto bg-white border-r border-slate-200 p-5 space-y-6 flex flex-col no-print scrollbar-thin">
          
          {/* Custom Editor Tab selection */}
          <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setTab("fields")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold tracking-wide flex items-center justify-center gap-1 cursor-pointer transition-all ${
                tab === "fields" 
                  ? "bg-white text-slate-900 shadow-xs" 
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Database className="w-4 h-4" />
              Property Fields
            </button>
            <button
              onClick={() => setTab("json")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold tracking-wide flex items-center justify-center gap-1 cursor-pointer transition-all ${
                tab === "json" 
                  ? "bg-white text-slate-900 shadow-xs" 
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Code className="w-4 h-4" />
              Advanced Config JSON
            </button>
          </div>

          {/* TAB 1: PROPERTIES ACCORDION LIST */}
          {tab === "fields" && (
            <div className="space-y-4 flex-1">
              
              {/* SECTION: Basic Metadata */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">1. Theme Metadata</h4>
                <TemplateBasicInfoForm
                  name={name}
                  slug={slug}
                  description={description}
                  category={category}
                  layoutFamily={layoutFamily}
                  onChange={(u) => {
                    if (u.name !== undefined) setName(u.name);
                    if (u.slug !== undefined) setSlug(u.slug);
                    if (u.description !== undefined) setDescription(u.description);
                    if (u.category !== undefined) setCategory(u.category);
                    if (u.layoutFamily !== undefined) setLayoutFamily(u.layoutFamily);
                  }}
                />
              </div>

              {/* SECTION: Color Theme */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">2. Brand Theme Colors</h4>
                <TemplateThemeEditor
                  value={config.theme}
                  onChange={(theme) => setConfig({ ...config, theme })}
                />
              </div>

              {/* SECTION: Typography styling */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">3. Typography Specs</h4>
                <TemplateTypographyEditor
                  value={config.typography}
                  onChange={(typography) => setConfig({ ...config, typography })}
                />
              </div>

              {/* SECTION: Page config */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">4. Paper margins & sizes</h4>
                <TemplatePageEditor
                  value={config.page}
                  onChange={(page) => setConfig({ ...config, page })}
                />
              </div>

              {/* SECTION: Header configurations */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">5. Brand Header Styles</h4>
                <TemplateHeaderEditor
                  value={config.header}
                  onChange={(header) => setConfig({ ...config, header })}
                />
              </div>

              {/* SECTION: Element togglers */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">6. Segment Visibility Indicators</h4>
                <TemplateVisibilityEditor
                  value={config.visibility}
                  onChange={(visibility) => setConfig({ ...config, visibility })}
                />
              </div>

              {/* SECTION: Floating watermark */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">7. Floating Watermarks</h4>
                <TemplateWatermarkEditor
                  value={config.watermark}
                  onChange={(watermark) => setConfig({ ...config, watermark })}
                />
              </div>

              {/* SECTION: Segment ordering hierarchy */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">8. Structural Ordering arrangement</h4>
                <TemplateSectionOrderEditor
                  value={config.sectionOrder}
                  onChange={(sectionOrder) => setConfig({ ...config, sectionOrder })}
                />
              </div>

              {/* SECTION: Custom labeling translator */}
              <div className="space-y-2 pb-6">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">9. Overriding label dictionary</h4>
                <TemplateLabelsEditor
                  value={config.labels}
                  onChange={(labels) => setConfig({ ...config, labels })}
                />
              </div>

            </div>
          )}

          {/* TAB 2: ADVANCED CONFIG RAW JSON */}
          {tab === "json" && (
            <div className="space-y-4 flex flex-col flex-1">
              
              {/* Warnings alert banner */}
              <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl flex gap-3 text-xs">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-extrabold text-amber-900 block leading-none">Advanced JSON Workbench</span>
                  <p className="leading-snug text-amber-700/90 font-medium">
                    Modifying RAW JSON directly allows bulk configuration. Structure schema validator checks automatically before updates are written.
                  </p>
                </div>
              </div>

              {/* Code TextArea */}
              <div className="flex-1 min-h-[350px] relative font-mono text-xs">
                <textarea
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  placeholder="Enter invoice configuration JSON..."
                  className="w-full h-full p-4 border border-slate-250 bg-slate-900 text-slate-200 font-mono text-[11px] rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium leading-relaxed"
                />
              </div>

              {/* Error logs output pane */}
              {jsonError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold font-mono whitespace-pre-wrap leading-normal">
                  <span className="text-rose-950 font-black block mb-1">❌ Format Check Logs:</span>
                  {jsonError}
                </div>
              )}

              {/* Apply parameters button */}
              <button
                onClick={handleApplyRawJson}
                type="button"
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-950 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <FileCheck className="w-4 h-4" />
                <span>Apply & Validate Raw Braces</span>
              </button>
            </div>
          )}

        </section>

        {/* ================= RIGHT HALF: STICKY PANEL PREVIEW DESK ================= */}
        <section className="w-1/2 overflow-y-auto bg-slate-200/80 p-6 flex flex-col items-center gap-4 relative">
          
          {/* Controllers float header */}
          <div className="w-full max-w-[550px] flex justify-between items-center bg-white p-2 border border-slate-200 rounded-xl shrink-0 no-print shadow-xs z-10 gap-3">
            
            {/* Stress testing cases list */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-black text-slate-400">Load Client:</span>
              <select
                value={activeSample}
                onChange={(e) => setActiveSample(e.target.value as any)}
                className="px-2 py-1 border border-slate-200 rounded text-[11.5px] bg-slate-50 text-slate-800 font-extrabold cursor-pointer"
              >
                <option value="simple">Simple consulting fee (1 Row)</option>
                <option value="service">Standard maintenance run</option>
                <option value="many">Load stress-test items (8 Rows)</option>
                <option value="partial">Pre-deposit partial bills</option>
                <option value="long">Long names overflow stresses</option>
              </select>
            </div>

            {/* Display scale keys */}
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setPreviewPaneSize("desktop")}
                type="button"
                className={`p-1.5 rounded-md ${
                  previewPaneSize === "desktop" 
                    ? "bg-white text-slate-800 shadow-xs" 
                    : "text-slate-400 hover:text-slate-700"
                }`}
                title="Scaled full browser scale"
              >
                <Laptop className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setPreviewPaneSize("pdf")}
                type="button"
                className={`p-1.5 rounded-md ${
                  previewPaneSize === "pdf" 
                    ? "bg-white text-slate-800 shadow-xs" 
                    : "text-slate-400 hover:text-slate-700"
                }`}
                title="A4 Vector paper dimensions representation"
              >
                <FileText className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Interactive Scaled Sheet Wrapper container */}
          <div 
            className={`transition-all duration-300 overflow-y-auto w-full select-none ${
              previewPaneSize === "pdf" 
                ? "max-w-[800px] h-fit md:h-[1100px] border border-slate-300 shadow-xl bg-white" 
                : "max-w-[700px] h-auto p-1 bg-white border border-slate-300 rounded-2xl shadow-xl"
            }`}
          >
            <InvoicePreviewRenderer
              data={activeInvoiceData}
              template={activePreviewTemplate}
            />
          </div>

        </section>

      </div>

    </div>
  );
}
