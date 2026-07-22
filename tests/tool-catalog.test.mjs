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

const EXPECTED_PAPERWORK_SLUGS = {
  "paperwork.invoice-generator": "invoice-generator",
  "paperwork.receipt-generator": "receipt-generator",
  "paperwork.expense-report": "expense-report",
  "paperwork.mileage-log": "mileage-log",
  "paperwork.quarterly-tax-estimator": "quarterly-tax-estimator",
  "paperwork.w9-request": "w9-request",
  "paperwork.1099-nec-tracker": "1099-nec-tracker",
};

const EXPECTED_DEVTOOLS_BY_CATEGORY = {
  "JSON Tools":
    "json-to-csv csv-to-json json-formatter json-viewer json-validator json-to-typescript json-minifier yaml-to-json json-to-yaml json-diff json-schema-generator json-editor xml-to-json json-path-tester json-to-xml json-schema-validator json-array-to-table json-escape json-unescape json-key-extractor json-sorter".split(
      " ",
    ),
  "CSV & Data Tools":
    "csv-viewer csv-to-markdown-table csv-to-tsv tsv-to-csv csv-formatter csv-to-table csv-sorter csv-validator csv-duplicate-remover csv-filter csv-delimiter-converter csv-column-extractor".split(
      " ",
    ),
  "Text Tools":
    "password-generator word-counter character-counter lorem-ipsum-generator text-diff-checker text-case-converter slug-generator duplicate-line-remover find-and-replace random-string-generator text-sorter whitespace-remover text-reverser duplicate-word-remover".split(
      " ",
    ),
  "Encoding & Decoding":
    "jwt-decoder base64-decoder base64-encoder qr-code-generator url-decoder url-encoder binary-to-text html-encoder html-decoder text-to-binary hex-to-text text-to-hex unicode-decoder unicode-encoder".split(
      " ",
    ),
  "Hashing & Crypto":
    "uuid-generator bcrypt-generator sha256-generator md5-generator sha1-generator bcrypt-compare sha512-generator hmac-generator nanoid-generator checksum-generator hash-compare".split(
      " ",
    ),
  "JWT & API Tools":
    "http-status-codes utm-builder curl-to-fetch curl-to-axios basic-auth-generator jwt-expiration-checker url-query-parser url-query-builder bearer-token-parser".split(
      " ",
    ),
  "Web & Markup Tools":
    "markdown-to-html javascript-formatter css-formatter html-formatter javascript-minifier css-minifier markdown-previewer html-viewer".split(
      " ",
    ),
  "Color & Design Tools":
    "hex-to-rgb rgb-to-hex color-picker gradient-generator css-box-shadow border-radius-generator css-unit-converter hex-to-hsl".split(
      " ",
    ),
  "Date & Time Tools":
    "timestamp-converter date-difference cron-builder cron-parser iso-date-converter".split(
      " ",
    ),
  "Developer Generators":
    "regex-tester random-number-generator meta-tag-generator open-graph-preview robots-txt-generator api-key-generator regex-generator sitemap-generator".split(
      " ",
    ),
  "Diagram Tools": ["diagram-generator"],
  "SEO & Domain Tools": [
    "domain-rating-checker",
    "domain-age-checker",
    "dns-checker",
  ],
};

const EXPECTED_DEVTOOL_SLUGS = Object.values(
  EXPECTED_DEVTOOLS_BY_CATEGORY,
).flat();
const DEFAULT_DISABLED_DEVTOOLS = [
  "domain-rating-checker",
  "domain-age-checker",
  "dns-checker",
];

const EXPECTED_MEDIA_BY_CATEGORY = {
  "PDF Conversion": ["image-to-pdf", "pdf-to-jpg", "pdf-to-png"],
  "PDF Organization": [
    "merge-pdf",
    "split-pdf",
    "extract-pdf-pages",
    "reorder-pdf-pages",
    "rotate-pdf-pages",
    "delete-pdf-pages",
    "crop-pdf",
    "resize-pdf-pages",
  ],
  "PDF Optimization": ["compress-pdf", "watermark-pdf", "add-page-numbers"],
  "Image Conversion": [
    "jpg-to-png",
    "png-to-jpg",
    "jpg-to-webp",
    "png-to-webp",
    "webp-to-jpg",
    "webp-to-png",
    "heic-to-jpg",
    "heic-to-png",
  ],
  "Image Editing": [
    "compress-image",
    "resize-image",
    "crop-image",
    "rotate-image",
    "flip-image",
    "combine-images",
    "remove-image-metadata",
    "social-media-image-resizer",
  ],
};

const EXPECTED_MEDIA_NAMES = {
  "image-to-pdf": "Image to PDF",
  "pdf-to-jpg": "PDF to JPG",
  "pdf-to-png": "PDF to PNG",
  "merge-pdf": "Merge PDF",
  "split-pdf": "Split PDF",
  "extract-pdf-pages": "Extract PDF Pages",
  "reorder-pdf-pages": "Reorder PDF Pages",
  "rotate-pdf-pages": "Rotate PDF Pages",
  "delete-pdf-pages": "Delete PDF Pages",
  "crop-pdf": "Crop PDF",
  "resize-pdf-pages": "Resize PDF Pages",
  "compress-pdf": "Compress PDF",
  "watermark-pdf": "Watermark PDF",
  "add-page-numbers": "Add Page Numbers",
  "jpg-to-png": "JPG to PNG",
  "png-to-jpg": "PNG to JPG",
  "jpg-to-webp": "JPG to WebP",
  "png-to-webp": "PNG to WebP",
  "webp-to-jpg": "WebP to JPG",
  "webp-to-png": "WebP to PNG",
  "heic-to-jpg": "HEIC to JPG",
  "heic-to-png": "HEIC to PNG",
  "compress-image": "Compress Image",
  "resize-image": "Resize Image",
  "crop-image": "Crop Image",
  "rotate-image": "Rotate Image",
  "flip-image": "Flip Image",
  "combine-images": "Combine Images",
  "remove-image-metadata": "Remove Image Metadata",
  "social-media-image-resizer": "Social Media Image Resizer",
};

const EXPECTED_MEDIA_SLUGS = Object.values(EXPECTED_MEDIA_BY_CATEGORY).flat();

test("the code manifest and managed seeds preserve every current tool route", () => {
  assert.equal(new Set(toolManifest.map((tool) => tool.id)).size, toolManifest.length);
  assert.equal(
    new Set(toolManifest.map((tool) => `${tool.app}:${tool.componentKey}`)).size,
    toolManifest.length,
  );

  const paperworkSeeds = seededManagedTools.filter((tool) =>
    tool.toolId.startsWith("paperwork."),
  );
  assert.deepEqual(
    Object.fromEntries(paperworkSeeds.map((tool) => [tool.toolId, tool.slug])),
    EXPECTED_PAPERWORK_SLUGS,
  );
  assert.equal(paperworkSeeds.every((tool) => tool.enabled && !tool.archived), true);
});

test("the Devtools registry has the exact captured routes, categories, and defaults", () => {
  const tools = toolManifest.filter((tool) => tool.app === "devtools");
  const seeds = seededManagedTools.filter((tool) =>
    tool.toolId.startsWith("devtools."),
  );

  assert.equal(tools.length, 114);
  assert.deepEqual(
    tools.map((tool) => tool.componentKey),
    EXPECTED_DEVTOOL_SLUGS,
  );
  assert.deepEqual(
    tools.map((tool) => tool.id),
    EXPECTED_DEVTOOL_SLUGS.map((slug) => `devtools.${slug}`),
  );
  assert.deepEqual(
    tools.map((tool) => tool.category),
    Object.entries(EXPECTED_DEVTOOLS_BY_CATEGORY).flatMap(([category, slugs]) =>
      slugs.map(() => category),
    ),
  );
  assert.deepEqual(
    seeds.map((tool) => tool.slug),
    EXPECTED_DEVTOOL_SLUGS,
  );
  assert.deepEqual(
    seeds.map((tool) => tool.order),
    EXPECTED_DEVTOOL_SLUGS.map((_, order) => order),
  );
  assert.deepEqual(
    seeds.filter((tool) => !tool.enabled).map((tool) => tool.slug),
    DEFAULT_DISABLED_DEVTOOLS,
  );
  assert.equal(seeds.every((tool) => !tool.archived), true);
});

test("the Media registry has the exact public routes, categories, names, and order", () => {
  const tools = toolManifest.filter((tool) => tool.app === "media");
  const seeds = seededManagedTools.filter((tool) =>
    tool.toolId.startsWith("media."),
  );

  assert.equal(tools.length, 30);
  assert.deepEqual(
    tools.map((tool) => tool.componentKey),
    EXPECTED_MEDIA_SLUGS,
  );
  assert.deepEqual(
    tools.map((tool) => tool.id),
    EXPECTED_MEDIA_SLUGS.map((slug) => `media.${slug}`),
  );
  assert.deepEqual(
    tools.map((tool) => tool.category),
    Object.entries(EXPECTED_MEDIA_BY_CATEGORY).flatMap(([category, slugs]) =>
      slugs.map(() => category),
    ),
  );
  assert.deepEqual(
    Object.fromEntries(tools.map((tool) => [tool.componentKey, tool.defaultName])),
    EXPECTED_MEDIA_NAMES,
  );
  assert.equal(
    tools.every(
      (tool) =>
        tool.defaultDescription.trim() &&
        tool.keywords?.length &&
        tool.keywords.every((keyword) => keyword.trim()),
    ),
    true,
  );
  assert.deepEqual(
    seeds.map((tool) => tool.order),
    EXPECTED_MEDIA_SLUGS.map((_, order) => order),
  );
  assert.equal(seeds.every((tool) => tool.enabled && !tool.archived), true);
});

test("stored Admin overrides win over generated Devtools defaults", () => {
  const tool = mergeToolManifest([
    {
      toolId: "devtools.domain-rating-checker",
      slug: "domain-rating-checker",
      name: "Domain Rating",
      description: "Configured externally.",
      order: 4,
      enabled: true,
      archived: false,
    },
  ]).find((candidate) => candidate.id === "devtools.domain-rating-checker");

  assert.equal(tool?.enabled, true);
  assert.equal(tool?.name, "Domain Rating");
  assert.equal(tool?.order, 4);
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
  assert.equal(isValidToolSlug("media", "api"), false);
  assert.equal(isValidToolSlug("media", "compress-pdf"), true);
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
