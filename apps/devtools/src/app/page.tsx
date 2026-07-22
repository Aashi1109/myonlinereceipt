import {
  getAuthServiceURL,
  getOptionalSession,
} from "@smarttools/auth/session";
import { getAvailableTools } from "@smarttools/control-plane";
import { AccountNavigation, CatalogCard, PageHero, ProductHeader } from "@smarttools/ui";
import { headers } from "next/headers";

export default async function HomePage() {
  const requestHeaders = await headers();
  const devtoolsUrl = process.env.DEVTOOLS_URL ?? "http://localhost:3002";
  const [tools, session] = await Promise.all([
    getAvailableTools("devtools"),
    getOptionalSession(requestHeaders, devtoolsUrl),
  ]);
  const platformUrl = process.env.PLATFORM_URL ?? "http://localhost:3000";

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
        <PageHero
          description="Format, inspect, and convert working data without uploading it."
          eyebrow="Private browser utilities"
          title="Choose the developer tool for the job."
        />

        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool) =>
              tool.slug ? (
                <CatalogCard
                  action="Open tool →"
                  description={tool.description}
                  href={`/${tool.slug}`}
                  key={tool.id}
                  title={tool.name}
                />
              ) : null,
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
