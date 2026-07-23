/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  AdvancedTemplateConfig,
  DocumentType,
  PageFormat,
  PdfmeBlankBase,
  PdfmeSchema,
} from "./templateTypes.ts";

type PageSpec = PdfmeBlankBase & {
  documentType: DocumentType;
};

const PAGE_SPECS: Record<PageFormat, PageSpec> = {
  A4: {
    documentType: "invoice",
    width: 210,
    height: 297,
    padding: [15, 15, 15, 15],
  },
  LETTER: {
    documentType: "invoice",
    width: 215.9,
    height: 279.4,
    padding: [15, 15, 15, 15],
  },
  RECEIPT_80MM: {
    documentType: "receipt",
    width: 80,
    height: 200,
    padding: [5, 5, 5, 5],
  },
  RECEIPT_58MM: {
    documentType: "receipt",
    width: 58,
    height: 180,
    padding: [5, 5, 5, 5],
  },
};

function cellStyle(backgroundColor: string, fontColor: string) {
  return {
    alignment: "left",
    verticalAlignment: "middle",
    fontSize: 9,
    lineHeight: 1.2,
    characterSpacing: 0,
    fontColor,
    backgroundColor,
    borderColor: "#CBD5E1",
    borderWidth: { top: 0.2, right: 0.2, bottom: 0.2, left: 0.2 },
    padding: { top: 2, right: 2, bottom: 2, left: 2 },
  };
}

function withPdfmeDefaults(schema: PdfmeSchema): PdfmeSchema {
  if (schema.type === "table") {
    return {
      showHead: true,
      repeatHead: true,
      tableStyles: {
        borderColor: "#CBD5E1",
        borderWidth: 0.2,
      },
      headStyles: cellStyle("#2563EB", "#FFFFFF"),
      bodyStyles: {
        ...cellStyle("#FFFFFF", "#111827"),
        alternateBackgroundColor: "#F8FAFC",
      },
      columnStyles: {},
      ...schema,
    };
  }

  if (schema.type === "text") {
    return {
      alignment: "left",
      verticalAlignment: "top",
      fontSize: 10,
      lineHeight: 1.2,
      characterSpacing: 0,
      fontColor: "#111827",
      backgroundColor: "",
      ...schema,
    };
  }

  return schema;
}

export function isSupportedPageFormat(
  documentType: DocumentType,
  pageFormat: PageFormat,
): boolean {
  return PAGE_SPECS[pageFormat].documentType === documentType;
}

function invoiceDefaults(
  pageFormat: Extract<PageFormat, "A4" | "LETTER">,
  basePdf: PdfmeBlankBase,
): AdvancedTemplateConfig {
  const x = basePdf.padding[3];
  const width = basePdf.width - x - basePdf.padding[1];
  const sampleData = {
    businessName: "Northstar Studio",
    businessAddress: "42 Market Street, Bengaluru, Karnataka 560001",
    documentTitle: "INVOICE",
    documentNumber: "INV-2026-0421",
    issueDate: "July 23, 2026",
    dueDate: "August 22, 2026",
    customerLabel: "BILL TO",
    customerName: "Avery Morgan",
    customerAddress: "Brightside Labs\n18 Residency Road\nBengaluru, Karnataka 560025",
    lineItems: JSON.stringify([
      ["Brand strategy workshop", "1", "$1,200.00", "$1,200.00"],
      ["Website design", "24", "$75.00", "$1,800.00"],
    ]),
    subtotal: "$3,000.00",
    tax: "$540.00",
    total: "$3,540.00",
    notes: "Thank you for your business. Payment is due within 30 days.",
  };

  return {
    editor: "pdfme",
    pageFormat,
    template: {
      basePdf,
      schemas: [[
        {
          name: "businessName",
          type: "text",
          content: sampleData.businessName,
          position: { x, y: 15 },
          width: width * 0.58,
          height: 10,
          fontSize: 20,
          fontColor: "#111827",
        },
        {
          name: "businessAddress",
          type: "text",
          content: sampleData.businessAddress,
          position: { x, y: 27 },
          width: width * 0.58,
          height: 12,
          fontSize: 9,
          fontColor: "#64748B",
        },
        {
          name: "documentTitle",
          type: "text",
          content: sampleData.documentTitle,
          position: { x: x + width * 0.68, y: 15 },
          width: width * 0.32,
          height: 10,
          fontSize: 18,
          fontColor: "#2563EB",
          alignment: "right",
        },
        {
          name: "documentNumber",
          type: "text",
          content: sampleData.documentNumber,
          position: { x: x + width * 0.68, y: 28 },
          width: width * 0.32,
          height: 6,
          fontSize: 9,
          fontColor: "#334155",
          alignment: "right",
        },
        {
          name: "issueDate",
          type: "text",
          content: sampleData.issueDate,
          position: { x: x + width * 0.68, y: 35 },
          width: width * 0.32,
          height: 6,
          fontSize: 9,
          fontColor: "#334155",
          alignment: "right",
        },
        {
          name: "dueDate",
          type: "text",
          content: `Due ${sampleData.dueDate}`,
          position: { x: x + width * 0.68, y: 42 },
          width: width * 0.32,
          height: 6,
          fontSize: 9,
          fontColor: "#334155",
          alignment: "right",
        },
        {
          name: "customerLabel",
          type: "text",
          content: sampleData.customerLabel,
          position: { x, y: 55 },
          width: width * 0.45,
          height: 6,
          fontSize: 8,
          fontColor: "#2563EB",
        },
        {
          name: "customerName",
          type: "text",
          content: sampleData.customerName,
          position: { x, y: 63 },
          width: width * 0.45,
          height: 7,
          fontSize: 11,
          fontColor: "#111827",
        },
        {
          name: "customerAddress",
          type: "text",
          content: sampleData.customerAddress,
          position: { x, y: 71 },
          width: width * 0.45,
          height: 18,
          fontSize: 9,
          fontColor: "#475569",
        },
        {
          name: "lineItems",
          type: "table",
          content: sampleData.lineItems,
          position: { x, y: 98 },
          width,
          height: 58,
          showHead: true,
          head: ["Description", "Qty", "Rate", "Amount"],
          headWidthPercentages: [52, 10, 18, 20],
        },
        {
          name: "subtotal",
          type: "text",
          content: `Subtotal  ${sampleData.subtotal}`,
          position: { x: x + width * 0.62, y: 166 },
          width: width * 0.38,
          height: 7,
          fontSize: 9,
          fontColor: "#334155",
          alignment: "right",
        },
        {
          name: "tax",
          type: "text",
          content: `Tax  ${sampleData.tax}`,
          position: { x: x + width * 0.62, y: 175 },
          width: width * 0.38,
          height: 7,
          fontSize: 9,
          fontColor: "#334155",
          alignment: "right",
        },
        {
          name: "total",
          type: "text",
          content: `Total  ${sampleData.total}`,
          position: { x: x + width * 0.58, y: 186 },
          width: width * 0.42,
          height: 10,
          fontSize: 14,
          fontColor: "#2563EB",
          alignment: "right",
        },
        {
          name: "notes",
          type: "text",
          content: sampleData.notes,
          position: { x, y: 218 },
          width,
          height: 14,
          fontSize: 9,
          fontColor: "#64748B",
        },
      ].map(withPdfmeDefaults)],
    },
    sampleData,
  };
}

function receiptDefaults(
  pageFormat: Extract<PageFormat, "RECEIPT_80MM" | "RECEIPT_58MM">,
  basePdf: PdfmeBlankBase,
): AdvancedTemplateConfig {
  const x = basePdf.padding[3];
  const width = basePdf.width - x - basePdf.padding[1];
  const sampleData = {
    businessName: "Northstar Market",
    businessAddress: "42 Market Street, Bengaluru\n+91 80 4567 8900",
    documentTitle: "RECEIPT",
    documentNumber: "RCP-2026-0184",
    issueDate: "July 23, 2026 · 4:32 PM",
    customerName: "Avery Morgan",
    lineItems: JSON.stringify([
      ["Cold brew coffee", "2", "$12.00"],
      ["Almond croissant", "1", "$4.50"],
      ["Canvas tote bag", "1", "$18.00"],
    ]),
    subtotal: "$34.50",
    tax: "$2.76",
    total: "$37.26",
    paymentMethod: "Visa •••• 4242",
    notes: "Thank you for stopping by!",
  };

  return {
    editor: "pdfme",
    pageFormat,
    template: {
      basePdf,
      schemas: [[
        {
          name: "businessName",
          type: "text",
          content: sampleData.businessName,
          position: { x, y: 7 },
          width,
          height: 8,
          fontSize: pageFormat === "RECEIPT_58MM" ? 13 : 16,
          fontColor: "#111827",
          alignment: "center",
        },
        {
          name: "businessAddress",
          type: "text",
          content: sampleData.businessAddress,
          position: { x, y: 17 },
          width,
          height: 12,
          fontSize: 7,
          fontColor: "#64748B",
          alignment: "center",
        },
        {
          name: "documentTitle",
          type: "text",
          content: sampleData.documentTitle,
          position: { x, y: 32 },
          width,
          height: 7,
          fontSize: 9,
          fontColor: "#111827",
          alignment: "center",
        },
        {
          name: "documentNumber",
          type: "text",
          content: sampleData.documentNumber,
          position: { x, y: 41 },
          width,
          height: 5,
          fontSize: 7,
          fontColor: "#475569",
          alignment: "center",
        },
        {
          name: "issueDate",
          type: "text",
          content: sampleData.issueDate,
          position: { x, y: 47 },
          width,
          height: 5,
          fontSize: 7,
          fontColor: "#475569",
          alignment: "center",
        },
        {
          name: "lineItems",
          type: "table",
          content: sampleData.lineItems,
          position: { x, y: 58 },
          width,
          height: 54,
          showHead: true,
          head: ["Item", "Qty", "Amount"],
          headWidthPercentages: [58, 12, 30],
        },
        {
          name: "subtotal",
          type: "text",
          content: `Subtotal  ${sampleData.subtotal}`,
          position: { x, y: 119 },
          width,
          height: 6,
          fontSize: 8,
          fontColor: "#334155",
          alignment: "right",
        },
        {
          name: "tax",
          type: "text",
          content: `Tax  ${sampleData.tax}`,
          position: { x, y: 126 },
          width,
          height: 6,
          fontSize: 8,
          fontColor: "#334155",
          alignment: "right",
        },
        {
          name: "total",
          type: "text",
          content: `TOTAL  ${sampleData.total}`,
          position: { x, y: 135 },
          width,
          height: 8,
          fontSize: 11,
          fontColor: "#111827",
          alignment: "right",
        },
        {
          name: "paymentMethod",
          type: "text",
          content: sampleData.paymentMethod,
          position: { x, y: 147 },
          width,
          height: 6,
          fontSize: 7,
          fontColor: "#475569",
          alignment: "center",
        },
        {
          name: "notes",
          type: "text",
          content: sampleData.notes,
          position: { x, y: 160 },
          width,
          height: 8,
          fontSize: 8,
          fontColor: "#334155",
          alignment: "center",
        },
      ].map(withPdfmeDefaults)],
    },
    sampleData,
  };
}

export function createAdvancedTemplateConfig(
  documentType: DocumentType,
  pageFormat: PageFormat,
): AdvancedTemplateConfig {
  const pageSpec = PAGE_SPECS[pageFormat];
  if (!pageSpec || !isSupportedPageFormat(documentType, pageFormat)) {
    throw new RangeError(
      `${pageFormat} is not supported for ${documentType} templates.`,
    );
  }

  const basePdf = {
    width: pageSpec.width,
    height: pageSpec.height,
    padding: [...pageSpec.padding],
  } as PdfmeBlankBase;
  return documentType === "invoice"
    ? invoiceDefaults(
        pageFormat as Extract<PageFormat, "A4" | "LETTER">,
        basePdf,
      )
    : receiptDefaults(
        pageFormat as Extract<
          PageFormat,
          "RECEIPT_80MM" | "RECEIPT_58MM"
        >,
        basePdf,
      );
}
