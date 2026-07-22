import {
  getAuthServiceURL,
  getOptionalSession,
} from "@smarttools/auth/session";
import { AccountNavigation, CatalogCard, PageHero, ProductHeader } from "@smarttools/ui";
import { headers } from "next/headers";

const projects = [
  {
    name: "Paperwork",
    description: "Create invoices, receipts, expense reports, tax estimates, and contractor records.",
    href: process.env.PAPERWORK_URL ?? "http://localhost:3001",
  },
  {
    name: "Devtools",
    description: "Fast, private browser tools for formatting and inspecting data.",
    href: process.env.DEVTOOLS_URL ?? "http://localhost:3002",
  },
];

export default async function HomePage() {
  const platformUrl = process.env.PLATFORM_URL ?? "http://localhost:3000";
  const session = await getOptionalSession(await headers(), platformUrl);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ProductHeader
        actions={
          <AccountNavigation
            authUrl={getAuthServiceURL(platformUrl)}
            returnTo={platformUrl}
            user={session ? { name: session.user.name } : null}
          />
        }
        href="/"
        name="SmartTools"
      />
      <main>
        <PageHero
          description="SmartTools keeps each utility suite independent while giving them one clear place to discover and launch."
          eyebrow="One home for focused utilities"
          title="Choose the project that fits the job."
        />

        <section
          aria-label="Projects"
          className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {projects.map((project) => (
              <CatalogCard
                action="Open project →"
                description={project.description}
                href={project.href}
                key={project.name}
                title={project.name}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
