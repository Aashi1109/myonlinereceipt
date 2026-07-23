import { auth } from "@smarttools/auth";
import {
  AppContainer,
  ProductHeader,
  StatusBadge,
} from "@smarttools/ui";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { resolveConfiguredReturnTo } from "../../lib/security";
import { ProfileBackLink } from "./_components/ProfileBackLink";
import { ProfileManager } from "./ProfileManager";

export const dynamic = "force-dynamic";

type SearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const returnTo = resolveConfiguredReturnTo(first(params.returnTo));
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    const profileReturnTo = new URLSearchParams({ returnTo });
    redirect(
      `/?${new URLSearchParams({ returnTo: `/profile?${profileReturnTo}` })}`,
    );
  }

  return (
    <main className="auth-shell min-h-screen bg-background text-foreground">
      <ProductHeader
        className="auth-header sticky top-0 z-50"
        href={process.env.PLATFORM_URL ?? "http://localhost:3000"}
        name="SmartTools"
      />
      <AppContainer className="pb-16 sm:pb-20">
        <header className="mb-10 border-b border-border pb-8 pt-8 sm:pt-10">
          <div className="-ml-3">
            <ProfileBackLink fallbackHref={returnTo} />
          </div>
          <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.14em] text-primary">
            Account settings
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight text-foreground">
              Your SmartTools account
            </h1>
            <StatusBadge
              variant={session.user.emailVerified ? "success" : "warning"}
            >
              {session.user.emailVerified
                ? "Verified account"
                : "Verification pending"}
            </StatusBadge>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Update your profile, sign-in methods, and account security.
          </p>
        </header>
        <ProfileManager
          currentSessionId={session.session.id}
          initialUser={{
            name: session.user.name,
            email: session.user.email,
            image: session.user.image ?? null,
            emailVerified: session.user.emailVerified,
          }}
        />
      </AppContainer>
    </main>
  );
}
