"use client";

import { ToolNav } from "@smarttools/ui";
import { useSelectedLayoutSegment } from "next/navigation";

const links = [
  { href: "/tools", label: "Tools" },
  { href: "/templates", label: "Templates" },
  { href: "/features", label: "Features" },
  { href: "/users", label: "Users" },
  { href: "/roles", label: "Roles" },
  { href: "/audit", label: "Audit" },
] as const;

export function AdminNavigation() {
  const segment = useSelectedLayoutSegment();

  return (
    <ToolNav
      ariaLabel="Admin sections"
      items={links.map((item) => ({
        ...item,
        current: item.href === `/${segment}`,
      }))}
    />
  );
}
