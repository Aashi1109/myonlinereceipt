import {
  assertCanDeleteRole,
  assertCanDemoteUser,
  assertCanEditRole,
  assertCanSuspendUser,
  assertValidAccess,
  hasPermission,
  mergeRoleAccess,
  type Access,
  type Role,
  type User,
} from "@smarttools/authorization";
import {
  and,
  auditEventsTable,
  authSession,
  authUser,
  db,
  eq,
  featureOverridesTable,
  inArray,
  invoiceTemplatesTable,
  managedToolsTable,
  ne,
  rolesTable,
  userRolesTable,
} from "@smarttools/database";
import {
  createAdvancedTemplateConfig,
  DocumentTemplateSchema,
  normalizeAdvancedTemplateConfig,
  validateAdvancedTemplateForPublish,
  type AdvancedDocumentTemplate,
  type DocumentTemplate,
  type InvoiceTemplate,
  type TemplateDocumentType,
  type TemplatePageFormat,
} from "@smarttools/invoice-templates";
import {
  assertToolSlugImmutable,
  isValidToolSlug,
  seededManagedTools,
  toolManifest,
  type ManagedTool,
  type ToolApp,
} from "@smarttools/tool-catalog";
import {
  AuthorizationError,
  type FeatureApp,
  type FeatureManifestEntry,
} from "@smarttools/control-plane";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type ToolRow = typeof managedToolsTable.$inferSelect;
type RoleRow = typeof rolesTable.$inferSelect;
type TemplateRow = typeof invoiceTemplatesTable.$inferSelect;

export type ManagedToolEdit = Partial<
  Pick<ManagedTool, "slug" | "name" | "description">
>;

export type FeatureEdit = {
  name?: string;
  description?: string;
};

export type CustomRoleEdit = {
  name?: string;
  description?: string;
  access?: Access;
};

export type InvoiceTemplateContent = Pick<
  InvoiceTemplate,
  "name" | "slug" | "description" | "category" | "layoutFamily" | "config"
>;

export type DocumentTemplateContent = Pick<
  DocumentTemplate,
  "name" | "slug" | "description" | "category" | "layoutFamily" | "config"
>;

export type AdvancedDocumentTemplateDraft = Pick<
  AdvancedDocumentTemplate,
  "name" | "slug" | "description" | "category"
> & {
  documentType: TemplateDocumentType;
  pageFormat: TemplatePageFormat;
};

const REDACTED = "[REDACTED]";
const SENSITIVE_KEY_PARTS = new Set([
  "auth",
  "authentication",
  "authorization",
  "cookie",
  "password",
  "passwd",
  "secret",
  "token",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isSensitiveKey(key: string): boolean {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .some((part) => SENSITIVE_KEY_PARTS.has(part));
}

function redactValue(value: unknown, seen: WeakSet<object>): unknown {
  if (Array.isArray(value)) {
    if (seen.has(value)) return REDACTED;
    seen.add(value);
    return value.map((item) => redactValue(item, seen));
  }
  if (!isRecord(value)) return value;
  if (seen.has(value)) return REDACTED;

  seen.add(value);
  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      isSensitiveKey(key) ? REDACTED : redactValue(nestedValue, seen),
    ]),
  );
}

export function redactAuditMetadata(
  metadata: Record<string, unknown>,
): Record<string, unknown> {
  return redactValue(metadata, new WeakSet()) as Record<string, unknown>;
}

function requiredText(value: unknown, label: string, maxLength = 2_000): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} is required.`);
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw new Error(`${label} must be ${maxLength} characters or fewer.`);
  }
  return trimmed;
}

function assertBoolean(value: unknown, label: string): asserts value is boolean {
  if (typeof value !== "boolean") throw new Error(`${label} must be boolean.`);
}

async function requireTransactionPermission(
  transaction: Transaction,
  actorUserId: string,
  resource: string,
  action: string,
): Promise<void> {
  const rows = await transaction
    .select({
      status: authUser.status,
      roleId: rolesTable.id,
      roleName: rolesTable.name,
      roleDescription: rolesTable.description,
      roleAccess: rolesTable.access,
      roleIsSystem: rolesTable.isSystem,
    })
    .from(authUser)
    .innerJoin(userRolesTable, eq(userRolesTable.userId, authUser.id))
    .innerJoin(rolesTable, eq(rolesTable.id, userRolesTable.roleId))
    .where(eq(authUser.id, actorUserId))
    .for("share");

  if (!rows.length || rows[0].status !== "active") {
    throw new AuthorizationError("Access denied");
  }

  const roles: Role[] = rows.flatMap((row) =>
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

  const access = mergeRoleAccess(roles);
  if (!hasPermission(access, "admin", "enter")) {
    throw new AuthorizationError("Missing permission: admin.enter");
  }
  if (!hasPermission(access, resource, action)) {
    throw new AuthorizationError(
      `Missing permission: ${resource}.${action}`,
    );
  }
}

async function writeAudit(
  transaction: Transaction,
  actorUserId: string,
  action: string,
  targetType: string,
  targetId: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  await transaction.insert(auditEventsTable).values({
    id: crypto.randomUUID(),
    actorUserId,
    action,
    targetType,
    targetId,
    metadata: redactAuditMetadata(metadata),
  });
}

function getToolManifestEntry(toolId: string) {
  const entries = toolManifest.filter((entry) => entry.id === toolId);
  if (entries.length !== 1) throw new Error(`Unknown tool: ${toolId}.`);
  return entries[0];
}

function getToolFallback(toolId: string): ToolRow {
  const entry = getToolManifestEntry(toolId);
  const seed = seededManagedTools.find((tool) => tool.toolId === toolId);
  if (!seed) throw new Error(`Missing tool seed: ${toolId}.`);

  return {
    ...seed,
    app: entry.app,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

async function getToolForUpdate(
  transaction: Transaction,
  toolId: string,
): Promise<ToolRow> {
  const entry = getToolManifestEntry(toolId);
  const [stored] = await transaction
    .select()
    .from(managedToolsTable)
    .where(eq(managedToolsTable.toolId, toolId))
    .limit(1)
    .for("update");

  if (stored && stored.app !== entry.app) {
    throw new Error("Stored tool ownership does not match its manifest.");
  }
  return stored ?? getToolFallback(toolId);
}

async function saveTool(
  transaction: Transaction,
  tool: Pick<
    ToolRow,
    | "toolId"
    | "app"
    | "slug"
    | "name"
    | "description"
    | "order"
    | "enabled"
    | "archived"
  >,
): Promise<ToolRow> {
  const now = new Date();
  const [saved] = await transaction
    .insert(managedToolsTable)
    .values({ ...tool, updatedAt: now })
    .onConflictDoUpdate({
      target: managedToolsTable.toolId,
      set: {
        slug: tool.slug,
        name: tool.name,
        description: tool.description,
        order: tool.order,
        enabled: tool.enabled,
        archived: tool.archived,
        updatedAt: now,
      },
    })
    .returning();
  return saved;
}

export async function updateManagedTool(
  actorUserId: string,
  toolId: string,
  input: ManagedToolEdit,
): Promise<ToolRow> {
  return db.transaction(async (transaction) => {
    await requireTransactionPermission(transaction, actorUserId, "tools", "edit");
    if (!isRecord(input)) throw new Error("Tool changes must be an object.");

    const current = await getToolForUpdate(transaction, toolId);
    const entry = getToolManifestEntry(toolId);
    const slug = Object.hasOwn(input, "slug") ? input.slug : current.slug;
    if (slug !== null && !isValidToolSlug(entry.app, slug)) {
      throw new Error("Tool slug is invalid or reserved.");
    }
    assertToolSlugImmutable(current.slug, slug ?? null);

    const name = Object.hasOwn(input, "name")
      ? requiredText(input.name, "Tool name", 160)
      : current.name;
    const description = Object.hasOwn(input, "description")
      ? requiredText(input.description, "Tool description")
      : current.description;

    if (slug !== null) {
      const [duplicate] = await transaction
        .select({ toolId: managedToolsTable.toolId })
        .from(managedToolsTable)
        .where(
          and(
            eq(managedToolsTable.app, entry.app),
            eq(managedToolsTable.slug, slug),
            ne(managedToolsTable.toolId, toolId),
          ),
        )
        .limit(1);
      if (duplicate) throw new Error("Tool slug is already in use.");
    }

    const next = {
      toolId,
      app: entry.app,
      slug: slug ?? null,
      name,
      description,
      order: current.order,
      enabled: current.enabled,
      archived: current.archived,
    };
    const saved = await saveTool(transaction, next);
    await writeAudit(transaction, actorUserId, "tool.edit", "tool", toolId, {
      changes: Object.keys(input),
      slug: next.slug,
    });
    return saved;
  });
}

export async function reorderManagedTools(
  actorUserId: string,
  app: ToolApp,
  toolIds: readonly string[],
): Promise<void> {
  return db.transaction(async (transaction) => {
    await requireTransactionPermission(transaction, actorUserId, "tools", "edit");
    const expectedIds = new Set<string>(
      toolManifest.filter((tool) => tool.app === app).map((tool) => tool.id),
    );
    if (expectedIds.size === 0) throw new Error("Tool app is invalid.");
    if (
      !Array.isArray(toolIds) ||
      toolIds.length !== expectedIds.size ||
      new Set(toolIds).size !== toolIds.length ||
      toolIds.some((toolId) => typeof toolId !== "string" || !expectedIds.has(toolId))
    ) {
      throw new Error(`Tool order must contain every registered ${app} tool exactly once.`);
    }

    const stored = await transaction
      .select()
      .from(managedToolsTable)
      .where(inArray(managedToolsTable.toolId, [...expectedIds]))
      .for("update");
    if (stored.some((tool) => tool.app !== app)) {
      throw new Error("Stored tool ownership does not match its manifest.");
    }
    const storedById = new Map(stored.map((tool) => [tool.toolId, tool]));
    const orderById = new Map(toolIds.map((toolId, order) => [toolId, order]));

    for (const toolId of expectedIds) {
      await saveTool(transaction, {
        ...(storedById.get(toolId) ?? getToolFallback(toolId)),
        order: orderById.get(toolId)!,
      });
    }

    await writeAudit(transaction, actorUserId, "tool.reorder", "tool-list", app, {
      toolIds,
    });
  });
}

export async function setManagedToolEnabled(
  actorUserId: string,
  toolId: string,
  enabled: boolean,
): Promise<ToolRow> {
  return db.transaction(async (transaction) => {
    await requireTransactionPermission(transaction, actorUserId, "tools", "toggle");
    assertBoolean(enabled, "Tool enabled state");
    const current = await getToolForUpdate(transaction, toolId);
    if (enabled && current.slug === null) {
      throw new Error("A tool needs a slug before it can be enabled.");
    }
    if (enabled && current.archived) {
      throw new Error("An archived tool cannot be enabled.");
    }

    const saved = await saveTool(transaction, { ...current, enabled });
    await writeAudit(transaction, actorUserId, "tool.toggle", "tool", toolId, {
      enabled,
    });
    return saved;
  });
}

export async function setManagedToolArchived(
  actorUserId: string,
  toolId: string,
  archived: boolean,
): Promise<ToolRow> {
  return db.transaction(async (transaction) => {
    await requireTransactionPermission(transaction, actorUserId, "tools", "archive");
    assertBoolean(archived, "Tool archived state");
    const current = await getToolForUpdate(transaction, toolId);
    const saved = await saveTool(transaction, {
      ...current,
      archived,
      enabled: archived ? false : current.enabled,
    });
    await writeAudit(transaction, actorUserId, "tool.archive", "tool", toolId, {
      archived,
    });
    return saved;
  });
}

function getFeatureManifestEntry(
  manifest: readonly FeatureManifestEntry[],
  app: FeatureApp,
  key: string,
): FeatureManifestEntry {
  const entries = manifest.filter(
    (entry) => entry.app === app && entry.key === key,
  );
  if (entries.length !== 1) throw new Error(`Unknown feature: ${app}.${key}.`);
  return entries[0];
}

async function getFeatureForUpdate(
  transaction: Transaction,
  entry: FeatureManifestEntry,
) {
  const [stored] = await transaction
    .select()
    .from(featureOverridesTable)
    .where(
      and(
        eq(featureOverridesTable.app, entry.app),
        eq(featureOverridesTable.key, entry.key),
      ),
    )
    .limit(1)
    .for("update");
  return (
    stored ?? {
      app: entry.app,
      key: entry.key,
      name: entry.defaultName,
      description: entry.defaultDescription,
      enabled: false,
      updatedAt: new Date(),
    }
  );
}

async function saveFeature(
  transaction: Transaction,
  feature: typeof featureOverridesTable.$inferInsert,
) {
  const now = new Date();
  const [saved] = await transaction
    .insert(featureOverridesTable)
    .values({ ...feature, updatedAt: now })
    .onConflictDoUpdate({
      target: [featureOverridesTable.app, featureOverridesTable.key],
      set: {
        name: feature.name,
        description: feature.description,
        enabled: feature.enabled,
        updatedAt: now,
      },
    })
    .returning();
  return saved;
}

export async function updateFeature(
  actorUserId: string,
  app: FeatureApp,
  key: string,
  input: FeatureEdit,
  manifest: readonly FeatureManifestEntry[],
) {
  return db.transaction(async (transaction) => {
    await requireTransactionPermission(transaction, actorUserId, "features", "edit");
    const entry = getFeatureManifestEntry(manifest, app, key);
    if (!isRecord(input)) throw new Error("Feature changes must be an object.");
    const current = await getFeatureForUpdate(transaction, entry);
    const saved = await saveFeature(transaction, {
      app,
      key,
      name: Object.hasOwn(input, "name")
        ? requiredText(input.name, "Feature name", 160)
        : current.name,
      description: Object.hasOwn(input, "description")
        ? requiredText(input.description, "Feature description")
        : current.description,
      enabled: current.enabled,
    });
    await writeAudit(transaction, actorUserId, "feature.edit", "feature", `${app}:${key}`, {
      changes: Object.keys(input),
    });
    return saved;
  });
}

export async function setFeatureEnabled(
  actorUserId: string,
  app: FeatureApp,
  key: string,
  enabled: boolean,
  manifest: readonly FeatureManifestEntry[],
) {
  return db.transaction(async (transaction) => {
    await requireTransactionPermission(transaction, actorUserId, "features", "toggle");
    assertBoolean(enabled, "Feature enabled state");
    const entry = getFeatureManifestEntry(manifest, app, key);
    const current = await getFeatureForUpdate(transaction, entry);
    const saved = await saveFeature(transaction, { ...current, enabled });
    await writeAudit(transaction, actorUserId, "feature.toggle", "feature", `${app}:${key}`, {
      enabled,
    });
    return saved;
  });
}

async function getUserForUpdate(
  transaction: Transaction,
  userId: string,
): Promise<typeof authUser.$inferSelect> {
  const [user] = await transaction
    .select()
    .from(authUser)
    .where(eq(authUser.id, userId))
    .limit(1)
    .for("update");
  if (!user) throw new Error("User not found.");
  return user;
}

async function getUserRoleIdsForUpdate(
  transaction: Transaction,
  userId: string,
): Promise<string[]> {
  const rows = await transaction
    .select({ roleId: userRolesTable.roleId })
    .from(userRolesTable)
    .where(eq(userRolesTable.userId, userId))
    .for("update");
  return rows.map(({ roleId }) => roleId);
}

async function getAdminCounts(transaction: Transaction) {
  const rows = await transaction
    .select({ userId: userRolesTable.userId, status: authUser.status })
    .from(userRolesTable)
    .innerJoin(authUser, eq(authUser.id, userRolesTable.userId))
    .where(eq(userRolesTable.roleId, "admin"))
    .for("update");
  const admins = new Map(rows.map((row) => [row.userId, row.status]));
  return {
    adminCount: admins.size,
    activeAdminCount: [...admins.values()].filter(
      (status) => status === "active",
    ).length,
  };
}

function authorizationUser(
  user: typeof authUser.$inferSelect,
  roles: string[],
): User {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    status: user.status,
    roles,
  };
}

export async function assignUserRoles(
  actorUserId: string,
  targetUserId: string,
  requestedRoleIds: readonly string[],
): Promise<string[]> {
  return db.transaction(async (transaction) => {
    await requireTransactionPermission(
      transaction,
      actorUserId,
      "users",
      "assignRoles",
    );
    if (!Array.isArray(requestedRoleIds)) {
      throw new Error("Role assignments must be an array.");
    }
    const nextRoleIds = [
      ...new Set([
        "user",
        ...requestedRoleIds.map((roleId) =>
          requiredText(roleId, "Role id", 200),
        ),
      ]),
    ];
    const target = await getUserForUpdate(transaction, targetUserId);
    const currentRoleIds = await getUserRoleIdsForUpdate(
      transaction,
      targetUserId,
    );
    const existingRoles = await transaction
      .select({ id: rolesTable.id })
      .from(rolesTable)
      .where(inArray(rolesTable.id, nextRoleIds))
      .for("share");
    if (new Set(existingRoles.map(({ id }) => id)).size !== nextRoleIds.length) {
      throw new Error("One or more assigned roles do not exist.");
    }

    if (currentRoleIds.includes("admin") && !nextRoleIds.includes("admin")) {
      assertCanDemoteUser(
        authorizationUser(target, currentRoleIds),
        await getAdminCounts(transaction),
      );
    }
    if (
      currentRoleIds.length === nextRoleIds.length &&
      currentRoleIds.every((roleId) => nextRoleIds.includes(roleId))
    ) {
      return nextRoleIds;
    }

    const removedRoleIds = currentRoleIds.filter(
      (roleId) => !nextRoleIds.includes(roleId),
    );
    const addedRoleIds = nextRoleIds.filter(
      (roleId) => !currentRoleIds.includes(roleId),
    );
    if (removedRoleIds.length) {
      await transaction
        .delete(userRolesTable)
        .where(
          and(
            eq(userRolesTable.userId, targetUserId),
            inArray(userRolesTable.roleId, removedRoleIds),
          ),
        );
    }
    if (addedRoleIds.length) {
      await transaction.insert(userRolesTable).values(
        addedRoleIds.map((roleId) => ({ userId: targetUserId, roleId })),
      );
    }
    await writeAudit(
      transaction,
      actorUserId,
      "user.assign-roles",
      "user",
      targetUserId,
      { previousRoleIds: currentRoleIds, roleIds: nextRoleIds },
    );
    return nextRoleIds;
  });
}

export async function setUserStatus(
  actorUserId: string,
  targetUserId: string,
  status: "active" | "suspended",
): Promise<void> {
  return db.transaction(async (transaction) => {
    await requireTransactionPermission(transaction, actorUserId, "users", "suspend");
    if (status !== "active" && status !== "suspended") {
      throw new Error("User status must be active or suspended.");
    }
    const target = await getUserForUpdate(transaction, targetUserId);
    const roleIds = await getUserRoleIdsForUpdate(transaction, targetUserId);
    if (status === "suspended" && target.status === "active" && roleIds.includes("admin")) {
      assertCanSuspendUser(
        authorizationUser(target, roleIds),
        await getAdminCounts(transaction),
      );
    }

    if (target.status !== status) {
      await transaction
        .update(authUser)
        .set({ status, updatedAt: new Date() })
        .where(eq(authUser.id, targetUserId));
    }
    if (status === "suspended") {
      await transaction
        .delete(authSession)
        .where(eq(authSession.userId, targetUserId));
    }
    if (target.status !== status || status === "suspended") {
      await writeAudit(
        transaction,
        actorUserId,
        status === "suspended" ? "user.suspend" : "user.reactivate",
        "user",
        targetUserId,
        { previousStatus: target.status, status },
      );
    }
  });
}

async function getRoleForUpdate(
  transaction: Transaction,
  roleId: string,
): Promise<RoleRow> {
  const [role] = await transaction
    .select()
    .from(rolesTable)
    .where(eq(rolesTable.id, roleId))
    .limit(1)
    .for("update");
  if (!role) throw new Error("Role not found.");
  return role;
}

export async function createCustomRole(
  actorUserId: string,
  input: { name: string; description: string },
): Promise<RoleRow> {
  return db.transaction(async (transaction) => {
    await requireTransactionPermission(transaction, actorUserId, "roles", "create");
    if (!isRecord(input)) throw new Error("Role input must be an object.");
    const values = {
      id: crypto.randomUUID(),
      name: requiredText(input.name, "Role name", 160),
      description: requiredText(input.description, "Role description"),
      access: {},
      isSystem: false,
    };
    const [role] = await transaction.insert(rolesTable).values(values).returning();
    await writeAudit(transaction, actorUserId, "role.create", "role", values.id, {
      name: values.name,
    });
    return role;
  });
}

export async function updateCustomRole(
  actorUserId: string,
  roleId: string,
  input: CustomRoleEdit,
): Promise<RoleRow> {
  return db.transaction(async (transaction) => {
    await requireTransactionPermission(transaction, actorUserId, "roles", "edit");
    if (!isRecord(input)) throw new Error("Role changes must be an object.");
    const current = await getRoleForUpdate(transaction, roleId);
    assertCanEditRole(current);
    if (Object.hasOwn(input, "access")) assertValidAccess(input.access);

    const changes = {
      name: Object.hasOwn(input, "name")
        ? requiredText(input.name, "Role name", 160)
        : current.name,
      description: Object.hasOwn(input, "description")
        ? requiredText(input.description, "Role description")
        : current.description,
      access: Object.hasOwn(input, "access") ? input.access! : current.access,
      updatedAt: new Date(),
    };
    const [role] = await transaction
      .update(rolesTable)
      .set(changes)
      .where(eq(rolesTable.id, roleId))
      .returning();
    await writeAudit(transaction, actorUserId, "role.edit", "role", roleId, {
      changes: Object.keys(input),
    });
    return role;
  });
}

export async function deleteCustomRole(
  actorUserId: string,
  roleId: string,
): Promise<void> {
  return db.transaction(async (transaction) => {
    await requireTransactionPermission(transaction, actorUserId, "roles", "delete");
    const role = await getRoleForUpdate(transaction, roleId);
    const assignments = await transaction
      .select({ userId: userRolesTable.userId })
      .from(userRolesTable)
      .where(eq(userRolesTable.roleId, roleId))
      .for("update");
    assertCanDeleteRole(role, assignments.length);

    await transaction.delete(rolesTable).where(eq(rolesTable.id, roleId));
    await writeAudit(transaction, actorUserId, "role.delete", "role", roleId, {
      name: role.name,
    });
  });
}

function templateValidationError(input: unknown): DocumentTemplate {
  const result = DocumentTemplateSchema.safeParse(input);
  if (result.success) return result.data as DocumentTemplate;
  throw new Error(result.error.issues.map(({ message }) => message).join("; "));
}

async function renderAdvancedTemplateForPublication(
  template: AdvancedDocumentTemplate,
) {
  const config = normalizeAdvancedTemplateConfig(
    template.config,
    template.documentType,
  );
  const validation = validateAdvancedTemplateForPublish(
    config,
    template.documentType,
  );
  if (!validation.valid) {
    throw new Error(
      `Publication blocked: ${validation.errors
        .map((issue) => issue.message)
        .join("; ")}`,
    );
  }
  if (validation.warnings.length) {
    console.warn(
      "Advanced template publication warnings",
      template.id,
      validation.warnings.map((issue) => issue.message),
    );
  }

  const [{ generate }, schemas] = await Promise.all([
    import("@pdfme/generator"),
    import("@pdfme/schemas"),
  ]);
  await generate({
    template: config.template,
    inputs: [config.sampleData],
    plugins: {
      text: schemas.text,
      multiVariableText: schemas.multiVariableText,
      list: schemas.list,
      image: schemas.image,
      signature: schemas.signature,
      svg: schemas.svg,
      line: schemas.line,
      rectangle: schemas.rectangle,
      ellipse: schemas.ellipse,
      table: schemas.table,
      dateTime: schemas.dateTime,
      date: schemas.date,
      time: schemas.time,
      select: schemas.select,
      radioGroup: schemas.radioGroup,
      checkbox: schemas.checkbox,
      circleMark: schemas.circleMark,
      ...schemas.barcodes,
    },
  });
}

function makeTemplateDraft(
  input: DocumentTemplateContent & Pick<DocumentTemplate, "documentType">,
  id = crypto.randomUUID(),
) {
  if (!isRecord(input)) throw new Error("Template input must be an object.");
  return templateValidationError({
    id,
    name: input.name,
    slug: input.slug,
    description: input.description,
    category: input.category,
    status: "draft",
    isDefault: false,
    version: 1,
    documentType: input.documentType,
    layoutFamily: input.layoutFamily,
    config: input.config,
  });
}

function storedTemplateInput(row: TemplateRow) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? "",
    category: row.category,
    status: row.status,
    isDefault: row.isDefault,
    version: row.version,
    documentType: row.documentType,
    layoutFamily: row.layoutFamily,
    config: row.config,
  };
}

function templateInsertValues(
  template: ReturnType<typeof templateValidationError>,
): typeof invoiceTemplatesTable.$inferInsert {
  return {
    id: template.id,
    name: template.name,
    slug: template.slug,
    description: template.description,
    category: template.category,
    status: template.status,
    isDefault: template.isDefault,
    version: template.version,
    documentType: template.documentType,
    layoutFamily: template.layoutFamily,
    config: template.config,
  };
}

async function assertTemplateSlugAvailable(
  transaction: Transaction,
  slug: string,
  exceptId?: string,
): Promise<void> {
  const where = exceptId
    ? and(
        eq(invoiceTemplatesTable.slug, slug),
        ne(invoiceTemplatesTable.id, exceptId),
      )
    : eq(invoiceTemplatesTable.slug, slug);
  const [duplicate] = await transaction
    .select({ id: invoiceTemplatesTable.id })
    .from(invoiceTemplatesTable)
    .where(where)
    .limit(1);
  if (duplicate) throw new Error("Template slug is already in use.");
}

async function getTemplateForUpdate(
  transaction: Transaction,
  templateId: string,
): Promise<TemplateRow> {
  const [template] = await transaction
    .select()
    .from(invoiceTemplatesTable)
    .where(eq(invoiceTemplatesTable.id, templateId))
    .limit(1)
    .for("update");
  if (!template) throw new Error("Invoice template not found.");
  return template;
}

async function insertTemplateDraft(
  transaction: Transaction,
  actorUserId: string,
  input: DocumentTemplateContent & Pick<DocumentTemplate, "documentType">,
  auditAction: "template.create" | "template.duplicate" | "template.import",
) {
  const template = makeTemplateDraft(input);
  await assertTemplateSlugAvailable(transaction, template.slug);
  const [saved] = await transaction
    .insert(invoiceTemplatesTable)
    .values(templateInsertValues(template))
    .returning();
  await writeAudit(transaction, actorUserId, auditAction, "template", template.id, {
    name: template.name,
    slug: template.slug,
  });
  return saved;
}

export async function createInvoiceTemplate(
  actorUserId: string,
  input: InvoiceTemplateContent,
): Promise<TemplateRow> {
  return db.transaction(async (transaction) => {
    await requireTransactionPermission(transaction, actorUserId, "templates", "create");
    return insertTemplateDraft(
      transaction,
      actorUserId,
      { ...input, documentType: "invoice" },
      "template.create",
    );
  });
}

export async function createAdvancedDocumentTemplate(
  actorUserId: string,
  input: AdvancedDocumentTemplateDraft,
): Promise<TemplateRow> {
  return db.transaction(async (transaction) => {
    await requireTransactionPermission(transaction, actorUserId, "templates", "create");
    if (!isRecord(input)) {
      throw new Error("Advanced template input must be an object.");
    }
    return insertTemplateDraft(
      transaction,
      actorUserId,
      {
        name: input.name,
        slug: input.slug,
        description: input.description,
        category: input.category,
        documentType: input.documentType,
        layoutFamily: "advanced",
        config: createAdvancedTemplateConfig(input.documentType, input.pageFormat),
      },
      "template.create",
    );
  });
}

export async function duplicateDocumentTemplate(
  actorUserId: string,
  sourceTemplateId: string,
  input: { name: string; slug: string },
): Promise<TemplateRow> {
  return db.transaction(async (transaction) => {
    await requireTransactionPermission(transaction, actorUserId, "templates", "create");
    if (!isRecord(input)) throw new Error("Duplicate input must be an object.");
    const source = await getTemplateForUpdate(transaction, sourceTemplateId);
    const parsed = templateValidationError(storedTemplateInput(source));
    return insertTemplateDraft(
      transaction,
      actorUserId,
      {
        name: requiredText(input.name, "Template name", 160),
        slug: requiredText(input.slug, "Template slug", 160),
        description: parsed.description,
        category: parsed.category,
        documentType: parsed.documentType,
        layoutFamily: parsed.layoutFamily,
        config: parsed.config,
      },
      "template.duplicate",
    );
  });
}

export async function importDocumentTemplate(
  actorUserId: string,
  input: unknown,
): Promise<TemplateRow> {
  return db.transaction(async (transaction) => {
    await requireTransactionPermission(transaction, actorUserId, "templates", "create");
    const imported = templateValidationError(input);
    return insertTemplateDraft(
      transaction,
      actorUserId,
      {
        name: imported.name,
        slug: imported.slug,
        description: imported.description,
        category: imported.category,
        documentType: imported.documentType,
        layoutFamily: imported.layoutFamily,
        config: imported.config,
      },
      "template.import",
    );
  });
}

export async function updateDocumentTemplate(
  actorUserId: string,
  templateId: string,
  input: Partial<DocumentTemplateContent>,
): Promise<TemplateRow> {
  return db.transaction((transaction) =>
    updateDocumentTemplateInTransaction(transaction, actorUserId, templateId, input),
  );
}

async function updateDocumentTemplateInTransaction(
  transaction: Transaction,
  actorUserId: string,
  templateId: string,
  input: Partial<DocumentTemplateContent>,
): Promise<TemplateRow> {
  await requireTransactionPermission(transaction, actorUserId, "templates", "edit");
  if (!isRecord(input)) throw new Error("Template changes must be an object.");
  const current = await getTemplateForUpdate(transaction, templateId);
  const previous = templateValidationError(storedTemplateInput(current));
  if (Object.hasOwn(input, "slug") && input.slug !== previous.slug) {
    throw new Error("Template slug cannot be changed.");
  }
  const next = templateValidationError({
    ...previous,
    name: Object.hasOwn(input, "name") ? input.name : previous.name,
    slug: previous.slug,
    description: Object.hasOwn(input, "description")
      ? input.description
      : previous.description,
    category: Object.hasOwn(input, "category")
      ? input.category
      : previous.category,
    layoutFamily: Object.hasOwn(input, "layoutFamily")
      ? input.layoutFamily
      : previous.layoutFamily,
    config: Object.hasOwn(input, "config") ? input.config : previous.config,
    id: templateId,
    status: current.status,
    isDefault: current.isDefault,
    version: current.version + 1,
  });
  await assertTemplateSlugAvailable(transaction, next.slug, templateId);
  const { id: _id, ...values } = templateInsertValues(next);
  const [saved] = await transaction
    .update(invoiceTemplatesTable)
    .set({
      ...values,
      updatedAt: new Date(),
    })
    .where(eq(invoiceTemplatesTable.id, templateId))
    .returning();
  await writeAudit(transaction, actorUserId, "template.edit", "template", templateId, {
    changes: Object.keys(input),
    slug: next.slug,
  });
  return saved;
}

async function prepareDocumentTemplatePublication(
  actorUserId: string,
  templateId: string,
): Promise<DocumentTemplate> {
  return db.transaction(async (transaction) => {
    await requireTransactionPermission(
      transaction,
      actorUserId,
      "templates",
      "publish",
    );
    const current = await getTemplateForUpdate(transaction, templateId);
    return templateValidationError(storedTemplateInput(current));
  });
}

export async function publishDocumentTemplate(
  actorUserId: string,
  templateId: string,
): Promise<TemplateRow> {
  const template = await prepareDocumentTemplatePublication(
    actorUserId,
    templateId,
  );
  if (template.layoutFamily === "advanced") {
    await renderAdvancedTemplateForPublication(template);
  }
  return db.transaction((transaction) =>
    publishDocumentTemplateInTransaction(
      transaction,
      actorUserId,
      templateId,
      template.version,
    ),
  );
}

async function publishDocumentTemplateInTransaction(
  transaction: Transaction,
  actorUserId: string,
  templateId: string,
  expectedVersion: number,
): Promise<TemplateRow> {
  await requireTransactionPermission(transaction, actorUserId, "templates", "publish");
  const current = await getTemplateForUpdate(transaction, templateId);
  if (current.version !== expectedVersion) {
    throw new Error(
      "The template changed while its publication preview was rendering. Review and publish again.",
    );
  }
  const template = templateValidationError(storedTemplateInput(current));
  const defaults = await transaction
    .select({ id: invoiceTemplatesTable.id })
    .from(invoiceTemplatesTable)
    .where(
      and(
        eq(invoiceTemplatesTable.documentType, template.documentType),
        eq(invoiceTemplatesTable.status, "published"),
        eq(invoiceTemplatesTable.isDefault, true),
      ),
    )
    .for("update");
  const isDefault =
    current.isDefault ||
    defaults.some(({ id }) => id === templateId) ||
    defaults.length === 0;
  const [saved] = await transaction
    .update(invoiceTemplatesTable)
    .set({ status: "published", isDefault, updatedAt: new Date() })
    .where(eq(invoiceTemplatesTable.id, templateId))
    .returning();
  await writeAudit(transaction, actorUserId, "template.publish", "template", templateId, {
    isDefault,
  });
  return saved;
}

export async function updateAndPublishDocumentTemplate(
  actorUserId: string,
  templateId: string,
  input: Partial<DocumentTemplateContent>,
): Promise<TemplateRow> {
  const updated = await updateDocumentTemplate(
    actorUserId,
    templateId,
    input,
  );
  const template = templateValidationError(
    storedTemplateInput({ ...updated, id: templateId }),
  );
  if (template.layoutFamily === "advanced") {
    await renderAdvancedTemplateForPublication(template);
  }
  return db.transaction((transaction) =>
    publishDocumentTemplateInTransaction(
      transaction,
      actorUserId,
      templateId,
      updated.version,
    ),
  );
}

export async function archiveDocumentTemplate(
  actorUserId: string,
  templateId: string,
): Promise<TemplateRow> {
  return db.transaction(async (transaction) => {
    await requireTransactionPermission(transaction, actorUserId, "templates", "archive");
    const current = await getTemplateForUpdate(transaction, templateId);
    if (current.status === "published" && current.isDefault) {
      throw new Error("Set another published default before archiving this template.");
    }
    const [saved] = await transaction
      .update(invoiceTemplatesTable)
      .set({ status: "archived", isDefault: false, updatedAt: new Date() })
      .where(eq(invoiceTemplatesTable.id, templateId))
      .returning();
    await writeAudit(transaction, actorUserId, "template.archive", "template", templateId);
    return saved;
  });
}

export async function setDefaultDocumentTemplate(
  actorUserId: string,
  templateId: string,
): Promise<TemplateRow> {
  return db.transaction(async (transaction) => {
    await requireTransactionPermission(transaction, actorUserId, "templates", "publish");
    const current = await getTemplateForUpdate(transaction, templateId);
    if (current.status !== "published") {
      throw new Error("Only a published template can be the default.");
    }
    await transaction
      .select({ id: invoiceTemplatesTable.id })
      .from(invoiceTemplatesTable)
      .where(
        and(
          eq(invoiceTemplatesTable.documentType, current.documentType),
          eq(invoiceTemplatesTable.isDefault, true),
        ),
      )
      .for("update");
    await transaction
      .update(invoiceTemplatesTable)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(
        and(
          eq(invoiceTemplatesTable.documentType, current.documentType),
          eq(invoiceTemplatesTable.isDefault, true),
        ),
      );
    const [saved] = await transaction
      .update(invoiceTemplatesTable)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(eq(invoiceTemplatesTable.id, templateId))
      .returning();
    await writeAudit(transaction, actorUserId, "template.set-default", "template", templateId);
    return saved;
  });
}

// Standard-invoice callers are a public compatibility surface.
export const duplicateInvoiceTemplate = duplicateDocumentTemplate;
export const importInvoiceTemplate = importDocumentTemplate;
export const updateInvoiceTemplate = updateDocumentTemplate;
export const publishInvoiceTemplate = publishDocumentTemplate;
export const updateAndPublishInvoiceTemplate =
  updateAndPublishDocumentTemplate;
export const archiveInvoiceTemplate = archiveDocumentTemplate;
export const setDefaultInvoiceTemplate = setDefaultDocumentTemplate;
