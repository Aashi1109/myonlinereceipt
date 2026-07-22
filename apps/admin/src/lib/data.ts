import {
  auditEventsTable,
  authUser,
  count,
  db,
  desc,
  eq,
  ilike,
  invoiceTemplatesTable,
  or,
  rolesTable,
  userRolesTable,
} from "@smarttools/database";

export async function listUsers(search = "") {
  const query = search.trim();
  const rows = await db
    .select({
      id: authUser.id,
      name: authUser.name,
      email: authUser.email,
      image: authUser.image,
      status: authUser.status,
      roleId: userRolesTable.roleId,
    })
    .from(authUser)
    .leftJoin(userRolesTable, eq(userRolesTable.userId, authUser.id))
    .where(
      query
        ? or(ilike(authUser.name, `%${query}%`), ilike(authUser.email, `%${query}%`))
        : undefined,
    )
    .orderBy(authUser.email);

  const users = new Map<
    string,
    {
      id: string;
      name: string;
      email: string;
      image: string | null;
      status: "active" | "suspended";
      roles: string[];
    }
  >();
  for (const row of rows) {
    const user = users.get(row.id) ?? { ...row, roles: [] };
    if (row.roleId) user.roles.push(row.roleId);
    users.set(row.id, user);
  }
  return [...users.values()];
}

export async function listRoles() {
  return db
    .select({
      id: rolesTable.id,
      name: rolesTable.name,
      description: rolesTable.description,
      access: rolesTable.access,
      isSystem: rolesTable.isSystem,
      assignedUsers: count(userRolesTable.userId),
    })
    .from(rolesTable)
    .leftJoin(userRolesTable, eq(userRolesTable.roleId, rolesTable.id))
    .groupBy(rolesTable.id)
    .orderBy(rolesTable.isSystem, rolesTable.name);
}

export async function getRole(roleId: string) {
  return (await listRoles()).find((role) => role.id === roleId);
}

export async function listTemplates() {
  return db
    .select()
    .from(invoiceTemplatesTable)
    .orderBy(desc(invoiceTemplatesTable.updatedAt));
}

export async function getTemplate(templateId: string) {
  const [template] = await db
    .select()
    .from(invoiceTemplatesTable)
    .where(eq(invoiceTemplatesTable.id, templateId))
    .limit(1);
  return template;
}

export async function listAuditEvents() {
  return db
    .select()
    .from(auditEventsTable)
    .orderBy(desc(auditEventsTable.createdAt))
    .limit(200);
}
