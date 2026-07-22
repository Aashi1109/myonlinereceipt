import {
  Button,
  Card,
  Checkbox,
  EmptyState,
  Field,
  Input,
  StatusBadge,
  ToolPageHeader,
} from "@smarttools/ui";
import { requirePagePermission } from "../../../lib/access";
import { listRoles, listUsers } from "../../../lib/data";
import { assignRolesAction, setUserStatusAction } from "../../actions";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requirePagePermission("users", "view");
  const query = (await searchParams).q ?? "";
  const [users, roles] = await Promise.all([listUsers(query), listRoles()]);

  return (
    <>
      <ToolPageHeader
        description="Assign roles or revoke access without editing account identity or credentials."
        title="Users"
      />
      <Card className="mb-6">
        <form className="flex flex-col gap-3 sm:flex-row sm:items-end" method="get">
          <Field className="flex-1" htmlFor="user-search" label="Search by name or email">
            <Input defaultValue={query} id="user-search" name="q" type="search" />
          </Field>
          <Button type="submit">Search</Button>
        </form>
      </Card>
      {users.length ? (
        <div className="grid gap-6">
          {users.map((user) => (
            <Card className="space-y-6" key={user.id}>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-extrabold tracking-tight text-foreground">
                  {user.name}
                </h2>
                <StatusBadge variant={user.status === "active" ? "success" : "danger"}>
                  {user.status}
                </StatusBadge>
              </div>
              <div className="space-y-1">
                <strong className="block text-sm text-foreground">{user.email}</strong>
                <code className="block break-all font-mono text-xs text-muted-foreground">
                  {user.id}
                </code>
              </div>
              <form action={assignRolesAction} className="grid gap-5">
                <input name="userId" type="hidden" value={user.id} />
                <fieldset>
                  <legend className="mb-3 text-sm font-extrabold text-foreground">
                    Assigned roles
                  </legend>
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
                        {role.id === "user" && (
                          <input name="roles" type="hidden" value="user" />
                        )}
                      </div>
                    ))}
                  </div>
                </fieldset>
                <Button className="justify-self-start" type="submit">
                  Save roles
                </Button>
              </form>
              <form action={setUserStatusAction}>
                <input name="userId" type="hidden" value={user.id} />
                <input
                  name="status"
                  type="hidden"
                  value={user.status === "active" ? "suspended" : "active"}
                />
                <Button
                  type="submit"
                  variant={user.status === "active" ? "danger-subtle" : "secondary"}
                >
                  {user.status === "active" ? "Suspend and revoke sessions" : "Reactivate"}
                </Button>
              </form>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          description={query ? "Try a different name or email address." : "Accounts appear here after registration."}
          title={query ? "No users matched" : "No users found"}
        />
      )}
    </>
  );
}
