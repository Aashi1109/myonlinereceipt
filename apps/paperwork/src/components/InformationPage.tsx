import {
  getAuthServiceURL,
  getOptionalSession,
} from "@smarttools/auth/session";
import {
  AccountNavigation,
  AppContainer,
  Card,
  ProductHeader,
} from "@smarttools/ui";
import { ArrowLeft } from "lucide-react";
import { headers } from "next/headers";
import type { ReactNode } from "react";

export default async function InformationPage({
  children,
  description,
  eyebrow,
  title,
}: {
  children: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}) {
  const requestHeaders = await headers();
  const paperworkUrl = process.env.PAPERWORK_URL ?? "http://localhost:3001";
  const session = await getOptionalSession(requestHeaders, paperworkUrl);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <ProductHeader
        actions={
          <AccountNavigation
            authUrl={getAuthServiceURL(paperworkUrl)}
            returnTo={paperworkUrl}
            user={session ? { name: session.user.name } : null}
          />
        }
        href="/"
        name="Paperwork"
      />
      <main className="grow py-12 sm:py-16">
        <AppContainer>
          <a
            className="mb-8 inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-bold text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            href="/"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to Paperwork tools
          </a>
          <header className="mb-8 max-w-3xl space-y-3">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">
              {eyebrow}
            </p>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl">{title}</h1>
            <p className="text-base leading-7 text-muted-foreground sm:text-lg">
              {description}
            </p>
          </header>
          <Card className="max-w-3xl space-y-7 p-6 text-sm leading-7 sm:p-8 sm:text-base">
            {children}
          </Card>
        </AppContainer>
      </main>
      <footer className="border-t border-border bg-card py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} SmartTools Paperwork Toolkit.
      </footer>
    </div>
  );
}
