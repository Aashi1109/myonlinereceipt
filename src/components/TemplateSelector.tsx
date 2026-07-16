/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from "react";
import { InvoiceTemplate, TemplateCategory } from "../lib/templates/templateTypes";
import { TemplateService } from "../lib/templates/templateService";
import { Search, Grid, Check, Sparkles, Filter } from "lucide-react";

interface TemplateSelectorProps {
  selectedTemplateId: string;
  onSelect: (template: InvoiceTemplate) => void;
}

export default function TemplateSelector({
  selectedTemplateId,
  onSelect,
}: TemplateSelectorProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const templates = useMemo(() => {
    return TemplateService.getPublishedTemplates();
  }, []);

  const categories = useMemo(() => {
    const list = new Set<string>();
    templates.forEach(t => list.add(t.category));
    return ["all", ...Array.from(list)];
  }, [templates]);

  // Filtering Logic
  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      const matchSearch = 
        t.name.toLowerCase().includes(search.toLowerCase()) || 
        t.description.toLowerCase().includes(search.toLowerCase());
      const matchCategory = activeCategory === "all" || t.category === activeCategory;
      return matchSearch && matchCategory;
    });
  }, [templates, search, activeCategory]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 space-y-4 no-print shadow-sm" id="template-selector-container">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="font-extrabold text-slate-900 text-base tracking-tight flex items-center gap-2">
            <Grid className="w-5 h-5 text-blue-600" />
            <span>Select Invoice Design Theme</span>
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Dynamic structure scales immediately based on layout. No lost draft.
          </p>
        </div>

        {/* Small badge of total count */}
        <span className="text-[10px] font-extrabold text-blue-700 bg-blue-55 rounded-full px-2.5 py-0.5 border border-blue-105">
          {templates.length} Published Styles
        </span>
      </div>

      {/* Grid: search & filters */}
      <div className="flex flex-col md:flex-row gap-3">
        
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search layout names or attributes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-250 rounded-xl text-xs bg-slate-55/40 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
          />
        </div>

        {/* Mobile Category Select */}
        <div className="block md:hidden relative">
          <select
            value={activeCategory}
            onChange={(e) => setActiveCategory(e.target.value)}
            className="w-full px-3 py-2 border border-slate-250 rounded-xl text-xs bg-white text-slate-800 font-semibold"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                Category: {c.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        {/* Desktop Category Filter Chips */}
        <div className="hidden md:flex flex-wrap items-center gap-1.5">
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide cursor-pointer transition-all ${
                  isActive
                    ? "bg-blue-600 border-blue-600 text-white shadow-xs"
                    : "bg-slate-100 border-slate-150 text-slate-600 hover:bg-slate-200 border"
                }`}
              >
                {cat === "all" ? "All Designs" : cat.toUpperCase()}
              </button>
            );
          })}
        </div>
      </div>

      {/* Cards Scrollbox */}
      {filteredTemplates.length > 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4" id="template-options-grid">
          {filteredTemplates.map((tpl) => {
            const isSelected = tpl.id === selectedTemplateId;
            const primaryColor = tpl.config.theme.primaryColor;
            
            return (
              <div
                key={tpl.id}
                onClick={() => onSelect(tpl)}
                style={{ borderColor: isSelected ? primaryColor : undefined }}
                className={`relative p-4 rounded-xl border flex flex-col justify-between gap-3 bg-slate-55/10 hover:bg-slate-55/35 cursor-pointer transition-all duration-150 group select-none ${
                  isSelected 
                    ? "shadow-sm bg-white ring-1" 
                    : "border-slate-200/80"
                }`}
              >
                {/* Header indicators */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span 
                      className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border"
                      style={{ 
                        color: primaryColor, 
                        borderColor: `${primaryColor}30`, 
                        backgroundColor: `${primaryColor}08` 
                      }}
                    >
                      {tpl.category}
                    </span>

                    {tpl.isDefault && (
                      <span className="flex items-center gap-0.5 text-[8px] font-black text-amber-700 bg-amber-50 rounded border border-amber-150 px-1.5">
                        <Sparkles className="w-2.5 h-2.5 fill-amber-300 text-amber-600" />
                        DEFAULT
                      </span>
                    )}
                  </div>

                  <h4 className="font-extrabold text-slate-900 text-xs tracking-tight pt-1 group-hover:text-blue-700 transition-colors">
                    {tpl.name}
                  </h4>
                  <p className="text-[10px] text-slate-500 leading-normal line-clamp-2">
                    {tpl.description}
                  </p>
                </div>

                {/* Card footer mini stats */}
                <div className="flex justify-between items-center pt-2 border-t border-slate-100/60 text-[9px] text-slate-400 font-semibold font-mono">
                  <span>Layout: {tpl.layoutFamily}</span>
                  {isSelected ? (
                    <span className="inline-flex items-center gap-0.5 text-blue-600 font-extrabold" style={{ color: primaryColor }}>
                      <Check className="w-3.5 h-3.5" />
                      ACTIVE
                    </span>
                  ) : (
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-600 font-bold">
                      Use Style &rarr;
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <p className="text-xs text-slate-400 italic">No matching published invoice themes found for your filter</p>
        </div>
      )}
    </div>
  );
}
