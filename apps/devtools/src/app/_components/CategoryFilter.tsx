"use client";

import { Select } from "@smarttools/ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function CategoryFilter({
  categories,
  value,
}: {
  categories: readonly string[];
  value: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <label className="inline-flex items-center gap-2 text-sm font-bold text-foreground">
      Tools
      <Select
        aria-label="Filter tools by category"
        className="h-10 w-56 bg-card text-sm font-semibold"
        defaultValue={value}
        onChange={(event) => {
          const params = new URLSearchParams(searchParams.toString());
          params.set("view", "all");
          if (event.currentTarget.value) {
            params.set("category", event.currentTarget.value);
          } else {
            params.delete("category");
          }
          router.push(`${pathname}?${params.toString()}`, { scroll: false });
        }}
      >
        <option value="">All categories</option>
        {categories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </Select>
    </label>
  );
}
