import assert from "node:assert/strict";
import test from "node:test";

import {
  areToolSlugsUnique,
  assertToolSlugImmutable,
  findAvailableToolBySlug,
  getEnabledTools,
  isToolAvailable,
  isValidToolSlug,
  mergeToolManifest,
  seededManagedTools,
  toolManifest,
} from "../packages/tool-catalog/src/index.ts";

const EXPECTED_SLUGS = {
  "paperwork.invoice-generator": "invoice-generator",
  "paperwork.receipt-generator": "receipt-generator",
  "paperwork.expense-report": "expense-report",
  "paperwork.mileage-log": "mileage-log",
  "paperwork.quarterly-tax-estimator": "quarterly-tax-estimator",
  "paperwork.w9-request": "w9-request",
  "paperwork.1099-nec-tracker": "1099-nec-tracker",
  "devtools.json-formatter": "json-formatter",
};

test("the code manifest and managed seeds preserve every current tool route", () => {
  assert.equal(new Set(toolManifest.map((tool) => tool.id)).size, toolManifest.length);
  assert.equal(
    new Set(toolManifest.map((tool) => `${tool.app}:${tool.componentKey}`)).size,
    toolManifest.length,
  );
  assert.deepEqual(
    Object.fromEntries(seededManagedTools.map((tool) => [tool.toolId, tool.slug])),
    EXPECTED_SLUGS,
  );
  assert.equal(seededManagedTools.every((tool) => tool.enabled && !tool.archived), true);
});

test("manifest merging applies stored configuration without losing code registrations", () => {
  const tools = mergeToolManifest([
    {
      toolId: "paperwork.receipt-generator",
      slug: "receipts",
      name: "Receipt Maker",
      description: "Create a receipt.",
      order: 20,
      enabled: false,
      archived: true,
    },
    {
      toolId: "removed.unknown-tool",
      slug: "removed",
      name: "Removed",
      description: "No longer registered.",
      order: 0,
      enabled: true,
      archived: false,
    },
  ]);

  assert.equal(tools.length, toolManifest.length);
  assert.deepEqual(
    tools.find((tool) => tool.id === "paperwork.receipt-generator"),
    {
      ...toolManifest.find((tool) => tool.id === "paperwork.receipt-generator"),
      toolId: "paperwork.receipt-generator",
      slug: "receipts",
      name: "Receipt Maker",
      description: "Create a receipt.",
      order: 20,
      enabled: false,
      archived: true,
    },
  );
  assert.equal(
    tools.find((tool) => tool.id === "paperwork.invoice-generator")?.slug,
    "invoice-generator",
  );
  assert.equal(tools.some((tool) => tool.id === "removed.unknown-tool"), false);
});

test("a newly registered code tool is setup-required and disabled by default", () => {
  const manifest = [
    ...toolManifest,
    {
      id: "paperwork.proposal-builder",
      app: "paperwork",
      componentKey: "proposal-builder",
      defaultName: "Proposal Builder",
      defaultDescription: "Create a client proposal.",
    },
  ];

  const tool = mergeToolManifest(undefined, manifest).find(
    (candidate) => candidate.id === "paperwork.proposal-builder",
  );

  assert.deepEqual(tool, {
    ...manifest.at(-1),
    toolId: "paperwork.proposal-builder",
    slug: null,
    name: "Proposal Builder",
    description: "Create a client proposal.",
    order: 7,
    enabled: false,
    archived: false,
  });
});

test("invalid persisted slugs fail closed while valid fields still merge", () => {
  const tool = mergeToolManifest([
    {
      toolId: "paperwork.receipt-generator",
      slug: "Receipt--Generator",
      name: "Receipt Maker",
      description: "Create a receipt.",
      order: 4,
      enabled: true,
      archived: false,
    },
  ]).find((candidate) => candidate.id === "paperwork.receipt-generator");

  assert.equal(tool?.slug, null);
  assert.equal(tool?.enabled, false);
  assert.equal(tool?.name, "Receipt Maker");
});

test("tool slugs use lowercase segments and reject application routes", () => {
  for (const slug of ["invoice", "invoice-2", "2fa-tool", "w9-request"]) {
    assert.equal(isValidToolSlug("paperwork", slug), true, slug);
  }

  for (const slug of [
    "",
    "Invoice",
    "invoice_generator",
    "invoice--generator",
    "-invoice",
    "invoice-",
    "/invoice",
    "api",
    "admin",
  ]) {
    assert.equal(isValidToolSlug("paperwork", slug), false, slug);
  }
  assert.equal(isValidToolSlug("devtools", "api"), false);
});

test("tool slugs are unique within an application but may repeat across applications", () => {
  const tools = mergeToolManifest();
  const duplicatedInPaperwork = tools.map((tool) =>
    tool.id === "paperwork.expense-report"
      ? { ...tool, slug: "receipt-generator" }
      : tool,
  );
  const repeatedInDevtools = tools.map((tool) =>
    tool.id === "devtools.json-formatter"
      ? { ...tool, slug: "receipt-generator" }
      : tool,
  );
  const setupRequired = tools.map((tool) =>
    tool.id === "paperwork.expense-report" ? { ...tool, slug: null } : tool,
  );

  assert.equal(areToolSlugsUnique(duplicatedInPaperwork), false);
  assert.equal(areToolSlugsUnique(repeatedInDevtools), true);
  assert.equal(areToolSlugsUnique(setupRequired), true);
});

test("a saved slug is immutable while setup-required tools may receive their first slug", () => {
  assert.doesNotThrow(() => assertToolSlugImmutable(null, "proposal-builder"));
  assert.doesNotThrow(() =>
    assertToolSlugImmutable("invoice-generator", "invoice-generator"),
  );
  assert.throws(
    () => assertToolSlugImmutable("invoice-generator", "invoices"),
    /immutable/i,
  );
  assert.throws(
    () => assertToolSlugImmutable("invoice-generator", null),
    /immutable/i,
  );
});

test("disabled, archived, setup-required, and ambiguous tools are blocked", () => {
  const tools = mergeToolManifest();
  const disabled = tools.map((tool) =>
    tool.id === "paperwork.invoice-generator" ? { ...tool, enabled: false } : tool,
  );
  const archived = tools.map((tool) =>
    tool.id === "paperwork.invoice-generator" ? { ...tool, archived: true } : tool,
  );
  const setupRequired = tools.map((tool) =>
    tool.id === "paperwork.invoice-generator" ? { ...tool, slug: null } : tool,
  );
  const duplicateRoute = tools.map((tool) =>
    tool.id === "paperwork.receipt-generator"
      ? { ...tool, slug: "invoice-generator" }
      : tool,
  );

  assert.equal(isToolAvailable(tools[0]), true);
  assert.equal(getEnabledTools(disabled, "paperwork").length, 6);
  assert.equal(
    findAvailableToolBySlug(disabled, "paperwork", "invoice-generator"),
    undefined,
  );
  assert.equal(
    findAvailableToolBySlug(archived, "paperwork", "invoice-generator"),
    undefined,
  );
  assert.equal(
    findAvailableToolBySlug(setupRequired, "paperwork", "invoice-generator"),
    undefined,
  );
  assert.equal(
    findAvailableToolBySlug(duplicateRoute, "paperwork", "invoice-generator"),
    undefined,
  );
  assert.equal(findAvailableToolBySlug(tools, "paperwork", "admin"), undefined);
});
