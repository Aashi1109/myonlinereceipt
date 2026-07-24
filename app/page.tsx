import { getOptionalSession } from "@smarttools/auth/session";
import { AccountNavigation, ProductHeader } from "@smarttools/ui";
import { headers } from "next/headers";

const projects = [
  {
    number: "01",
    category: "Business documents",
    name: "Paperwork",
    description:
      "Create invoices, receipts, expense reports, tax estimates, and contractor records.",
    href: "/paperwork",
  },
  {
    number: "02",
    category: "Browser utilities",
    name: "Devtools",
    description:
      "Format, convert, and inspect working data with focused browser tools.",
    href: "/devtools",
  },
  {
    number: "03",
    category: "Private media processing",
    name: "Media Tools",
    description:
      "Convert, organize, edit, and compress images and PDFs entirely in your browser.",
    href: "/media",
  },
] as const;

export default async function HomePage() {
  const session = await getOptionalSession(await headers());

  return (
    <div className="platform-shell min-h-screen bg-background text-foreground">
      <ProductHeader
        actions={
          <AccountNavigation
            returnTo="/"
            user={session ? { name: session.user.name } : null}
          />
        }
        className="platform-header sticky top-0 z-50"
        href="/"
        name="SmartTools"
      />

      <main>
        <section className="overflow-hidden border-b border-border bg-card">
          <div className="mx-auto grid max-w-7xl lg:grid-cols-[minmax(0,1.08fr)_minmax(28rem,0.92fr)]">
            <div className="flex min-h-[36rem] flex-col justify-center px-4 py-16 sm:px-6 sm:py-20 lg:min-h-[44rem] lg:border-r lg:border-border lg:px-8 lg:py-24">
              <p className="mb-6 text-xs font-bold uppercase tracking-[0.18em] text-primary">
                Focused utilities for everyday work
              </p>
              <h1 className="max-w-4xl text-[clamp(3rem,8vw,7.5rem)] leading-[0.86] font-black tracking-[-0.075em]">
                Less time
                <br />
                between
                <br />
                <span className="text-primary">need</span>
                <br />
                and done.
              </h1>
              <p className="mt-8 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                SmartTools brings image and PDF tools, business paperwork, and
                developer utilities into one clear place to start.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <a
                  className="inline-flex min-h-12 items-center justify-center bg-primary px-5 text-sm font-bold text-primary-foreground outline-none transition-colors hover:bg-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  href={projects[0].href}
                >
                  Explore Paperwork
                </a>
                <a
                  className="inline-flex min-h-12 items-center justify-center border border-foreground bg-card px-5 text-sm font-bold text-foreground outline-none transition-colors hover:bg-foreground hover:text-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  href={projects[1].href}
                >
                  Browse Devtools
                </a>
                <a
                  className="inline-flex min-h-12 items-center justify-center border border-foreground bg-card px-5 text-sm font-bold text-foreground outline-none transition-colors hover:bg-foreground hover:text-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  href={projects[2].href}
                >
                  Open Media Tools
                </a>
              </div>
              <p className="mt-6 text-xs font-semibold text-muted-foreground">
                Public tools are available without an account.
              </p>
            </div>

            <nav
              aria-labelledby="suite-navigation-title"
              className="platform-grid flex flex-col justify-center bg-background px-4 py-12 sm:px-6 lg:px-8 lg:py-16"
            >
              <h2 className="mb-4 text-sm font-bold" id="suite-navigation-title">
                Choose a suite
              </h2>
              <ul className="border border-border bg-card">
                {projects.map((project) => (
                  <li className="border-b border-border last:border-b-0" key={project.name}>
                    <a
                      className="group grid min-h-56 grid-cols-[5rem_minmax(0,1fr)] text-foreground outline-none transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:relative focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:grid-cols-[6.5rem_minmax(0,1fr)]"
                      href={project.href}
                    >
                      <span
                        aria-hidden="true"
                        className="flex items-start justify-center border-r border-border px-3 py-6 text-4xl font-black tracking-[-0.08em] text-primary transition-colors group-hover:border-white/35 group-hover:text-primary-foreground sm:text-5xl"
                      >
                        {project.number}
                      </span>
                      <span className="flex min-w-0 flex-col p-6">
                        <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground transition-colors group-hover:text-white/70">
                          {project.category}
                        </span>
                        <span className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
                          {project.name}
                        </span>
                        <span className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground transition-colors group-hover:text-white/80">
                          {project.description}
                        </span>
                        <span className="mt-auto pt-6 text-sm font-bold underline decoration-1 underline-offset-4">
                          Open {project.name}
                        </span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </section>

        <section aria-labelledby="projects-title" className="border-b border-border">
          <div className="mx-auto grid max-w-7xl lg:grid-cols-[minmax(18rem,0.7fr)_minmax(0,1.3fr)]">
            <div className="border-b border-border px-4 py-12 sm:px-6 lg:border-r lg:border-b-0 lg:px-8 lg:py-20">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                What you can do
              </p>
              <h2
                className="mt-5 max-w-md text-4xl leading-[0.95] font-black tracking-[-0.055em] sm:text-5xl"
                id="projects-title"
              >
                Start with the task in front of you.
              </h2>
            </div>

            <div className="grid sm:grid-cols-3">
              <article className="border-b border-border p-6 sm:border-r sm:border-b-0 lg:p-8">
                <p aria-hidden="true" className="text-sm font-black text-primary">01</p>
                <h3 className="mt-10 text-xl font-black tracking-tight">
                  Create the document
                </h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Build invoices, receipts, expense reports, tax estimates, and
                  contractor records in Paperwork.
                </p>
              </article>
              <article className="border-b border-border p-6 sm:border-r sm:border-b-0 lg:p-8">
                <p aria-hidden="true" className="text-sm font-black text-primary">02</p>
                <h3 className="mt-10 text-xl font-black tracking-tight">
                  Process the media
                </h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Convert, organize, edit, and compress images and PDFs in Media Tools.
                </p>
              </article>
              <article className="p-6 lg:p-8">
                <p aria-hidden="true" className="text-sm font-black text-primary">03</p>
                <h3 className="mt-10 text-xl font-black tracking-tight">
                  Handle the data
                </h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Format, convert, inspect, and generate developer data in Devtools.
                </p>
              </article>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-card">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 text-sm sm:flex-row sm:items-end sm:justify-between sm:px-6 lg:px-8">
          <div>
            <p className="font-black">SmartTools</p>
            <p className="mt-2 text-muted-foreground">
              Focused utilities for everyday work.
            </p>
          </div>
          <nav aria-label="SmartTools projects" className="flex flex-wrap gap-6 font-bold">
            {projects.map((project) => (
              <a
                className="underline-offset-4 hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                href={project.href}
                key={project.name}
              >
                {project.name}
              </a>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
