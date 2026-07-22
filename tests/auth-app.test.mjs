import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_AUTH_ERROR,
  canConfirmAccountDeletion,
  getSafeAuthError,
  isEmailVerificationError,
  isValidPassword,
  normalizeProfileImage,
  resolveReturnTo,
} from "../apps/auth/src/lib/security.ts";

const redirectPolicy = {
  baseURL: "https://auth.smarttools.test",
  trustedOrigins:
    "https://platform.smarttools.test,https://paperwork.smarttools.test",
  fallback: "https://platform.smarttools.test",
};

test("auth return URLs allow local paths and exact configured origins only", () => {
  assert.equal(resolveReturnTo("/profile", redirectPolicy), "/profile");
  assert.equal(
    resolveReturnTo(
      "https://paperwork.smarttools.test/invoice-generator",
      redirectPolicy,
    ),
    "https://paperwork.smarttools.test/invoice-generator",
  );

  for (const unsafe of [
    "//evil.test",
    "/%2fevil.test",
    "https://paperwork.smarttools.test.evil.test/",
    "https://user@paperwork.smarttools.test/",
  ]) {
    assert.equal(
      resolveReturnTo(unsafe, redirectPolicy),
      "https://platform.smarttools.test/",
    );
  }
});

test("auth errors never expose server or provider details", () => {
  const secret = "postgres://admin:password@database.internal";

  assert.equal(getSafeAuthError({ message: secret }), DEFAULT_AUTH_ERROR);
  assert.doesNotMatch(getSafeAuthError({ message: secret }), /postgres|password/);
  assert.equal(
    getSafeAuthError({ code: "TOO_MANY_REQUESTS" }),
    "Too many attempts. Try again in a few minutes.",
  );
  assert.equal(
    isEmailVerificationError({ code: "EMAIL_NOT_VERIFIED" }),
    true,
  );
});

test("account inputs enforce password, image, and deletion boundaries", () => {
  assert.equal(isValidPassword("a".repeat(11)), false);
  assert.equal(isValidPassword("a".repeat(12)), true);
  assert.equal(isValidPassword("a".repeat(128)), true);
  assert.equal(isValidPassword("a".repeat(129)), false);

  assert.equal(normalizeProfileImage(""), null);
  assert.equal(
    normalizeProfileImage(" https://images.example/avatar.png "),
    "https://images.example/avatar.png",
  );
  assert.throws(() => normalizeProfileImage("javascript:alert(1)"));

  assert.equal(
    canConfirmAccountDeletion(" Person@Example.com ", "person@example.com"),
    true,
  );
  assert.equal(
    canConfirmAccountDeletion("other@example.com", "person@example.com"),
    false,
  );
});
