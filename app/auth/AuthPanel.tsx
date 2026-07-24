"use client";

import { useId, useState } from "react";
import type { FormEvent } from "react";
import { AlertBanner, Button, Card, Field, Input } from "@smarttools/ui";
import { authClient } from "./_lib/authClient";
import {
  getSafeAuthError,
  isEmailVerificationError,
  isValidPassword,
} from "./_lib/security";

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
      redirectTo: `/auth/reset-password?returnTo=${encodeURIComponent(returnTo)}`,
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
      aria-labelledby={`${panelId}-title`}
      className="w-full max-w-lg rounded-none p-6 shadow-none sm:p-8"
      role="region"
    >
      {mode !== "forgot" && (
        <div
          aria-label="Account access mode"
          className="-mx-6 -mt-6 mb-7 grid grid-cols-2 border-b border-border bg-background sm:-mx-8 sm:-mt-8"
          role="group"
        >
          <button
            aria-pressed={mode === "sign-in"}
            className={`border-b-2 px-3 py-4 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:cursor-wait disabled:opacity-60 ${
              mode === "sign-in"
                ? "border-primary bg-card text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            disabled={pending}
            onClick={() => chooseMode("sign-in")}
            type="button"
          >
            Sign in
          </button>
          <button
            aria-pressed={mode === "sign-up"}
            className={`border-b-2 px-3 py-4 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:cursor-wait disabled:opacity-60 ${
              mode === "sign-up"
                ? "border-primary bg-card text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            disabled={pending}
            onClick={() => chooseMode("sign-up")}
            type="button"
          >
            Create account
          </button>
        </div>
      )}

      <div id={`${panelId}-panel`}>
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">
            {mode === "sign-up"
              ? "New account"
              : mode === "forgot"
                ? "Account recovery"
                : "Account access"}
          </p>
          <h2
            className="mt-2 text-2xl font-black tracking-tight text-foreground sm:text-3xl"
            id={`${panelId}-title`}
          >
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
          <AlertBanner className="mt-5 rounded-none" variant={feedback.kind}>
            {feedback.text}
          </AlertBanner>
        )}

        {verificationEmail && (
          <AlertBanner
            action={
              <Button
                disabled={pending}
                className="min-h-11 rounded-none"
                onClick={resendVerification}
                size="sm"
                type="button"
                variant="ghost"
              >
                Resend verification email
              </Button>
            }
            className="mt-5 rounded-none"
          >
            Verification needed for{" "}
            <span className="break-all font-semibold">{verificationEmail}</span>
          </AlertBanner>
        )}

        {mode === "forgot" ? (
          <form className="mt-6" onSubmit={requestRecovery}>
            <fieldset
              className="grid min-w-0 gap-4 border-0 p-0"
              disabled={pending}
            >
              <legend className="sr-only">Password recovery</legend>
              <Field htmlFor={`${panelId}-recovery-email`} label="Email address">
                <Input
                  autoComplete="email"
                  className="h-12 rounded-none"
                  id={`${panelId}-recovery-email`}
                  name="email"
                  required
                  type="email"
                />
              </Field>
              <Button className="w-full rounded-none" size="lg" type="submit">
                {pending ? "Sending…" : "Send reset link"}
              </Button>
              <Button
                className="min-h-11 justify-self-center rounded-none"
                onClick={() => chooseMode("sign-in")}
                type="button"
                variant="ghost"
              >
                Back to sign in
              </Button>
            </fieldset>
          </form>
        ) : (
          <>
            <Button
              className="mt-6 w-full rounded-none"
              disabled={pending}
              onClick={signInWithGoogle}
              size="lg"
              type="button"
              variant="outline"
            >
              <img
                alt=""
                className="size-4 object-contain"
                height="16"
                src="/auth/google-g-logo.png"
                width="16"
              />
              Continue with Google
            </Button>
            <div className="my-5 flex items-center gap-3 text-xs font-semibold text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              <span>or use email</span>
              <span className="h-px flex-1 bg-border" />
            </div>
            <form onSubmit={submitCredentials}>
              <fieldset
                className="grid min-w-0 gap-4 border-0 p-0"
                disabled={pending}
              >
                <legend className="sr-only">
                  {mode === "sign-up"
                    ? "Create account with email"
                    : "Sign in with email"}
                </legend>
                {mode === "sign-up" && (
                  <Field htmlFor={`${panelId}-name`} label="Name">
                    <Input
                      autoComplete="name"
                      className="h-12 rounded-none"
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
                    className="h-12 rounded-none"
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
                    autoComplete={
                      mode === "sign-up" ? "new-password" : "current-password"
                    }
                    className="h-12 rounded-none"
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
                      className="h-12 rounded-none"
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
                    className="min-h-11 justify-self-end rounded-none px-0"
                    onClick={() => chooseMode("forgot")}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    Forgot password?
                  </Button>
                )}
                <Button
                  className="w-full rounded-none"
                  size="lg"
                  type="submit"
                >
                  {pending
                    ? "Please wait…"
                    : mode === "sign-up"
                      ? "Create account"
                      : "Sign in"}
                </Button>
              </fieldset>
            </form>
          </>
        )}
      </div>

      <p className="mt-6 text-left text-xs leading-5 text-muted-foreground">
        Authentication cookies are HttpOnly and never stored in browser storage.
      </p>
    </Card>
  );
}
