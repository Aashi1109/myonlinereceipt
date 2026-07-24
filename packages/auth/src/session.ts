import { auth } from "./auth.ts";

export type AuthServiceSession = {
  session: { id: string };
  user: { id: string; name: string };
};

export class AuthServiceError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "AuthServiceError";
  }
}

export async function getSession(
  requestHeaders: Headers,
): Promise<AuthServiceSession | null> {
  let session;
  try {
    session = await auth.api.getSession({ headers: requestHeaders });
  } catch (cause) {
    throw new AuthServiceError("Authentication is unavailable.", {
      cause,
    });
  }

  if (!session) return null;

  return {
    session: { id: session.session.id },
    user: { id: session.user.id, name: session.user.name },
  };
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
