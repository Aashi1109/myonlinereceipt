export function getTrustedOrigins(value: string | undefined): string[] {
  if (!value?.trim()) return [];

  return [...new Set(value.split(",").map((origin) => origin.trim()))].map(
    (origin) => {
      let parsed: URL;
      try {
        parsed = new URL(origin);
      } catch {
        throw new Error(`Invalid trusted origin: ${origin}`);
      }

      if (
        !["http:", "https:"].includes(parsed.protocol) ||
        parsed.origin !== origin ||
        parsed.username ||
        parsed.password
      ) {
        throw new Error(`Invalid trusted origin: ${origin}`);
      }

      return parsed.origin;
    },
  );
}

export function safeReturnTo(
  value: string | null | undefined,
  trustedOrigins: readonly string[],
  fallback = "/",
): string {
  if (!value) return fallback;

  if (
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\") &&
    !/%2f|%5c/i.test(value)
  ) {
    return value;
  }

  try {
    const parsed = new URL(value);
    if (
      !parsed.username &&
      !parsed.password &&
      trustedOrigins.includes(parsed.origin)
    ) {
      return parsed.toString();
    }
  } catch {
    // Invalid and non-absolute values fall through to the safe default.
  }

  return fallback;
}

export function normalizeAccountName(value: unknown): string {
  if (typeof value !== "string") throw new Error("Account name is required.");
  const name = value.trim();
  if (!name || name.length > 100) {
    throw new Error("Account name must be between 1 and 100 characters.");
  }
  return name;
}

export function normalizeProfileImage(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || value.length > 2_048) {
    throw new Error("Image URL is invalid.");
  }

  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    throw new Error("Image URL is invalid.");
  }
  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password
  ) {
    throw new Error("Image URL is invalid.");
  }
  return parsed.toString();
}
