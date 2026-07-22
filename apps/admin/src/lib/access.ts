import { getAuthServiceURL, getSession } from "@smarttools/auth/session";
import {
  AuthorizationError,
  requirePermission,
} from "@smarttools/control-plane";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

function adminURL(): string {
  return process.env.ADMIN_URL ?? "http://localhost:3003";
}

function authEntryUrl(): string {
  const adminUrl = adminURL();
  const url = new URL("/", getAuthServiceURL(adminUrl));
  url.searchParams.set("returnTo", adminUrl);
  return url.toString();
}

export async function getActorUserId(): Promise<string> {
  const session = await getSession(await headers(), adminURL());
  if (!session) redirect(authEntryUrl());
  return session.user.id;
}

export async function requirePagePermission(
  resource: string,
  action: string,
) {
  const session = await getSession(await headers(), adminURL());
  if (!session) redirect(authEntryUrl());

  try {
    await requirePermission(session.user.id, resource, action);
  } catch (error) {
    if (error instanceof AuthorizationError) redirect("/denied");
    throw error;
  }

  return session;
}
