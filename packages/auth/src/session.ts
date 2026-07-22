const APP_SUBDOMAINS = new Set([
  "admin",
  "auth",
  "devtools",
  "media",
  "paperwork",
  "platform",
  "www",
]);
const LOCAL_AUTH_PORT = "3004";
const SESSION_REQUEST_TIMEOUT_MS = 5_000;

type RequestHeaders = Pick<Headers, "get">;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isLoopback(hostname: string): boolean {
  return ["localhost", "127.0.0.1", "[::1]"].includes(hostname);
}

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

export function getAuthServiceURL(applicationURL: string): string {
  let url: URL;
  try {
    url = new URL(applicationURL);
  } catch (cause) {
    throw new AuthServiceError(
      "The application URL must be an absolute HTTP or HTTPS origin.",
      { cause },
    );
  }

  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    (url.protocol === "http:" && !isLoopback(url.hostname))
  ) {
    throw new AuthServiceError(
      "The application URL must be an HTTPS origin or a local HTTP origin.",
    );
  }

  if (isLoopback(url.hostname)) {
    url.port = LOCAL_AUTH_PORT;
    return url.origin;
  }

  const labels = url.hostname.split(".");
  const parentDomain =
    labels.length > 2 && APP_SUBDOMAINS.has(labels[0])
      ? labels.slice(1).join(".")
      : url.hostname;
  url.hostname = `auth.${parentDomain}`;
  url.port = "";
  return url.origin;
}

export async function getSession(
  requestHeaders: RequestHeaders,
  applicationURL: string,
): Promise<AuthServiceSession | null> {
  // ponytail: RSC consumers cannot relay Set-Cookie; keep reads non-mutating
  // until Auth is exposed through a browser-visible gateway.
  const endpoint = new URL(
    "/api/auth/get-session?disableRefresh=true",
    getAuthServiceURL(applicationURL),
  );

  let response: Response;
  try {
    response = await fetch(endpoint, {
      cache: "no-store",
      headers: {
        accept: "application/json",
        cookie: requestHeaders.get("cookie") ?? "",
      },
      redirect: "error",
      signal: AbortSignal.timeout(SESSION_REQUEST_TIMEOUT_MS),
    });
  } catch (cause) {
    throw new AuthServiceError("Authentication service is unavailable.", {
      cause,
    });
  }

  if (!response.ok) {
    throw new AuthServiceError("Authentication service is unavailable.");
  }

  let value: unknown;
  try {
    value = await response.json();
  } catch (cause) {
    throw new AuthServiceError(
      "Authentication service returned an invalid response.",
      { cause },
    );
  }

  if (value === null) return null;
  if (
    !isRecord(value) ||
    !isRecord(value.session) ||
    typeof value.session.id !== "string" ||
    !value.session.id ||
    !isRecord(value.user) ||
    typeof value.user.id !== "string" ||
    !value.user.id ||
    typeof value.user.name !== "string"
  ) {
    throw new AuthServiceError(
      "Authentication service returned an invalid response.",
    );
  }

  return {
    session: { id: value.session.id },
    user: { id: value.user.id, name: value.user.name },
  };
}

export async function getOptionalSession(
  requestHeaders: RequestHeaders,
  applicationURL: string,
): Promise<AuthServiceSession | null> {
  try {
    return await getSession(requestHeaders, applicationURL);
  } catch (error) {
    if (error instanceof AuthServiceError) return null;
    throw error;
  }
}
