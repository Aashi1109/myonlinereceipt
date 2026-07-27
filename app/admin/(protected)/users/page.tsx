import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Checkbox,
  EmptyState,
  Field,
  FieldLegend,
  FieldSet,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusBadge,
  ToolPageHeader,
  buttonVariants,
} from "@smarttools/ui";
import { Ellipsis, SearchX, Users } from "lucide-react";
import { requirePagePermission } from "../../../../lib/admin/access";
import { listRoles, listUsers } from "../../../../lib/admin/data";
import { assignRolesAction, setUserStatusAction } from "../../actions";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "U";
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; role?: string | string[] }>;
}) {
  await requirePagePermission("users", "view");
  const params = await searchParams;
  const queryValue = Array.isArray(params.q) ? params.q[0] : params.q;
  const roleValue = Array.isArray(params.role) ? params.role[0] : params.role;
  const query = queryValue ?? "";
  const selectedRole = roleValue || "all";
  const [allUsers, roles] = await Promise.all([listUsers(query), listRoles()]);
  const users = selectedRole === "all"
    ? allUsers
    : allUsers.filter((user) => user.roles.includes(selectedRole));
  const roleNames = new Map(roles.map((role) => [role.id, role.name] as const));

  return (
    <div className="flex min-h-full flex-col gap-5">
      <ToolPageHeader
        className="mb-0 border-b-0 pb-0"
        description="Search people and assign the right level of access."
        title="Users"
      />

      <form className="grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-[minmax(15rem,1fr)_220px_auto] md:items-end" method="get">
        <Field htmlFor="user-search" label="Search">
          <Input defaultValue={query} name="q" placeholder="Name or email…" type="search" />
        </Field>
        <Field htmlFor="user-role-filter" label="Role">
          <Select defaultValue={selectedRole} name="role">
            <SelectTrigger id="user-role-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <div className="flex gap-2">
          <Button type="submit">Apply</Button>
          {(query || selectedRole !== "all") ? (
            <a className={buttonVariants({ variant: "secondary" })} href="/admin/users">Clear</a>
          ) : null}
        </div>
      </form>

      {users.length ? (
        <section aria-label="User accounts" className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="hidden grid-cols-[minmax(0,1fr)_220px_150px_44px] items-center gap-4 border-b border-border bg-muted px-5 py-3 md:grid">
            {['User', 'Role', 'Status', ''].map((heading) => (
              <span className="font-caption text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase" key={heading || "action"}>{heading}</span>
            ))}
          </div>
          <div className="divide-y divide-border">
            {users.map((user) => {
              const assignedRoleNames = user.roles
                .filter((roleId) => roleId !== "user")
                .map((roleId) => roleNames.get(roleId) ?? roleId);
              const roleLabel = assignedRoleNames.length ? assignedRoleNames.join(", ") : "User";

              return (
                <details className="group/user" key={user.id}>
                  <summary className="grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-3.5 outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:grid-cols-[minmax(0,1fr)_220px_150px_44px] [&::-webkit-details-marker]:hidden">
                    <span className="flex min-w-0 items-center gap-3">
                      <Avatar className="size-9 shrink-0">
                        {user.image ? <AvatarImage alt="" src={user.image} /> : null}
                        <AvatarFallback className="bg-accent font-heading text-[13px] font-semibold text-primary">{initials(user.name)}</AvatarFallback>
                      </Avatar>
                      <span className="min-w-0">
                        <strong className="block truncate font-heading text-sm font-semibold text-foreground">{user.name}</strong>
                        <span className="mt-0.5 block truncate font-caption text-xs text-muted-foreground">{user.email}</span>
                      </span>
                    </span>
                    <span className={`min-w-0 truncate text-[13px] ${assignedRoleNames.length ? "text-foreground" : "text-status-warning"}`}>{roleLabel}</span>
                    <StatusBadge className="justify-self-start" variant={user.status === "active" ? "success" : "danger"}>
                      {user.status === "active" ? "Active" : "Suspended"}
                    </StatusBadge>
                    <span className="grid size-9 place-items-center justify-self-end rounded-lg text-muted-foreground group-open/user:bg-muted group-open/user:text-foreground">
                      <Ellipsis aria-hidden="true" className="size-[18px]" />
                    </span>
                  </summary>
                  <div className="grid gap-5 border-t border-border bg-muted/40 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                    <form action={assignRolesAction} className="grid gap-4">
                      <input name="userId" type="hidden" value={user.id} />
                      <FieldSet className="gap-3">
                        <FieldLegend className="font-heading text-sm font-semibold">Assigned roles</FieldLegend>
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {roles.map((role) => (
                            <div key={role.id}>
                              <Checkbox
                                defaultChecked={user.roles.includes(role.id)}
                                description={role.description}
                                disabled={role.id === "user"}
                                label={role.name}
                                name="roles"
                                value={role.id}
                              />
                              {role.id === "user" ? <input name="roles" type="hidden" value="user" /> : null}
                            </div>
                          ))}
                        </div>
                      </FieldSet>
                      <Button className="justify-self-start" size="sm" type="submit">Save roles</Button>
                    </form>
                    <form action={setUserStatusAction}>
                      <input name="userId" type="hidden" value={user.id} />
                      <input name="status" type="hidden" value={user.status === "active" ? "suspended" : "active"} />
                      <Button size="sm" type="submit" variant={user.status === "active" ? "danger-subtle" : "secondary"}>
                        {user.status === "active" ? "Suspend and revoke sessions" : "Reactivate account"}
                      </Button>
                    </form>
                  </div>
                </details>
              );
            })}
          </div>
          <div className="border-t border-border px-5 py-3 font-caption text-[11px] text-muted-foreground">
            {users.length} {users.length === 1 ? "user" : "users"}
          </div>
        </section>
      ) : (
        <EmptyState
          description={query || selectedRole !== "all" ? "No users match these filters. Clear the filters or try another search." : "Accounts appear here after registration."}
          icon={query || selectedRole !== "all" ? <SearchX aria-hidden="true" /> : <Users aria-hidden="true" />}
          title={query || selectedRole !== "all" ? "No users matched" : "No users found"}
        />
      )}
    </div>
  );
}
