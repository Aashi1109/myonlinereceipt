import assert from "node:assert/strict";
import test from "node:test";

import {
  AdvancedDocumentTemplateSchema,
  AdvancedTemplateConfigSchema,
  DocumentTemplateSchema,
  InvoiceTemplateSchema,
  createAdvancedTemplateConfig,
  seedTemplates,
} from "../packages/invoice-templates/src/index.ts";

const supportedFormats = [
  ["invoice", "A4", 210, 297],
  ["invoice", "LETTER", 215.9, 279.4],
  ["receipt", "RECEIPT_80MM", 80, 200],
  ["receipt", "RECEIPT_58MM", 58, 180],
];

function createAdvancedTemplate(documentType, pageFormat) {
  const pageSlug = pageFormat.toLowerCase().replaceAll("_", "-");
  return {
    ...structuredClone(seedTemplates[0]),
    id: `advanced-${documentType}-${pageSlug}`,
    name: `Advanced ${documentType}`,
    slug: `advanced-${documentType}-${pageSlug}`,
    documentType,
    layoutFamily: "advanced",
    config: createAdvancedTemplateConfig(documentType, pageFormat),
  };
}

test("advanced defaults are valid blank-base pdfme templates with realistic sample data", () => {
  for (const [documentType, pageFormat, width, height] of supportedFormats) {
    const config = createAdvancedTemplateConfig(documentType, pageFormat);

    assert.equal(AdvancedTemplateConfigSchema.safeParse(config).success, true);
    assert.equal(config.editor, "pdfme");
    assert.equal(config.pageFormat, pageFormat);
    assert.deepEqual(config.template.basePdf, {
      width,
      height,
      padding:
        documentType === "invoice"
          ? [15, 15, 15, 15]
          : [5, 5, 5, 5],
    });
    assert.equal(config.template.schemas.length, 1);
    assert.ok(config.template.schemas[0].length > 0);
    const textSchema = config.template.schemas[0].find(
      (schema) => schema.type === "text",
    );
    const tableSchema = config.template.schemas[0].find(
      (schema) => schema.type === "table",
    );
    assert.equal(textSchema.verticalAlignment, "top");
    assert.equal(typeof textSchema.backgroundColor, "string");
    assert.equal(tableSchema.repeatHead, true);
    assert.equal(typeof tableSchema.tableStyles.borderWidth, "number");
    assert.equal(typeof tableSchema.headStyles.padding.left, "number");
    assert.equal(
      typeof tableSchema.bodyStyles.alternateBackgroundColor,
      "string",
    );
    assert.deepEqual(tableSchema.columnStyles, {});
    assert.equal(typeof config.sampleData.documentNumber, "string");
    assert.equal(typeof config.sampleData.lineItems, "string");
    assert.equal(typeof config.sampleData.total, "string");
  }
});

test("document template validation accepts standard and advanced templates without widening the standard schema", () => {
  const standard = seedTemplates[0];
  const advancedInvoice = createAdvancedTemplate("invoice", "A4");
  const advancedReceipt = createAdvancedTemplate("receipt", "RECEIPT_80MM");

  assert.equal(InvoiceTemplateSchema.safeParse(standard).success, true);
  assert.equal(DocumentTemplateSchema.safeParse(standard).success, true);

  assert.equal(AdvancedDocumentTemplateSchema.safeParse(advancedInvoice).success, true);
  assert.equal(AdvancedDocumentTemplateSchema.safeParse(advancedReceipt).success, true);
  assert.equal(DocumentTemplateSchema.safeParse(advancedInvoice).success, true);
  assert.equal(DocumentTemplateSchema.safeParse(advancedReceipt).success, true);

  assert.equal(InvoiceTemplateSchema.safeParse(advancedInvoice).success, false);
  assert.equal(InvoiceTemplateSchema.safeParse(advancedReceipt).success, false);
});

test("advanced template validation rejects incompatible document and page formats", () => {
  assert.throws(
    () => createAdvancedTemplateConfig("invoice", "RECEIPT_80MM"),
    /not supported for invoice templates/,
  );
  assert.throws(
    () => createAdvancedTemplateConfig("receipt", "A4"),
    /not supported for receipt templates/,
  );

  const invoiceOnReceiptPaper = createAdvancedTemplate(
    "receipt",
    "RECEIPT_58MM",
  );
  invoiceOnReceiptPaper.documentType = "invoice";

  const receiptOnLetterPaper = createAdvancedTemplate("invoice", "LETTER");
  receiptOnLetterPaper.documentType = "receipt";

  assert.equal(
    AdvancedDocumentTemplateSchema.safeParse(invoiceOnReceiptPaper).success,
    false,
  );
  assert.equal(
    DocumentTemplateSchema.safeParse(receiptOnLetterPaper).success,
    false,
  );
});

test("advanced config validation rejects malformed pdfme blank bases", () => {
  const config = createAdvancedTemplateConfig("invoice", "A4");
  config.template.basePdf.width = 0;
  config.template.schemas = [{}];

  const result = AdvancedTemplateConfigSchema.safeParse(config);

  assert.equal(result.success, false);
  assert.deepEqual(
    result.error.issues.map((issue) => issue.path.join(".")),
    ["template.basePdf.width", "template.schemas.0"],
  );
});
