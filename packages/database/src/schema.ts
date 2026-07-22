import type { Access } from "@smarttools/authorization";
import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const anonymousUsersTable = pgTable("users", {
  id: text("id").primaryKey(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const keyValuePairTable = pgTable(
  "key_value_pairs",
  {
    userId: text("user_id").notNull(),
    key: text("key").notNull(),
    value: jsonb("value").notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.key] })],
);

export const vendorProfilesTable = pgTable(
  "vendor_profiles",
  {
    userId: text("user_id").notNull(),
    id: text("id").notNull(),
    legalName: text("legal_name").notNull(),
    businessName: text("business_name"),
    email: text("email"),
    phone: text("phone"),
    addressLine1: text("address_line1"),
    city: text("city"),
    state: text("state"),
    zipCode: text("zip_code"),
    entityType: text("entity_type").default("Unknown").notNull(),
    w9Status: text("w9_status").default("Not Requested").notNull(),
    notes: text("notes"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.id] })],
);

export const invoiceTemplatesTable = pgTable(
  "invoice_templates",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    category: text("category").notNull(),
    status: text("status").notNull(),
    isDefault: boolean("is_default").default(false).notNull(),
    version: integer("version").default(1).notNull(),
    documentType: text("document_type").default("invoice").notNull(),
    layoutFamily: text("layout_family").notNull(),
    config: jsonb("config").notNull(),
    isPremium: boolean("is_premium").default(false).notNull(),
    requiredPlan: text("required_plan").default("free").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("invoice_templates_slug_unique").on(table.slug),
    uniqueIndex("invoice_templates_published_default_unique")
      .on(table.isDefault)
      .where(sql`${table.isDefault} = true AND ${table.status} = 'published'`),
  ],
);

export const authUser = pgTable(
  "auth_users",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    status: text("status").$type<"active" | "suspended">().default("active").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("auth_users_email_unique").on(table.email)],
);

export const authSession = pgTable(
  "auth_sessions",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => authUser.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("auth_sessions_token_unique").on(table.token),
    index("auth_sessions_user_idx").on(table.userId),
  ],
);

export const authAccount = pgTable(
  "auth_accounts",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => authUser.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("auth_accounts_provider_account_unique").on(
      table.providerId,
      table.accountId,
    ),
    index("auth_accounts_user_idx").on(table.userId),
  ],
);

export const authVerification = pgTable(
  "auth_verifications",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("auth_verifications_identifier_idx").on(table.identifier)],
);

export const rolesTable = pgTable(
  "roles",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    access: jsonb("access").$type<Access>().default({}).notNull(),
    isSystem: boolean("is_system").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("roles_name_unique").on(table.name)],
);

export const userRolesTable = pgTable(
  "user_roles",
  {
    userId: text("user_id")
      .notNull()
      .references(() => authUser.id, { onDelete: "cascade" }),
    roleId: text("role_id")
      .notNull()
      .references(() => rolesTable.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.roleId] })],
);

export const managedToolsTable = pgTable(
  "managed_tools",
  {
    toolId: text("tool_id").primaryKey(),
    app: text("app").$type<"paperwork" | "devtools">().notNull(),
    slug: text("slug"),
    name: text("name").notNull(),
    description: text("description").notNull(),
    order: integer("sort_order").default(0).notNull(),
    enabled: boolean("enabled").default(false).notNull(),
    archived: boolean("archived").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [unique("managed_tools_app_slug_unique").on(table.app, table.slug)],
);

export const featureOverridesTable = pgTable(
  "feature_overrides",
  {
    key: text("key").notNull(),
    app: text("app").$type<"paperwork" | "devtools">().notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    enabled: boolean("enabled").default(false).notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.app, table.key] })],
);

export const auditEventsTable = pgTable(
  "audit_events",
  {
    id: text("id").primaryKey(),
    actorUserId: text("actor_user_id").notNull(),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("audit_events_created_idx").on(table.createdAt)],
);

export const usersTable = anonymousUsersTable;

