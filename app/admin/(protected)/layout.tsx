import { requirePagePermission } from "../../../lib/admin/access";
import { AdminShell } from "./components/AdminShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePagePermission("admin", "enter");

  return <AdminShell user={session.user}>{children}</AdminShell>;
}
