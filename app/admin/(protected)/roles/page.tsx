import {
  Button,
  Card,
  Field,
  Input,
  SectionCard,
  SectionHeading,
  StatusBadge,
  Textarea,
  ToolPageHeader,
  buttonVariants,
} from "@smarttools/ui";
import Link from "next/link";
import { requirePagePermission } from "../../../../lib/admin/access";
import { listRoles } from "../../../../lib/admin/data";
import { createRoleAction } from "../../actions";

export default async function RolesPage() {
  await requirePagePermission("roles", "view");
  const roles = await listRoles();

  return (
    <>
      <ToolPageHeader
        description="Custom roles begin with no access and grant only selected permissions."
        title="Roles"
      />
      <SectionCard>
        <SectionHeading
          description="Start with a clear name and purpose; permissions are assigned after creation."
          title="Create custom role"
        />
        <form action={createRoleAction} className="grid gap-4">
          <Field htmlFor="new-role-name" label="Name" required>
            <Input id="new-role-name" maxLength={80} name="name" required />
          </Field>
          <Field htmlFor="new-role-description" label="Description" required>
            <Textarea
              id="new-role-description"
              maxLength={500}
              name="description"
              required
            />
          </Field>
          <Button className="justify-self-start" type="submit">
            Create with no access
          </Button>
        </form>
      </SectionCard>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {roles.map((role) => (
          <Card className="flex flex-col gap-4" key={role.id}>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-extrabold tracking-tight text-foreground">
                {role.name}
              </h2>
              {role.isSystem && <StatusBadge>Protected</StatusBadge>}
            </div>
            <p className="text-sm leading-6 text-muted-foreground">{role.description}</p>
            <code className="break-all font-mono text-xs text-muted-foreground">{role.id}</code>
            <p className="text-sm text-muted-foreground">
              {Number(role.assignedUsers)} assigned users
            </p>
            {!role.isSystem && (
              <Link
                className={buttonVariants({ className: "self-start" })}
                href={`/admin/roles/${role.id}`}
              >
                Edit permissions
              </Link>
            )}
          </Card>
        ))}
      </div>
    </>
  );
}
