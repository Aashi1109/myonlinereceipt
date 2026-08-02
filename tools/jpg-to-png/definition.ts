import type { ToolSpec } from "../../lib/tool-framework/spec";

export default {
  toolId: "media.jpg-to-png",
  app: "media",
  category: "image-conversion",
  keywords: [
    "jpg",
    "jpeg",
    "png",
    "convert",
    "image",
    "lossless",
    "transparency",
    "batch",
  ],
  name: "JPG to PNG",
  description: "Convert JPG images to PNG.",
  input: {
    kind: "files",
    label: "JPG images",
    accept: "image/jpeg",
    multiple: true,
    engine: "image",
    maxFiles: 50,
    maxBytes: 26_214_400,
  },
  settings: { fields: {} },
  trigger: { mode: "manual", actionLabel: "Convert to PNG" },
  layout: "file-processor",
  capabilities: { cancel: true, download: true, progress: true },
  labels: {
    empty: "Add JPG images to convert them to PNG.",
    ready: "Conversion settings are ready.",
    running: "Converting JPG images…",
  },
  content: {
    howToUse: [
      "Add one or more JPG files. Everything is decoded and re-encoded in your browser, so nothing is uploaded.",
      "There is nothing to configure: the original pixel dimensions are kept and PNG is lossless, so the output matches the decoded JPG exactly.",
      "Run the conversion and download the PNGs. Multiple files are produced one-for-one, each named after its source.",
      "Use PNG when you need a lossless master to edit further, or a format that supports transparency for later compositing.",
    ],
    limitations: [
      "PNG files are usually several times larger than the JPG they came from. JPG already discarded detail; PNG cannot recover it, only stop discarding more.",
      "Converting to PNG does not add transparency. JPG has no alpha channel, so the result is fully opaque.",
      "Decoding and re-encoding drops EXIF, GPS, and colour-profile metadata. Rotation recorded in EXIF is applied to the pixels first.",
      "Each image must be 25 MiB or smaller, up to 50 files per run, and no more than 100 megapixels once decoded.",
    ],
    faq: [
      {
        q: "Will this improve the quality of my JPG?",
        a: "No. Quality is fixed the moment a JPG is saved. PNG preserves what is there without adding new compression damage, which matters if you plan to keep editing.",
      },
      {
        q: "Why is the PNG so much bigger?",
        a: "PNG is lossless, so it stores every pixel including JPG compression artefacts. Photographs compress poorly in PNG; keep JPG for delivery and use PNG for editing.",
      },
      {
        q: "Are my images uploaded anywhere?",
        a: "No. Conversion runs entirely in a Web Worker in your browser. The files never leave the device.",
      },
    ],
  },
} as const satisfies ToolSpec;
