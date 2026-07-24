const definitions = [
  {
    slug: "image-to-pdf",
    title: "Image to PDF",
    description: "Combine local images into one PDF.",
    category: "PDF Conversion",
    engine: "image",
    accept: "image/jpeg,image/png,image/webp,image/heic,image/heif",
    multiple: true,
  },
  {
    slug: "pdf-to-jpg",
    title: "PDF to JPG",
    description: "Convert selected PDF pages to JPG images.",
    category: "PDF Conversion",
    engine: "pdf",
    accept: "application/pdf",
    multiple: false,
  },
  {
    slug: "pdf-to-png",
    title: "PDF to PNG",
    description: "Convert selected PDF pages to PNG images.",
    category: "PDF Conversion",
    engine: "pdf",
    accept: "application/pdf",
    multiple: false,
  },
  {
    slug: "merge-pdf",
    title: "Merge PDF",
    description: "Merge PDF files in the order you choose.",
    category: "PDF Organization",
    engine: "pdf",
    accept: "application/pdf",
    multiple: true,
  },
  {
    slug: "split-pdf",
    title: "Split PDF",
    description: "Split a PDF by page, interval, or range.",
    category: "PDF Organization",
    engine: "pdf",
    accept: "application/pdf",
    multiple: false,
  },
  {
    slug: "extract-pdf-pages",
    title: "Extract PDF Pages",
    description: "Create a PDF from selected pages.",
    category: "PDF Organization",
    engine: "pdf",
    accept: "application/pdf",
    multiple: false,
  },
  {
    slug: "reorder-pdf-pages",
    title: "Reorder PDF Pages",
    description: "Rearrange PDF pages with accessible controls.",
    category: "PDF Organization",
    engine: "pdf",
    accept: "application/pdf",
    multiple: false,
  },
  {
    slug: "rotate-pdf-pages",
    title: "Rotate PDF Pages",
    description: "Rotate all or selected PDF pages.",
    category: "PDF Organization",
    engine: "pdf",
    accept: "application/pdf",
    multiple: false,
  },
  {
    slug: "delete-pdf-pages",
    title: "Delete PDF Pages",
    description: "Remove selected pages while keeping a valid PDF.",
    category: "PDF Organization",
    engine: "pdf",
    accept: "application/pdf",
    multiple: false,
  },
  {
    slug: "crop-pdf",
    title: "Crop PDF",
    description: "Change the visible crop box on selected pages.",
    category: "PDF Organization",
    engine: "pdf",
    accept: "application/pdf",
    multiple: false,
  },
  {
    slug: "resize-pdf-pages",
    title: "Resize PDF Pages",
    description: "Resize PDF pages and their contents.",
    category: "PDF Organization",
    engine: "pdf",
    accept: "application/pdf",
    multiple: false,
  },
  {
    slug: "compress-pdf",
    title: "Compress PDF",
    description: "Reduce PDF size with structural or strong compression.",
    category: "PDF Optimization",
    engine: "pdf",
    accept: "application/pdf",
    multiple: false,
  },
  {
    slug: "watermark-pdf",
    title: "Watermark PDF",
    description: "Add a text or image watermark to PDF pages.",
    category: "PDF Optimization",
    engine: "pdf",
    accept: "application/pdf",
    multiple: false,
  },
  {
    slug: "add-page-numbers",
    title: "Add Page Numbers",
    description: "Add configurable page numbers to a PDF.",
    category: "PDF Optimization",
    engine: "pdf",
    accept: "application/pdf",
    multiple: false,
  },
  {
    slug: "jpg-to-png",
    title: "JPG to PNG",
    description: "Convert JPG images to PNG.",
    category: "Image Conversion",
    engine: "image",
    accept: "image/jpeg",
    multiple: true,
  },
  {
    slug: "png-to-jpg",
    title: "PNG to JPG",
    description: "Convert PNG images to JPG with a chosen background.",
    category: "Image Conversion",
    engine: "image",
    accept: "image/png",
    multiple: true,
  },
  {
    slug: "jpg-to-webp",
    title: "JPG to WebP",
    description: "Convert JPG images to WebP.",
    category: "Image Conversion",
    engine: "image",
    accept: "image/jpeg",
    multiple: true,
  },
  {
    slug: "png-to-webp",
    title: "PNG to WebP",
    description: "Convert PNG images to WebP.",
    category: "Image Conversion",
    engine: "image",
    accept: "image/png",
    multiple: true,
  },
  {
    slug: "webp-to-jpg",
    title: "WebP to JPG",
    description: "Convert static WebP images to JPG.",
    category: "Image Conversion",
    engine: "image",
    accept: "image/webp",
    multiple: true,
  },
  {
    slug: "webp-to-png",
    title: "WebP to PNG",
    description: "Convert static WebP images to PNG.",
    category: "Image Conversion",
    engine: "image",
    accept: "image/webp",
    multiple: true,
  },
  {
    slug: "heic-to-jpg",
    title: "HEIC to JPG",
    description: "Convert HEIC images to JPG.",
    category: "Image Conversion",
    engine: "image",
    accept: "image/heic,image/heif",
    multiple: true,
  },
  {
    slug: "heic-to-png",
    title: "HEIC to PNG",
    description: "Convert HEIC images to PNG.",
    category: "Image Conversion",
    engine: "image",
    accept: "image/heic,image/heif",
    multiple: true,
  },
  {
    slug: "compress-image",
    title: "Compress Image",
    description: "Reduce image size while keeping its format and dimensions.",
    category: "Image Editing",
    engine: "image",
    accept: "image/jpeg,image/png,image/webp",
    multiple: true,
  },
  {
    slug: "resize-image",
    title: "Resize Image",
    description: "Resize images by pixels or percentage.",
    category: "Image Editing",
    engine: "image",
    accept: "image/jpeg,image/png,image/webp,image/heic,image/heif",
    multiple: true,
  },
  {
    slug: "crop-image",
    title: "Crop Image",
    description: "Crop an image freely or to a common aspect ratio.",
    category: "Image Editing",
    engine: "image",
    accept: "image/jpeg,image/png,image/webp",
    multiple: false,
  },
  {
    slug: "rotate-image",
    title: "Rotate Image",
    description: "Rotate images by 90, 180, or 270 degrees.",
    category: "Image Editing",
    engine: "image",
    accept: "image/jpeg,image/png,image/webp,image/heic,image/heif",
    multiple: true,
  },
  {
    slug: "flip-image",
    title: "Flip Image",
    description: "Flip images horizontally or vertically.",
    category: "Image Editing",
    engine: "image",
    accept: "image/jpeg,image/png,image/webp,image/heic,image/heif",
    multiple: true,
  },
  {
    slug: "combine-images",
    title: "Combine Images",
    description: "Arrange images horizontally, vertically, or in a grid.",
    category: "Image Editing",
    engine: "image",
    accept: "image/jpeg,image/png,image/webp,image/heic,image/heif",
    multiple: true,
  },
  {
    slug: "remove-image-metadata",
    title: "Remove Image Metadata",
    description: "Apply image orientation and strip embedded metadata.",
    category: "Image Editing",
    engine: "image",
    accept: "image/jpeg,image/png,image/webp,image/heic,image/heif",
    multiple: true,
  },
  {
    slug: "social-media-image-resizer",
    title: "Social Media Image Resizer",
    description: "Resize images to common social media dimensions.",
    category: "Image Editing",
    engine: "image",
    accept: "image/jpeg,image/png,image/webp,image/heic,image/heif",
    multiple: true,
  },
] as const;

export type MediaToolSlug = (typeof definitions)[number]["slug"];
export type MediaToolCategory = (typeof definitions)[number]["category"];
export type MediaEngine = "image" | "pdf";

export interface MediaToolDefinition {
  readonly slug: MediaToolSlug;
  readonly title: string;
  readonly description: string;
  readonly category: MediaToolCategory;
  readonly operation: MediaToolSlug;
  readonly engine: MediaEngine;
  readonly accept: string;
  readonly multiple: boolean;
}

export const mediaToolDefinitions: readonly MediaToolDefinition[] = definitions.map(
  (definition) => ({ ...definition, operation: definition.slug }),
);

export const MEDIA_TOOL_SLUGS: readonly MediaToolSlug[] = mediaToolDefinitions.map(
  ({ slug }) => slug,
);

const definitionsBySlug = new Map(
  mediaToolDefinitions.map((definition) => [definition.slug, definition]),
);

export function getMediaToolDefinition(slug: string) {
  return definitionsBySlug.get(slug as MediaToolSlug);
}

export function isMediaToolSlug(value: string): value is MediaToolSlug {
  return definitionsBySlug.has(value as MediaToolSlug);
}

export const IMAGE_COMPRESSION_PRESETS = {
  best: { quality: 0.9 },
  balanced: { quality: 0.8 },
  smallest: { quality: 0.6 },
} as const;

export const PNG_COMPRESSION_PRESETS = {
  fast: { effort: 3 },
  balanced: { effort: 6 },
  maximum: { effort: 9 },
} as const;

export const IMAGE_TO_PDF_QUALITY_PRESETS = {
  original: { quality: 1, reencode: false },
  balanced: { quality: 0.82, reencode: true },
  small: { quality: 0.65, reencode: true },
} as const;

export const STRONG_PDF_COMPRESSION_PRESETS = {
  high: { dpi: 150, quality: 0.85 },
  balanced: { dpi: 120, quality: 0.75 },
  smallest: { dpi: 96, quality: 0.6 },
} as const;

export const SOCIAL_IMAGE_PRESETS = {
  "instagram-square": {
    label: "Instagram square",
    width: 1080,
    height: 1080,
  },
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
} as const;
