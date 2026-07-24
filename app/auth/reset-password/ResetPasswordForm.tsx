"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import {
  AlertBanner,
  Button,
  Card,
  Field,
  Input,
  buttonVariants,
} from "@smarttools/ui";
import { authClient } from "../_lib/authClient";
import { getSafeAuthError, isValidPassword } from "../_lib/security";

export function ResetPasswordForm({
  token,
  returnTo,
}: {
  token?: string;
  returnTo: string;
}) {
  const [pending, setPending] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get("password") ?? "");
    const confirmation = String(form.get("passwordConfirmation") ?? "");
    if (!isValidPassword(newPassword)) {
      setError("Use 12 to 128 characters for your password.");
      return;
    }
    if (newPassword !== confirmation) {
      setError("Passwords do not match.");
      return;
    }

    setPending(true);
    setError(undefined);
    const result = await authClient.resetPassword({ newPassword, token });
    if (result.error) {
      setError(getSafeAuthError(result.error));
      setPending(false);
      return;
    }

    setComplete(true);
    setPending(false);
  }

  if (!token) {
    return (
      <Card className="w-full max-w-lg p-6 shadow-lg sm:p-8">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">
          Invalid link
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">
          Request a new reset email.
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          This reset link is missing, invalid, or has expired.
        </p>
        <a
          className={buttonVariants({ className: "mt-6 w-full", size: "lg" })}
          href="/auth"
        >
          Return to account recovery
        </a>
      </Card>
    );
  }

  if (complete) {
    return (
      <Card className="w-full max-w-lg p-6 shadow-lg sm:p-8">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">
          Password updated
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">
          Your new password is ready.
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Sign in again. Other sessions were revoked when the reset completed.
        </p>
        <a
          className={buttonVariants({ className: "mt-6 w-full", size: "lg" })}
          href={`/auth?returnTo=${encodeURIComponent(returnTo)}`}
        >
          Continue to sign in
        </a>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg p-6 shadow-lg sm:p-8">
      <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">
        Account recovery
      </p>
      <h1 className="mt-2 text-3xl font-black tracking-tight">
        Choose a new password.
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Use 12–128 characters. Resetting revokes your existing sessions.
      </p>
      {error && (
        <AlertBanner className="mt-5" variant="error">
          {error}
        </AlertBanner>
      )}
      <form className="mt-6 grid gap-4" onSubmit={submit}>
        <Field
          description="12–128 characters"
          htmlFor="new-password"
          label="New password"
        >
          <Input
            autoComplete="new-password"
            className="h-12"
            id="new-password"
            maxLength={128}
            minLength={12}
            name="password"
            required
            type="password"
          />
        </Field>
        <Field htmlFor="confirm-new-password" label="Confirm new password">
          <Input
            autoComplete="new-password"
            className="h-12"
            id="confirm-new-password"
            maxLength={128}
            minLength={12}
            name="passwordConfirmation"
            required
            type="password"
          />
        </Field>
        <Button className="w-full" disabled={pending} size="lg" type="submit">
          {pending ? "Updating…" : "Update password"}
        </Button>
      </form>
    </Card>
  );
}
