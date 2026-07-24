import { ProductHeader } from "@smarttools/ui";
import {
  DEFAULT_AUTH_ERROR,
  resolveConfiguredReturnTo,
} from "./_lib/security";
import { AuthPanel } from "./AuthPanel";

type SearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

const accountFeatures = [
  "Sign in across SmartTools",
  "Recover access by email",
  "Review active sessions",
] as const;

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
    ["Platform", "/"],
    ["Paperwork", "/paperwork"],
    ["Devtools", "/devtools"],
    ["Media", "/media"],
  ] as const;

  return (
    <div className="auth-shell min-h-screen bg-background text-foreground">
      <ProductHeader
        actions={
          <nav
            aria-label="SmartTools projects"
            className="hidden items-center gap-6 text-sm font-bold text-muted-foreground sm:flex"
          >
            {projects.map(([name, href]) => (
              <a
                className="underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                href={href}
                key={name}
              >
                {name}
              </a>
            ))}
          </nav>
        }
        className="auth-header sticky top-0 z-50"
        href={projects[0][1]}
        name="SmartTools"
      />

      <main>
        <section
          aria-labelledby="welcome-title"
          className="border-b border-border bg-card"
        >
          <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl lg:grid-cols-[minmax(0,1.08fr)_minmax(28rem,0.92fr)]">
            <div className="auth-grid order-1 flex items-center justify-center bg-background px-4 py-12 sm:px-6 sm:py-16 lg:order-2 lg:px-8">
              <AuthPanel returnTo={returnTo} initialError={initialError} />
            </div>

            <div className="order-2 flex flex-col justify-center border-t border-border px-4 py-12 sm:px-6 sm:py-16 lg:order-1 lg:border-t-0 lg:border-r lg:px-8 lg:py-20">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                SmartTools account
              </p>
              <h1
                className="mt-6 max-w-3xl text-[clamp(3rem,7vw,5.5rem)] leading-[0.88] font-black tracking-[-0.07em]"
                id="welcome-title"
              >
                One <span className="text-primary">account.</span>
                <br />
                Every
                <br />
                SmartTool.
              </h1>
              <p className="mt-8 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                Sign in to manage your account across SmartTools. Public tools stay
                available without an account.
              </p>

              <ol className="mt-12 hidden border border-border sm:grid sm:grid-cols-3">
                {accountFeatures.map((feature, index) => (
                  <li
                    className="border-r border-border p-4 last:border-r-0"
                    key={feature}
                  >
                    <span
                      aria-hidden="true"
                      className="text-sm font-black text-primary"
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="mt-8 block text-sm font-bold leading-5">
                      {feature}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
