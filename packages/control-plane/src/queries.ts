import {
  type Access,
  type Role,
  hasPermission,
  mergeRoleAccess,
} from "@smarttools/authorization";
import {
  assertDatabaseConfigured,
  authUser,
  db,
  eq,
  featureOverridesTable,
  invoiceTemplatesTable,
  isDatabaseConfigured,
  managedToolsTable,
  rolesTable,
  userRolesTable,
} from "@smarttools/database";
import {
  InvoiceTemplateSchema,
  seedTemplates,
  type InvoiceTemplate,
} from "@smarttools/invoice-templates";
import {
  findAvailableToolBySlug,
  getEnabledTools,
  mergeToolManifest,
  type ResolvedTool,
  type ToolApp,
} from "@smarttools/tool-catalog";
import {
  mergeFeatureOverrides,
  type FeatureManifestEntry,
  type ResolvedFeature,
} from "./featureFlags.ts";

export class AuthorizationError extends Error {
  readonly status = 403;
}

export const featureManifest: readonly FeatureManifestEntry[] = [];

export async function getManagedTools(): Promise<ResolvedTool[]> {
  if (!isDatabaseConfigured()) return mergeToolManifest();
  return mergeToolManifest(await db.select().from(managedToolsTable));
}

export async function getAvailableTools(
  app: ToolApp,
): Promise<ResolvedTool[]> {
  return getEnabledTools(await getManagedTools(), app);
}

export async function getAvailableToolBySlug(
  app: ToolApp,
  slug: string,
): Promise<ResolvedTool | undefined> {
  return findAvailableToolBySlug(await getManagedTools(), app, slug);
}

export async function getFeatures(
  manifest: readonly FeatureManifestEntry[] = featureManifest,
): Promise<ResolvedFeature[]> {
  try {
    assertDatabaseConfigured();
    return mergeFeatureOverrides(
      manifest,
      await db.select().from(featureOverridesTable),
    );
  } catch {
    return mergeFeatureOverrides(manifest);
  }
}

function mapTemplate(
  row: typeof invoiceTemplatesTable.$inferSelect,
): InvoiceTemplate | undefined {
  const template = {
    ...row,
    description: row.description ?? "",
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  } as InvoiceTemplate;
  return InvoiceTemplateSchema.safeParse(template).success
    ? template
    : undefined;
}

export async function getPublishedTemplates(): Promise<InvoiceTemplate[]> {
  try {
    assertDatabaseConfigured();
    const rows = await db
      .select()
      .from(invoiceTemplatesTable)
      .where(eq(invoiceTemplatesTable.status, "published"));
    return rows.flatMap((row) => mapTemplate(row) ?? []);
  } catch {
    return seedTemplates.filter((template) => template.status === "published");
  }
}

export async function getUserAuthorization(userId: string): Promise<{
  roles: Role[];
  access: Access;
}> {
  assertDatabaseConfigured();
  const rows = await db
    .select({
      status: authUser.status,
      roleId: rolesTable.id,
      roleName: rolesTable.name,
      roleDescription: rolesTable.description,
      roleAccess: rolesTable.access,
      roleIsSystem: rolesTable.isSystem,
    })
    .from(authUser)
    .leftJoin(userRolesTable, eq(userRolesTable.userId, authUser.id))
    .leftJoin(rolesTable, eq(rolesTable.id, userRolesTable.roleId))
    .where(eq(authUser.id, userId));

  if (!rows.length || rows[0].status !== "active") {
    throw new AuthorizationError("Access denied");
  }

  const roles = rows.flatMap((row) =>
    row.roleId &&
    row.roleName &&
    row.roleDescription &&
    row.roleAccess &&
    row.roleIsSystem !== null
      ? [
          {
            id: row.roleId,
            name: row.roleName,
            description: row.roleDescription,
            access: row.roleAccess,
            isSystem: row.roleIsSystem,
          },
        ]
      : [],
  );

  return { roles, access: mergeRoleAccess(roles) };
}

export async function requirePermission(
  userId: string,
  resource: string,
  action: string,
): Promise<void> {
  const { access } = await getUserAuthorization(userId);
  if (!hasPermission(access, resource, action)) {
    throw new AuthorizationError(`Missing permission: ${resource}.${action}`);
  }
}
