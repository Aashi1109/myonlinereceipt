/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from "react";
import { InvoiceTemplate, TemplateCategory, TemplateStatus, LayoutFamily } from "../../lib/templates/templateTypes";
import { TemplateService } from "../../lib/templates/templateService";
import { 
  Search, 
  Settings, 
  Trash2, 
  Sparkles, 
  Copy, 
  FileDown, 
  FileUp, 
  Plus, 
  Eye, 
  Archive, 
  CheckCircle, 
  RefreshCw,
  FolderOpen,
  ArrowLeft
} from "lucide-react";

interface TemplateListTableProps {
  onEdit: (id: string) => void;
  onPreview: (id: string) => void;
  onCreateNew: () => void;
  showToast: (msg: string) => void;
}

export default function TemplateListTable({
  onEdit,
  onPreview,
  onCreateNew,
  showToast,
}: TemplateListTableProps) {
  const [templates, setTemplates] = useState<InvoiceTemplate[]>(() => TemplateService.getAllTemplates());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [layoutFilter, setLayoutFilter] = useState<string>("all");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync templates
  const refreshTemplates = () => {
    setTemplates(TemplateService.getAllTemplates());
  };

  // Stats Counters
  const stats = useMemo(() => {
    return {
      total: templates.length,
      published: templates.filter(t => t.status === "published").length,
      draft: templates.filter(t => t.status === "draft").length,
      archived: templates.filter(t => t.status === "archived").length,
    };
  }, [templates]);

  // Filtering list
  const filtered = useMemo(() => {
    return templates.filter((t) => {
      const matchesSearch = 
        t.name.toLowerCase().includes(search.toLowerCase()) || 
        t.slug.toLowerCase().includes(search.toLowerCase()) ||
        (t.description || "").toLowerCase().includes(search.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || t.status === statusFilter;
      const matchesLayout = layoutFilter === "all" || t.layoutFamily === layoutFilter;

      return matchesSearch && matchesStatus && matchesLayout;
    });
  }, [templates, search, statusFilter, layoutFilter]);

  // Actions
  const handleDuplicate = (id: string) => {
    try {
      const duplicated = TemplateService.duplicateTemplate(id);
      showToast(`Duplicated "${duplicated.name}" successfully to drafts!`);
      refreshTemplates();
    } catch (e: any) {
      showToast(`Error: ${e.message}`);
    }
  };

  const handleSetDefault = (id: string) => {
    try {
      TemplateService.setDefaultTemplate(id);
      showToast("Changed active template default key!");
      refreshTemplates();
    } catch (e: any) {
      showToast(`Error: ${e.message}`);
    }
  };

  const handleArchive = (id: string) => {
    try {
      TemplateService.updateTemplate(id, { status: "archived", isDefault: false });
      showToast("Template archived. Unusable for public generators.");
      refreshTemplates();
    } catch (e: any) {
      showToast(`Error: ${e.message}`);
    }
  };

  const handlePublish = (id: string) => {
    try {
      TemplateService.updateTemplate(id, { status: "published" });
      showToast("Template published to public selector!");
      refreshTemplates();
    } catch (e: any) {
      showToast(`Error: ${e.message}`);
    }
  };

  const handleExportJSON = (tpl: InvoiceTemplate) => {
    try {
      const payload = TemplateService.exportTemplateJson(tpl);
      const blob = new Blob([payload], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `template-${tpl.slug}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast(`Exported "${tpl.name}" JSON payload successfully.`);
    } catch (e: any) {
      showToast(`Export failed: ${e.message}`);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const imported = TemplateService.importTemplateJson(text);
        showToast(`Imported "${imported.name}" successfully! Saved as Draft.`);
        refreshTemplates();
      } catch (err: any) {
        showToast(`Import validation failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // reset
  };

  const handleResetToSeeds = () => {
    if (window.confirm("Are you sure you want to reset all configurations? This will revert everything to the original 6 prebuilt seed templates and wipe custom edits.")) {
      TemplateService.restoreAllToSeeds();
      showToast("Database reset to original seed templates!");
      refreshTemplates();
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 select-none font-sans" id="admin-dashboard-root">
      
      {/* Exit admin to tools navigator */}
      <div className="flex">
        <button
          onClick={() => {
            window.location.hash = "#invoice-generator";
          }}
          type="button"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-550 hover:text-slate-900 bg-white hover:bg-slate-50/80 border border-slate-205 rounded-xl shadow-3xs hover:shadow-2xs cursor-pointer transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-blue-600" />
          <span>Exit Admin View • Return to Tools Panel</span>
        </button>
      </div>

      {/* Hidden layout file uploader */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileImport} 
        accept=".json,application/json" 
        className="hidden" 
      />

      {/* Hero Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-2xl font-black text-slate-950 tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-600 animate-spin-slow" />
            <span>Invoice Template Architecture Manager</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium pt-0.5">
            Create, duplicate, publish configs side-by-side. Safe schema persistence applies instantly.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleResetToSeeds}
            type="button"
            className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-600 font-bold text-xs flex items-center gap-1 cursor-pointer transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset to Seeds
          </button>
          <button
            onClick={handleImportClick}
            type="button"
            className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-600 font-bold text-xs flex items-center gap-1 cursor-pointer transition-all"
          >
            <FileUp className="w-3.5 h-3.5" />
            Import JSON
          </button>
          <button
            onClick={onCreateNew}
            type="button"
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center gap-1 shadow-xs cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            New Template
          </button>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" id="stats-dashboard-row">
        {[
          { label: "Total Configs", val: stats.total, color: "border-slate-300 text-slate-900 bg-slate-50" },
          { label: "Published Themes", val: stats.published, color: "border-emerald-200 text-emerald-800 bg-emerald-50/50" },
          { label: "Draft Forms", val: stats.draft, color: "border-blue-200 text-blue-800 bg-blue-50/45" },
          { label: "Archived Assets", val: stats.archived, color: "border-zinc-200 text-zinc-650 bg-zinc-50" },
        ].map((s, idx) => (
          <div key={idx} className={`p-4 rounded-xl border flex flex-col justify-between ${s.color}`}>
            <span className="text-[10px] font-black uppercase tracking-wider opacity-60">{s.label}</span>
            <span className="text-3xl font-black mt-2 leading-none">{s.val}</span>
          </div>
        ))}
      </div>

      {/* Search and filter controls row */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl flex flex-col md:flex-row gap-3 shadow-xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search custom layouts by name, slug or criteria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-250 rounded-lg text-xs bg-slate-50/70 text-slate-800 placeholder-slate-400"
          />
        </div>

        {/* Filter Status */}
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-250 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-700 font-semibold cursor-pointer"
          >
            <option value="all">Status: All</option>
            <option value="published">Status: Published</option>
            <option value="draft">Status: Draft</option>
            <option value="archived">Status: Archived</option>
          </select>

          {/* Filter Layout */}
          <select
            value={layoutFilter}
            onChange={(e) => setLayoutFilter(e.target.value)}
            className="border border-slate-250 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-700 font-semibold cursor-pointer"
          >
            <option value="all">Layout: All</option>
            <option value="classic">Layout: Classic</option>
            <option value="modern">Layout: Modern</option>
            <option value="compact">Layout: Compact</option>
            <option value="bold">Layout: Bold</option>
            <option value="minimal">Layout: Minimal</option>
            <option value="service">Layout: Service</option>
          </select>
        </div>
      </div>

      {/* Layout Grid / Table list */}
      {filtered.length > 0 ? (
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
          <table className="w-full text-left text-xs divide-y divide-slate-100">
            <thead>
              <tr className="bg-slate-50/80 text-slate-400 font-black tracking-wider uppercase text-[10px]">
                <th className="py-3 px-4">Template name & Slug</th>
                <th className="py-3 px-4">Layout Family</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Status & Flags</th>
                <th className="py-3 px-4">Revision</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 font-semibold">
              {filtered.map((tpl) => {
                const primaryColor = tpl.config.theme.primaryColor;
                return (
                  <tr key={tpl.id} className="hover:bg-slate-50/40 select-none">
                    
                    {/* Name block */}
                    <td className="py-3 px-4">
                      <p className="font-extrabold text-slate-950 text-sm hover:text-blue-650 cursor-pointer" onClick={() => onEdit(tpl.id)}>
                        {tpl.name}
                      </p>
                      <span className="font-mono text-[10px] text-slate-400 font-medium block">
                        slug: /{tpl.slug}
                      </span>
                    </td>

                    {/* Family block */}
                    <td className="py-3 px-4">
                      <span className="font-mono text-[10.5px] bg-slate-100 text-slate-800 border border-slate-200 px-2 py-0.5 rounded capitalize">
                        {tpl.layoutFamily}
                      </span>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4 capitalize text-slate-705">
                      {tpl.category}
                    </td>

                    {/* Status badges */}
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {tpl.status === "published" && (
                          <span className="text-[9px] font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-150 uppercase tracking-widest">
                            Published
                          </span>
                        )}
                        {tpl.status === "draft" && (
                          <span className="text-[9px] font-black text-blue-800 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-150 uppercase tracking-widest">
                            Draft
                          </span>
                        )}
                        {tpl.status === "archived" && (
                          <span className="text-[9px] font-black text-zinc-650 bg-zinc-100 px-2 py-0.5 rounded-full border border-zinc-200 uppercase tracking-widest">
                            Archived
                          </span>
                        )}

                        {tpl.isDefault && (
                          <span className="text-[9px] font-black text-amber-805 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 tracking-wider flex items-center gap-0.5 uppercase">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-300 shrink-0" />
                            DEFAULT
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Version */}
                    <td className="py-3 px-4 font-mono font-bold text-slate-500">
                      v{tpl.version}
                    </td>

                    {/* Controls Actions Row */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        <button
                          onClick={() => onEdit(tpl.id)}
                          title="Edit Settings"
                          type="button"
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-700 cursor-pointer"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onPreview(tpl.id)}
                          title="Full screen preview"
                          type="button"
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-700 cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDuplicate(tpl.id)}
                          title="Duplicate config"
                          type="button"
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-700 cursor-pointer"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleExportJSON(tpl)}
                          title="Export standard JSON payload"
                          type="button"
                          className="p-1.5 rounded hover:bg-slate-100 text-neutral-600 cursor-pointer"
                        >
                          <FileDown className="w-4 h-4" />
                        </button>

                        {/* Status switching shortcuts */}
                        {tpl.status === "published" && !tpl.isDefault && (
                          <button
                            onClick={() => handleSetDefault(tpl.id)}
                            title="Set as active system default"
                            type="button"
                            className="p-1.5 rounded hover:bg-amber-50 text-amber-600 cursor-pointer"
                          >
                            <Sparkles className="w-4 h-4" />
                          </button>
                        )}
                        {tpl.status !== "published" && (
                          <button
                            onClick={() => handlePublish(tpl.id)}
                            title="Publish statement"
                            type="button"
                            className="p-1.5 rounded hover:bg-emerald-50 text-emerald-600 cursor-pointer"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        {tpl.status !== "archived" && (
                          <button
                            onClick={() => handleArchive(tpl.id)}
                            title="Archive theme"
                            type="button"
                            className="p-1.5 rounded hover:bg-rose-50 text-rose-600 cursor-pointer"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-xl space-y-3">
          <FolderOpen className="w-12 h-12 text-slate-300 mx-auto animate-bounce-none" />
          <h4 className="font-extrabold text-slate-900 text-base">No Matching Themes Found</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Try adjusting your search keywords, clear filter status tabs, or load standard template presets.
          </p>
          <button
            onClick={onCreateNew}
            type="button"
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs inline-flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create new invoice theme</span>
          </button>
        </div>
      )}
    </div>
  );
}
