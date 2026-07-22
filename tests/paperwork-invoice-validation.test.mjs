import assert from "node:assert/strict";
import test from "node:test";

import { validateInvoiceData } from "../apps/paperwork/src/utils/invoiceValidation.ts";

function validInvoice() {
  return {
    business: {
      name: "Blue Ridge Studio",
      email: "billing@example.com",
    },
    client: {
      name: "Acme Corp",
      email: "accounts@example.com",
    },
    invoice: {
      invoiceNumber: "INV-1001",
      invoiceDate: "2026-07-22",
      dueDate: "2026-08-21",
    },
    lineItems: [
      {
        description: "Design services",
        quantity: 2,
        unitPrice: 150,
      },
    ],
  };
}

test("a complete invoice passes export validation", () => {
  assert.deepEqual(validateInvoiceData(validInvoice()), {});
});

test("invoice validation covers required identity and date fields", () => {
  const invoice = validInvoice();
  invoice.business.name = " ";
  invoice.client.name = "";
  invoice.invoice.invoiceNumber = "";
  invoice.invoice.invoiceDate = "";
  invoice.invoice.dueDate = "";

  assert.deepEqual(Object.keys(validateInvoiceData(invoice)).sort(), [
    "business.name",
    "client.name",
    "invoice.dueDate",
    "invoice.invoiceDate",
    "invoice.invoiceNumber",
  ]);
});

test("invoice validation rejects malformed emails and a due date before issue", () => {
  const invoice = validInvoice();
  invoice.business.email = "billing.example.com";
  invoice.client.email = "accounts@";
  invoice.invoice.dueDate = "2026-07-21";

  assert.deepEqual(Object.keys(validateInvoiceData(invoice)).sort(), [
    "business.email",
    "client.email",
    "invoice.dueDate",
  ]);
});

test("invoice validation rejects unusable line items", () => {
  const invoice = validInvoice();
  invoice.lineItems = [
    { description: " ", quantity: "", unitPrice: 20 },
    { description: "Hosting", quantity: -1, unitPrice: Number.NaN },
  ];

  assert.deepEqual(Object.keys(validateInvoiceData(invoice)).sort(), [
    "lineItems[0].description",
    "lineItems[0].quantity",
    "lineItems[1].quantity",
    "lineItems[1].unitPrice",
  ]);

  invoice.lineItems = [];
  assert.deepEqual(Object.keys(validateInvoiceData(invoice)), ["lineItems"]);
});
