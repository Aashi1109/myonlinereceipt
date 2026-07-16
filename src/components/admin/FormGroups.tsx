/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { InvoiceTemplateConfig, LayoutFamily, TemplateCategory } from "../../lib/templates/templateTypes";
import { ArrowUp, ArrowDown, Eye, RefreshCcw } from "lucide-react";

interface FormSectionProps<T> {
  value: T;
  onChange: (updated: T) => void;
}

// 1. Basic Metadata Form
interface BasicInfoFormProps {
  name: string;
  slug: string;
  description: string;
  category: TemplateCategory;
  layoutFamily: LayoutFamily;
  onChange: (updates: { name?: string; slug?: string; description?: string; category?: TemplateCategory; layoutFamily?: LayoutFamily }) => void;
}
export function TemplateBasicInfoForm({ name, slug, description, category, layoutFamily, onChange }: BasicInfoFormProps) {
  return (
    <div className="space-y-3.5 bg-slate-50 p-4 rounded-xl border border-slate-205">
      <div>
        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Theme Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="w-full px-3 py-1.5 border border-slate-250 rounded-lg text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
        />
      </div>
      <div>
        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Slug URL</label>
        <input
          type="text"
          value={slug}
          onChange={(e) => onChange({ slug: e.target.value })}
          placeholder="lowercase-letters-and-hyphens-only"
          className="w-full px-3 py-1.5 border border-slate-250 rounded-lg text-xs bg-white font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={2}
          className="w-full px-3 py-1.5 border border-slate-250 rounded-lg text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => onChange({ category: e.target.value as TemplateCategory })}
            className="w-full px-2 py-1.5 border border-slate-250 rounded-lg text-xs bg-white text-slate-800 font-semibold"
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
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Layout</label>
          <select
            value={layoutFamily}
            onChange={(e) => onChange({ layoutFamily: e.target.value as LayoutFamily })}
            className="w-full px-2 py-1.5 border border-slate-250 rounded-lg text-xs bg-white text-slate-800 font-semibold"
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
    </div>
  );
}

// 2. Theme Editor
export function TemplateThemeEditor({ value, onChange }: FormSectionProps<InvoiceTemplateConfig["theme"]>) {
  const update = (key: keyof InvoiceTemplateConfig["theme"], val: string) => {
    onChange({ ...value, [key]: val });
  };

  const fields: { key: keyof InvoiceTemplateConfig["theme"]; label: string }[] = [
    { key: "primaryColor", label: "Primary / Accents Color" },
    { key: "accentColor", label: "Secondary / Button Color" },
    { key: "textColor", label: "Primary Text Color" },
    { key: "mutedTextColor", label: "Secondary / Subtitle Text" },
    { key: "borderColor", label: "Border / Grids Divider Color" },
    { key: "backgroundColor", label: "Pills / Stripes Background" },
    { key: "surfaceColor", label: "Paper Surface Color" },
  ];

  return (
    <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-205 grid grid-cols-2 gap-3 items-end">
      {fields.map((f) => (
        <div key={f.key} className="space-y-1">
          <label className="block text-[9px] font-black text-slate-500 uppercase">{f.label}</label>
          <div className="flex items-center gap-1.5">
            <input
              type="color"
              value={value[f.key]}
              onChange={(e) => update(f.key, e.target.value)}
              className="w-6 h-6 border rounded cursor-pointer shrink-0"
            />
            <input
              type="text"
              value={value[f.key]}
              onChange={(e) => update(f.key, e.target.value)}
              className="w-full px-2 py-1 border border-slate-250 rounded text-[10px] font-mono text-slate-800 bg-white"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// 3. Typography Editor
export function TemplateTypographyEditor({ value, onChange }: FormSectionProps<InvoiceTemplateConfig["typography"]>) {
  return (
    <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-205">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[9px] font-black text-slate-500 uppercase mb-1">Font Pairings</label>
          <select
            value={value.fontFamily}
            onChange={(e) => onChange({ ...value, fontFamily: e.target.value as any })}
            className="w-full px-2 py-1.5 border border-slate-250 rounded text-xs bg-white text-slate-800 font-semibold"
          >
            <option value="Inter">Inter (Sans-Serif)</option>
            <option value="Space Grotesk">Space Grotesk (Tech)</option>
            <option value="Outfit">Outfit (Geometric)</option>
            <option value="JetBrains Mono">JetBrains Mono (Editorial Code)</option>
            <option value="Georgia">Georgia (Editorial Serif)</option>
            <option value="Times-Roman">Times New Roman</option>
            <option value="Courier">Courier Typewriter</option>
          </select>
        </div>
        <div>
          <label className="block text-[9px] font-black text-slate-500 uppercase mb-1">Headings Size</label>
          <select
            value={value.headingSize}
            onChange={(e) => onChange({ ...value, headingSize: e.target.value as any })}
            className="w-full px-2 py-1.5 border border-slate-250 rounded text-xs bg-white text-slate-800 font-medium"
          >
            <option value="sm">Small (18px)</option>
            <option value="md">Default (22px)</option>
            <option value="lg">Large (26px)</option>
            <option value="xl">XL (32px)</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[9px] font-black text-slate-500 uppercase mb-1">Base Body Size</label>
          <select
            value={value.bodySize}
            onChange={(e) => onChange({ ...value, bodySize: e.target.value as any })}
            className="w-full px-2 py-1.5 border border-slate-250 rounded text-xs bg-white text-slate-800 font-medium"
          >
            <option value="xs">Extra density (12px)</option>
            <option value="sm">Standard text (14px)</option>
            <option value="md">Spacious content (15px)</option>
          </select>
        </div>
        <div>
          <label className="block text-[9px] font-black text-slate-500 uppercase mb-1">Line Heights</label>
          <select
            value={value.lineHeight}
            onChange={(e) => onChange({ ...value, lineHeight: e.target.value as any })}
            className="w-full px-2 py-1.5 border border-slate-250 rounded text-xs bg-white text-slate-800 font-medium"
          >
            <option value="tight">Compressed (1.25x)</option>
            <option value="normal">Normal (1.5x)</option>
            <option value="relaxed">Comfortable (1.75x)</option>
          </select>
        </div>
      </div>
    </div>
  );
}

// 4. Page and Margins Editor
export function TemplatePageEditor({ value, onChange }: FormSectionProps<InvoiceTemplateConfig["page"]>) {
  return (
    <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-205">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[9px] font-black text-slate-500 uppercase mb-1">Paper Sizes</label>
          <select
            value={value.size}
            onChange={(e) => onChange({ ...value, size: e.target.value as any })}
            className="w-full px-2 py-1.5 border border-slate-250 rounded text-xs bg-white text-slate-800 font-semibold"
          >
            <option value="LETTER">Letter (8.5" x 11")</option>
            <option value="A4">A4 (210mm x 297mm)</option>
          </select>
        </div>
        <div>
          <label className="block text-[9px] font-black text-slate-500 uppercase mb-1">Margin Padding</label>
          <select
            value={value.margin}
            onChange={(e) => onChange({ ...value, margin: e.target.value as any })}
            className="w-full px-2 py-1.5 border border-slate-250 rounded text-xs bg-white text-slate-800 font-medium"
          >
            <option value="compact">Compact (Half Margin)</option>
            <option value="normal">Standard normal margin</option>
            <option value="spacious">Spacious padded margin</option>
          </select>
        </div>
      </div>
      <div className="flex items-center gap-2 pt-1 select-none">
        <input
          type="checkbox"
          id="showPageBorder"
          checked={value.showPageBorder}
          onChange={(e) => onChange({ ...value, showPageBorder: e.target.checked })}
          className="w-3.5 h-3.5 accent-blue-600 rounded"
        />
        <label htmlFor="showPageBorder" className="text-xs text-slate-700 font-semibold cursor-pointer">
          Apply colored brand border around document bounding box
        </label>
      </div>
    </div>
  );
}

// 5. Header block options (Style, titles, alignment)
export function TemplateHeaderEditor({ value, onChange }: FormSectionProps<InvoiceTemplateConfig["header"]>) {
  return (
    <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-205">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[9px] font-black text-slate-500 uppercase mb-1">Header Style</label>
          <select
            value={value.style}
            onChange={(e) => onChange({ ...value, style: e.target.value as any })}
            className="w-full px-2 py-1.5 border border-slate-250 rounded text-xs bg-white text-slate-800 font-bold"
          >
            <option value="left-logo">Brand logo Left, text right</option>
            <option value="centered">Centered focus logo</option>
            <option value="right-meta">Logo left, vertical metadata right</option>
            <option value="split">Split layout balanced</option>
            <option value="minimal">Low visual footprint</option>
          </select>
        </div>
        <div>
          <label className="block text-[9px] font-black text-slate-500 uppercase mb-1">Logo Placement</label>
          <select
            value={value.logoPosition}
            onChange={(e) => onChange({ ...value, logoPosition: e.target.value as any })}
            className="w-full px-2 py-1.5 border border-slate-250 rounded text-xs bg-white text-slate-800"
          >
            <option value="left">Left Aligned Logo</option>
            <option value="center">Centered Logo Row</option>
            <option value="right">Right Aligned Logo</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[9px] font-black text-slate-500 uppercase mb-1">Brand Logo Scale</label>
          <select
            value={value.logoSize}
            onChange={(e) => onChange({ ...value, logoSize: e.target.value as any })}
            className="w-full px-2 py-1.5 border border-slate-250 rounded text-xs bg-white text-slate-800"
          >
            <option value="sm">Small limit (40px)</option>
            <option value="md">Normal scale (48px)</option>
            <option value="lg">Large badge (64px)</option>
          </select>
        </div>
        <div>
          <label className="block text-[9px] font-black text-slate-500 uppercase mb-1">Document Header Title</label>
          <input
            type="text"
            value={value.invoiceTitleText}
            onChange={(e) => onChange({ ...value, invoiceTitleText: e.target.value })}
            className="w-full px-2.5 py-1.5 border border-slate-250 rounded text-xs bg-white text-slate-805"
          />
        </div>
      </div>
      <div className="flex flex-col gap-2 pt-1 border-t border-slate-200/50">
        <label className="flex items-center gap-2 text-xs text-slate-700 font-semibold cursor-pointer">
          <input
            type="checkbox"
            checked={value.showInvoiceTitle}
            onChange={(e) => onChange({ ...value, showInvoiceTitle: e.target.checked })}
            className="w-3.5 h-3.5 rounded accent-blue-600"
          />
          Show Invoice header template title
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-700 font-semibold cursor-pointer">
          <input
            type="checkbox"
            checked={value.showStatusBadge}
            onChange={(e) => onChange({ ...value, showStatusBadge: e.target.checked })}
            className="w-3.5 h-3.5 rounded accent-blue-600"
          />
          Render saved status assurance badge (Early Pro access)
        </label>
      </div>
    </div>
  );
}

// 6. Section Visibility Switches
export function TemplateVisibilityEditor({ value, onChange }: FormSectionProps<InvoiceTemplateConfig["visibility"]>) {
  const toggle = (key: keyof InvoiceTemplateConfig["visibility"]) => {
    onChange({ ...value, [key]: !value[key] });
  };

  const fields: { key: keyof InvoiceTemplateConfig["visibility"]; label: string }[] = [
    { key: "showLogo", label: "Render Brand Business Logo" },
    { key: "showBusinessBlock", label: "Render Business Details block" },
    { key: "showClientBlock", label: "Render Client / Bill To recipient" },
    { key: "showMetaBlock", label: "Invoice serial metadata info block" },
    { key: "showLineItems", label: "Line items description table grid" },
    { key: "showTotals", label: "Render totals calculation summations" },
    { key: "showPaymentInstructions", label: "Accept payments instruction details block" },
    { key: "showNotes", label: "Render notes and milestone block" },
    { key: "showTerms", label: "Display terms and conditions signatures" },
    { key: "showFooter", label: "Render legal and brand footers" },
  ];

  return (
    <div className="grid grid-cols-1 gap-2.5 bg-slate-50 p-4 rounded-xl border border-slate-205 select-none">
      {fields.map((f) => (
        <label key={f.key} className="flex items-center justify-between p-1.5 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer">
          <span>{f.label}</span>
          <input
            type="checkbox"
            checked={value[f.key]}
            onChange={() => toggle(f.key)}
            className="w-4 h-4 accent-blue-605"
          />
        </label>
      ))}
    </div>
  );
}

// 7. Labels Overrides & Translation Dictionary Editor
export function TemplateLabelsEditor({ value, onChange }: FormSectionProps<InvoiceTemplateConfig["labels"]>) {
  const update = (key: string, val: string) => {
    onChange({ ...value, [key]: val });
  };

  return (
    <div className="bg-slate-50 p-4 rounded-xl border border-slate-205 space-y-3.5">
      <p className="text-[10px] text-slate-500 font-semibold leading-normal">
        Overriding text labels lets you localized template grids immediately into multi languages (e.g. Spanish, German, French) or alter formal vocabulary.
      </p>
      <div className="grid grid-cols-2 gap-3 pt-1">
        {Object.keys(value).map((k) => (
          <div key={k} className="space-y-0.5">
            <label className="block text-[8px] font-black tracking-wider text-slate-505 uppercase">
              {k.replace(/([A-Z])/g, " $1")}
            </label>
            <input
              type="text"
              value={value[k] || ""}
              onChange={(e) => update(k, e.target.value)}
              className="w-full px-2 py-1.5 border border-slate-250 rounded text-xs bg-white text-slate-805 focus:outline-none"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// 8. Watermark Editor config
export function TemplateWatermarkEditor({ value, onChange }: FormSectionProps<InvoiceTemplateConfig["watermark"]>) {
  return (
    <div className="space-y-3.5 bg-slate-50 p-4 rounded-xl border border-slate-205">
      <div className="flex items-center gap-2 select-none">
        <input
          type="checkbox"
          id="watermarkEnabled"
          checked={value.enabled}
          onChange={(e) => onChange({ ...value, enabled: e.target.checked })}
          className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
        />
        <label htmlFor="watermarkEnabled" className="text-xs font-bold text-slate-800 cursor-pointer">
          Enable floating visual watermark layer
        </label>
      </div>
      
      {value.enabled && (
        <div className="space-y-3 pt-2 border-t border-slate-200/50 animate-fade-in text-xs gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] font-black text-slate-500 uppercase mb-1">Watermark Overlay Text</label>
              <input
                type="text"
                value={value.text}
                onChange={(e) => onChange({ ...value, text: e.target.value })}
                className="w-full px-2 py-1.5 border border-slate-250 rounded text-xs bg-white"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-500 uppercase mb-1">Placement Screen</label>
              <select
                value={value.position}
                onChange={(e) => onChange({ ...value, position: e.target.value as any })}
                className="w-full px-2.5 py-1.5 border border-slate-250 rounded text-xs bg-white text-slate-700"
              >
                <option value="center">Centered (Rotasted 45°)</option>
                <option value="bottom-right">Bottom right label</option>
              </select>
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase mb-1">
              <span>Text Ink Opacity</span>
              <span className="font-mono text-blue-600">{(value.opacity * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.4"
              step="0.05"
              value={value.opacity}
              onChange={(e) => onChange({ ...value, opacity: parseFloat(e.target.value) })}
              className="w-full accent-blue-620"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// 9. Simple Section Re-ordering
export function TemplateSectionOrderEditor({ value, onChange }: FormSectionProps<string[]>) {
  const move = (index: number, direction: "up" | "down") => {
    const updated = [...value];
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= updated.length) return;
    
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    onChange(updated);
  };

  const labelsMap: Record<string, string> = {
    header: "Business header & details block",
    meta_info: "Invoices recipient & date specifics",
    line_items: "Line items table list grid",
    totals: "Financial summaries and calculations",
    payment_instructions: "Payment wire instructions bank block",
    notes_terms: "Custom guidelines, agreements, milestones",
    footer: "Legal advisory signature & copyright notes footer",
  };

  return (
    <div className="bg-slate-50 p-4 rounded-xl border border-slate-205 space-y-2">
      <p className="text-[10px] text-slate-500 font-semibold leading-normal mb-2">
        Alter order blocks relative hierarchy level to design custom invoice compositions.
      </p>
      {value.map((sect, idx) => (
        <div key={sect} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 select-none">
          <span className="text-xs font-bold text-slate-800">{labelsMap[sect] || sect}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => move(idx, "up")}
              disabled={idx === 0}
              type="button"
              className="p-1 hover:bg-slate-100 disabled:opacity-30 rounded text-slate-600 transition-colors"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => move(idx, "down")}
              disabled={idx === value.length - 1}
              type="button"
              className="p-1 hover:bg-slate-100 disabled:opacity-30 rounded text-slate-600 transition-colors"
            >
              <ArrowDown className="w-3.5 h-3.5 animate-bounce-none" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
