/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TemplateCategory = "simple" | "professional" | "creative" | "service" | "modern" | "classic";
export type TemplateStatus = "draft" | "published" | "archived";
export type LayoutFamily = "classic" | "modern" | "compact" | "bold" | "minimal" | "service";
export type TemplateLayoutFamily = LayoutFamily | "advanced";
export type DocumentType = "invoice" | "receipt";
export type PageFormat = "A4" | "LETTER" | "RECEIPT_80MM" | "RECEIPT_58MM";
export type TemplateDocumentType = DocumentType;
export type TemplatePageFormat = PageFormat;

export interface PdfmeSchema {
  name: string;
  type: string;
  position: { x: number; y: number };
  width: number;
  height: number;
  [key: string]: unknown;
}

export interface PdfmeBlankBase {
  width: number;
  height: number;
  padding: [number, number, number, number];
  staticSchema?: PdfmeSchema[];
}

export interface PdfmeTemplate {
  basePdf: PdfmeBlankBase;
  schemas: PdfmeSchema[][];
  pdfmeVersion?: string;
  [key: string]: unknown;
}

export interface AdvancedTemplateConfig {
  editor: "pdfme";
  pageFormat: PageFormat;
  template: PdfmeTemplate;
  sampleData: Record<string, string>;
}

export interface InvoiceTemplateConfig {
  theme: {
    primaryColor: string;
    accentColor: string;
    textColor: string;
    mutedTextColor: string;
    borderColor: string;
    backgroundColor: string;
    surfaceColor: string;
  };

  typography: {
    fontFamily: "Inter" | "Helvetica" | "Times-Roman" | "Courier" | "Georgia" | "JetBrains Mono" | "Space Grotesk" | "Outfit";
    headingSize: "sm" | "md" | "lg" | "xl";
    bodySize: "xs" | "sm" | "md";
    lineHeight: "tight" | "normal" | "relaxed";
  };

  page: {
    size: "LETTER" | "A4";
    margin: "compact" | "normal" | "spacious";
    showPageBorder: boolean;
  };

  header: {
    style: "left-logo" | "centered" | "right-meta" | "split" | "minimal";
    logoPosition: "left" | "center" | "right";
    logoSize: "xs" | "sm" | "md" | "lg";
    showInvoiceTitle: boolean;
    invoiceTitleText: string;
    showStatusBadge: boolean;
  };

  businessBlock: {
    position: "header" | "left-column" | "right-column";
    showBusinessName: boolean;
    showContactName: boolean;
    showEmail: boolean;
    showPhone: boolean;
    showWebsite: boolean;
    showAddress: boolean;
    showTaxId: boolean;
  };

  clientBlock: {
    title: string;
    position: "left-column" | "right-column" | "full-width";
    showClientName: boolean;
    showCompany: boolean;
    showEmail: boolean;
    showPhone: boolean;
    showAddress: boolean;
  };

  metaBlock: {
    position: "right-column" | "below-header" | "table";
    showInvoiceNumber: boolean;
    showInvoiceDate: boolean;
    showDueDate: boolean;
    showPaymentTerms: boolean;
    showPoNumber: boolean;
    showProjectName: boolean;
  };

  lineItemsTable: {
    style: "simple" | "striped" | "bordered" | "minimal";
    headerBackground: boolean;
    showItemNumbers: boolean;
    showTaxableColumn: boolean;
    descriptionLabel: string;
    quantityLabel: string;
    rateLabel: string;
    amountLabel: string;
  };

  totalsBlock: {
    position: "right" | "full-width";
    style: "simple" | "boxed" | "highlight-total";
    showSubtotal: boolean;
    showDiscount: boolean;
    showTax: boolean;
    showShipping: boolean;
    showAmountPaid: boolean;
    showBalanceDue: boolean;
    emphasizeBalanceDue: boolean;
  };

  paymentBlock: {
    title: string;
    style: "plain" | "boxed" | "muted";
    showPaymentMethods: boolean;
    showInstructions: boolean;
    showLateFeeNote: boolean;
  };

  notesBlock: {
    title: string;
    style: "plain" | "boxed" | "muted";
    showNotes: boolean;
    showTerms: boolean;
    showThankYouNote: boolean;
  };

  footer: {
    showFooter: boolean;
    text: string;
    showGeneratedWith: boolean;
    alignment: "left" | "center" | "right";
  };

  watermark: {
    enabled: boolean;
    text: string;
    opacity: number;
    position: "center" | "bottom-right";
  };

  sectionOrder: string[];

  labels: {
    invoiceTitle: string;
    billTo: string;
    from: string;
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string;
    paymentTerms: string;
    poNumber: string;
    projectName: string;
    subtotal: string;
    discount: string;
    tax: string;
    shipping: string;
    amountPaid: string;
    total: string;
    balanceDue: string;
    paymentInstructions: string;
    notes: string;
    terms: string;
  };

  visibility: {
    showLogo: boolean;
    showBusinessBlock: boolean;
    showClientBlock: boolean;
    showMetaBlock: boolean;
    showLineItems: boolean;
    showTotals: boolean;
    showPaymentInstructions: boolean;
    showNotes: boolean;
    showTerms: boolean;
    showFooter: boolean;
  };

  pdf: {
    pageSize: "LETTER" | "A4";
    orientation: "portrait";
    repeatTableHeader: boolean;
    avoidRowSplit: boolean;
    showPageNumbers: boolean;
  };
}

export interface InvoiceTemplate {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: TemplateCategory;
  status: TemplateStatus;
  isDefault: boolean;
  version: number;
  documentType: "invoice";
  layoutFamily: LayoutFamily;
  config: InvoiceTemplateConfig;
  thumbnailUrl?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  createdBy?: string;
  updatedBy?: string;
  isPremium?: boolean;
  requiredPlan?: "free" | "pro" | "business";
}

export interface AdvancedDocumentTemplate extends Omit<
  InvoiceTemplate,
  "documentType" | "layoutFamily" | "config"
> {
  documentType: DocumentType;
  layoutFamily: "advanced";
  config: AdvancedTemplateConfig;
}

export type DocumentTemplate = InvoiceTemplate | AdvancedDocumentTemplate;
