import { SmartToolsFooter } from "@/components/smarttools/SmartToolsFooter";
import { getOptionalSession } from "@smarttools/auth/session";
import { getAvailableToolBySlug } from "@smarttools/control-plane";
import {
  AccountNavigation,
  Badge,
  ToolPageShell,
} from "@smarttools/ui";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { MediaWorkbench } from "../components/MediaWorkbench";
import {
  getMediaToolDefinition,
  mediaToolDefinitions,
} from "../_lib/tools";

export function generateStaticParams() {
  return mediaToolDefinitions.map(({ slug }) => ({ slug }));
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
    <ToolPageShell
      badge={
        <div className="flex flex-wrap items-center justify-end gap-2">
          {['FILE TOOL', 'RESULT READY', 'PRIVATE IN BROWSER'].map((label) => (
            <Badge className="border-transparent bg-accent px-2.5 py-1.5 font-caption text-[11px] font-semibold tracking-[0.035em] text-primary" key={label} variant="secondary">
              {label}
            </Badge>
          ))}
        </div>
      }
      category={definition.category}
      description={tool.description}
      footer={<SmartToolsFooter />}
      headerActions={
        <AccountNavigation
          returnTo={`/media/${slug}`}
          user={session ? { name: session.user.name } : null}
        />
      }
      productHref="/media"
      productName="Media tools"
      skipHref="#media-workspace"
      title={tool.name}
      workspaceId="media-workspace"
    >
      <MediaWorkbench definition={definition} title={tool.name} />
    </ToolPageShell>
  );
}
