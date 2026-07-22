import { getAuthServiceURL } from "@smarttools/auth/session";
import { AppContainer, EmptyState, buttonVariants } from "@smarttools/ui";

export default function DeniedPage() {
  const adminUrl = process.env.ADMIN_URL ?? "http://localhost:3003";
  const authUrl = getAuthServiceURL(adminUrl);
  return (
    <main className="grid min-h-screen place-items-center py-12">
      <AppContainer>
        <EmptyState
          action={
            <a className={buttonVariants()} href={authUrl}>
              Return to your account
            </a>
          }
          description="Your account does not have the required permission."
          headingLevel="h1"
          title="Admin access denied"
        />
      </AppContainer>
    </main>
  );
}
