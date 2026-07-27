import { SmartToolsFooter } from "@/components/smarttools/SmartToolsFooter";
import { getOptionalSession } from "@smarttools/auth/session";
import { getAvailableTools } from "@smarttools/control-plane";
import type { ResolvedTool } from "@smarttools/tool-catalog";
import {
  AccountNavigation,
  AppContainer,
  Badge,
  Button,
  Card,
  CatalogCard,
  EmptyState,
  IconTile,
  Input,
  ProductHeader,
  SectionHeading,
  StatusBadge,
  buttonVariants,
} from "@smarttools/ui";
import {
  FileImage,
  Files,
  Image as ImageIcon,
  Images,
  LockKeyhole,
  Minimize2,
  Search,
  ShieldCheck,
  Sparkles,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { headers } from "next/headers";

const CATEGORIES: readonly {
  description: string;
  icon: LucideIcon;
  name: string;
}[] = [
  {
    name: "PDF Conversion",
    description: "Move between images and PDF pages without uploading files.",
    icon: FileImage,
  },
  {
    name: "PDF Organization",
    description: "Merge, split, reorder, rotate, crop, and resize PDF pages.",
    icon: Files,
  },
  {
    name: "PDF Optimization",
    description: "Compress, watermark, and number documents locally.",
    icon: Minimize2,
  },
  {
    name: "Image Conversion",
    description: "Convert JPG, PNG, WebP, and HEIC images in your browser.",
    icon: ImageIcon,
  },
  {
    name: "Image Editing",
    description: "Resize, crop, rotate, combine, and optimize images.",
    icon: Images,
  },
];

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function ToolCard({ tool }: { tool: ResolvedTool }) {
  if (!tool.slug) return null;
  const category = CATEGORIES.find(({ name }) => name === tool.category);
  const Icon = category?.icon ?? Sparkles;

  return (
    <CatalogCard
      action="Open tool →"
      description={tool.description}
      href={`/media/${tool.slug}`}
      icon={<Icon aria-hidden="true" />}
      status={<StatusBadge variant="success">Browser only</StatusBadge>}
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
  const [tools, session] = await Promise.all([
    getAvailableTools("media"),
    getOptionalSession(requestHeaders),
  ]);
  const normalizedQuery = query.toLocaleLowerCase();
  const filteredTools = tools.filter(
    (tool) =>
      (!category || tool.category === category) &&
      (!normalizedQuery ||
        `${tool.name} ${tool.description} ${tool.category ?? ""} ${tool.keywords?.join(" ") ?? ""}`
          .toLocaleLowerCase()
          .includes(normalizedQuery)),
  );
  return (
    <div className="min-h-screen bg-background text-foreground">
      <ProductHeader
        actions={
          <AccountNavigation
            returnTo="/media"
            user={session ? { name: session.user.name } : null}
          />
        }
        href="/media"
        name="Media Tools"
      />

      <main>
        <section className="bg-primary text-primary-foreground">
          <AppContainer className="py-16 text-center sm:py-24">
            <Badge
              className="border-white/25 bg-white/10 px-3 font-extrabold tracking-[0.14em] text-primary-foreground uppercase"
              variant="outline"
            >
              Private image and PDF tools
            </Badge>
            <h1 className="mx-auto mt-5 max-w-4xl text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
              Edit media without sending it anywhere.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-primary-foreground/80 sm:text-lg">
              Convert, organize, and compress files in dedicated browser workers. Your files stay on this device.
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
                  aria-label="Search media tools"
                  className="border-0 pl-10 shadow-none focus-visible:ring-0"
                  defaultValue={query}
                  name="q"
                  placeholder="Search image and PDF tools…"
                  type="search"
                />
              </div>
              <Button type="submit" variant="strong">
                Search
              </Button>
            </form>
          </AppContainer>
        </section>

        <section aria-label="Media Tools facts" className="border-b border-border bg-card">
          <AppContainer className="grid grid-cols-2 divide-x divide-y divide-border py-6 sm:grid-cols-4 sm:divide-y-0">
            {[
              [`${tools.length}`, "Enabled tools"],
              ["100%", "On-device"],
              ["2", "Dedicated workers"],
              ["0", "File uploads"],
            ].map(([value, label]) => (
              <div className="px-4 py-3 text-center" key={label}>
                <strong className="block text-2xl font-black text-primary">{value}</strong>
                <span className="mt-1 block text-xs font-bold text-muted-foreground">{label}</span>
              </div>
            ))}
          </AppContainer>
        </section>

        <section className="py-14 sm:py-16">
          <AppContainer>
            <SectionHeading
              action={
                query || category ? (
                  <a
                    className={buttonVariants({ size: "sm", variant: "outline" })}
                    href="/media"
                  >
                    Clear filters
                  </a>
                ) : undefined
              }
              description={
                query
                  ? `Matching “${query}”${category ? ` in ${category}` : ""}.`
                  : category
                    ? `Enabled tools in ${category}.`
                    : "Choose one focused workflow. Every operation stays in this browser."
              }
              title={query || category ? "Search results" : "All media tools"}
            />
            {filteredTools.length ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredTools.map((tool) => (
                  <ToolCard key={tool.id} tool={tool} />
                ))}
              </div>
            ) : (
              <EmptyState
                action={
                  <a className={buttonVariants()} href="/media">
                    Browse all tools
                  </a>
                }
                description="Try another search or category. Disabled tools are intentionally hidden."
                title="No enabled tools found"
              />
            )}
          </AppContainer>
        </section>

        <section className="border-y border-border bg-muted/50 py-14 sm:py-16">
          <AppContainer>
            <SectionHeading
              description="Jump directly to the file operation you need."
              title="Browse by category"
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {CATEGORIES.map(({ description, icon: Icon, name }) => {
                const count = tools.filter((tool) => tool.category === name).length;
                return (
                  <a
                    className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm outline-none transition hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    href={`/media?category=${encodeURIComponent(name)}`}
                    key={name}
                  >
                    <IconTile className="rounded-xl" size="sm">
                      <Icon aria-hidden="true" className="size-5" />
                    </IconTile>
                    <span className="min-w-0">
                      <strong className="block text-sm font-extrabold group-hover:text-primary">{name}</strong>
                      <span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span>
                      <span className="mt-2 block text-xs font-bold text-primary">{count} enabled</span>
                    </span>
                  </a>
                );
              })}
            </div>
          </AppContainer>
        </section>

        <section className="py-14 sm:py-16">
          <AppContainer className="grid gap-6 lg:grid-cols-3">
            {[
              {
                icon: ShieldCheck,
                title: "Processed locally",
                description: "Files and previews never leave your device or enter application logs.",
              },
              {
                icon: Zap,
                title: "UI stays responsive",
                description: "Image and PDF work runs sequentially outside the page's UI thread.",
              },
              {
                icon: LockKeyhole,
                title: "No hidden storage",
                description: "No server API, IndexedDB, local storage, or service worker keeps your files.",
              },
            ].map(({ description, icon: Icon, title }) => (
              <Card className="gap-0 rounded-2xl shadow-none" key={title} role="article">
                <Icon aria-hidden="true" className="size-6 text-primary" />
                <h2 className="mt-4 text-lg font-black">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
              </Card>
            ))}
          </AppContainer>
        </section>
      </main>

      <SmartToolsFooter />
    </div>
  );
}
