import { getAuthServiceURL, getOptionalSession } from "@smarttools/auth/session";
import { getAvailableToolBySlug } from "@smarttools/control-plane";
import { AccountNavigation, AppContainer, ProductHeader } from "@smarttools/ui";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { MediaWorkbench } from "../../components/MediaWorkbench";
import {
  getMediaToolDefinition,
  mediaToolDefinitions,
} from "../../lib/tools";

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
    <nav aria-label="Breadcrumb" className="mb-5 text-xs font-bold text-muted-foreground">
      <a className="hover:text-primary hover:underline" href="/">
        All tools
      </a>
      <span aria-hidden="true" className="mx-2">/</span>
      <a
        className="hover:text-primary hover:underline"
        href={`/?category=${encodeURIComponent(category)}`}
      >
        {category}
      </a>
      <span aria-hidden="true" className="mx-2">/</span>
      <span aria-current="page">{title}</span>
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
    alternates: { canonical: `/${definition.slug}` },
    openGraph: {
      title: `${definition.title} | SmartTools Media Tools`,
      description: definition.description,
      type: "website",
      url: `/${definition.slug}`,
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
  const mediaUrl = process.env.MEDIA_URL ?? "http://localhost:3005";
  const [tool, session] = await Promise.all([
    getAvailableToolBySlug("media", slug),
    getOptionalSession(requestHeaders, mediaUrl),
  ]);
  if (!tool) notFound();

  const platformUrl = process.env.PLATFORM_URL ?? "http://localhost:3000";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ProductHeader
        actions={
          <AccountNavigation
            authUrl={getAuthServiceURL(mediaUrl)}
            returnTo={`${mediaUrl}/${slug}`}
            user={session ? { name: session.user.name } : null}
          />
        }
        href={platformUrl}
        name="Media Tools"
      />

      <main>
        <AppContainer className="py-8 sm:py-10">
          <ToolBreadcrumb category={definition.category} title={tool.name} />

          <MediaWorkbench
            definition={definition}
            description={tool.description}
            title={tool.name}
          />

          <section className="mt-8 flex items-start gap-4 rounded-2xl border border-primary/20 bg-accent p-5 sm:p-6">
            <ShieldCheck aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-primary" />
            <div>
              <h2 className="font-extrabold">Your files never leave this browser</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Selection, previews, processing, and downloads happen on this device in dedicated workers.
              </p>
            </div>
          </section>
        </AppContainer>
      </main>

      <footer className="border-t border-border bg-card py-6 text-xs text-muted-foreground">
        <AppContainer className="flex flex-wrap items-center justify-between gap-3">
          <span>© {new Date().getFullYear()} SmartTools Media Tools</span>
          <nav aria-label="Media Tools footer" className="flex flex-wrap gap-x-4 gap-y-2">
            <a className="font-bold underline-offset-4 hover:underline" href="/">
              All Media Tools
            </a>
            <a
              className="underline-offset-4 hover:underline"
              href="/vendor/licenses/heic-to-LGPL-3.0.txt"
            >
              HEIC decoder license
            </a>
            <a
              className="underline-offset-4 hover:underline"
              href="/licenses/heic-to-NOTICE.txt"
            >
              HEIC source notice
            </a>
          </nav>
        </AppContainer>
      </footer>
    </div>
  );
}
