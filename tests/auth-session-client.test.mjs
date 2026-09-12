import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

const sessionUrl = new URL("../packages/auth/src/session.ts", import.meta.url).href;
const fixture = {
  session: null,
  rows: [],
  authError: null,
  databaseError: null,
  queries: 0,
  headers: null,
};
globalThis.__smarttoolsSessionTest = fixture;
const moduleUrl = (source) => `data:text/javascript,${encodeURIComponent(source)}`;
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL === sessionUrl && specifier === "./auth.ts") {
      return { shortCircuit: true, url: moduleUrl(`
        const fixture = globalThis.__smarttoolsSessionTest;
        export const auth = { api: { async getSession({ headers }) {
          fixture.headers = headers;
          if (fixture.authError) throw fixture.authError;
          return fixture.session;
        } } };
      `) };
    }
    if (context.parentURL === sessionUrl && specifier === "@smarttools/database") {
      return { shortCircuit: true, url: moduleUrl(`
        const fixture = globalThis.__smarttoolsSessionTest;
        export const authUser = { id: { key: "id" }, status: { key: "status" } };
        export const userRolesTable = { userId: { key: "userId" }, roleId: { key: "roleId" } };
        export const rolesTable = { id: { key: "assignedRoleId" }, access: { key: "access" } };
        export const eq = (column, value) => row => row[column.key] === (value?.key ? row[value.key] : value);
        export const and = (...conditions) => row => conditions.every(condition => condition(row));
        export const db = { select() {
          fixture.queries++;
          let rows = fixture.rows;
          return {
            from() { return this; },
            innerJoin(table, condition) { rows = rows.filter(condition); return this; },
            where(condition) { rows = rows.filter(condition); return this; },
            async limit(count) {
              if (fixture.databaseError) throw fixture.databaseError;
              return rows.slice(0, count);
            },
            then(resolve, reject) {
              return (fixture.databaseError ? Promise.reject(fixture.databaseError) : Promise.resolve(rows)).then(resolve, reject);
            },
          };
        } };
      `) };
    }
    return nextResolve(specifier, context);
  },
});
const { AuthServiceError, getSession, getOptionalSession, isAdminUser } = await import(sessionUrl);
hooks.deregister();

test("account session uses active users' effective Admin entry grants, including custom roles", async (t) => {
  t.after(() => { delete globalThis.__smarttoolsSessionTest; });
  const headers = new Headers({ cookie: "session=test" });
  fixture.session = { session: { id: "session-1" }, user: { id: "user-1", name: "Ashish", status: "active" } };

  for (const [status, roleId, id, access, expected] of [
    ["active", "admin", "user-1", { admin: { enter: true } }, true],
    ["active", "custom", "user-1", { admin: { enter: true }, tools: { view: true } }, true],
    ["active", "user", "user-1", {}, false],
    ["active", "custom", "user-1", { tools: { view: true } }, false],
    ["active", "admin", "user-1", { admin: { enter: false } }, false],
    ["suspended", "custom", "user-1", { admin: { enter: true } }, false],
    ["active", "custom", "other-user", { admin: { enter: true } }, false],
  ]) {
    fixture.session.user.status = status;
    fixture.rows = [{ id, userId: id, status, roleId, assignedRoleId: roleId, access }];
    assert.deepEqual(await getSession(headers), {
      session: { id: "session-1" },
      user: { id: "user-1", name: "Ashish", status, isAdmin: expected },
    });
    assert.equal(await isAdminUser("user-1"), expected);
    assert.equal(fixture.headers, headers);
  }
  fixture.rows = [
    { id: "user-1", userId: "user-1", status: "active", roleId: "user", assignedRoleId: "user", access: {} },
    { id: "user-1", userId: "user-1", status: "active", roleId: "custom", assignedRoleId: "custom", access: { admin: { enter: true } } },
  ];
  assert.equal(await isAdminUser("user-1"), true, "entry permission may come from any assigned role");
  fixture.rows[1].access = { admin: { enter: false } };
  assert.equal(await isAdminUser("user-1"), false, "revocation is reflected on the next lookup");
  fixture.rows = [];
  assert.equal((await getSession(headers)).user.isAdmin, false);

  fixture.session = null;
  const queries = fixture.queries;
  assert.equal(await getSession(headers), null);
  assert.equal(fixture.queries, queries);

  fixture.authError = new Error("auth unavailable");
  await assert.rejects(getSession(headers), error =>
    error instanceof AuthServiceError && error.cause === fixture.authError);
  assert.equal(await getOptionalSession(headers), null);
  fixture.authError = null;
  fixture.session = { session: { id: "session-1" }, user: { id: "user-1", name: "Ashish" } };
  fixture.databaseError = new Error("database unavailable");
  await assert.rejects(getSession(headers), error =>
    error instanceof AuthServiceError && error.cause === fixture.databaseError);
  assert.equal(await getOptionalSession(headers), null);
});
