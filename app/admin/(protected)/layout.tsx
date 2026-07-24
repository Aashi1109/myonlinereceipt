import {
  AccountNavigation,
  AppContainer,
  ProductHeader,
} from "@smarttools/ui";
import { requirePagePermission } from "../../../lib/admin/access";
import { AdminNavigation } from "./components/AdminNavigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePagePermission("admin", "enter");

  return (
    <div className="min-h-screen bg-background">
      <ProductHeader
        actions={
          <div className="flex flex-wrap items-center justify-end gap-3">
            <AdminNavigation />
            <AccountNavigation returnTo="/admin" user={session.user} />
          </div>
        }
        href="/admin/tools"
        name="Admin"
      />
      <AppContainer>
        <main className="py-6 sm:py-8 lg:py-10">{children}</main>
      </AppContainer>
    </div>
  );
}
