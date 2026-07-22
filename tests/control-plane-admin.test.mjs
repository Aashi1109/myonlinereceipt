import assert from "node:assert/strict";
import test from "node:test";

import { ADMIN_ACCESS } from "../packages/authorization/src/index.ts";
import {
  auditEventsTable,
  authSession,
  authUser,
  db,
  featureOverridesTable,
  invoiceTemplatesTable,
  managedToolsTable,
  rolesTable,
  userRolesTable,
} from "../packages/database/src/index.ts";
import { seedTemplates } from "../packages/invoice-templates/src/index.ts";
import { toolManifest } from "../packages/tool-catalog/src/index.ts";
import {
  archiveInvoiceTemplate,
  assignUserRoles,
  createCustomRole,
  createInvoiceTemplate,
  deleteCustomRole,
  duplicateInvoiceTemplate,
  importInvoiceTemplate,
  publishInvoiceTemplate,
  redactAuditMetadata,
  reorderManagedTools,
  setDefaultInvoiceTemplate,
  setFeatureEnabled,
  setManagedToolArchived,
  setManagedToolEnabled,
  setUserStatus,
  updateAndPublishInvoiceTemplate,
  updateCustomRole,
  updateFeature,
  updateInvoiceTemplate,
  updateManagedTool,
} from "../apps/admin/src/lib/adminMutations.ts";

function permissionRows(access) {
  return [
    {
      status: "active",
      roleId: "test-role",
      roleName: "Test role",
      roleDescription: "Test permissions.",
      roleAccess: {
        ...access,
        admin: { enter: true, ...access.admin },
      },
      roleIsSystem: false,
    },
  ];
}

function createFakeTransaction(selectResults) {
  const state = { inserts: [], updates: [], deletes: [] };

  function select() {
    const result = selectResults.shift();
    const chain = {
      from: () => chain,
      leftJoin: () => chain,
      innerJoin: () => chain,
      where: () => chain,
      limit: () => chain,
      for: () => chain,
      then: (resolve, reject) =>
        result === undefined
          ? Promise.reject(new Error("Unexpected database read")).then(
              resolve,
              reject,
            )
          : Promise.resolve(result).then(resolve, reject),
    };
    return chain;
  }

  function mutation(kind, table, values) {
    const entry = { table, values };
    state[kind].push(entry);
    const rows = Array.isArray(values) ? values : [values];
    const chain = {
      values(nextValues) {
        entry.values = nextValues;
        return mutationChain(kind, entry, nextValues);
      },
      set(nextValues) {
        entry.values = nextValues;
        return mutationChain(kind, entry, nextValues);
      },
      where: () => chain,
      returning: () => Promise.resolve(rows),
      then: (resolve, reject) => Promise.resolve([]).then(resolve, reject),
    };
    return chain;
  }

  function mutationChain(kind, entry, values) {
    const rows = Array.isArray(values) ? values : [values];
    const chain = {
      onConflictDoNothing: () => chain,
      onConflictDoUpdate: () => chain,
      where: () => chain,
      returning: () => Promise.resolve(rows),
      then: (resolve, reject) => Promise.resolve([]).then(resolve, reject),
    };
    return chain;
  }

  return {
    state,
    transaction: {
      select,
      insert: (table) => mutation("inserts", table),
      update: (table) => mutation("updates", table),
      delete: (table) => mutation("deletes", table),
    },
  };
}

async function withFakeDatabase(selectResults, callback) {
  const originalTransaction = db.transaction;
  const fake = createFakeTransaction([...selectResults]);
  db.transaction = async (operation) => operation(fake.transaction);
  try {
    return await callback(fake.state);
  } finally {
    db.transaction = originalTransaction;
  }
}

function accessWithout(resource, action) {
  const access = structuredClone(ADMIN_ACCESS);
  delete access[resource][action];
  return access;
}

function templateContent(overrides = {}) {
  const template = seedTemplates[0];
  return {
    name: template.name,
    slug: `test-${template.slug}`,
    description: template.description,
    category: template.category,
    layoutFamily: template.layoutFamily,
    config: structuredClone(template.config),
    ...overrides,
  };
}

function templateRow(overrides = {}) {
  const template = seedTemplates[0];
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
    config: structuredClone(template.config),
    isPremium: false,
    requiredPlan: "free",
    createdAt: new Date(template.createdAt),
    updatedAt: new Date(template.updatedAt),
    ...overrides,
  };
}

test("every privileged mutation checks its exact PostgreSQL permission", async () => {
  const featureManifest = [
    {
      app: "paperwork",
      key: "new-editor",
      defaultName: "New editor",
      defaultDescription: "Controls the new editor.",
    },
  ];
  const cases = [
    ["tools.edit", () => updateManagedTool("actor", "paperwork.invoice-generator", {})],
    ["tools.edit", () => reorderManagedTools("actor", "paperwork", [])],
    ["tools.toggle", () => setManagedToolEnabled("actor", "paperwork.invoice-generator", true)],
    ["tools.archive", () => setManagedToolArchived("actor", "paperwork.invoice-generator", true)],
    ["features.edit", () => updateFeature("actor", "paperwork", "new-editor", {}, featureManifest)],
    ["features.toggle", () => setFeatureEnabled("actor", "paperwork", "new-editor", true, featureManifest)],
    ["users.assignRoles", () => assignUserRoles("actor", "target", ["user"])],
    ["users.suspend", () => setUserStatus("actor", "target", "suspended")],
    ["roles.create", () => createCustomRole("actor", { name: "Editor", description: "Edits templates." })],
    ["roles.edit", () => updateCustomRole("actor", "role", {})],
    ["roles.delete", () => deleteCustomRole("actor", "role")],
    ["templates.create", () => createInvoiceTemplate("actor", {})],
    ["templates.create", () => duplicateInvoiceTemplate("actor", "template", { name: "Copy", slug: "copy" })],
    ["templates.create", () => importInvoiceTemplate("actor", {})],
    ["templates.edit", () => updateInvoiceTemplate("actor", "template", {})],
    ["templates.publish", () => publishInvoiceTemplate("actor", "template")],
    ["templates.archive", () => archiveInvoiceTemplate("actor", "template")],
    ["templates.publish", () => setDefaultInvoiceTemplate("actor", "template")],
  ];

  for (const [permission, invoke] of cases) {
    const [resource, action] = permission.split(".");
    await withFakeDatabase(
      [permissionRows(accessWithout(resource, action))],
      async (state) => {
        await assert.rejects(invoke, new RegExp(`Missing permission: ${permission.replace(".", "\\.")}`));
        assert.deepEqual(state, { inserts: [], updates: [], deletes: [] });
      },
    );
  }
});

test("audit metadata recursively redacts authentication material", () => {
  assert.deepEqual(
    redactAuditMetadata({
      changed: ["name", "accessToken"],
      password: "hunter2",
      nested: {
        refreshToken: "token-value",
        cookie_header: "session=secret",
        oauthProvider: "google",
        safe: true,
      },
    }),
    {
      changed: ["name", "accessToken"],
      password: "[REDACTED]",
      nested: {
        refreshToken: "[REDACTED]",
        cookie_header: "[REDACTED]",
        oauthProvider: "google",
        safe: true,
      },
    },
  );
});

test("tool setup validates and stores a code-owned slug with its audit event", async () => {
  await withFakeDatabase(
    [permissionRows({ tools: { edit: true } }), [], []],
    async (state) => {
      await updateManagedTool("actor", "devtools.json-formatter", {
        slug: "json-formatter",
        name: "JSON Formatter",
        description: "Format and validate JSON.",
      });

      const toolWrite = state.inserts.find(
        ({ table }) => table === managedToolsTable,
      );
      const auditWrite = state.inserts.find(
        ({ table }) => table === auditEventsTable,
      );
      assert.equal(toolWrite.values.app, "devtools");
      assert.equal(toolWrite.values.slug, "json-formatter");
      assert.equal(auditWrite.values.action, "tool.edit");
      assert.equal(auditWrite.values.actorUserId, "actor");
    },
  );
});

test("tool reordering stores one contiguous app order and one audit event", async () => {
  const toolIds = [
    "paperwork.receipt-generator",
    "paperwork.invoice-generator",
    "paperwork.expense-report",
    "paperwork.mileage-log",
    "paperwork.quarterly-tax-estimator",
    "paperwork.w9-request",
    "paperwork.1099-nec-tracker",
  ];

  await withFakeDatabase(
    [permissionRows({ tools: { edit: true } }), []],
    async (state) => {
      await reorderManagedTools("actor", "paperwork", toolIds);

      assert.deepEqual(
        toolIds.map((toolId) =>
          state.inserts.find(
            ({ table, values }) =>
              table === managedToolsTable && values.toolId === toolId,
          ).values.order,
        ),
        toolIds.map((_, order) => order),
      );
      const auditWrite = state.inserts.find(
        ({ table }) => table === auditEventsTable,
      );
      assert.equal(auditWrite.values.action, "tool.reorder");
      assert.equal(auditWrite.values.targetId, "paperwork");
    },
  );
});

test("tool reordering accepts the complete Media registry", async () => {
  const toolIds = toolManifest
    .filter((tool) => tool.app === "media")
    .map((tool) => tool.id)
    .reverse();

  await withFakeDatabase(
    [permissionRows({ tools: { edit: true } }), []],
    async (state) => {
      await reorderManagedTools("actor", "media", toolIds);

      assert.equal(toolIds.length, 30);
      assert.deepEqual(
        toolIds.map((toolId) =>
          state.inserts.find(
            ({ table, values }) =>
              table === managedToolsTable && values.toolId === toolId,
          ).values.order,
        ),
        toolIds.map((_, order) => order),
      );
    },
  );
});

test("tool reordering rejects incomplete, duplicate, and cross-app orders", async () => {
  const invalidOrders = [
    [],
    [
      "paperwork.invoice-generator",
      "paperwork.invoice-generator",
      "paperwork.expense-report",
      "paperwork.mileage-log",
      "paperwork.quarterly-tax-estimator",
      "paperwork.w9-request",
      "paperwork.1099-nec-tracker",
    ],
    [
      "paperwork.invoice-generator",
      "paperwork.receipt-generator",
      "paperwork.expense-report",
      "paperwork.mileage-log",
      "paperwork.quarterly-tax-estimator",
      "paperwork.w9-request",
      "devtools.json-formatter",
    ],
  ];

  for (const toolIds of invalidOrders) {
    await withFakeDatabase(
      [permissionRows({ tools: { edit: true } })],
      async (state) => {
        await assert.rejects(
          () => reorderManagedTools("actor", "paperwork", toolIds),
          /every registered paperwork tool exactly once/,
        );
        assert.deepEqual(state, { inserts: [], updates: [], deletes: [] });
      },
    );
  }
});

test("a saved tool slug is immutable and failed changes are not audited", async () => {
  const stored = {
    toolId: "devtools.json-formatter",
    app: "devtools",
    slug: "json-formatter",
    name: "JSON Formatter",
    description: "Format JSON.",
    order: 0,
    enabled: true,
    archived: false,
  };

  await withFakeDatabase(
    [permissionRows({ tools: { edit: true } }), [stored]],
    async (state) => {
      await assert.rejects(
        () =>
          updateManagedTool("actor", stored.toolId, {
            slug: "json-prettifier",
          }),
        /slug is immutable/,
      );
      assert.deepEqual(state, { inserts: [], updates: [], deletes: [] });
    },
  );
});

test("seeded tools can be toggled before their first override and archiving disables them", async () => {
  await withFakeDatabase(
    [permissionRows({ tools: { toggle: true } }), []],
    async (state) => {
      await setManagedToolEnabled(
        "actor",
        "devtools.json-formatter",
        true,
      );
      const write = state.inserts.find(
        ({ table }) => table === managedToolsTable,
      );
      assert.equal(write.values.slug, "json-formatter");
      assert.equal(write.values.enabled, true);
    },
  );

  const stored = {
    toolId: "devtools.json-formatter",
    app: "devtools",
    slug: "json-formatter",
    name: "JSON Formatter",
    description: "Format JSON.",
    order: 0,
    enabled: true,
    archived: false,
  };
  await withFakeDatabase(
    [permissionRows({ tools: { archive: true } }), [stored]],
    async (state) => {
      await setManagedToolArchived("actor", stored.toolId, true);
      const write = state.inserts.find(
        ({ table }) => table === managedToolsTable,
      );
      assert.equal(write.values.archived, true);
      assert.equal(write.values.enabled, false);
      assert.equal(
        state.inserts.find(({ table }) => table === auditEventsTable).values
          .action,
        "tool.archive",
      );
    },
  );

  await withFakeDatabase(
    [
      permissionRows({ tools: { toggle: true } }),
      [{ ...stored, archived: true }],
    ],
    async (state) => {
      await assert.rejects(
        () => setManagedToolEnabled("actor", stored.toolId, true),
        /archived tool cannot be enabled/,
      );
      assert.deepEqual(state, { inserts: [], updates: [], deletes: [] });
    },
  );

  await withFakeDatabase(
    [permissionRows({ tools: { toggle: true } }), [stored]],
    async (state) => {
      await setManagedToolEnabled("actor", stored.toolId, false);
      assert.equal(
        state.inserts.find(({ table }) => table === managedToolsTable).values
          .enabled,
        false,
      );
    },
  );
});

test("tool edits reject invalid ownership, slugs, and text", async () => {
  const cases = [
    [
      [{ app: "paperwork" }],
      { name: "Valid" },
      /ownership does not match/,
    ],
    [[], { slug: "Admin" }, /slug is invalid or reserved/],
    [[], { name: " " }, /Tool name is required/],
  ];
  for (const [storedRows, input, error] of cases) {
    await withFakeDatabase(
      [permissionRows({ tools: { edit: true } }), storedRows],
      async (state) => {
        await assert.rejects(
          () =>
            updateManagedTool("actor", "devtools.json-formatter", input),
          error,
        );
        assert.deepEqual(state, { inserts: [], updates: [], deletes: [] });
      },
    );
  }
});

test("unregistered feature keys cannot create overrides", async () => {
  await withFakeDatabase(
    [permissionRows({ features: { edit: true } })],
    async (state) => {
      await assert.rejects(
        () => updateFeature("actor", "paperwork", "unknown", {}, []),
        /Unknown feature/,
      );
      assert.deepEqual(state, { inserts: [], updates: [], deletes: [] });
    },
  );
});

test("registered features default disabled and preserve metadata when toggled", async () => {
  const manifest = [
    {
      app: "paperwork",
      key: "new-editor",
      defaultName: "New editor",
      defaultDescription: "Controls the new editor.",
    },
  ];
  await withFakeDatabase(
    [permissionRows({ features: { edit: true } }), []],
    async (state) => {
      await updateFeature(
        "actor",
        "paperwork",
        "new-editor",
        { name: "Invoice editor" },
        manifest,
      );
      const write = state.inserts.find(
        ({ table }) => table === featureOverridesTable,
      );
      assert.equal(write.values.name, "Invoice editor");
      assert.equal(write.values.description, "Controls the new editor.");
      assert.equal(write.values.enabled, false);
    },
  );

  await withFakeDatabase(
    [
      permissionRows({ features: { toggle: true } }),
      [
        {
          app: "paperwork",
          key: "new-editor",
          name: "Invoice editor",
          description: "Controls the new editor.",
          enabled: false,
        },
      ],
    ],
    async (state) => {
      await setFeatureEnabled(
        "actor",
        "paperwork",
        "new-editor",
        true,
        manifest,
      );
      const write = state.inserts.find(
        ({ table }) => table === featureOverridesTable,
      );
      assert.equal(write.values.name, "Invoice editor");
      assert.equal(write.values.enabled, true);
    },
  );
});

test("suspension blocks the final admin and otherwise revokes sessions atomically", async () => {
  const target = {
    id: "target",
    name: "Target",
    email: "target@example.com",
    image: null,
    status: "active",
  };

  await withFakeDatabase(
    [
      permissionRows({ users: { suspend: true } }),
      [target],
      [{ roleId: "admin" }],
      [{ userId: "target", status: "active" }],
    ],
    async (state) => {
      await assert.rejects(
        () => setUserStatus("actor", "target", "suspended"),
        /final Admin/,
      );
      assert.deepEqual(state, { inserts: [], updates: [], deletes: [] });
    },
  );

  await withFakeDatabase(
    [
      permissionRows({ users: { suspend: true } }),
      [target],
      [{ roleId: "user" }],
    ],
    async (state) => {
      await setUserStatus("actor", "target", "suspended");
      assert.equal(
        state.updates.find(({ table }) => table === authUser).values.status,
        "suspended",
      );
      assert.ok(state.deletes.some(({ table }) => table === authSession));
      assert.equal(
        state.inserts.find(({ table }) => table === auditEventsTable).values
          .action,
        "user.suspend",
      );
    },
  );
});

test("role assignment keeps the default user role and protects the final admin", async () => {
  const target = {
    id: "target",
    name: "Target",
    email: "target@example.com",
    image: null,
    status: "active",
  };
  await withFakeDatabase(
    [
      permissionRows({ users: { assignRoles: true } }),
      [target],
      [{ roleId: "user" }],
      [{ id: "user" }, { id: "editor" }],
    ],
    async (state) => {
      assert.deepEqual(
        await assignUserRoles("actor", "target", ["editor", "editor"]),
        ["user", "editor"],
      );
      assert.deepEqual(
        state.inserts.find(({ table }) => table === userRolesTable).values,
        [{ userId: "target", roleId: "editor" }],
      );
      assert.equal(
        state.deletes.some(({ table }) => table === userRolesTable),
        false,
      );
    },
  );

  await withFakeDatabase(
    [
      permissionRows({ users: { assignRoles: true } }),
      [target],
      [{ roleId: "user" }, { roleId: "admin" }],
      [{ id: "user" }],
      [{ userId: "target", status: "active" }],
    ],
    async (state) => {
      await assert.rejects(
        () => assignUserRoles("actor", "target", ["user"]),
        /final Admin/,
      );
      assert.deepEqual(state, { inserts: [], updates: [], deletes: [] });
    },
  );

  await withFakeDatabase(
    [
      permissionRows({ users: { assignRoles: true } }),
      [target],
      [{ roleId: "user" }],
      [{ id: "user" }],
    ],
    async (state) => {
      assert.deepEqual(
        await assignUserRoles("actor", "target", ["user"]),
        ["user"],
      );
      assert.deepEqual(state, { inserts: [], updates: [], deletes: [] });
    },
  );

  await withFakeDatabase(
    [
      permissionRows({ users: { assignRoles: true } }),
      [target],
      [{ roleId: "user" }],
      [{ id: "user" }],
    ],
    async (state) => {
      await assert.rejects(
        () => assignUserRoles("actor", "target", ["missing"]),
        /roles do not exist/,
      );
      assert.deepEqual(state, { inserts: [], updates: [], deletes: [] });
    },
  );

  await withFakeDatabase(
    [
      permissionRows({ users: { assignRoles: true } }),
      [target],
      [{ roleId: "user" }, { roleId: "editor" }],
      [{ id: "user" }],
    ],
    async (state) => {
      await assignUserRoles("actor", "target", ["user"]);
      assert.ok(state.deletes.some(({ table }) => table === userRolesTable));
      assert.equal(
        state.inserts.some(({ table }) => table === userRolesTable),
        false,
      );
    },
  );
});

test("inactive actors and invalid user statuses fail before mutation", async () => {
  await withFakeDatabase([[]], async (state) => {
    await assert.rejects(
      () => createCustomRole("actor", { name: "Role", description: "Role." }),
      /Access denied/,
    );
    assert.deepEqual(state, { inserts: [], updates: [], deletes: [] });
  });

  await withFakeDatabase(
    [permissionRows({ users: { suspend: true } })],
    async (state) => {
      await assert.rejects(
        () => setUserStatus("actor", "target", "deleted"),
        /must be active or suspended/,
      );
      assert.deepEqual(state, { inserts: [], updates: [], deletes: [] });
    },
  );
});

test("custom roles start empty and assigned roles cannot be deleted", async () => {
  await withFakeDatabase(
    [permissionRows({ roles: { create: true } })],
    async (state) => {
      await createCustomRole("actor", {
        name: "Template editor",
        description: "Edits invoice templates.",
      });
      const roleWrite = state.inserts.find(({ table }) => table === rolesTable);
      assert.deepEqual(roleWrite.values.access, {});
      assert.equal(roleWrite.values.isSystem, false);
      assert.ok(state.inserts.some(({ table }) => table === auditEventsTable));
    },
  );

  await withFakeDatabase(
    [
      permissionRows({ roles: { delete: true } }),
      [
        {
          id: "editor",
          name: "Editor",
          description: "Edits templates.",
          access: {},
          isSystem: false,
        },
      ],
      [{ userId: "target" }],
    ],
    async (state) => {
      await assert.rejects(
        () => deleteCustomRole("actor", "editor"),
        /assigned to users/,
      );
      assert.deepEqual(state, { inserts: [], updates: [], deletes: [] });
    },
  );
});

test("custom role edits validate access and unassigned custom roles can be deleted", async () => {
  const role = {
    id: "editor",
    name: "Editor",
    description: "Edits templates.",
    access: {},
    isSystem: false,
  };
  await withFakeDatabase(
    [permissionRows({ roles: { edit: true } }), [role]],
    async (state) => {
      await updateCustomRole("actor", role.id, {
        description: "Edits and publishes templates.",
        access: { templates: { edit: true, publish: true } },
      });
      const write = state.updates.find(({ table }) => table === rolesTable);
      assert.deepEqual(write.values.access, {
        templates: { edit: true, publish: true },
      });
      assert.ok(state.inserts.some(({ table }) => table === auditEventsTable));
    },
  );

  await withFakeDatabase(
    [permissionRows({ roles: { delete: true } }), [role], []],
    async (state) => {
      await deleteCustomRole("actor", role.id);
      assert.ok(state.deletes.some(({ table }) => table === rolesTable));
      assert.ok(state.inserts.some(({ table }) => table === auditEventsTable));
    },
  );
});

test("template creation uses shared validation and starts as a non-default draft", async () => {
  await withFakeDatabase(
    [permissionRows({ templates: { create: true } }), []],
    async (state) => {
      await createInvoiceTemplate("actor", templateContent());
      const templateWrite = state.inserts.find(
        ({ table }) => table === invoiceTemplatesTable,
      );
      assert.equal(templateWrite.values.status, "draft");
      assert.equal(templateWrite.values.isDefault, false);
      assert.ok(state.inserts.some(({ table }) => table === auditEventsTable));
    },
  );

  await withFakeDatabase(
    [permissionRows({ templates: { create: true } })],
    async (state) => {
      await assert.rejects(
        () => createInvoiceTemplate("actor", templateContent({ name: "x" })),
        /Template name must be at least 2 characters/,
      );
      assert.deepEqual(state, { inserts: [], updates: [], deletes: [] });
    },
  );
});

test("template duplicate, import, and edit stay validated and audited", async () => {
  const source = templateRow();
  await withFakeDatabase(
    [permissionRows({ templates: { create: true } }), [source], []],
    async (state) => {
      await duplicateInvoiceTemplate("actor", source.id, {
        name: "Classic copy",
        slug: "classic-copy",
      });
      const write = state.inserts.find(
        ({ table }) => table === invoiceTemplatesTable,
      );
      assert.equal(write.values.name, "Classic copy");
      assert.equal(write.values.status, "draft");
    },
  );

  await withFakeDatabase(
    [permissionRows({ templates: { create: true } }), []],
    async (state) => {
      await importInvoiceTemplate("actor", {
        ...seedTemplates[1],
        slug: "imported-modern",
      });
      assert.equal(
        state.inserts.find(({ table }) => table === auditEventsTable).values
          .action,
        "template.import",
      );
    },
  );

  await withFakeDatabase(
    [permissionRows({ templates: { edit: true } }), [source], []],
    async (state) => {
      await updateInvoiceTemplate("actor", source.id, {
        name: "Classic updated",
      });
      const write = state.updates.find(
        ({ table }) => table === invoiceTemplatesTable,
      );
      assert.equal(write.values.name, "Classic updated");
      assert.equal(write.values.version, source.version + 1);
    },
  );

  await withFakeDatabase(
    [permissionRows({ templates: { edit: true } }), [source]],
    async (state) => {
      await assert.rejects(
        () => updateInvoiceTemplate("actor", source.id, { slug: "changed-slug" }),
        /Template slug cannot be changed/,
      );
      assert.equal(state.updates.length, 0);
    },
  );
});

test("template publication maintains one default and protects it from archival", async () => {
  const draft = templateRow({ status: "draft", isDefault: false });
  await withFakeDatabase(
    [permissionRows({ templates: { publish: true } }), [draft], []],
    async (state) => {
      await publishInvoiceTemplate("actor", draft.id);
      const write = state.updates.find(
        ({ table }) => table === invoiceTemplatesTable,
      );
      assert.equal(write.values.status, "published");
      assert.equal(write.values.isDefault, true);
    },
  );

  const published = templateRow({ id: "other", isDefault: false });
  await withFakeDatabase(
    [permissionRows({ templates: { publish: true } }), [published], []],
    async (state) => {
      await setDefaultInvoiceTemplate("actor", published.id);
      const templateUpdates = state.updates.filter(
        ({ table }) => table === invoiceTemplatesTable,
      );
      assert.equal(templateUpdates.length, 2);
      assert.equal(templateUpdates[0].values.isDefault, false);
      assert.equal(templateUpdates[1].values.isDefault, true);
    },
  );

  const currentDefault = templateRow({ isDefault: true });
  await withFakeDatabase(
    [permissionRows({ templates: { archive: true } }), [currentDefault]],
    async (state) => {
      await assert.rejects(
        () => archiveInvoiceTemplate("actor", currentDefault.id),
        /Set another published default/,
      );
      assert.deepEqual(state, { inserts: [], updates: [], deletes: [] });
    },
  );

  await withFakeDatabase(
    [
      permissionRows({ templates: { archive: true } }),
      [templateRow({ id: "old", isDefault: false })],
    ],
    async (state) => {
      await archiveInvoiceTemplate("actor", "old");
      assert.equal(
        state.updates.find(({ table }) => table === invoiceTemplatesTable)
          .values.status,
        "archived",
      );
    },
  );

  await withFakeDatabase(
    [
      permissionRows({ templates: { publish: true } }),
      [templateRow({ id: "draft", status: "draft", isDefault: false })],
    ],
    async (state) => {
      await assert.rejects(
        () => setDefaultInvoiceTemplate("actor", "draft"),
        /Only a published template/,
      );
      assert.deepEqual(state, { inserts: [], updates: [], deletes: [] });
    },
  );
});

test("template update and publish commit through one mutation transaction", async () => {
  const source = templateRow({ status: "draft", isDefault: false });
  const updated = templateRow({
    ...source,
    name: "Published update",
    version: source.version + 1,
  });

  await withFakeDatabase(
    [
      permissionRows({ templates: { edit: true, publish: true } }),
      [source],
      [],
      permissionRows({ templates: { edit: true, publish: true } }),
      [updated],
      [],
    ],
    async (state) => {
      await updateAndPublishInvoiceTemplate("actor", source.id, {
        name: updated.name,
      });
      const templateUpdates = state.updates.filter(
        ({ table }) => table === invoiceTemplatesTable,
      );
      assert.equal(templateUpdates.length, 2);
      assert.equal(templateUpdates[0].values.name, updated.name);
      assert.equal(templateUpdates[1].values.status, "published");
    },
  );
});
