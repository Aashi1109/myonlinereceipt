export type ToolApp = "paperwork" | "devtools";

export interface ToolManifestEntry {
  id: string;
  app: ToolApp;
  componentKey: string;
  defaultName: string;
  defaultDescription: string;
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

export const toolManifest = [
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
  {
    id: "devtools.json-formatter",
    app: "devtools",
    componentKey: "json-formatter",
    defaultName: "JSON Formatter and Validator",
    defaultDescription:
      "Format, minify, validate, and inspect JSON locally in your browser.",
  },
] as const satisfies readonly ToolManifestEntry[];

const seededToolRoutes = {
  "paperwork.invoice-generator": ["invoice-generator", 0],
  "paperwork.receipt-generator": ["receipt-generator", 1],
  "paperwork.expense-report": ["expense-report", 2],
  "paperwork.mileage-log": ["mileage-log", 3],
  "paperwork.quarterly-tax-estimator": ["quarterly-tax-estimator", 4],
  "paperwork.w9-request": ["w9-request", 5],
  "paperwork.1099-nec-tracker": ["1099-nec-tracker", 6],
  "devtools.json-formatter": ["json-formatter", 0],
} as const satisfies Record<
  (typeof toolManifest)[number]["id"],
  readonly [slug: string, order: number]
>;

export const seededManagedTools: readonly ManagedTool[] = toolManifest.map(
  (entry) => ({
    toolId: entry.id,
    slug: seededToolRoutes[entry.id][0],
    name: entry.defaultName,
    description: entry.defaultDescription,
    order: seededToolRoutes[entry.id][1],
    enabled: true,
    archived: false,
  }),
);

export const reservedToolSlugs = {
  paperwork: ["admin", "api"],
  devtools: ["api"],
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
  const nextOrder: Record<ToolApp, number> = { paperwork: 0, devtools: 0 };

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
