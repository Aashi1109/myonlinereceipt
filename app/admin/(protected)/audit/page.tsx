import {
  EmptyState,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  ToolPageHeader,
} from "@smarttools/ui";
import { History } from "lucide-react";
import { requirePagePermission } from "../../../../lib/admin/access";
import { listAuditEvents } from "../../../../lib/admin/data";
import { AuditFilters } from "./AuditFilters";
import { auditEventPresentation } from "./eventPresentation";

const dateTimeFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

type AuditSearchParams = Promise<{
  action?: string | string[];
  date?: string | string[];
  q?: string | string[];
}>;

function valueOf(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function AuditPage({ searchParams }: { searchParams: AuditSearchParams }) {
  await requirePagePermission("audit", "view");
  const [events, params] = await Promise.all([listAuditEvents(), searchParams]);
  const query = valueOf(params.q).trim().toLowerCase();
  const requestedAction = valueOf(params.action);
  const action = requestedAction === "all" ? "" : requestedAction;
  const date = valueOf(params.date) || "30";
  const days = date === "all" ? null : Number(date);
  const cutoff = days && Number.isFinite(days)
    ? new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    : null;
  const actions = [...new Set(events.map((event) => event.action))].sort();
  const filteredEvents = events.filter((event) => {
    if (action && event.action !== action) return false;
    if (cutoff && event.createdAt < cutoff) return false;
    if (!query) return true;
    return [
      event.actorName,
      event.actorEmail,
      event.action,
      event.targetType,
      event.targetId,
      event.targetUserName,
      event.targetUserEmail,
      JSON.stringify(event.metadata),
    ].some((value) => value?.toLowerCase().includes(query));
  });

  return (
    <>
      <ToolPageHeader
        className="mb-5"
        description="A chronological record of privileged administrative and access events. Sensitive metadata is redacted."
        eyebrow="Security"
        title="Audit history"
      />
      <div className="mb-5">
        <AuditFilters
          actions={actions}
          defaultAction={action}
          defaultDate={date}
          defaultQuery={query}
        />
      </div>
      {filteredEvents.length ? (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <Table className="min-w-[900px] border-collapse">
            <TableHeader>
              <TableRow className="bg-muted/60">
                {[
                  ["Actor", "w-[22%]"],
                  ["Event", "w-[20%]"],
                  ["Target", "w-[22%]"],
                  ["Metadata", "w-[22%]"],
                  ["Time", "w-[14%]"],
                ].map(([heading, width]) => (
                  <TableHead className={`${width} py-3 font-caption text-[10px] font-semibold tracking-[0.05em] uppercase`} key={heading} scope="col">
                    {heading}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvents.map((event) => {
                const { icon: EventIcon, label } = auditEventPresentation(event.action);
                return (
                  <TableRow className="align-top hover:bg-muted/30" key={event.id}>
                    <TableCell className="whitespace-normal py-3.5">
                      <strong className="block font-heading text-sm font-semibold text-foreground">{event.actorName ?? "Deleted user"}</strong>
                      <span className="mt-0.5 block break-all text-xs text-muted-foreground">{event.actorEmail ?? event.actorUserId}</span>
                    </TableCell>
                    <TableCell className="whitespace-normal py-3.5 align-middle">
                      <span className="inline-flex items-center gap-2.5 font-heading text-sm font-semibold text-foreground">
                        <EventIcon aria-hidden="true" className="size-[18px] shrink-0 text-primary" strokeWidth={1.8} />
                        {label}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-normal py-3.5">
                      {event.targetType === "user" ? (
                        <>
                          <strong className="block text-sm font-semibold text-foreground">{event.targetUserName ?? "Deleted user"}</strong>
                          <span className="mt-0.5 block break-all text-xs text-muted-foreground">{event.targetUserEmail ?? event.targetId}</span>
                        </>
                      ) : (
                        <>
                          <span className="block font-caption text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">{event.targetType}</span>
                          <code className="mt-1 block break-all font-mono text-xs">{event.targetId}</code>
                        </>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-normal py-3.5">
                      <code className="block max-w-xs break-all font-mono text-[11px] leading-5 text-muted-foreground">{JSON.stringify(event.metadata)}</code>
                    </TableCell>
                    <TableCell className="whitespace-normal py-3.5 text-xs leading-5 text-muted-foreground">
                      <time dateTime={event.createdAt.toISOString()}>{dateTimeFormatter.format(event.createdAt)}</time>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between border-t border-border px-4 py-3 font-caption text-[11px] text-muted-foreground">
            <span>Showing {filteredEvents.length} of {events.length} retained events</span>
            <span>Latest 200 events</span>
          </div>
        </div>
      ) : (
        <EmptyState
          description={events.length ? "No events match the current filters. Adjust the search, action, or date range." : "Privileged changes will appear here after an administrator makes one."}
          icon={<History aria-hidden="true" />}
          title={events.length ? "No matching audit events" : "No privileged mutations recorded"}
        />
      )}
    </>
  );
}
