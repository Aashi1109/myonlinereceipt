"use client";

import { useId, useState } from "react";
import type { FormEvent } from "react";
import { AlertBanner, Button, Card, Field, Input } from "@smarttools/ui";
import { authClient } from "../lib/authClient";
import {
  getSafeAuthError,
  isEmailVerificationError,
  isValidPassword,
} from "../lib/security";

type Mode = "sign-in" | "sign-up" | "forgot";
type Feedback = { kind: "error" | "success"; text: string } | null;

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export function AuthPanel({
  returnTo,
  initialError,
}: {
  returnTo: string;
  initialError?: string;
}) {
  const panelId = useId();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [pending, setPending] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState<string>();
  const [feedback, setFeedback] = useState<Feedback>(
    initialError ? { kind: "error", text: initialError } : null,
  );

  function chooseMode(nextMode: Mode) {
    setMode(nextMode);
    setFeedback(null);
    setVerificationEmail(undefined);
  }

  async function submitCredentials(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setFeedback(null);

    const form = new FormData(event.currentTarget);
    const email = field(form, "email").toLowerCase();
    const password = field(form, "password");

    if (!email || !password) {
      setFeedback({ kind: "error", text: "Enter your email and password." });
      setPending(false);
      return;
    }

    if (mode === "sign-up") {
      const name = field(form, "name");
      const confirmation = field(form, "passwordConfirmation");
      if (!name || name.length > 100) {
        setFeedback({ kind: "error", text: "Enter a name under 100 characters." });
        setPending(false);
        return;
      }
      if (!isValidPassword(password)) {
        setFeedback({ kind: "error", text: "Use 12 to 128 characters for your password." });
        setPending(false);
        return;
      }
      if (password !== confirmation) {
        setFeedback({ kind: "error", text: "Passwords do not match." });
        setPending(false);
        return;
      }

      const result = await authClient.signUp.email({
        name,
        email,
        password,
        callbackURL: returnTo,
      });
      if (result.error) {
        setFeedback({ kind: "error", text: getSafeAuthError(result.error) });
      } else {
        setVerificationEmail(email);
        setFeedback({
          kind: "success",
          text: "Check your inbox to verify your email before signing in.",
        });
      }
      setPending(false);
      return;
    }

    const result = await authClient.signIn.email({
      email,
      password,
      callbackURL: returnTo,
    });
    if (result.error) {
      if (isEmailVerificationError(result.error)) setVerificationEmail(email);
      setFeedback({ kind: "error", text: getSafeAuthError(result.error) });
      setPending(false);
      return;
    }

    window.location.assign(returnTo);
  }

  async function signInWithGoogle() {
    setPending(true);
    setFeedback(null);
    const result = await authClient.signIn.social({
      provider: "google",
      callbackURL: returnTo,
    });
    if (result.error) {
      setFeedback({ kind: "error", text: getSafeAuthError(result.error) });
      setPending(false);
    }
  }

  async function requestRecovery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setFeedback(null);
    const email = field(new FormData(event.currentTarget), "email").toLowerCase();
    if (!email) {
      setFeedback({ kind: "error", text: "Enter your email address." });
      setPending(false);
      return;
    }

    await authClient.requestPasswordReset({
      email,
      redirectTo: `/reset-password?returnTo=${encodeURIComponent(returnTo)}`,
    });
    setFeedback({
      kind: "success",
      text: "If that account exists, a password-reset link is on its way.",
    });
    setPending(false);
  }

  async function resendVerification() {
    if (!verificationEmail) return;
    setPending(true);
    await authClient.sendVerificationEmail({
      email: verificationEmail,
      callbackURL: returnTo,
    });
    setFeedback({
      kind: "success",
      text: "If the account still needs verification, a new link is on its way.",
    });
    setPending(false);
  }

  return (
    <Card
      aria-label="SmartTools account access"
      className="w-full p-6 shadow-lg sm:p-8"
    >
      {mode !== "forgot" && (
        <div
          aria-label="Account access"
          className="-mx-6 -mt-6 mb-7 grid grid-cols-2 border-b border-border sm:-mx-8 sm:-mt-8"
          role="tablist"
        >
          <button
            aria-controls={`${panelId}-panel`}
            aria-selected={mode === "sign-in"}
            className={`border-b-2 px-3 py-4 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
              mode === "sign-in"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            id={`${panelId}-sign-in-tab`}
            onClick={() => chooseMode("sign-in")}
            role="tab"
            type="button"
          >
            Sign in
          </button>
          <button
            aria-controls={`${panelId}-panel`}
            aria-selected={mode === "sign-up"}
            className={`border-b-2 px-3 py-4 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
              mode === "sign-up"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            id={`${panelId}-sign-up-tab`}
            onClick={() => chooseMode("sign-up")}
            role="tab"
            type="button"
          >
            Create account
          </button>
        </div>
      )}

      <div
        aria-labelledby={
          mode === "forgot" ? undefined : `${panelId}-${mode}-tab`
        }
        id={`${panelId}-panel`}
        role={mode === "forgot" ? undefined : "tabpanel"}
      >
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">
            {mode === "forgot" ? "Account recovery" : "Welcome"}
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            {mode === "sign-up"
              ? "Create your account"
              : mode === "forgot"
                ? "Reset your password"
                : "Sign in to SmartTools"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {mode === "forgot"
              ? "We’ll email a time-limited reset link if the account exists."
              : "Use email and password, or continue with Google."}
          </p>
        </div>

        {feedback && (
          <AlertBanner className="mt-5" variant={feedback.kind}>
            {feedback.text}
          </AlertBanner>
        )}

        {verificationEmail && (
          <AlertBanner
            action={
              <Button
                disabled={pending}
                onClick={resendVerification}
                size="sm"
                type="button"
                variant="ghost"
              >
                Resend verification email
              </Button>
            }
            className="mt-5"
          >
            Verification needed for {verificationEmail}
          </AlertBanner>
        )}

        {mode === "forgot" ? (
          <form className="mt-6 grid gap-4" onSubmit={requestRecovery}>
            <Field htmlFor={`${panelId}-recovery-email`} label="Email address">
              <Input
                autoComplete="email"
                className="h-12"
                id={`${panelId}-recovery-email`}
                name="email"
                required
                type="email"
              />
            </Field>
            <Button className="w-full" disabled={pending} size="lg" type="submit">
              {pending ? "Sending…" : "Send reset link"}
            </Button>
            <Button
              className="justify-self-center"
              onClick={() => chooseMode("sign-in")}
              type="button"
              variant="ghost"
            >
              Back to sign in
            </Button>
          </form>
        ) : (
          <>
            <Button
              className="mt-6 w-full"
              disabled={pending}
              onClick={signInWithGoogle}
              size="lg"
              type="button"
              variant="outline"
            >
              <span
                aria-hidden="true"
                className="grid size-6 shrink-0 place-items-center rounded-full border border-border bg-white"
              >
                <img
                  alt=""
                  className="size-4 object-contain"
                  height="16"
                  src="/google-g-logo.png"
                  width="16"
                />
              </span>
              Continue with Google
            </Button>
            <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              <span>or use email</span>
              <span className="h-px flex-1 bg-border" />
            </div>
            <form className="grid gap-4" onSubmit={submitCredentials}>
              {mode === "sign-up" && (
                <Field htmlFor={`${panelId}-name`} label="Name">
                  <Input
                    autoComplete="name"
                    className="h-12"
                    id={`${panelId}-name`}
                    maxLength={100}
                    name="name"
                    required
                  />
                </Field>
              )}
              <Field htmlFor={`${panelId}-email`} label="Email address">
                <Input
                  autoComplete="email"
                  className="h-12"
                  id={`${panelId}-email`}
                  name="email"
                  required
                  type="email"
                />
              </Field>
              <Field
                description={mode === "sign-up" ? "12–128 characters" : undefined}
                htmlFor={`${panelId}-password`}
                label="Password"
              >
                <Input
                  autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                  className="h-12"
                  id={`${panelId}-password`}
                  maxLength={128}
                  minLength={mode === "sign-up" ? 12 : undefined}
                  name="password"
                  required
                  type="password"
                />
              </Field>
              {mode === "sign-up" && (
                <Field
                  htmlFor={`${panelId}-password-confirmation`}
                  label="Confirm password"
                >
                  <Input
                    autoComplete="new-password"
                    className="h-12"
                    id={`${panelId}-password-confirmation`}
                    maxLength={128}
                    minLength={12}
                    name="passwordConfirmation"
                    required
                    type="password"
                  />
                </Field>
              )}
              {mode === "sign-in" && (
                <Button
                  className="justify-self-end px-0"
                  onClick={() => chooseMode("forgot")}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Forgot password?
                </Button>
              )}
              <Button className="w-full" disabled={pending} size="lg" type="submit">
                {pending ? "Please wait…" : mode === "sign-up" ? "Create account" : "Sign in"}
              </Button>
            </form>
          </>
        )}
      </div>

      <p className="mt-6 text-center text-xs leading-5 text-muted-foreground">
        Authentication cookies are HttpOnly and never stored in browser storage.
      </p>
    </Card>
  );
}
