"use client";

import {
  AccountNavigation,
  type AccountNavigationProps,
} from "@smarttools/ui";
import { ShieldCheck } from "lucide-react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AdminNavigation } from "./AdminNavigation";

function isFullPageTemplateLifecycle(pathname: string) {
  return (
    pathname === "/admin/templates/new" ||
    pathname.startsWith("/admin/templates/new/") ||
    pathname === "/admin/templates/import" ||
    /^\/admin\/templates\/[^/]+\/(?:advanced|manage)\/?$/.test(pathname)
  );
}

export function AdminShell({
  children,
  user,
}: {
  children: ReactNode;
  user: AccountNavigationProps["user"];
}) {
  const pathname = usePathname();
  const isToolsCatalog = pathname === "/admin/tools";

  if (isFullPageTemplateLifecycle(pathname)) {
    return (
      <main className="min-h-dvh overflow-y-auto bg-muted">
        {children}
      </main>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-background">
      <header className="z-50 flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-surface-ink px-4 text-on-ink sm:px-6">
        <a
          className="inline-flex items-center gap-2.5 rounded-lg font-heading text-[15px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
          href="/admin/tools"
        >
          <span className="grid size-8 place-items-center rounded-lg bg-primary">
            <ShieldCheck aria-hidden="true" className="size-[17px]" />
          </span>
          SmartTools Admin
        </a>
        <div className="flex items-center gap-3">
          <span className="hidden rounded-full bg-white/10 px-3 py-1.5 font-caption text-[10px] font-semibold tracking-[0.05em] text-on-ink-muted sm:inline-flex">
            CONTROL PLANE
          </span>
          <AccountNavigation
            className="[&_a]:border-white/15 [&_a]:bg-white/10 [&_a]:text-on-ink [&_a:hover]:bg-white/15"
            returnTo="/admin"
            user={user}
          />
        </div>
      </header>
      <div className="flex min-h-0 w-full flex-1 flex-col lg:flex-row">
        <aside className="shrink-0 overflow-hidden border-b border-border bg-card px-4 py-3 lg:h-full lg:w-60 lg:border-r lg:border-b-0 lg:px-4 lg:py-6">
          <p className="mb-3 hidden px-3 font-caption text-[10px] font-semibold tracking-[0.07em] text-muted-foreground lg:block">
            WORKSPACE
          </p>
          <AdminNavigation />
          <div className="mt-6 hidden rounded-lg bg-muted p-3 lg:block">
            <p className="font-heading text-xs font-semibold">Code is the source</p>
            <p className="mt-1.5 text-xs leading-[1.45] text-muted-foreground">
              Routes and capabilities are registered at build time.
            </p>
          </div>
        </aside>
        <main
          className={`min-h-0 min-w-0 flex-1 overscroll-contain px-4 py-6 sm:px-6 lg:px-7 lg:py-7 ${
            isToolsCatalog ? "overflow-y-auto lg:overflow-hidden" : "overflow-y-auto"
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
