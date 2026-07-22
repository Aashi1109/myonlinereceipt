export type ToolApp = "paperwork" | "devtools" | "media";

export interface ToolManifestEntry {
  id: string;
  app: ToolApp;
  category?: string;
  componentKey: string;
  defaultName: string;
  defaultDescription: string;
  defaultEnabled?: boolean;
  keywords?: readonly string[];
}

export interface ManagedTool {
  toolId: string;
  slug: string | null;
  name: string;
  description: string;
  order: number;
  enabled: boolean;
  archived: boolean;
}

export interface ResolvedTool extends ToolManifestEntry, ManagedTool {}

type DevtoolDefinition = readonly [
  slug: string,
  name: string,
  description: string,
  defaultEnabled?: boolean,
];

const devtoolsByCategory: readonly (readonly [
  category: string,
  tools: readonly DevtoolDefinition[],
])[] = [
  [
    "JSON Tools",
    [
      ["json-to-csv", "JSON to CSV", "Convert JSON to CSV"],
      ["csv-to-json", "CSV to JSON", "Convert CSV to JSON"],
      ["json-formatter", "JSON Formatter", "Beautify & format JSON"],
      ["json-viewer", "JSON Viewer", "View JSON as tree"],
      ["json-validator", "JSON Validator", "Validate JSON syntax"],
      [
        "json-to-typescript",
        "JSON to TypeScript",
        "JSON → TypeScript interfaces",
      ],
      ["json-minifier", "JSON Minifier", "Minify & compress JSON"],
      ["yaml-to-json", "YAML to JSON", "Convert YAML to JSON"],
      ["json-to-yaml", "JSON to YAML", "Convert JSON to YAML"],
      ["json-diff", "JSON Diff", "Compare two JSON objects"],
      [
        "json-schema-generator",
        "JSON Schema Generator",
        "Generate JSON Schema",
      ],
      ["json-editor", "JSON Editor", "Edit JSON with live validation"],
      ["xml-to-json", "XML to JSON", "Convert XML to JSON"],
      ["json-path-tester", "JSON Path Tester", "Test JSONPath expressions"],
      ["json-to-xml", "JSON to XML", "Convert JSON to XML"],
      [
        "json-schema-validator",
        "JSON Schema Validator",
        "Validate JSON against schema",
      ],
      [
        "json-array-to-table",
        "JSON Array to Table",
        "JSON array as HTML table",
      ],
      ["json-escape", "JSON Escape", "Escape JSON strings"],
      ["json-unescape", "JSON Unescape", "Unescape JSON strings"],
      ["json-key-extractor", "JSON Key Extractor", "Extract all JSON keys"],
      ["json-sorter", "JSON Sorter", "Sort JSON keys"],
    ],
  ],
  [
    "CSV & Data Tools",
    [
      ["csv-viewer", "CSV Viewer", "View CSV as table"],
      [
        "csv-to-markdown-table",
        "CSV to Markdown Table",
        "CSV to Markdown table",
      ],
      ["csv-to-tsv", "CSV to TSV", "Convert CSV to TSV"],
      ["tsv-to-csv", "TSV to CSV", "Convert TSV to CSV"],
      ["csv-formatter", "CSV Formatter", "Format & clean CSV data"],
      ["csv-to-table", "CSV to Table", "Convert CSV to table"],
      ["csv-sorter", "CSV Sorter", "Sort CSV by column"],
      ["csv-validator", "CSV Validator", "Validate CSV data"],
      [
        "csv-duplicate-remover",
        "CSV Duplicate Row Remover",
        "Remove duplicate CSV rows",
      ],
      ["csv-filter", "CSV Filter", "Filter CSV rows"],
      [
        "csv-delimiter-converter",
        "CSV Delimiter Converter",
        "Change CSV delimiter",
      ],
      [
        "csv-column-extractor",
        "CSV Column Extractor",
        "Extract CSV columns",
      ],
    ],
  ],
  [
    "Text Tools",
    [
      ["password-generator", "Password Generator", "Generate secure passwords"],
      ["word-counter", "Word Counter", "Count words & characters"],
      ["character-counter", "Character Counter", "Count text characters"],
      [
        "lorem-ipsum-generator",
        "Lorem Ipsum Generator",
        "Generate placeholder text",
      ],
      ["text-diff-checker", "Text Diff Checker", "Compare two texts"],
      ["text-case-converter", "Text Case Converter", "Convert text case"],
      ["slug-generator", "Slug Generator", "Generate URL slugs"],
      [
        "duplicate-line-remover",
        "Duplicate Line Remover",
        "Remove duplicate lines",
      ],
      ["find-and-replace", "Find and Replace", "Find & replace in text"],
      [
        "random-string-generator",
        "Random String Generator",
        "Generate random strings",
      ],
      ["text-sorter", "Text Sorter", "Sort text lines"],
      ["whitespace-remover", "Whitespace Remover", "Remove extra whitespace"],
      ["text-reverser", "Text Reverser", "Reverse text or words"],
      [
        "duplicate-word-remover",
        "Duplicate Word Remover",
        "Remove duplicate words",
      ],
    ],
  ],
  [
    "Encoding & Decoding",
    [
      ["jwt-decoder", "JWT Decoder", "Decode JWT tokens"],
      ["base64-decoder", "Base64 Decoder", "Decode from Base64"],
      ["base64-encoder", "Base64 Encoder", "Encode to Base64"],
      ["qr-code-generator", "QR Code Generator", "Generate QR codes"],
      ["url-decoder", "URL Decoder", "Decode URL strings"],
      ["url-encoder", "URL Encoder", "Encode URL strings"],
      ["binary-to-text", "Binary to Text", "Binary to readable text"],
      ["html-encoder", "HTML Encoder", "Encode HTML entities"],
      ["html-decoder", "HTML Decoder", "Decode HTML entities"],
      ["text-to-binary", "Text to Binary", "Text to binary"],
      ["hex-to-text", "Hex to Text", "Hex to readable text"],
      ["text-to-hex", "Text to Hex", "Text to hexadecimal"],
      ["unicode-decoder", "Unicode Decoder", "Decode Unicode escapes"],
      ["unicode-encoder", "Unicode Encoder", "Encode to Unicode"],
    ],
  ],
  [
    "Hashing & Crypto",
    [
      ["uuid-generator", "UUID Generator", "Generate UUIDs"],
      [
        "bcrypt-generator",
        "Bcrypt Hash Generator",
        "Generate bcrypt hashes",
      ],
      ["sha256-generator", "SHA256 Generator", "Generate SHA256 hash"],
      ["md5-generator", "MD5 Generator", "Generate MD5 hash"],
      ["sha1-generator", "SHA1 Generator", "Generate SHA1 hash"],
      ["bcrypt-compare", "Bcrypt Compare", "Compare bcrypt hash"],
      ["sha512-generator", "SHA512 Generator", "Generate SHA512 hash"],
      ["hmac-generator", "HMAC Generator", "Generate HMAC signatures"],
      ["nanoid-generator", "Nano ID Generator", "Generate Nano IDs"],
      ["checksum-generator", "Checksum Generator", "Generate file checksums"],
      ["hash-compare", "Hash Compare", "Compare two hashes"],
    ],
  ],
  [
    "JWT & API Tools",
    [
      [
        "http-status-codes",
        "HTTP Status Code Lookup",
        "Look up HTTP status codes",
      ],
      ["utm-builder", "UTM Builder", "Build UTM tracking URLs"],
      ["curl-to-fetch", "cURL to Fetch", "Convert cURL to Fetch"],
      ["curl-to-axios", "cURL to Axios", "Convert cURL to Axios"],
      [
        "basic-auth-generator",
        "Basic Auth Generator",
        "Generate Basic Auth headers",
      ],
      [
        "jwt-expiration-checker",
        "JWT Expiration Checker",
        "Check JWT expiration",
      ],
      ["url-query-parser", "URL Query Parser", "Parse URL query strings"],
      ["url-query-builder", "URL Query Builder", "Build URL query strings"],
      ["bearer-token-parser", "Bearer Token Parser", "Parse Bearer tokens"],
    ],
  ],
  [
    "Web & Markup Tools",
    [
      ["markdown-to-html", "Markdown to HTML", "Convert Markdown to HTML"],
      [
        "javascript-formatter",
        "JavaScript Formatter",
        "Format JavaScript code",
      ],
      ["css-formatter", "CSS Formatter", "Format CSS code"],
      ["html-formatter", "HTML Formatter", "Format HTML code"],
      [
        "javascript-minifier",
        "JavaScript Minifier",
        "Minify JavaScript code",
      ],
      ["css-minifier", "CSS Minifier", "Minify CSS code"],
      ["markdown-previewer", "Markdown Previewer", "Preview Markdown"],
      ["html-viewer", "HTML Viewer", "Preview HTML code"],
    ],
  ],
  [
    "Color & Design Tools",
    [
      ["hex-to-rgb", "HEX to RGB", "HEX to RGB converter"],
      ["rgb-to-hex", "RGB to HEX", "RGB to HEX converter"],
      ["color-picker", "Color Picker", "Pick and convert colors"],
      [
        "gradient-generator",
        "Gradient Generator",
        "Generate CSS gradients",
      ],
      [
        "css-box-shadow",
        "CSS Box Shadow Generator",
        "Generate CSS box shadows",
      ],
      [
        "border-radius-generator",
        "Border Radius Generator",
        "Generate border radius CSS",
      ],
      ["css-unit-converter", "CSS Unit Converter", "Convert CSS units"],
      ["hex-to-hsl", "HEX to HSL", "HEX to HSL converter"],
    ],
  ],
  [
    "Date & Time Tools",
    [
      ["timestamp-converter", "Timestamp Converter", "Convert timestamps"],
      [
        "date-difference",
        "Date Difference Calculator",
        "Calculate date difference",
      ],
      ["cron-builder", "Cron Expression Builder", "Build cron expressions"],
      ["cron-parser", "Cron Expression Parser", "Parse cron expressions"],
      ["iso-date-converter", "ISO Date Converter", "Convert ISO date formats"],
    ],
  ],
  [
    "Developer Generators",
    [
      ["regex-tester", "Regex Tester", "Test regex patterns"],
      [
        "random-number-generator",
        "Random Number Generator",
        "Generate random numbers",
      ],
      ["meta-tag-generator", "Meta Tag Generator", "Generate HTML meta tags"],
      [
        "open-graph-preview",
        "Open Graph Preview",
        "Preview Open Graph tags",
      ],
      [
        "robots-txt-generator",
        "Robots.txt Generator",
        "Generate robots.txt",
      ],
      ["api-key-generator", "API Key Generator", "Generate API keys"],
      ["regex-generator", "Regex Generator", "Generate regex patterns"],
      [
        "sitemap-generator",
        "Sitemap Generator",
        "Generate XML sitemap",
      ],
    ],
  ],
  [
    "Diagram Tools",
    [["diagram-generator", "Diagram Generator", "Text to flowcharts & diagrams"]],
  ],
  [
    "SEO & Domain Tools",
    [
      [
        "domain-rating-checker",
        "Domain Rating Checker",
        "Check Domain Rating (DR)",
        false,
      ],
      [
        "domain-age-checker",
        "Domain Age & WHOIS Checker",
        "Check domain age & WHOIS",
        false,
      ],
      [
        "dns-checker",
        "DNS & Email Records Checker",
        "Look up DNS & email records",
        false,
      ],
    ],
  ],
];

type MediaToolDefinition = readonly [
  slug: string,
  name: string,
  description: string,
  keywords: string,
];

const mediaByCategory: readonly (readonly [
  category: string,
  tools: readonly MediaToolDefinition[],
])[] = [
  [
    "PDF Conversion",
    [
      [
        "image-to-pdf",
        "Image to PDF",
        "Convert JPG, PNG, WebP, or HEIC images into a PDF.",
        "pictures photos document converter",
      ],
      [
        "pdf-to-jpg",
        "PDF to JPG",
        "Render PDF pages as downloadable JPG images.",
        "jpeg pictures pages converter",
      ],
      [
        "pdf-to-png",
        "PDF to PNG",
        "Render PDF pages as downloadable PNG images.",
        "transparent pictures pages converter",
      ],
    ],
  ],
  [
    "PDF Organization",
    [
      [
        "merge-pdf",
        "Merge PDF",
        "Combine multiple PDFs in the order you choose.",
        "join combine documents pages",
      ],
      [
        "split-pdf",
        "Split PDF",
        "Split a PDF by page, group size, or page range.",
        "separate divide document ranges",
      ],
      [
        "extract-pdf-pages",
        "Extract PDF Pages",
        "Create a new PDF from selected pages.",
        "select copy document range",
      ],
      [
        "reorder-pdf-pages",
        "Reorder PDF Pages",
        "Arrange PDF pages into a new order.",
        "move sort organize document",
      ],
      [
        "rotate-pdf-pages",
        "Rotate PDF Pages",
        "Rotate all or selected pages in a PDF.",
        "turn orientation document",
      ],
      [
        "delete-pdf-pages",
        "Delete PDF Pages",
        "Remove selected pages from a PDF.",
        "erase remove document",
      ],
      [
        "crop-pdf",
        "Crop PDF",
        "Set a new visible crop area for PDF pages.",
        "trim margins page box",
      ],
      [
        "resize-pdf-pages",
        "Resize PDF Pages",
        "Resize PDF pages to standard or custom dimensions.",
        "paper a4 letter legal scale",
      ],
    ],
  ],
  [
    "PDF Optimization",
    [
      [
        "compress-pdf",
        "Compress PDF",
        "Reduce PDF file size locally with document-preserving or strong compression.",
        "optimize shrink reduce qpdf",
      ],
      [
        "watermark-pdf",
        "Watermark PDF",
        "Add a text or image watermark to PDF pages.",
        "stamp overlay brand document",
      ],
      [
        "add-page-numbers",
        "Add Page Numbers",
        "Place configurable page numbers on a PDF.",
        "pagination footer header document",
      ],
    ],
  ],
  [
    "Image Conversion",
    [
      ["jpg-to-png", "JPG to PNG", "Convert JPG images to PNG.", "jpeg converter image"],
      ["png-to-jpg", "PNG to JPG", "Convert PNG images to JPG.", "jpeg converter image"],
      ["jpg-to-webp", "JPG to WebP", "Convert JPG images to WebP.", "jpeg converter image"],
      ["png-to-webp", "PNG to WebP", "Convert PNG images to WebP.", "converter image"],
      ["webp-to-jpg", "WebP to JPG", "Convert WebP images to JPG.", "jpeg converter image"],
      ["webp-to-png", "WebP to PNG", "Convert WebP images to PNG.", "converter image"],
      ["heic-to-jpg", "HEIC to JPG", "Convert HEIC images to JPG.", "heif iphone jpeg converter"],
      ["heic-to-png", "HEIC to PNG", "Convert HEIC images to PNG.", "heif iphone converter"],
    ],
  ],
  [
    "Image Editing",
    [
      [
        "compress-image",
        "Compress Image",
        "Reduce image file size while keeping its format and dimensions.",
        "optimize shrink jpg png webp",
      ],
      [
        "resize-image",
        "Resize Image",
        "Resize one or more images by pixels or percentage.",
        "dimensions scale batch contain cover",
      ],
      [
        "crop-image",
        "Crop Image",
        "Crop an image freely or to a common aspect ratio.",
        "trim aspect ratio dimensions",
      ],
      [
        "rotate-image",
        "Rotate Image",
        "Rotate images by 90, 180, or 270 degrees.",
        "turn orientation picture",
      ],
      [
        "flip-image",
        "Flip Image",
        "Flip images horizontally or vertically.",
        "mirror horizontal vertical picture",
      ],
      [
        "combine-images",
        "Combine Images",
        "Join images horizontally, vertically, or in a grid.",
        "collage merge grid layout",
      ],
      [
        "remove-image-metadata",
        "Remove Image Metadata",
        "Strip EXIF, ICC, and comment metadata by re-encoding an image.",
        "privacy exif clean strip",
      ],
      [
        "social-media-image-resizer",
        "Social Media Image Resizer",
        "Resize images for common social platform dimensions.",
        "instagram youtube linkedin facebook twitter x",
      ],
    ],
  ],
];

export const toolManifest: readonly ToolManifestEntry[] = [
  {
    id: "paperwork.invoice-generator",
    app: "paperwork",
    componentKey: "invoice-generator",
    defaultName: "Invoice Generator",
    defaultDescription:
      "Create printable invoices with reusable business details and themes.",
  },
  {
    id: "paperwork.receipt-generator",
    app: "paperwork",
    componentKey: "receipt-generator",
    defaultName: "Receipt Generator",
    defaultDescription:
      "Create clean receipts for payments and completed invoices.",
  },
  {
    id: "paperwork.expense-report",
    app: "paperwork",
    componentKey: "expense-report",
    defaultName: "Expense Report Generator",
    defaultDescription:
      "Organize expenses into a printable reimbursement report.",
  },
  {
    id: "paperwork.mileage-log",
    app: "paperwork",
    componentKey: "mileage-log",
    defaultName: "Mileage Log Tracker",
    defaultDescription:
      "Track business mileage and calculate deductible amounts.",
  },
  {
    id: "paperwork.quarterly-tax-estimator",
    app: "paperwork",
    componentKey: "quarterly-tax-estimator",
    defaultName: "Quarterly Tax Estimator",
    defaultDescription:
      "Estimate quarterly US self-employment and income taxes.",
  },
  {
    id: "paperwork.w9-request",
    app: "paperwork",
    componentKey: "w9-request",
    defaultName: "W-9 Request Template",
    defaultDescription:
      "Collect contractor details and prepare W-9 requests.",
  },
  {
    id: "paperwork.1099-nec-tracker",
    app: "paperwork",
    componentKey: "1099-nec-tracker",
    defaultName: "1099-NEC Tracker",
    defaultDescription:
      "Track contractor payments and year-end reporting thresholds.",
  },
  ...devtoolsByCategory.flatMap(([category, tools]) =>
    tools.map(
      ([slug, defaultName, defaultDescription, defaultEnabled = true]) => ({
        id: `devtools.${slug}`,
        app: "devtools" as const,
        category,
        componentKey: slug,
        defaultName,
        defaultDescription,
        defaultEnabled,
      }),
    ),
  ),
  ...mediaByCategory.flatMap(([category, tools]) =>
    tools.map(([slug, defaultName, defaultDescription, keywords]) => ({
      id: `media.${slug}`,
      app: "media" as const,
      category,
      componentKey: slug,
      defaultName,
      defaultDescription,
      keywords: keywords.split(" "),
    })),
  ),
];

const nextToolOrder: Record<ToolApp, number> = {
  paperwork: 0,
  devtools: 0,
  media: 0,
};

export const seededManagedTools: readonly ManagedTool[] = toolManifest.map(
  (entry) => ({
    toolId: entry.id,
    slug: entry.componentKey,
    name: entry.defaultName,
    description: entry.defaultDescription,
    order: nextToolOrder[entry.app]++,
    enabled: entry.defaultEnabled ?? true,
    archived: false,
  }),
);

export const reservedToolSlugs = {
  paperwork: ["admin", "api"],
  devtools: ["api"],
  media: ["api"],
} as const satisfies Readonly<Record<ToolApp, readonly string[]>>;

const TOOL_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isValidToolSlug(
  app: ToolApp,
  slug: unknown,
): slug is string {
  return (
    typeof slug === "string" &&
    TOOL_SLUG_PATTERN.test(slug) &&
    !reservedToolSlugs[app].some((reservedSlug) => reservedSlug === slug)
  );
}

function mergeManagedTool(
  manifest: ToolManifestEntry,
  fallback: ManagedTool,
  stored: unknown,
): ManagedTool {
  if (!isRecord(stored)) return fallback;

  const slug = Object.hasOwn(stored, "slug")
    ? stored.slug === null
      ? null
      : isValidToolSlug(manifest.app, stored.slug)
        ? stored.slug
        : null
    : fallback.slug;

  return {
    toolId: manifest.id,
    slug,
    name:
      typeof stored.name === "string" && stored.name.trim()
        ? stored.name.trim()
        : fallback.name,
    description:
      typeof stored.description === "string" && stored.description.trim()
        ? stored.description.trim()
        : fallback.description,
    order: Number.isInteger(stored.order)
      ? (stored.order as number)
      : fallback.order,
    enabled:
      slug !== null &&
      (typeof stored.enabled === "boolean" ? stored.enabled : fallback.enabled),
    archived:
      typeof stored.archived === "boolean" ? stored.archived : fallback.archived,
  };
}

export function mergeToolManifest(
  managedTools?: unknown,
  manifest: readonly ToolManifestEntry[] = toolManifest,
): ResolvedTool[] {
  const storedById = new Map<string, unknown>();

  if (Array.isArray(managedTools)) {
    for (const stored of managedTools) {
      if (
        isRecord(stored) &&
        typeof stored.toolId === "string" &&
        !storedById.has(stored.toolId)
      ) {
        storedById.set(stored.toolId, stored);
      }
    }
  }

  const seedById = new Map<string, ManagedTool>(
    seededManagedTools.map((tool) => [tool.toolId, tool] as const),
  );
  const nextOrder: Record<ToolApp, number> = {
    paperwork: 0,
    devtools: 0,
    media: 0,
  };

  return manifest.map((entry) => {
    const order = nextOrder[entry.app]++;
    const fallback = seedById.get(entry.id) ?? {
      toolId: entry.id,
      slug: null,
      name: entry.defaultName,
      description: entry.defaultDescription,
      order,
      enabled: false,
      archived: false,
    };

    return {
      ...entry,
      ...mergeManagedTool(entry, fallback, storedById.get(entry.id)),
    };
  });
}

export function areToolSlugsUnique(
  tools: readonly ManagedTool[],
  manifest: readonly ToolManifestEntry[] = toolManifest,
): boolean {
  const appById = new Map(
    manifest.map((entry) => [entry.id, entry.app] as const),
  );
  const slugs = new Set<string>();

  for (const tool of tools) {
    if (tool.slug === null) continue;

    const app = appById.get(tool.toolId);
    if (!app) return false;

    const key = `${app}:${tool.slug}`;
    if (slugs.has(key)) return false;
    slugs.add(key);
  }

  return true;
}

export function assertToolSlugImmutable(
  previousSlug: string | null,
  nextSlug: string | null,
): void {
  if (previousSlug !== null && previousSlug !== nextSlug) {
    throw new Error("A saved tool slug is immutable.");
  }
}

export function isToolAvailable<T extends ManagedTool>(
  tool: T,
): tool is T & { slug: string } {
  return tool.slug !== null && tool.enabled && !tool.archived;
}

export function getEnabledTools<T extends ResolvedTool>(
  tools: readonly T[],
  app?: ToolApp,
): Array<T & { slug: string }> {
  return tools
    .filter(
      (tool): tool is T & { slug: string } =>
        isToolAvailable(tool) && (!app || tool.app === app),
    )
    .sort((left, right) => left.order - right.order);
}

export function findAvailableToolBySlug<T extends ResolvedTool>(
  tools: readonly T[],
  app: ToolApp,
  slug: unknown,
): (T & { slug: string }) | undefined {
  if (!isValidToolSlug(app, slug)) return undefined;

  const matches = tools.filter(
    (tool): tool is T & { slug: string } =>
      tool.app === app && tool.slug === slug && isToolAvailable(tool),
  );

  return matches.length === 1 ? matches[0] : undefined;
}
