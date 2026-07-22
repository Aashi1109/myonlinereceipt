import {
  getAuthServiceURL,
  getOptionalSession,
} from "@smarttools/auth/session";
import { getAvailableTools } from "@smarttools/control-plane";
import type { ResolvedTool } from "@smarttools/tool-catalog";
import {
  AccountNavigation,
  AppContainer,
  Button,
  CatalogCard,
  EmptyState,
  Input,
  ProductHeader,
  SectionHeading,
  StatusBadge,
  buttonVariants,
} from "@smarttools/ui";
import {
  Binary,
  Braces,
  CalendarClock,
  Check,
  Clock3,
  Code2,
  Download,
  FileText,
  GitBranch,
  Hash,
  KeyRound,
  LockKeyhole,
  Palette,
  Search,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Table2,
  Type,
  WandSparkles,
  WifiOff,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { headers } from "next/headers";

const TOOL_ICONS: Record<string, LucideIcon> = {
  "json-formatter": Braces,
  "json-to-csv": Table2,
  "csv-to-json": Table2,
};

const QUICK_TOOL_KEYS = [
  "json-formatter",
  "json-viewer",
  "json-to-csv",
  "csv-to-json",
  "csv-viewer",
  "jwt-decoder",
  "base64-encoder",
  "sha256-generator",
  "bcrypt-generator",
  "password-generator",
  "uuid-generator",
  "regex-tester",
] as const;

const POPULAR_TOOL_KEYS = [
  "json-to-csv",
  "csv-to-json",
  "json-formatter",
  "jwt-decoder",
  "json-viewer",
  "password-generator",
  "uuid-generator",
  "base64-decoder",
  "bcrypt-generator",
  "word-counter",
  "base64-encoder",
  "timestamp-converter",
] as const;

const RECENT_TOOL_KEYS = [
  "json-path-tester",
  "nanoid-generator",
  "diagram-generator",
  "domain-rating-checker",
  "domain-age-checker",
  "dns-checker",
  "meta-tag-generator",
  "open-graph-preview",
] as const;

const CATEGORIES: readonly {
  description: string;
  icon: LucideIcon;
  name: string;
}[] = [
  { name: "JSON Tools", description: "Format, validate, compare, and transform JSON.", icon: Braces },
  { name: "CSV & Data Tools", description: "Convert, inspect, and clean tabular data.", icon: Table2 },
  { name: "Text Tools", description: "Count, compare, sort, and reshape text.", icon: Type },
  { name: "Encoding & Decoding", description: "Work with Base64, URLs, HTML, and binary data.", icon: Binary },
  { name: "Hashing & Crypto", description: "Generate hashes and inspect common security formats.", icon: Hash },
  { name: "JWT & API Tools", description: "Decode tokens and prepare API requests.", icon: KeyRound },
  { name: "Web & Markup Tools", description: "Convert and inspect developer-facing markup.", icon: FileText },
  { name: "Color & Design Tools", description: "Convert, inspect, and generate color values.", icon: Palette },
  { name: "Date & Time Tools", description: "Convert timestamps and compare dates.", icon: CalendarClock },
  { name: "Developer Generators", description: "Create IDs, passwords, mock data, and more.", icon: WandSparkles },
  { name: "Diagram Tools", description: "Turn structured text into useful diagrams.", icon: GitBranch },
  { name: "SEO & Domain Tools", description: "Inspect domains, DNS, and search metadata.", icon: SearchCheck },
];

const BENEFITS: readonly {
  description: string;
  icon: LucideIcon;
  title: string;
}[] = [
  { title: "Private by default", description: "Your data stays in this browser while each tool runs.", icon: ShieldCheck },
  { title: "Instant results", description: "No upload queue, server round trip, or waiting screen.", icon: Zap },
  { title: "No sign-up required", description: "Open a tool and get the job done immediately.", icon: Check },
  { title: "Works offline after load", description: "Core transformations do not depend on a remote API.", icon: WifiOff },
  { title: "Built for repeat work", description: "Clear controls make common developer tasks predictable.", icon: Clock3 },
  { title: "Easy to export", description: "Copy results or download them in the format you need.", icon: Download },
];

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function selectTools(
  tools: readonly ResolvedTool[],
  componentKeys: readonly string[],
): ResolvedTool[] {
  return componentKeys.flatMap((componentKey) =>
    tools.filter((tool) => tool.componentKey === componentKey),
  );
}

function ToolCard({ tool }: { tool: ResolvedTool }) {
  if (!tool.slug) return null;
  const Icon = TOOL_ICONS[tool.componentKey] ?? Code2;

  return (
    <CatalogCard
      action="Open tool →"
      description={tool.description}
      href={`/${tool.slug}`}
      icon={<Icon aria-hidden="true" />}
      status={<StatusBadge variant="success">Available</StatusBadge>}
      title={tool.name}
    />
  );
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const requestHeaders = await headers();
  const params = await searchParams;
  const query = first(params.q).trim().slice(0, 80);
  const requestedCategory = first(params.category).slice(0, 80);
  const category = CATEGORIES.some(({ name }) => name === requestedCategory)
    ? requestedCategory
    : "";
  const devtoolsUrl = process.env.DEVTOOLS_URL ?? "http://localhost:3002";
  const [tools, session] = await Promise.all([
    getAvailableTools("devtools"),
    getOptionalSession(requestHeaders, devtoolsUrl),
  ]);
  const platformUrl = process.env.PLATFORM_URL ?? "http://localhost:3000";
  const normalizedQuery = query.toLocaleLowerCase();
  const filteredTools = tools.filter(
    (tool) =>
      (!category || tool.category === category) &&
      (!normalizedQuery ||
        `${tool.name} ${tool.description} ${tool.category ?? ""}`
          .toLocaleLowerCase()
          .includes(normalizedQuery)),
  );
  const quickTools = selectTools(tools, QUICK_TOOL_KEYS);
  const popularTools = selectTools(tools, POPULAR_TOOL_KEYS);
  const recentTools = selectTools(tools, RECENT_TOOL_KEYS);
  const hasFilter = Boolean(query || category);
  const showAllTools = !hasFilter && first(params.view) === "all";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ProductHeader
        actions={
          <AccountNavigation
            authUrl={getAuthServiceURL(devtoolsUrl)}
            returnTo={devtoolsUrl}
            user={session ? { name: session.user.name } : null}
          />
        }
        href={platformUrl}
        name="Devtools"
      />

      <main>
        <section className="bg-primary text-primary-foreground">
          <AppContainer className="py-14 text-center sm:flex sm:min-h-[49.5rem] sm:flex-col sm:items-center sm:justify-center sm:py-20">
            <span className="inline-flex rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.14em]">
              Fast, private, and free
            </span>
            <h1 className="mx-auto mt-5 max-w-4xl text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
              Free developer tools that run in your browser.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-primary-foreground/80 sm:text-lg">
              Format, convert, and inspect working data without accounts, uploads, or waiting.
            </p>

            <form
              className="mx-auto mt-8 flex w-full max-w-2xl gap-2 rounded-2xl bg-card p-2 shadow-lg"
              method="get"
              role="search"
            >
              <div className="relative min-w-0 flex-1">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  aria-label="Search developer tools"
                  className="border-0 pl-10 shadow-none focus-visible:ring-0"
                  defaultValue={query}
                  name="q"
                  placeholder="Search developer tools…"
                  type="search"
                />
              </div>
              <Button type="submit" variant="strong">
                Search
              </Button>
            </form>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs font-bold">
              <span className="text-primary-foreground/70">Quick tools:</span>
              {quickTools.map((tool) =>
                tool.slug ? (
                  <a
                    className="rounded-full border border-white/25 bg-white/10 px-3 py-1.5 hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    href={`/${tool.slug}`}
                    key={tool.id}
                  >
                    {tool.name}
                  </a>
                ) : null,
              )}
            </div>
          </AppContainer>
        </section>

        <section aria-label="Devtools facts" className="border-b border-border bg-card">
          <AppContainer className="grid grid-cols-2 divide-x divide-y divide-border py-6 sm:grid-cols-4 sm:divide-y-0">
            {[
              [`${tools.length}`, "Available tools"],
              ["100%", "Browser based"],
              ["Free", "No paywall"],
              ["0", "Uploads required"],
            ].map(([value, label]) => (
              <div className="px-4 py-3 text-center" key={label}>
                <strong className="block text-2xl font-black text-primary">{value}</strong>
                <span className="mt-1 block text-xs font-bold text-muted-foreground">{label}</span>
              </div>
            ))}
          </AppContainer>
        </section>

        {hasFilter || showAllTools ? (
          <section className="py-14 sm:py-16">
            <AppContainer>
              <SectionHeading
                action={
                  <a className={buttonVariants({ size: "sm", variant: "outline" })} href="/">
                    {showAllTools ? "Back" : "Clear search"}
                  </a>
                }
                description={
                  showAllTools
                    ? "Browse every available developer tool in one place."
                    : query
                    ? `Matching “${query}”${category ? ` in ${category}` : ""}.`
                    : `Tools in ${category}.`
                }
                title={showAllTools ? "All Tools" : "Search Results"}
              />
              {filteredTools.length ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredTools.map((tool) => <ToolCard key={tool.id} tool={tool} />)}
                </div>
              ) : (
                <EmptyState
                  action={
                    <a className={buttonVariants()} href="/">
                      {showAllTools ? "Back" : "Browse all tools"}
                    </a>
                  }
                  description={
                    showAllTools
                      ? "There are no developer tools available right now."
                      : "Try another search or category. More tools are being added one by one."
                  }
                  title="No available tools found"
                />
              )}
            </AppContainer>
          </section>
        ) : (
          <>
            <section className="py-14 sm:py-16">
              <AppContainer>
                <SectionHeading
                  action={
                    <a className={buttonVariants({ size: "sm", variant: "outline" })} href="/?view=all">
                      View all
                    </a>
                  }
                  description="The fastest path to the utilities developers use most."
                  title="Popular Tools"
                />
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {popularTools.map((tool) => <ToolCard key={tool.id} tool={tool} />)}
                </div>
              </AppContainer>
            </section>

            <section className="border-y border-border bg-muted/50 py-14 sm:py-16">
              <AppContainer>
                <SectionHeading
                  description="The newest utility available in the Devtools collection."
                  title="Recently Added Tools"
                />
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {recentTools.map((tool) => <ToolCard key={tool.id} tool={tool} />)}
                </div>
              </AppContainer>
            </section>
          </>
        )}

        <section className="py-14 sm:py-16">
          <AppContainer>
            <SectionHeading
              description="Jump straight to the kind of work you need to do."
              title="Browse by Category"
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {CATEGORIES.map(({ description, icon: Icon, name }) => {
                const count = tools.filter((tool) => tool.category === name).length;
                return (
                  <a
                    className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm outline-none transition hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    href={`/?category=${encodeURIComponent(name)}`}
                    key={name}
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-primary">
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                    <span className="min-w-0">
                      <strong className="block text-sm font-extrabold group-hover:text-primary">{name}</strong>
                      <span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span>
                      <span className="mt-2 block text-xs font-bold text-primary">{count} available</span>
                    </span>
                  </a>
                );
              })}
            </div>
          </AppContainer>
        </section>

        <section className="border-y border-border bg-card py-14 sm:py-16">
          <AppContainer>
            <SectionHeading
              description="Simple utilities should be fast, dependable, and respectful of your data."
              title="Why use SmartTools?"
            />
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {BENEFITS.map(({ description, icon: Icon, title }) => (
                <div className="flex gap-4" key={title}>
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-primary">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-extrabold">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </AppContainer>
        </section>

        <section className="py-14 sm:py-16">
          <AppContainer>
            <div className="grid overflow-hidden rounded-3xl bg-card-foreground text-card shadow-xl lg:grid-cols-[1.35fr_0.65fr]">
              <div className="p-8 sm:p-10 lg:p-12">
                <LockKeyhole aria-hidden="true" className="size-9 text-primary" />
                <h2 className="mt-6 max-w-2xl text-3xl font-black tracking-tight sm:text-4xl">
                  Your working data stays yours.
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-card/70 sm:text-base">
                  These tools process content locally in your browser. No file upload is required for the core workflow.
                </p>
              </div>
              <div className="flex items-center border-t border-card/10 bg-primary p-8 sm:p-10 lg:border-t-0 lg:border-l">
                <div>
                  <Sparkles aria-hidden="true" className="size-8" />
                  <h2 className="mt-5 text-2xl font-black tracking-tight">Start with JSON to CSV</h2>
                  <p className="mt-3 text-sm leading-6 text-primary-foreground/80">
                    Turn object arrays into clean spreadsheet-ready rows in seconds.
                  </p>
                  <a
                    className={buttonVariants({ className: "mt-6 bg-card text-card-foreground hover:bg-card/90", size: "lg" })}
                    href="/json-to-csv"
                  >
                    Open JSON to CSV
                  </a>
                </div>
              </div>
            </div>
          </AppContainer>
        </section>
      </main>

      <footer className="border-t border-border bg-card py-8 text-sm text-muted-foreground">
        <AppContainer className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} SmartTools Devtools</span>
          <span>Private browser utilities, added one by one.</span>
        </AppContainer>
      </footer>
    </div>
  );
}
