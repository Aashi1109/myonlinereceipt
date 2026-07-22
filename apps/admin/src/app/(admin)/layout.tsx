import { getAuthServiceURL } from "@smarttools/auth/session";
import {
  AccountNavigation,
  AppContainer,
  ProductHeader,
} from "@smarttools/ui";
import { requirePagePermission } from "../../lib/access";
import { AdminNavigation } from "./_components/AdminNavigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePagePermission("admin", "enter");
  const adminUrl = process.env.ADMIN_URL ?? "http://localhost:3003";
  const authUrl = getAuthServiceURL(adminUrl);

  return (
    <div className="min-h-screen bg-background">
      <ProductHeader
        actions={
          <div className="flex flex-wrap items-center justify-end gap-3">
            <AdminNavigation />
            <AccountNavigation authUrl={authUrl} returnTo={adminUrl} user={session.user} />
          </div>
        }
        href="/tools"
        name="Admin"
      />
      <AppContainer>
        <main className="py-6 sm:py-8 lg:py-10">{children}</main>
      </AppContainer>
    </div>
  );
}
