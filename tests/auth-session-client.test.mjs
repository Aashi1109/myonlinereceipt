import assert from "node:assert/strict";
import test from "node:test";
import {
  AuthServiceError,
  getAuthServiceURL,
  getOptionalSession,
  getSession,
} from "../packages/auth/src/session.ts";

test("the auth session client forwards cookies and validates the service response", async (context) => {
  const originalFetch = globalThis.fetch;

  context.after(() => {
    globalThis.fetch = originalFetch;
  });

  assert.equal(
    getAuthServiceURL("https://paperwork.smarttools.test"),
    "https://auth.smarttools.test",
  );
  assert.equal(
    getAuthServiceURL("http://localhost:3001"),
    "http://localhost:3004",
  );
  assert.equal(
    getAuthServiceURL("http://localhost:3005"),
    "http://localhost:3004",
  );
  assert.equal(
    getAuthServiceURL("https://media.smarttools.test"),
    "https://auth.smarttools.test",
  );
  assert.equal(
    getAuthServiceURL("https://paperwork.smarttools.co.uk"),
    "https://auth.smarttools.co.uk",
  );
  assert.throws(
    () => getAuthServiceURL("http://paperwork.smarttools.test"),
    AuthServiceError,
  );

  let request;
  globalThis.fetch = async (input, init) => {
    request = { input: input.toString(), init };
    return Response.json({
      session: { id: "session-1", token: "not-exposed" },
      user: { id: "user-1", name: "Maya", email: "maya@example.test" },
    });
  };

  const session = await getSession(
    new Headers({ authorization: "do-not-forward", cookie: "smarttools.session=abc" }),
    "https://paperwork.smarttools.test",
  );

  assert.deepEqual(session, {
    session: { id: "session-1" },
    user: { id: "user-1", name: "Maya" },
  });
  assert.equal(
    request.input,
    "https://auth.smarttools.test/api/auth/get-session?disableRefresh=true",
  );
  assert.deepEqual(request.init.headers, {
    accept: "application/json",
    cookie: "smarttools.session=abc",
  });
  assert.equal(request.init.cache, "no-store");
  assert.equal(request.init.redirect, "error");
  assert.ok(request.init.signal instanceof AbortSignal);

  globalThis.fetch = async () => Response.json({ user: { id: "user-1" } });
  await assert.rejects(
    getSession(new Headers(), "https://paperwork.smarttools.test"),
    (error) => error instanceof AuthServiceError,
  );
  assert.equal(
    await getOptionalSession(
      new Headers(),
      "https://paperwork.smarttools.test",
    ),
    null,
  );
});
