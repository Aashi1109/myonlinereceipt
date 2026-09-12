import { hasPermission, mergeRoleAccess } from "@smarttools/authorization";
import { and, authUser, db, eq, rolesTable, userRolesTable } from "@smarttools/database";
import { auth } from "./auth.ts";

export type AuthServiceSession = {
  session: { id: string };
  user: { id: string; name: string; status: string; isAdmin?: boolean };
};

export async function isAdminUser(userId: string): Promise<boolean> {
  const roles = await db
    .select({ access: rolesTable.access })
    .from(authUser)
    .innerJoin(userRolesTable, eq(userRolesTable.userId, authUser.id))
    .innerJoin(rolesTable, eq(rolesTable.id, userRolesTable.roleId))
    .where(
      and(
        eq(authUser.id, userId),
        eq(authUser.status, "active"),
      ),
    );
  return hasPermission(mergeRoleAccess(roles), "admin", "enter");
}

export class AuthServiceError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "AuthServiceError";
  }
}

export async function getSession(
  requestHeaders: Headers,
): Promise<AuthServiceSession | null> {
  try {
    const session = await auth.api.getSession({
      headers: requestHeaders,
      query: { disableCookieCache: true },
    });
    if (!session) return null;

    return {
      session: { id: session.session.id },
      user: {
        id: session.user.id,
        name: session.user.name,
        status: session.user.status === "active" ? "active" : "suspended",
        isAdmin: await isAdminUser(session.user.id),
      },
    };
  } catch (cause) {
    throw new AuthServiceError("Authentication is unavailable.", {
      cause,
    });
  }
}

export async function getOptionalSession(
  requestHeaders: Headers,
): Promise<AuthServiceSession | null> {
  try {
    return await getSession(requestHeaders);
  } catch (error) {
    if (error instanceof AuthServiceError) return null;
    throw error;
  }
}
