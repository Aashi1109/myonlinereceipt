import { getOptionalSession } from "@smarttools/auth/session";
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
  buttonVariants,
} from "@smarttools/ui";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Binary,
  Braces,
  CalendarClock,
  Code2,
  FileText,
  GitBranch,
  Hash,
  KeyRound,
  LockKeyhole,
  Palette,
  Search,
  SearchCheck,
  ShieldCheck,
  Table2,
  Type,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";
import { headers } from "next/headers";
import { CategoryFilter } from "./components/CategoryFilter";

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

const SECTION_HEADING_CLASS =
  "mb-8 items-end [&_h2]:text-2xl [&_h2]:font-black [&_h2]:tracking-[-0.03em] sm:[&_h2]:text-3xl";

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
      action={
        <>
          Open tool
          <ArrowUpRight aria-hidden="true" className="size-4" />
        </>
      }
      className="min-h-48 rounded-[1.25rem] p-5 shadow-none duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg [&>span:nth-child(2)]:text-lg [&>span:nth-child(3)]:text-sm [&>span:nth-child(3)]:leading-6 [&>span:last-child]:inline-flex [&>span:last-child]:items-center [&>span:last-child]:gap-1.5 [&>span:last-child]:text-sm"
      description={tool.description}
      href={`/devtools/${tool.slug}`}
      icon={<Icon aria-hidden="true" />}
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
  const [tools, session] = await Promise.all([
    getAvailableTools("devtools"),
    getOptionalSession(requestHeaders),
  ]);
  const category = tools.some((tool) => tool.category === requestedCategory)
    ? requestedCategory
    : "";
  const normalizedQuery = query.toLocaleLowerCase();
  const filteredTools = tools.filter(
    (tool) =>
      (!category || tool.category === category) &&
      (!normalizedQuery ||
        `${tool.name} ${tool.description} ${tool.category ?? ""}`
          .toLocaleLowerCase()
          .includes(normalizedQuery)),
  );
  const quickTools = selectTools(tools, QUICK_TOOL_KEYS).slice(0, 6);
  const popularTools = selectTools(tools, POPULAR_TOOL_KEYS);
  const availableCategories = CATEGORIES.map((item) => ({
    ...item,
    count: tools.filter((tool) => tool.category === item.name).length,
  })).filter(({ count }) => count > 0);
  const hasFilter = Boolean(query || category);
  const showAllTools = !hasFilter && first(params.view) === "all";
  const searchForm = (
    <form
      className="flex w-full items-center gap-2 rounded-2xl border border-input bg-background p-1.5 shadow-sm transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10"
      method="get"
      role="search"
    >
      <div className="relative min-w-0 flex-1">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          aria-label="Search developer tools"
          className="h-12 border-0 bg-transparent pl-11 shadow-none"
          defaultValue={query}
          name="q"
          placeholder="Search JSON, CSV, JWT…"
          type="search"
        />
      </div>
      <Button className="h-12 rounded-xl px-5" type="submit">
        Search
      </Button>
    </form>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ProductHeader
        actions={
          <AccountNavigation
            returnTo="/devtools"
            user={session ? { name: session.user.name } : null}
          />
        }
        className="sticky top-0 z-50 bg-card/90 supports-[backdrop-filter]:bg-card/85 supports-[backdrop-filter]:backdrop-blur-xl"
        href="/devtools"
        name="Devtools"
      />

      <main>
        {hasFilter || showAllTools ? (
          <section className="border-b border-border bg-card">
            <AppContainer className="grid gap-6 py-8 sm:py-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(26rem,1.2fr)] lg:items-end">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">
                  Devtools catalog
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
                  Find the right tool.
                </h1>
              </div>
              {searchForm}
            </AppContainer>
          </section>
        ) : (
          <section className="overflow-hidden border-b border-border bg-card">
            <AppContainer className="py-12 sm:py-16 lg:py-20">
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1.12fr)_minmax(26rem,0.88fr)] lg:items-end lg:gap-16">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">
                    {tools.length} focused tools. No sign-up.
                  </p>
                  <h1 className="mt-5 max-w-4xl text-[clamp(3.25rem,7vw,6.75rem)] leading-[0.9] font-black tracking-[-0.065em]">
                    The useful side of{" "}
                    <span className="text-primary">your browser.</span>
                  </h1>
                </div>
                <div className="lg:pb-1">
                  <p className="max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                    Format, convert, inspect, and generate working data without
                    accounts, uploads, or waiting.
                  </p>
                  <div className="mt-7">{searchForm}</div>
                  <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <ShieldCheck aria-hidden="true" className="size-4 text-primary" />
                    Core tools process your content locally in this browser.
                  </p>
                </div>
              </div>

              <nav
                aria-label="Quick tools"
                className="mt-12 overflow-hidden rounded-2xl border border-border bg-border lg:mt-16"
              >
                <div className="flex min-h-12 items-center justify-between gap-4 bg-background px-4">
                  <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted-foreground">
                    Popular now
                  </p>
                  <a
                    className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-primary outline-none hover:underline focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    href="/devtools?view=all"
                  >
                    All tools
                    <ArrowRight aria-hidden="true" className="size-4" />
                  </a>
                </div>
                <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                  {quickTools.map((tool, index) =>
                    tool.slug ? (
                      <a
                        className="group flex min-h-24 flex-col justify-between bg-card p-4 text-card-foreground outline-none transition-colors hover:bg-accent focus-visible:relative focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                        href={`/devtools/${tool.slug}`}
                        key={tool.id}
                      >
                        <span className="text-xs font-bold text-muted-foreground">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="flex items-end justify-between gap-3 text-sm font-extrabold">
                          {tool.name}
                          <ArrowUpRight
                            aria-hidden="true"
                            className="size-4 shrink-0 text-primary transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                          />
                        </span>
                      </a>
                    ) : null,
                  )}
                </div>
              </nav>
            </AppContainer>
          </section>
        )}

        {hasFilter || showAllTools ? (
          <section className="py-12 sm:py-16">
            <AppContainer>
              <a
                className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-muted-foreground outline-none hover:text-foreground focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                href={category && !query ? "/devtools?view=all" : "/devtools"}
              >
                <ArrowLeft aria-hidden="true" className="size-4" />
                {showAllTools
                  ? "Back to Devtools"
                  : category && !query
                    ? "All tools"
                    : "Clear search"}
              </a>
              <SectionHeading
                action={
                  showAllTools || category ? (
                    <CategoryFilter
                      categories={availableCategories.map(({ name }) => name)}
                      value={category}
                    />
                  ) : null
                }
                className={`${SECTION_HEADING_CLASS} flex-col items-stretch sm:flex-row sm:items-end`}
                description={
                  showAllTools
                    ? "Browse every available developer tool in one place."
                    : query
                    ? `Matching “${query}”${category ? ` in ${category}` : ""}.`
                    : `Tools in ${category}.`
                }
                title={
                  showAllTools
                    ? "All Tools"
                    : category && !query
                      ? category
                      : "Search Results"
                }
              />
              {filteredTools.length ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredTools.map((tool) => <ToolCard key={tool.id} tool={tool} />)}
                </div>
              ) : (
                <EmptyState
                  action={
                    <a className={buttonVariants()} href="/devtools">
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
            <section className="py-14 sm:py-20" id="popular-tools">
              <AppContainer>
                <SectionHeading
                  action={
                    <a
                      className={buttonVariants({
                        className: "h-11",
                        variant: "outline",
                      })}
                      href="/devtools?view=all"
                    >
                      View all tools
                    </a>
                  }
                  className={SECTION_HEADING_CLASS}
                  description="A short list of dependable utilities for common developer work."
                  eyebrow="Start here"
                  title="Popular Tools"
                />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {popularTools.map((tool) => <ToolCard key={tool.id} tool={tool} />)}
                </div>
              </AppContainer>
            </section>

            <section className="border-y border-border bg-card py-14 sm:py-20">
              <AppContainer>
                <SectionHeading
                  className={SECTION_HEADING_CLASS}
                  description="Go straight to the kind of work you need to do."
                  eyebrow="Tool index"
                  title="Browse by Category"
                />
                <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
                  {availableCategories.map(
                    ({ count, description, icon: Icon, name }) => (
                      <a
                        className="group flex min-h-28 items-start gap-4 bg-card p-5 text-card-foreground outline-none transition-colors hover:bg-accent focus-visible:relative focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset lg:last:col-span-2"
                        href={`/devtools?category=${encodeURIComponent(name)}`}
                        key={name}
                      >
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-primary group-hover:bg-background">
                          <Icon aria-hidden="true" className="size-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <strong className="block text-sm font-extrabold">
                            {name}
                          </strong>
                          <span className="mt-1 block text-sm leading-5 text-muted-foreground">
                            {description}
                          </span>
                          <span className="mt-2 block text-xs font-bold text-primary">
                            {count} {count === 1 ? "tool" : "tools"}
                          </span>
                        </span>
                        <ArrowUpRight
                          aria-hidden="true"
                          className="size-4 shrink-0 text-muted-foreground transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
                        />
                      </a>
                    ),
                  )}
                </div>
              </AppContainer>
            </section>

            <section className="py-14 sm:py-20">
              <AppContainer>
                <div className="flex flex-col gap-8 overflow-hidden rounded-[1.75rem] bg-card-foreground px-6 py-8 text-card sm:px-10 sm:py-10 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex max-w-3xl items-start gap-5">
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground">
                      <LockKeyhole aria-hidden="true" className="size-6" />
                    </span>
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">
                        Private by default
                      </p>
                      <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] sm:text-3xl">
                        Your working data stays yours.
                      </h2>
                      <p className="mt-3 max-w-2xl text-sm leading-6 text-card/70 sm:text-base sm:leading-7">
                        Core formatting and conversion happens locally in your
                        browser. No file upload or account is required.
                      </p>
                    </div>
                  </div>
                  <a
                    className={buttonVariants({ size: "lg" })}
                    href="/devtools?view=all"
                  >
                    Browse all {tools.length} tools
                    <ArrowRight aria-hidden="true" className="size-4" />
                  </a>
                </div>
              </AppContainer>
            </section>
          </>
        )}
      </main>

      <footer className="border-t border-border bg-card py-7 text-sm text-muted-foreground">
        <AppContainer className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} SmartTools Devtools</span>
          <span>Fast, private browser utilities.</span>
        </AppContainer>
      </footer>
    </div>
  );
}
