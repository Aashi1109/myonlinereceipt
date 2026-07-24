"use client";

import { ToolNav } from "@smarttools/ui";
import { useSelectedLayoutSegment } from "next/navigation";

const links = [
  { href: "/admin/tools", label: "Tools" },
  { href: "/admin/templates", label: "Templates" },
  { href: "/admin/features", label: "Features" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/roles", label: "Roles" },
  { href: "/admin/audit", label: "Audit" },
] as const;

export function AdminNavigation() {
  const segment = useSelectedLayoutSegment();

  return (
    <ToolNav
      ariaLabel="Admin sections"
      items={links.map((item) => ({
        ...item,
        current: item.href === `/admin/${segment}`,
      }))}
    />
  );
}
