import { getSession } from "@smarttools/auth/session";
import { buttonVariants } from "@smarttools/ui";
import { Mail, ShieldCheck, ShieldX } from "lucide-react";
import { headers } from "next/headers";

export default async function DeniedPage() {
  const session = await getSession(await headers());
  const accountName = session?.user.name?.trim() || "Signed-in account";
  const accountDetail = session?.user.name?.trim() || "your current account";
  const initials = accountName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "ST";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 sm:px-8">
        <a className="inline-flex items-center gap-2.5 rounded-lg font-heading text-[15px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring" href="/">
          <span className="grid size-8 place-items-center rounded-lg bg-surface-ink text-on-ink">
            <ShieldCheck aria-hidden="true" className="size-[17px]" />
          </span>
          SmartTools Admin
        </a>
        {session ? (
          <span className="hidden font-caption text-[11px] text-muted-foreground sm:block">
            Signed in as {accountDetail}
          </span>
        ) : null}
      </header>
      <main className="grid flex-1 place-items-center px-4 py-10">
        <section className="flex w-full max-w-[620px] flex-col items-center gap-[18px] rounded-xl border border-border bg-card p-6 text-center shadow-lg sm:p-9" aria-labelledby="denied-title">
          <span className="grid size-16 place-items-center rounded-xl bg-destructive-soft text-destructive">
            <ShieldX aria-hidden="true" className="size-[30px]" />
          </span>
          <p className="font-caption text-[11px] font-semibold tracking-[0.07em] text-destructive">ERROR 403</p>
          <h1 className="font-heading text-[26px] leading-tight font-semibold tracking-tight text-foreground" id="denied-title">
            You don’t have access to Admin
          </h1>
          <p className="max-w-[500px] text-sm leading-[1.55] text-muted-foreground">
            Your current role can’t view administrative tools, users, roles, or audit history. Your account is still signed in and no changes were made.
          </p>
          {session ? (
            <div className="flex w-full items-center gap-3 rounded-lg border border-border bg-muted p-3.5 text-left">
              <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-accent font-heading text-sm font-semibold text-primary">
                {initials}
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block truncate font-heading text-[13px] font-semibold">{accountName}</strong>
                <code className="mt-0.5 block truncate font-mono text-[10px] text-muted-foreground">Required permission: admin.enter</code>
              </span>
            </div>
          ) : null}
          <div className="flex flex-wrap justify-center gap-2.5">
            <a className={buttonVariants({ variant: "secondary" })} href="/auth?returnTo=%2Fadmin">
              Switch account
            </a>
            <a className={buttonVariants()} href="/paperwork">
              Return to Paperwork
            </a>
          </div>
          <p className="inline-flex items-center gap-2 font-caption text-[11px] text-muted-foreground">
            <Mail aria-hidden="true" className="size-3.5" />
            Need access? Contact an administrator for the appropriate role.
          </p>
        </section>
      </main>
    </div>
  );
}
