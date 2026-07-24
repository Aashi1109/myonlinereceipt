import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";

import { toolManifest } from "../packages/tool-catalog/src/index.ts";
import {
  IMAGE_WORKER_OPERATIONS,
  MEDIA_WORKER_OPERATIONS,
  PDF_WORKER_OPERATIONS,
  isImageWorkerOperation,
  isPdfWorkerOperation,
} from "../app/media/_workers/operations.ts";
import {
  QpdfAdapterError,
  buildQpdfArguments,
  preservePdfWithQpdf,
} from "../app/media/_workers/qpdfAdapter.ts";
import {
  PdfPreflightError,
  assertStructuralPdfInspection,
  clipEndOperators,
  clipStartOperators,
  getPdfContentBox,
  hasTransparentPixels,
  inspectPdfBeforeStructuralRewrite,
  processStructuralPages,
} from "../app/media/_workers/workerRules.ts";

import {
  IMAGE_COMPRESSION_PRESETS,
  IMAGE_TO_PDF_QUALITY_PRESETS,
  MEDIA_TOOL_SLUGS,
  PNG_COMPRESSION_PRESETS,
  SOCIAL_IMAGE_PRESETS,
  STRONG_PDF_COMPRESSION_PRESETS,
  getMediaToolDefinition,
  mediaToolDefinitions,
} from "../app/media/_lib/tools.ts";
import {
  calculateResizeDimensions,
  fitRect,
  getExifOrientationTransform,
  normalizeCropRect,
  readExifOrientation,
  rotatedDimensions,
} from "../app/media/_lib/geometry.ts";
import {
  MEDIA_LIMITS,
  createOutputFilename,
  createPageArchiveFilename,
  createPageOutputFilename,
  detectMediaKind,
  hasPdfDigitalSignature,
  parsePageRange,
  sanitizeBaseName,
  sanitizeFileName,
  validateDecodedImageDimensions,
  validateImageSelection,
  validateMediaSignature,
  validatePdfSelection,
} from "../app/media/_lib/validation.ts";
import {
  beginWorkerJob,
  createInspectPdfMessage,
  cancelWorkerJob,
  createStartWorkerMessage,
  createWorkerInput,
  createWorkerJobState,
  getOutputTransferables,
  getPdfInspectionTransferables,
  getStartTransferables,
  reduceWorkerJobState,
} from "../app/media/_lib/workerProtocol.ts";

const EXPECTED_TOOLS_BY_CATEGORY = {
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
  "PDF Optimization": [
    "compress-pdf",
    "watermark-pdf",
    "add-page-numbers",
  ],
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

const requireFromMedia = createRequire(
  new URL("../package.json", import.meta.url),
);

test("the Media runtime defines exactly the 30 public tool routes", () => {
  const expected = Object.values(EXPECTED_TOOLS_BY_CATEGORY).flat();

  assert.deepEqual(MEDIA_TOOL_SLUGS, expected);
  assert.equal(mediaToolDefinitions.length, 30);
  assert.equal(new Set(mediaToolDefinitions.map(({ slug }) => slug)).size, 30);
  for (const [category, slugs] of Object.entries(EXPECTED_TOOLS_BY_CATEGORY)) {
    assert.deepEqual(
      mediaToolDefinitions
        .filter((tool) => tool.category === category)
        .map(({ slug }) => slug),
      slugs,
    );
  }

  for (const tool of mediaToolDefinitions) {
    assert.equal(tool.operation, tool.slug);
    assert.match(tool.title, /\S/);
    assert.match(tool.description, /\S/);
    assert.match(tool.accept, /^(application|image)\//);
    assert.ok(tool.engine === "image" || tool.engine === "pdf");
    assert.equal(typeof tool.multiple, "boolean");
  }
  assert.equal(getMediaToolDefinition("not-a-tool"), undefined);
});

test("every Media catalog entry resolves to exactly one runtime implementation", () => {
  const catalogSlugs = toolManifest
    .filter(({ app }) => app === "media")
    .map(({ componentKey }) => componentKey);

  assert.deepEqual(catalogSlugs, MEDIA_TOOL_SLUGS);
  assert.equal(
    catalogSlugs.every((slug) => getMediaToolDefinition(slug) !== undefined),
    true,
  );
  assert.deepEqual(
    [...MEDIA_WORKER_OPERATIONS].sort(),
    [...MEDIA_TOOL_SLUGS].sort(),
  );
  assert.deepEqual(
    IMAGE_WORKER_OPERATIONS.filter((slug) => PDF_WORKER_OPERATIONS.includes(slug)),
    [],
  );
  assert.equal(
    IMAGE_WORKER_OPERATIONS.length + PDF_WORKER_OPERATIONS.length,
    MEDIA_TOOL_SLUGS.length,
  );
  assert.equal(IMAGE_WORKER_OPERATIONS.every(isImageWorkerOperation), true);
  assert.equal(IMAGE_WORKER_OPERATIONS.some(isPdfWorkerOperation), false);
  assert.equal(PDF_WORKER_OPERATIONS.every(isPdfWorkerOperation), true);
  assert.equal(PDF_WORKER_OPERATIONS.some(isImageWorkerOperation), false);
});

test("crop rejects HEIC at the public input boundary", () => {
  const crop = getMediaToolDefinition("crop-image");

  assert.ok(crop);
  assert.doesNotMatch(crop.accept, /image\/hei[cf]/);
  assert.match(crop.accept, /image\/jpeg/);
  assert.match(crop.accept, /image\/png/);
  assert.match(crop.accept, /image\/webp/);
});

test("workbench cleanup invalidates async continuations before releasing resources", async () => {
  const source = await readFile(
    new URL(
      "../app/media/components/MediaWorkbench.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  const cleanup = source.indexOf("return () => {");
  const generation = source.indexOf(
    "lifecycleGenerationRef.current += 1;",
    cleanup,
  );
  const activeJob = source.indexOf("activeJobIdRef.current = null;", cleanup);
  const inspectionJob = source.indexOf("inspectionJobIdRef.current = null;", cleanup);
  const terminate = source.indexOf("workerRef.current?.terminate();", cleanup);

  assert.ok(cleanup >= 0);
  assert.ok(generation > cleanup && generation < terminate);
  assert.ok(activeJob > cleanup && activeJob < terminate);
  assert.ok(inspectionJob > cleanup && inspectionJob < terminate);
  assert.ok(
    (source.match(/isCurrentLifecycle\(lifecycleToken\)/g) ?? []).length >= 6,
  );
});

test("preset mappings preserve the product defaults and engine values", () => {
  assert.deepEqual(IMAGE_COMPRESSION_PRESETS, {
    best: { quality: 0.9 },
    balanced: { quality: 0.8 },
    smallest: { quality: 0.6 },
  });
  assert.deepEqual(PNG_COMPRESSION_PRESETS, {
    fast: { effort: 3 },
    balanced: { effort: 6 },
    maximum: { effort: 9 },
  });
  assert.equal(
    Object.values(PNG_COMPRESSION_PRESETS).some((preset) => "quality" in preset),
    false,
  );
  assert.deepEqual(IMAGE_TO_PDF_QUALITY_PRESETS, {
    original: { quality: 1, reencode: false },
    balanced: { quality: 0.82, reencode: true },
    small: { quality: 0.65, reencode: true },
  });
  assert.deepEqual(STRONG_PDF_COMPRESSION_PRESETS, {
    high: { dpi: 150, quality: 0.85 },
    balanced: { dpi: 120, quality: 0.75 },
    smallest: { dpi: 96, quality: 0.6 },
  });
});

test("social image presets map every published target to exact dimensions", () => {
  assert.deepEqual(SOCIAL_IMAGE_PRESETS, {
    "instagram-square": { label: "Instagram square", width: 1080, height: 1080 },
    "instagram-portrait": {
      label: "Instagram portrait",
      width: 1080,
      height: 1350,
    },
    "story-reel": { label: "Story / Reel", width: 1080, height: 1920 },
    "youtube-thumbnail": {
      label: "YouTube thumbnail",
      width: 1280,
      height: 720,
    },
    "x-landscape": { label: "X landscape", width: 1600, height: 900 },
    "linkedin-landscape": {
      label: "LinkedIn landscape",
      width: 1200,
      height: 627,
    },
    "facebook-landscape": {
      label: "Facebook landscape",
      width: 1200,
      height: 630,
    },
  });
});

test("media signatures are detected from bytes rather than extensions", () => {
  const fixtures = {
    pdf: new TextEncoder().encode("%PDF-1.7\n"),
    jpeg: Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]),
    png: Uint8Array.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]),
    webp: riff("VP8 ", Uint8Array.of(0)),
    heic: ftyp("heic", ["mif1", "heic"]),
  };

  for (const [kind, bytes] of Object.entries(fixtures)) {
    assert.equal(detectMediaKind(bytes), kind);
  }
  assert.equal(detectMediaKind(new TextEncoder().encode("photo.jpg")), null);
});

test("signature validation rejects MIME mismatches and unsupported animation", () => {
  assert.deepEqual(
    validateMediaSignature(
      Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]),
      "image/png",
    ),
    {
      ok: false,
      code: "mime-mismatch",
      message: "The file contents do not match its reported type.",
    },
  );
  assert.equal(
    validateMediaSignature(
      Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]),
      "image/jpeg",
      ["png"],
    ).code,
    "unsupported-type",
  );
  assert.equal(
    validateMediaSignature(riff("VP8X", Uint8Array.of(0x02)), "image/webp")
      .code,
    "animated-image",
  );
  assert.equal(
    validateMediaSignature(ftyp("hevc", ["msf1"]), "image/heic").code,
    "image-sequence",
  );
  assert.deepEqual(
    validateMediaSignature(ftyp("heic", ["mif1"]), ""),
    { ok: true, kind: "heic", mime: "image/heic" },
  );
  assert.equal(
    validateMediaSignature(Uint8Array.of(1, 2, 3), "image/jpeg").code,
    "invalid-signature",
  );
});

test("image limits enforce per-file, batch, total, and decoded-pixel ceilings", () => {
  assert.deepEqual(
    validateImageSelection(
      Array.from({ length: MEDIA_LIMITS.images.maxFiles }, () => ({ size: 1 })),
    ),
    { ok: true },
  );
  assert.equal(
    validateImageSelection([{ size: MEDIA_LIMITS.images.maxFileBytes + 1 }])
      .code,
    "file-too-large",
  );
  assert.equal(
    validateImageSelection(
      Array.from({ length: MEDIA_LIMITS.images.maxFiles + 1 }, () => ({ size: 1 })),
    ).code,
    "too-many-files",
  );
  assert.equal(
    validateImageSelection([
      { size: 200 * 1024 * 1024 },
      { size: 51 * 1024 * 1024 },
    ]).code,
    "file-too-large",
  );
  assert.equal(
    validateImageSelection(
      Array.from({ length: 11 }, () => ({ size: 24 * 1024 * 1024 })),
    ).code,
    "total-too-large",
  );
  assert.deepEqual(validateDecodedImageDimensions(10_000, 10_000), { ok: true });
  assert.equal(validateDecodedImageDimensions(10_001, 10_000).code, "too-many-pixels");
  assert.equal(validateDecodedImageDimensions(0, 10).code, "invalid-dimensions");
});

test("PDF limits distinguish merge, structural, and raster jobs", () => {
  assert.deepEqual(
    validatePdfSelection([{ size: MEDIA_LIMITS.pdfs.maxFileBytes }], {
      pageCount: MEDIA_LIMITS.pdfs.maxStructuralPages,
    }),
    { ok: true },
  );
  assert.equal(
    validatePdfSelection([{ size: MEDIA_LIMITS.pdfs.maxFileBytes + 1 }]).code,
    "file-too-large",
  );
  assert.equal(
    validatePdfSelection(
      Array.from({ length: MEDIA_LIMITS.pdfs.maxMergeFiles + 1 }, () => ({
        size: 1,
      })),
      { merge: true },
    ).code,
    "too-many-files",
  );
  assert.equal(
    validatePdfSelection(
      Array.from({ length: 20 }, () => ({ size: 13 * 1024 * 1024 })),
      { merge: true },
    ).code,
    "total-too-large",
  );
  assert.equal(
    validatePdfSelection([{ size: 1 }], { pageCount: 501 }).code,
    "too-many-pages",
  );
  assert.equal(
    validatePdfSelection([{ size: 1 }], { pageCount: 201, raster: true }).code,
    "too-many-pages",
  );
});

test("digitally signed PDFs are detected before a rewriting operation", () => {
  assert.equal(
    hasPdfDigitalSignature(
      new TextEncoder().encode("%PDF-1.7\n/Type /Sig /ByteRange [0 10 20 30]"),
    ),
    true,
  );
  assert.equal(
    hasPdfDigitalSignature(new TextEncoder().encode("%PDF-1.7\n/Pages 2 0 R")),
    false,
  );
});

test("qpdf preserve arguments toggle metadata removal without changing compression", () => {
  const base = [
    "/input.pdf",
    "--object-streams=generate",
    "--stream-data=compress",
    "--recompress-flate",
    "--compression-level=9",
  ];
  assert.deepEqual(buildQpdfArguments("/input.pdf", "/output.pdf", false), [
    ...base,
    "/output.pdf",
  ]);
  assert.deepEqual(buildQpdfArguments("/input.pdf", "/output.pdf", true), [
    ...base,
    "--remove-info",
    "--remove-metadata",
    "/output.pdf",
  ]);
});

test("qpdf preserve fails closed outside a cross-origin-isolated browser", async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "crossOriginIsolated");
  Object.defineProperty(globalThis, "crossOriginIsolated", {
    configurable: true,
    value: false,
  });
  try {
    await assert.rejects(
      preservePdfWithQpdf(new ArrayBuffer(0), {
        jobId: "unit-test",
        removeMetadata: true,
      }),
      (error) =>
        error instanceof QpdfAdapterError &&
        error.code === "qpdf-unavailable" &&
        /cross-origin-isolated browser/.test(error.message),
    );
  } finally {
    if (previous) {
      Object.defineProperty(globalThis, "crossOriginIsolated", previous);
    } else {
      delete globalThis.crossOriginIsolated;
    }
  }

  const failure = new QpdfAdapterError("qpdf-failed", "qpdf failed safely");
  assert.equal(failure.code, "qpdf-failed");
  assert.equal(failure.message, "qpdf failed safely");
});

test("image-to-PDF detects PNG alpha that must be flattened onto the selected background", () => {
  assert.equal(
    hasTransparentPixels(Uint8ClampedArray.from([20, 30, 40, 255, 50, 60, 70, 255])),
    false,
  );
  assert.equal(
    hasTransparentPixels(Uint8ClampedArray.from([20, 30, 40, 255, 50, 60, 70, 64])),
    true,
  );
});

test("PDF fill and cover clip exactly to the inner page box", () => {
  const pdfLib = requireFromMedia("pdf-lib");
  const box = getPdfContentBox(612, 792, 18);
  assert.deepEqual(box, { x: 18, y: 18, width: 576, height: 756 });
  assert.deepEqual(clipStartOperators(box, pdfLib).map(String), [
    "q",
    "18 18 576 756 re",
    "W",
    "n",
  ]);
  assert.deepEqual(clipEndOperators(pdfLib).map(String), ["Q"]);
});

test("Preserve Document preflight rejects encrypted and oversized structural PDFs", async () => {
  assert.throws(
    () => assertStructuralPdfInspection({ isEncrypted: true, pageCount: 1 }),
    (error) =>
      error instanceof PdfPreflightError && error.code === "encrypted-pdf",
  );
  assert.throws(
    () => assertStructuralPdfInspection({ isEncrypted: false, pageCount: 501 }),
    (error) =>
      error instanceof PdfPreflightError && error.code === "too-many-pages",
  );

  const { PDFDocument } = requireFromMedia("pdf-lib");
  const source = await PDFDocument.create();
  source.addPage([200, 300]);
  const bytes = await source.save();
  const data = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  );
  assert.deepEqual(await inspectPdfBeforeStructuralRewrite(data), { pageCount: 1 });
  await assert.rejects(
    inspectPdfBeforeStructuralRewrite(new TextEncoder().encode("%PDF-broken").buffer),
    (error) =>
      error instanceof PdfPreflightError && error.code === "malformed-pdf",
  );
});

test("structural page processing reports start and completion for every page", async () => {
  const updates = [];
  const visited = [];
  await processStructuralPages(
    [3, 0],
    (page) => page + 1,
    "Resizing PDF page",
    (current, completed, total, stage) => {
      updates.push({ current, completed, total, stage });
    },
    async (page) => {
      visited.push(page);
    },
  );

  assert.deepEqual(visited, [3, 0]);
  assert.deepEqual(updates, [
    { current: 4, completed: 0, total: 2, stage: "Resizing PDF page" },
    { current: 4, completed: 1, total: 2, stage: "Page complete" },
    { current: 1, completed: 1, total: 2, stage: "Resizing PDF page" },
    { current: 1, completed: 2, total: 2, stage: "Page complete" },
  ]);
});

test("output names remove paths, controls, reserved names, and unsafe punctuation", () => {
  assert.equal(sanitizeBaseName("../CON"), "download");
  assert.equal(sanitizeBaseName("  report:*?\u0000  "), "report");
  assert.equal(sanitizeBaseName("Résumé 2026"), "Résumé 2026");
  assert.equal(sanitizeBaseName("..."), "download");
  assert.equal(sanitizeFileName("../quarterly:report.PDF"), "quarterly-report.PDF");
  assert.equal(createOutputFilename("../../invoice.final.JPG", "png"), "invoice.final.png");
  assert.equal(
    createOutputFilename("CON.pdf", ".pdf", "compressed"),
    "download-compressed.pdf",
  );
  assert.equal(
    createPageOutputFilename("report.pdf", 3, 120, "jpg"),
    "report-page-003.jpg",
  );
  assert.equal(createPageArchiveFilename("report.pdf"), "report-pages.zip");
});

test("page ranges expand in display order and reject ambiguous selections", () => {
  assert.deepEqual(parsePageRange("1-3, 5, 8", 8), {
    ok: true,
    pages: [1, 2, 3, 5, 8],
  });
  assert.deepEqual(parsePageRange("all", 3), { ok: true, pages: [1, 2, 3] });

  for (const [input, code] of [
    ["", "empty-range"],
    ["0", "page-out-of-range"],
    ["9", "page-out-of-range"],
    ["3-1", "reversed-range"],
    ["1,,2", "invalid-range"],
    ["1-3,3", "duplicate-page"],
    ["one", "invalid-range"],
  ]) {
    assert.equal(parsePageRange(input, 8).code, code, input);
  }
});

test("resize and fit geometry covers aspect lock, no-upscale, contain, cover, and stretch", () => {
  assert.deepEqual(
    calculateResizeDimensions(
      { width: 400, height: 200 },
      { width: 100, lockAspectRatio: true, noUpscale: true },
    ),
    { width: 100, height: 50 },
  );
  assert.deepEqual(
    calculateResizeDimensions(
      { width: 400, height: 200 },
      { percentage: 50, lockAspectRatio: true, noUpscale: true },
    ),
    { width: 200, height: 100 },
  );
  assert.deepEqual(
    calculateResizeDimensions(
      { width: 400, height: 200 },
      { width: 800, lockAspectRatio: true, noUpscale: true },
    ),
    { width: 400, height: 200 },
  );
  assert.deepEqual(
    calculateResizeDimensions(
      { width: 400, height: 200 },
      { width: 100, height: 100, lockAspectRatio: false, noUpscale: false },
    ),
    { width: 100, height: 100 },
  );
  assert.deepEqual(fitRect({ width: 400, height: 200 }, { width: 100, height: 100 }, "contain"), {
    x: 0,
    y: 25,
    width: 100,
    height: 50,
    scaleX: 0.25,
    scaleY: 0.25,
  });
  assert.deepEqual(fitRect({ width: 400, height: 200 }, { width: 100, height: 100 }, "cover"), {
    x: -50,
    y: 0,
    width: 200,
    height: 100,
    scaleX: 0.5,
    scaleY: 0.5,
  });
  assert.deepEqual(fitRect({ width: 400, height: 200 }, { width: 100, height: 100 }, "stretch"), {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    scaleX: 0.25,
    scaleY: 0.5,
  });
});

test("geometry handles no-op, height-only, upscale, and invalid requests", () => {
  assert.deepEqual(
    calculateResizeDimensions(
      { width: 400, height: 200 },
      { lockAspectRatio: true, noUpscale: true },
    ),
    { width: 400, height: 200 },
  );
  assert.deepEqual(
    calculateResizeDimensions(
      { width: 400, height: 200 },
      { height: 50, lockAspectRatio: true, noUpscale: false },
    ),
    { width: 100, height: 50 },
  );
  assert.deepEqual(
    calculateResizeDimensions(
      { width: 400, height: 200 },
      { percentage: 200, lockAspectRatio: true, noUpscale: false },
    ),
    { width: 800, height: 400 },
  );
  assert.deepEqual(
    calculateResizeDimensions(
      { width: 400, height: 200 },
      { lockAspectRatio: false, noUpscale: false },
    ),
    { width: 400, height: 200 },
  );
  assert.throws(
    () =>
      calculateResizeDimensions(
        { width: 400, height: 200 },
        { percentage: 0, lockAspectRatio: true, noUpscale: true },
      ),
    /positive dimensions/,
  );
  assert.throws(
    () => fitRect({ width: 1, height: 1 }, { width: 1, height: 1 }, "tile"),
    /Unknown fit mode/,
  );
  assert.throws(() => rotatedDimensions(10, 20, 45), /Rotation must be/);
});

test("crop, rotation, and EXIF orientation helpers keep pixels in bounds", () => {
  assert.deepEqual(
    normalizeCropRect(
      { x: -10, y: 10, width: 150, height: 100 },
      { width: 100, height: 80 },
    ),
    { x: 0, y: 10, width: 100, height: 70 },
  );
  assert.throws(
    () =>
      normalizeCropRect(
        { x: 0, y: 0, width: 0, height: 10 },
        { width: 100, height: 80 },
      ),
    /positive dimensions/,
  );
  assert.deepEqual(rotatedDimensions(400, 200, 90), { width: 200, height: 400 });
  assert.deepEqual(rotatedDimensions(400, 200, 180), { width: 400, height: 200 });
  assert.deepEqual(rotatedDimensions(400, 200, 270), { width: 200, height: 400 });

  assert.deepEqual(getExifOrientationTransform(6, 400, 200), {
    matrix: [0, 1, -1, 0, 200, 0],
    width: 200,
    height: 400,
  });
  assert.deepEqual(getExifOrientationTransform(2, 400, 200), {
    matrix: [-1, 0, 0, 1, 400, 0],
    width: 400,
    height: 200,
  });
  assert.equal(readExifOrientation(jpegWithExifOrientation(8)), 8);
  assert.equal(readExifOrientation(Uint8Array.of(0xff, 0xd8, 0xff, 0xd9)), 1);
  assert.equal(readExifOrientation(Uint8Array.of()), 1);
  assert.deepEqual(getExifOrientationTransform(99, 400, 200), {
    matrix: [1, 0, 0, 1, 0, 0],
    width: 400,
    height: 200,
  });
  assert.deepEqual(
    normalizeCropRect(
      { x: 10, y: 20, width: 30, height: 40 },
      { width: 100, height: 100 },
    ),
    { x: 10, y: 20, width: 30, height: 40 },
  );
  assert.throws(
    () =>
      normalizeCropRect(
        { x: Number.NaN, y: 0, width: 10, height: 10 },
        { width: 100, height: 100 },
      ),
    /Coordinates must be finite/,
  );
});

test("worker starts expose transferable buffers with only sanitized metadata", () => {
  const data = Uint8Array.of(1, 2, 3).buffer;
  const input = createWorkerInput(
    "file-1",
    data,
    "../private/photo?.jpg",
    "image/jpeg",
  );
  const message = createStartWorkerMessage({
    jobId: "job-1",
    operation: "jpg-to-png",
    files: [input],
    options: {},
  });

  assert.equal(message.files[0].data, data);
  assert.deepEqual(message.files[0].metadata, {
    name: "photo.jpg",
    mime: "image/jpeg",
    size: 3,
  });
  assert.deepEqual(
    { type: message.type, jobId: message.jobId, operation: message.operation },
    { type: "start", jobId: "job-1", operation: "jpg-to-png" },
  );
  assert.deepEqual(getStartTransferables(message), [data]);
  assert.throws(
    () => createStartWorkerMessage({ ...message, operation: "unknown" }),
    /Unknown media operation/,
  );
});

test("worker protocol rejects malformed starts and exposes output transferables", () => {
  const data = new ArrayBuffer(1);
  const file = createWorkerInput("file-1", data, "photo.jpg", "image/jpeg");

  assert.throws(() => createWorkerInput(" ", data, "photo.jpg", "image/jpeg"), /ID/);
  assert.throws(
    () => createWorkerInput("file", new Uint8Array(1), "photo.jpg", "image/jpeg"),
    /ArrayBuffer/,
  );
  assert.throws(
    () => createWorkerInput("file", data, "photo.jpg", "not a mime"),
    /MIME/,
  );
  assert.throws(
    () =>
      createStartWorkerMessage({
        jobId: " ",
        operation: "jpg-to-png",
        files: [file],
        options: {},
      }),
    /job ID/,
  );
  assert.throws(
    () =>
      createStartWorkerMessage({
        jobId: "job",
        operation: "jpg-to-png",
        files: [],
        options: {},
      }),
    /at least one file/,
  );
  assert.throws(() => beginWorkerJob(createWorkerJobState(), " "), /job ID/);

  const output = new ArrayBuffer(2);
  assert.deepEqual(
    getOutputTransferables({
      type: "complete",
      jobId: "job",
      outputs: [
        { buffer: output, mime: "image/png", filename: "a.png", size: 2 },
        { buffer: output, mime: "image/png", filename: "b.png", size: 2 },
      ],
      inputBytes: 4,
      outputBytes: 4,
    }),
    [output],
  );
});

test("PDF inspection messages keep page previews typed and transferable", () => {
  const input = createWorkerInput(
    "pdf-1",
    new ArrayBuffer(8),
    "document.pdf",
    "application/pdf",
  );
  assert.deepEqual(createInspectPdfMessage(" inspect-1 ", input, 160), {
    type: "inspect-pdf",
    jobId: "inspect-1",
    input,
    thumbnailWidth: 160,
  });
  assert.throws(() => createInspectPdfMessage("", input), /job ID/);
  assert.throws(() => createInspectPdfMessage("inspect", input, 0), /positive integer/);

  const thumbnail = new ArrayBuffer(4);
  assert.deepEqual(
    getPdfInspectionTransferables({
      type: "pdf-inspection",
      jobId: "inspect-1",
      pageCount: 2,
      thumbnails: [
        { pageNumber: 1, width: 160, height: 200, mime: "image/jpeg", buffer: thumbnail },
        { pageNumber: 2, width: 160, height: 200, mime: "image/jpeg", buffer: thumbnail },
      ],
    }),
    [thumbnail],
  );
});

test("worker job state ignores stale responses and cannot complete after cancellation", () => {
  let state = beginWorkerJob(createWorkerJobState(), "job-1");
  state = reduceWorkerJobState(state, {
    type: "progress",
    jobId: "other-job",
    current: 9,
    completed: 9,
    total: 9,
    stage: "encode",
  });
  assert.equal(state.progress, null);

  state = reduceWorkerJobState(state, {
    type: "progress",
    jobId: "job-1",
    current: 2,
    completed: 1,
    total: 4,
    stage: "decode",
  });
  assert.deepEqual(state.progress, {
    current: 2,
    completed: 1,
    total: 4,
    stage: "decode",
  });

  const canceled = cancelWorkerJob(state);
  assert.deepEqual(canceled.message, { type: "cancel", jobId: "job-1" });
  assert.equal(canceled.state.status, "canceled");
  assert.deepEqual(
    reduceWorkerJobState(canceled.state, {
      type: "complete",
      jobId: "job-1",
      outputs: [
        {
          buffer: new ArrayBuffer(1),
          mime: "image/png",
          filename: "photo.png",
          size: 1,
        },
      ],
      inputBytes: 3,
      outputBytes: 1,
    }),
    canceled.state,
  );
  assert.equal(cancelWorkerJob(createWorkerJobState()), null);
});

test("worker failures and completions produce terminal state with size statistics", () => {
  const running = beginWorkerJob(createWorkerJobState(), "job-2");
  const failed = reduceWorkerJobState(running, {
    type: "failure",
    jobId: "job-2",
    code: "memory-limit",
    message: "This file needs more memory than the browser can provide.",
  });
  assert.equal(failed.status, "failed");
  assert.deepEqual(failed.error, {
    code: "memory-limit",
    message: "This file needs more memory than the browser can provide.",
  });

  const output = {
    buffer: new ArrayBuffer(2),
    mime: "application/pdf",
    filename: "merged.pdf",
    size: 2,
  };
  const complete = reduceWorkerJobState(
    beginWorkerJob(createWorkerJobState(), "job-3"),
    {
      type: "complete",
      jobId: "job-3",
      outputs: [output],
      inputBytes: 5,
      outputBytes: 2,
    },
  );
  assert.equal(complete.status, "completed");
  assert.deepEqual(complete.outputs, [output]);
  assert.deepEqual(complete.sizes, { inputBytes: 5, outputBytes: 2 });
});

function riff(chunkType, payload) {
  const bytes = new Uint8Array(20 + payload.length + (payload.length % 2));
  bytes.set(new TextEncoder().encode("RIFF"), 0);
  new DataView(bytes.buffer).setUint32(4, bytes.length - 8, true);
  bytes.set(new TextEncoder().encode("WEBP"), 8);
  bytes.set(new TextEncoder().encode(chunkType), 12);
  new DataView(bytes.buffer).setUint32(16, payload.length, true);
  bytes.set(payload, 20);
  return bytes;
}

function ftyp(majorBrand, compatibleBrands = []) {
  const bytes = new Uint8Array(16 + compatibleBrands.length * 4);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, bytes.length);
  bytes.set(new TextEncoder().encode("ftyp"), 4);
  bytes.set(new TextEncoder().encode(majorBrand), 8);
  bytes.set(new TextEncoder().encode("0000"), 12);
  compatibleBrands.forEach((brand, index) => {
    bytes.set(new TextEncoder().encode(brand), 16 + index * 4);
  });
  return bytes;
}

function jpegWithExifOrientation(orientation) {
  const bytes = new Uint8Array(40);
  bytes.set([0xff, 0xd8, 0xff, 0xe1, 0x00, 0x22], 0);
  bytes.set([0x45, 0x78, 0x69, 0x66, 0x00, 0x00], 6);
  bytes.set([0x49, 0x49], 12);
  const view = new DataView(bytes.buffer);
  view.setUint16(14, 42, true);
  view.setUint32(16, 8, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 0x0112, true);
  view.setUint16(24, 3, true);
  view.setUint32(26, 1, true);
  view.setUint16(30, orientation, true);
  view.setUint32(34, 0, true);
  bytes.set([0xff, 0xd9], 38);
  return bytes;
}
