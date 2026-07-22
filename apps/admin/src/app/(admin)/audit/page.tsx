import { EmptyState, ToolPageHeader } from "@smarttools/ui";
import { requirePagePermission } from "../../../lib/access";
import { listAuditEvents } from "../../../lib/data";

export default async function AuditPage() {
  await requirePagePermission("audit", "view");
  const events = await listAuditEvents();

  return (
    <>
      <ToolPageHeader
        description="The latest 200 privileged mutations, with sensitive metadata redacted."
        title="Audit history"
      />
      {events.length ? (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/60">
                {['Time', 'Actor', 'Action', 'Target', 'Metadata'].map((heading) => (
                  <th
                    className="px-4 py-3 text-left text-xs font-extrabold uppercase tracking-wide text-muted-foreground"
                    key={heading}
                    scope="col"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {events.map((event) => (
                <tr className="align-top hover:bg-muted/30" key={event.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {event.createdAt.toISOString()}
                  </td>
                  <td className="px-4 py-3">
                    <code className="break-all font-mono text-xs">{event.actorUserId}</code>
                  </td>
                  <td className="px-4 py-3 font-semibold text-foreground">{event.action}</td>
                  <td className="px-4 py-3">
                    {event.targetType}:{" "}
                    <code className="break-all font-mono text-xs">{event.targetId}</code>
                  </td>
                  <td className="px-4 py-3">
                    <code className="break-all font-mono text-xs text-muted-foreground">
                      {JSON.stringify(event.metadata)}
                    </code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          description="Privileged changes will appear here after an administrator makes one."
          title="No privileged mutations recorded"
        />
      )}
    </>
  );
}
