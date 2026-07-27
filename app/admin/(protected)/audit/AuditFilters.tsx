"use client";

import {
  Field,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@smarttools/ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function AuditFilters({
  actions,
  defaultAction,
  defaultDate,
  defaultQuery,
}: {
  actions: readonly string[];
  defaultAction: string;
  defaultDate: string;
  defaultQuery: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateFilter(key: "action" | "date" | "q", value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (!value || (key === "action" && value === "all")) next.delete(key);
    else next.set(key, value);
    router.replace(`${pathname}?${next.toString()}`);
  }

  return (
    <form
      className="grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-[minmax(15rem,1fr)_190px_190px] md:items-end"
      onSubmit={(event) => {
        event.preventDefault();
        updateFilter("q", String(new FormData(event.currentTarget).get("q") ?? "").trim());
      }}
    >
      <Field htmlFor="audit-search" label="Search events">
        <Input defaultValue={defaultQuery} name="q" placeholder="Actor, target, or action…" type="search" />
      </Field>
      <Field htmlFor="audit-action" label="Action">
        <Select defaultValue={defaultAction || "all"} onValueChange={(value) => updateFilter("action", value)}>
          <SelectTrigger id="audit-action">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            {actions.map((action) => (
              <SelectItem key={action} value={action}>{action}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field htmlFor="audit-date" label="Date range">
        <Select defaultValue={defaultDate} onValueChange={(value) => updateFilter("date", value)}>
          <SelectTrigger id="audit-date">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="all">All retained events</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <button className="sr-only" type="submit">Search audit history</button>
    </form>
  );
}
