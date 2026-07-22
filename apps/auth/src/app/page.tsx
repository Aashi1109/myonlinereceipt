import { AuthPanel } from "./AuthPanel";
import { ProductHeader } from "@smarttools/ui";
import {
  DEFAULT_AUTH_ERROR,
  resolveConfiguredReturnTo,
} from "../lib/security";

type SearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const returnTo = resolveConfiguredReturnTo(first(params.returnTo));
  const initialError = first(params.error) ? DEFAULT_AUTH_ERROR : undefined;
  const projects = [
    ["Platform", process.env.PLATFORM_URL ?? "http://localhost:3000"],
    ["Paperwork", process.env.PAPERWORK_URL ?? "http://localhost:3001"],
    ["Devtools", process.env.DEVTOOLS_URL ?? "http://localhost:3002"],
  ] as const;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ProductHeader
        actions={
          <nav
            aria-label="SmartTools projects"
            className="hidden items-center gap-6 text-sm font-bold text-muted-foreground sm:flex"
          >
            {projects.map(([name, href]) => (
              <a className="hover:text-foreground" href={href} key={name}>
                {name}
              </a>
            ))}
          </nav>
        }
        href={projects[0][1]}
        name="SmartTools"
      />

      <main>
        <section
          aria-labelledby="welcome-title"
          className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(24rem,30rem)] lg:gap-20 lg:px-8 lg:py-20"
        >
          <div className="max-w-2xl">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">
            One account, every SmartTool
          </p>
          <h1
            className="mt-4 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl"
            id="welcome-title"
          >
            Keep your work moving.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
            Sign in to manage your account across SmartTools. Public tools stay
            available without an account.
          </p>
          <ul className="mt-8 grid max-w-xl gap-3 text-sm font-semibold text-foreground">
            <li className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="grid size-9 place-items-center rounded-full border border-border text-xs font-extrabold text-primary"
              >
                01
              </span>
              Secure parent-domain sessions
            </li>
            <li className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="grid size-9 place-items-center rounded-full border border-border text-xs font-extrabold text-primary"
              >
                02
              </span>
              Verified email recovery
            </li>
            <li className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="grid size-9 place-items-center rounded-full border border-border text-xs font-extrabold text-primary"
              >
                03
              </span>
              Control every active session
            </li>
          </ul>
          </div>

          <AuthPanel returnTo={returnTo} initialError={initialError} />
        </section>
      </main>
    </div>
  );
}
