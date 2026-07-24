import { AppContainer, EmptyState, buttonVariants } from "@smarttools/ui";

export default function DeniedPage() {
  return (
    <main className="grid min-h-screen place-items-center py-12">
      <AppContainer>
        <EmptyState
          action={
            <a className={buttonVariants()} href="/auth?returnTo=%2Fadmin">
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
