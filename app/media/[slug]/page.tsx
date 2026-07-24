import { getOptionalSession } from "@smarttools/auth/session";
import { getAvailableToolBySlug } from "@smarttools/control-plane";
import {
  AccountNavigation,
  AppContainer,
  ProductHeader,
  StatusBadge,
  ToolPageHeader,
} from "@smarttools/ui";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { MediaWorkbench } from "../components/MediaWorkbench";
import {
  getMediaToolDefinition,
  mediaToolDefinitions,
} from "../_lib/tools";

export function generateStaticParams() {
  return mediaToolDefinitions.map(({ slug }) => ({ slug }));
}

function ToolBreadcrumb({
  category,
  title,
}: {
  category: string;
  title: string;
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-5 flex min-w-0 items-center gap-1 text-xs font-bold text-muted-foreground"
    >
      <a
        className="shrink-0 rounded-md px-2 py-1 hover:bg-accent hover:text-primary"
        href="/media"
      >
        All tools
      </a>
      <ChevronRight aria-hidden="true" className="size-3.5 shrink-0" />
      <a
        className="min-w-0 truncate rounded-md px-2 py-1 hover:bg-accent hover:text-primary"
        href={`/media?category=${encodeURIComponent(category)}`}
      >
        {category}
      </a>
      <ChevronRight aria-hidden="true" className="size-3.5 shrink-0" />
      <span aria-current="page" className="min-w-0 truncate px-2 text-foreground">
        {title}
      </span>
    </nav>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const definition = getMediaToolDefinition(slug);

  if (!definition) return { title: "Tool not found", robots: { index: false } };

  return {
    title: definition.title,
    description: definition.description,
    alternates: { canonical: `/media/${definition.slug}` },
    openGraph: {
      title: `${definition.title} | SmartTools Media Tools`,
      description: definition.description,
      type: "website",
      url: `/media/${definition.slug}`,
    },
  };
}

export default async function ToolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const definition = getMediaToolDefinition(slug);
  if (!definition) notFound();

  const requestHeaders = await headers();
  const [tool, session] = await Promise.all([
    getAvailableToolBySlug("media", slug),
    getOptionalSession(requestHeaders),
  ]);
  if (!tool) notFound();

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <a
        className="fixed top-3 left-3 z-[100] -translate-y-[180%] rounded-lg bg-primary px-3.5 py-2.5 font-bold text-primary-foreground shadow-sm focus:translate-y-0"
        href="#media-workspace"
      >
        Skip to tool workspace
      </a>

      <ProductHeader
        actions={
          <AccountNavigation
            returnTo={`/media/${slug}`}
            user={session ? { name: session.user.name } : null}
          />
        }
        className="sticky top-0 z-50 border-border/80 bg-card/90 supports-[backdrop-filter]:bg-card/85 supports-[backdrop-filter]:backdrop-blur-xl"
        href="/media"
        name="Media Tools"
      />

      <main className="flex-1">
        <section className="border-b border-border bg-card">
          <AppContainer className="max-w-[100rem] py-5 sm:py-7">
            <ToolBreadcrumb category={definition.category} title={tool.name} />

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-10">
              <ToolPageHeader
                className="mb-0 border-b-0 pb-0 [&_h1]:text-4xl [&_h1]:tracking-[-0.045em] [&_p]:mt-3 [&_p]:max-w-3xl [&_p]:text-base [&_p]:leading-7 sm:[&_h1]:text-5xl"
                description={tool.description}
                eyebrow={
                  <>
                    <StatusBadge variant="success">Runs locally</StatusBadge>
                    <span>{definition.category}</span>
                  </>
                }
                inlineEyebrow
                title={tool.name}
              />

              <div className="flex items-center gap-3 lg:mb-1 lg:max-w-xs lg:border-l lg:border-border lg:pl-6">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-primary">
                  <ShieldCheck aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <h2 className="text-sm font-extrabold">Private by default</h2>
                  <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                    Files never leave your device.
                  </p>
                </div>
              </div>
            </div>
          </AppContainer>
        </section>

        <AppContainer
          className="max-w-[100rem] py-5 outline-none sm:py-7 lg:py-8"
          id="media-workspace"
          tabIndex={-1}
        >
          <MediaWorkbench
            definition={definition}
            title={tool.name}
          />
        </AppContainer>
      </main>

      <footer className="border-t border-border bg-card py-6 text-xs text-muted-foreground">
        <AppContainer className="flex flex-wrap items-center justify-between gap-3">
          <span>© {new Date().getFullYear()} SmartTools Media Tools</span>
          <nav aria-label="Media Tools footer" className="flex flex-wrap gap-x-4 gap-y-2">
            <a
              className="font-bold underline-offset-4 hover:underline"
              href="/media"
            >
              All Media Tools
            </a>
            <a
              className="underline-offset-4 hover:underline"
              href="/media/vendor/licenses/heic-to-LGPL-3.0.txt"
            >
              HEIC decoder license
            </a>
            <a
              className="underline-offset-4 hover:underline"
              href="/media/licenses/heic-to-NOTICE.txt"
            >
              HEIC source notice
            </a>
          </nav>
        </AppContainer>
      </footer>
    </div>
  );
}
