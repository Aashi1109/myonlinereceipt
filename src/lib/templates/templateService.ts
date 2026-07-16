/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { InvoiceTemplate, InvoiceTemplateConfig } from "./templateTypes";
import { seedTemplates } from "./templateSeeds";

const STORAGE_KEY = "paperwork_kit_invoice_templates";

async function syncTemplatesFromDb() {
  try {
    const res = await fetch("/api/templates");
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.templates) && data.templates.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data.templates));
        // Force list refresh internally if needed or let standard React reactivity handle it on subsequent render
      }
    }
  } catch (err) {
    console.warn("Failed background sync profile of templates from Postgres DB:", err);
  }
}

// Trigger background sync on client init
if (typeof window !== "undefined") {
  syncTemplatesFromDb();
}

export class TemplateService {
  /**
   * Initialize and fetch all templates (or seeds if storage is empty)
   */
  static getAllTemplates(): InvoiceTemplate[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error("Failed to fetch templates from localStorage. Falling back to seeds.", e);
    }
    
    // Seed and persist if empty
    TemplateService.saveToStorage(seedTemplates);
    return seedTemplates;
  }

  /**
   * Returns only templates that are published (for public user selector)
   */
  static getPublishedTemplates(): InvoiceTemplate[] {
    return TemplateService.getAllTemplates().filter(t => t.status === "published");
  }

  /**
   * Retrieves template by ID
   */
  static getTemplateById(id: string): InvoiceTemplate | undefined {
    return TemplateService.getAllTemplates().find(t => t.id === id);
  }

  /**
   * Retrieves template by Slug
   */
  static getTemplateBySlug(slug: string): InvoiceTemplate | undefined {
    return TemplateService.getAllTemplates().find(t => t.slug === slug);
  }

  /**
   * Save array to storage
   */
  private static saveToStorage(templates: InvoiceTemplate[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
      
      // Perform background sync to Postgres
      fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templates }),
      }).catch(err => {
        console.warn("Failed background write profile of templates to Postgres DB:", err);
      });
    } catch (e) {
      console.error("Failed to write templates to localStorage", e);
    }
  }

  /**
   * Helper to validate and clean slugs
   */
  static cleanSlug(slug: string): string {
    return slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-") // Allow only lowercase, digit, hyphen
      .replace(/-+/g, "-")         // Collapse multi-hyphens
      .replace(/^-|-$/g, "");      // Strip leading/trailing hyphens
  }

  /**
   * Generates a unique slug by appending numbers to avoid collisions
   */
  static makeUniqueSlug(candidate: string, excludeId?: string): string {
    const cleaned = TemplateService.cleanSlug(candidate) || "template";
    const templates = TemplateService.getAllTemplates();
    
    let slug = cleaned;
    let counter = 1;
    
    while (templates.some(t => t.slug === slug && t.id !== excludeId)) {
      slug = `${cleaned}-${counter}`;
      counter++;
    }
    
    return slug;
  }

  /**
   * Check if slug already exists
   */
  static isSlugTaken(slug: string, id?: string): boolean {
    const cleaned = TemplateService.cleanSlug(slug);
    const templates = TemplateService.getAllTemplates();
    return templates.some(t => t.slug === cleaned && t.id !== id);
  }

  /**
   * Create a template
   */
  static createTemplate(template: Omit<InvoiceTemplate, "id" | "createdAt" | "updatedAt">): InvoiceTemplate {
    const templates = TemplateService.getAllTemplates();
    const id = "tpl_" + Math.random().toString(36).substr(2, 9);
    
    const slug = TemplateService.makeUniqueSlug(template.slug || template.name);
    
    const newTemplate: InvoiceTemplate = {
      ...template,
      id,
      slug,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // If setting default, unset others (only if published)
    if (newTemplate.isDefault && newTemplate.status === "published") {
      templates.forEach(t => t.isDefault = false);
    } else {
      newTemplate.isDefault = false; // Drafts/Archived cannot be default
    }

    templates.push(newTemplate);
    TemplateService.saveToStorage(templates);
    return newTemplate;
  }

  /**
   * Update template
   */
  static updateTemplate(id: string, updates: Partial<InvoiceTemplate>): InvoiceTemplate {
    const templates = TemplateService.getAllTemplates();
    const idx = templates.findIndex(t => t.id === id);
    if (idx === -1) {
      throw new Error(`Template not found: ${id}`);
    }

    const current = templates[idx];
    const newSlug = updates.slug 
      ? TemplateService.cleanSlug(updates.slug) 
      : current.slug;

    const finalSlug = TemplateService.isSlugTaken(newSlug, id)
      ? TemplateService.makeUniqueSlug(newSlug, id)
      : newSlug;

    const updated: InvoiceTemplate = {
      ...current,
      ...updates,
      slug: finalSlug,
      updatedAt: new Date().toISOString(),
    };

    // Handle isDefault logic: must be published to be default
    if (updated.isDefault) {
      if (updated.status !== "published") {
        updated.isDefault = false;
      } else {
        templates.forEach(t => {
          if (t.id !== id) t.isDefault = false;
        });
      }
    }

    templates[idx] = updated;
    TemplateService.saveToStorage(templates);
    return updated;
  }

  /**
   * Duplicate template
   */
  static duplicateTemplate(id: string): InvoiceTemplate {
    const original = TemplateService.getTemplateById(id);
    if (!original) {
      throw new Error(`Template not found: ${id}`);
    }

    const name = `${original.name} Copy`;
    const slug = TemplateService.makeUniqueSlug(`${original.slug}-copy`);

    return TemplateService.createTemplate({
      name,
      slug,
      description: original.description || `Copy of ${original.name}`,
      category: original.category,
      status: "draft",
      isDefault: false,
      version: 1,
      documentType: "invoice",
      layoutFamily: original.layoutFamily,
      config: JSON.parse(JSON.stringify(original.config)), // deep clone config
    });
  }

  /**
   * Set dynamic default template
   */
  static setDefaultTemplate(id: string): void {
    const templates = TemplateService.getAllTemplates();
    const target = templates.find(t => t.id === id);
    if (!target) return;
    if (target.status !== "published") {
      throw new Error("Only published templates can be set as default.");
    }

    templates.forEach(t => {
      t.isDefault = t.id === id;
    });

    TemplateService.saveToStorage(templates);
  }

  /**
   * Return the fallback default template
   */
  static getDefaultTemplate(): InvoiceTemplate {
    const templates = TemplateService.getPublishedTemplates();
    const defaultTpl = templates.find(t => t.isDefault);
    if (defaultTpl) return defaultTpl;
    
    // Fallback to first published, then fallback to seed
    if (templates.length > 0) return templates[0];
    return seedTemplates[0];
  }

  /**
   * Export JSON data
   */
  static exportTemplateJson(template: InvoiceTemplate): string {
    // Exclude database IDs or audit fields
    const payload = {
      name: template.name,
      slug: template.slug,
      description: template.description || "",
      category: template.category,
      documentType: template.documentType,
      layoutFamily: template.layoutFamily,
      config: template.config,
      version: template.version || 1,
      isPremium: template.isPremium || false,
      requiredPlan: template.requiredPlan || "free",
    };
    return JSON.stringify(payload, null, 2);
  }

  /**
   * Import template JSON
   */
  static importTemplateJson(jsonString: string): InvoiceTemplate {
    const parsed = JSON.parse(jsonString);
    if (!parsed.name || !parsed.layoutFamily || !parsed.config) {
      throw new Error("Invalid structure: missing required name, layoutFamily, or config.");
    }

    // Prepare standard imported template
    const slug = TemplateService.makeUniqueSlug(parsed.slug || parsed.name);
    
    return TemplateService.createTemplate({
      name: parsed.name,
      slug,
      description: parsed.description || "Imported template",
      category: parsed.category || "simple",
      status: "draft", // always default to drafts for safety
      isDefault: false,
      version: parsed.version || 1,
      documentType: "invoice",
      layoutFamily: parsed.layoutFamily,
      config: parsed.config,
      isPremium: parsed.isPremium || false,
      requiredPlan: parsed.requiredPlan || "free",
    });
  }

  /**
   * Restore/Reset to original Seeds (Wipes current custom changes)
   */
  static restoreAllToSeeds(): void {
    TemplateService.saveToStorage(seedTemplates);
  }
}
export default TemplateService;
