import { auth } from "@smarttools/auth";
import { AppContainer, ProductHeader, StatusBadge } from "@smarttools/ui";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ProfileManager } from "./ProfileManager";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/?returnTo=/profile");

  return (
    <main className="min-h-screen bg-background text-foreground">
      <ProductHeader
        actions={
          <StatusBadge variant={session.user.emailVerified ? "success" : "warning"}>
            {session.user.emailVerified ? "Verified account" : "Verification pending"}
          </StatusBadge>
        }
        href={process.env.PLATFORM_URL ?? "http://localhost:3000"}
        name="SmartTools"
      />
      <AppContainer className="pb-20">
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
