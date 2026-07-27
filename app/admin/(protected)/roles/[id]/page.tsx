import { PERMISSION_CATALOG } from "@smarttools/authorization";
import {
  Button,
  Checkbox,
  DangerZone,
  Field,
  FieldLegend,
  FieldSet,
  Input,
  SectionCard,
  SectionHeading,
  Textarea,
  ToolPageHeader,
} from "@smarttools/ui";
import { notFound } from "next/navigation";
import { requirePagePermission } from "../../../../../lib/admin/access";
import { getRole } from "../../../../../lib/admin/data";
import { deleteRoleAction, updateRoleAction } from "../../../actions";

export default async function RolePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePagePermission("roles", "view");
  const role = await getRole((await params).id);
  if (!role || role.isSystem) notFound();

  return (
    <>
      <ToolPageHeader
        description="Missing permissions deny access; selected grants combine across roles."
        title={role.name}
      />
      <SectionCard>
        <SectionHeading title="Role details and permissions" />
        <form action={updateRoleAction} className="grid gap-6">
          <input name="roleId" type="hidden" value={role.id} />
          <Field htmlFor="role-name" label="Name" required>
            <Input defaultValue={role.name} id="role-name" name="name" required />
          </Field>
          <Field htmlFor="role-description" label="Description" required>
            <Textarea
              defaultValue={role.description}
              id="role-description"
              name="description"
              required
            />
          </Field>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Object.entries(PERMISSION_CATALOG).map(([resource, definition]) => (
              <FieldSet
                className="gap-0 rounded-lg border border-border bg-muted/40 p-4"
                key={resource}
                title={definition.description}
              >
                <FieldLegend className="mb-0 px-1 font-extrabold text-foreground">
                  {resource}
                </FieldLegend>
                <p className="mb-4 text-sm leading-6 text-muted-foreground">
                  {definition.description}
                </p>
                <div className="grid gap-3">
                  {Object.entries(definition.actions).map(([action, help]) => (
                    <Checkbox
                      defaultChecked={role.access[resource]?.[action] === true}
                      description={help.description}
                      key={action}
                      label={action}
                      name={`permission:${resource}:${action}`}
                      title={help.description}
                    />
                  ))}
                </div>
              </FieldSet>
            ))}
          </div>
          <Button className="justify-self-start" type="submit">
            Save role
          </Button>
        </form>
      </SectionCard>
      <DangerZone className="mt-6">
        <SectionHeading
          description="Assigned custom roles cannot be deleted."
          title="Delete role"
        />
        <form action={deleteRoleAction}>
          <input name="roleId" type="hidden" value={role.id} />
          <Button type="submit" variant="destructive">
            Delete role
          </Button>
        </form>
      </DangerZone>
    </>
  );
}
