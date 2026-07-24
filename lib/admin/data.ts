import {
  alias,
  and,
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

const auditActor = alias(authUser, "audit_actor");
const auditTargetUser = alias(authUser, "audit_target_user");

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
    .select({
      id: auditEventsTable.id,
      actorUserId: auditEventsTable.actorUserId,
      actorName: auditActor.name,
      actorEmail: auditActor.email,
      action: auditEventsTable.action,
      targetType: auditEventsTable.targetType,
      targetId: auditEventsTable.targetId,
      targetUserName: auditTargetUser.name,
      targetUserEmail: auditTargetUser.email,
      metadata: auditEventsTable.metadata,
      createdAt: auditEventsTable.createdAt,
    })
    .from(auditEventsTable)
    .leftJoin(
      auditActor,
      eq(auditActor.id, auditEventsTable.actorUserId),
    )
    .leftJoin(
      auditTargetUser,
      and(
        eq(auditEventsTable.targetType, "user"),
        eq(auditTargetUser.id, auditEventsTable.targetId),
      ),
    )
    .orderBy(desc(auditEventsTable.createdAt))
    .limit(200);
}
