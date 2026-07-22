"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  AlertBanner,
  Button,
  Checkbox,
  DangerZone,
  Field,
  Input,
  SectionCard,
  SectionHeading,
  StatusBadge,
  ToolPageHeader,
} from "@smarttools/ui";
import { authClient } from "../../lib/authClient";
import {
  canConfirmAccountDeletion,
  getSafeAuthError,
  isValidPassword,
  normalizeProfileImage,
} from "../../lib/security";

type AccountResult = Awaited<ReturnType<typeof authClient.listAccounts>>;
type SessionResult = Awaited<ReturnType<typeof authClient.listSessions>>;
type LinkedAccount = NonNullable<AccountResult["data"]>[number];
type ActiveSession = NonNullable<SessionResult["data"]>[number];
type Feedback = { kind: "error" | "success"; text: string } | null;

function LoadingState({ label }: { label: string }) {
  return (
    <div
      className="flex items-center justify-center gap-3 py-10 text-sm text-muted-foreground"
      role="status"
    >
      <span
        aria-hidden="true"
        className="size-4 animate-spin rounded-full border-2 border-border border-t-primary"
      />
      {label}
    </div>
  );
}

type InitialUser = {
  name: string;
  email: string;
  image: string | null;
  emailVerified: boolean;
};

function value(form: FormData, name: string): string {
  const field = form.get(name);
  return typeof field === "string" ? field : "";
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function providerName(providerId: string): string {
  if (providerId === "credential") return "Email and password";
  if (providerId === "google") return "Google";
  return providerId;
}

export function ProfileManager({
  initialUser,
  currentSessionId,
}: {
  initialUser: InitialUser;
  currentSessionId: string;
}) {
  const { data: liveSession, refetch } = authClient.useSession();
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loadingSecurity, setLoadingSecurity] = useState(true);
  const [pending, setPending] = useState<string>();
  const [feedback, setFeedback] = useState<Feedback>(null);

  const user = liveSession?.user ?? initialUser;
  const hasPassword = accounts.some(
    (account) => account.providerId === "credential",
  );
  const googleAccount = accounts.find(
    (account) => account.providerId === "google",
  );

  const loadSecurityData = useCallback(async () => {
    setLoadingSecurity(true);
    const [accountResult, sessionResult] = await Promise.all([
      authClient.listAccounts(),
      authClient.listSessions(),
    ]);

    if (accountResult.data) setAccounts(accountResult.data);
    if (sessionResult.data) setSessions(sessionResult.data);
    if (accountResult.error || sessionResult.error) {
      setFeedback({
        kind: "error",
        text: getSafeAuthError(accountResult.error ?? sessionResult.error),
      });
    }
    setLoadingSecurity(false);
  }, []);

  useEffect(() => {
    void loadSecurityData();
  }, [loadSecurityData]);

  async function updateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = value(form, "name").trim();
    if (!name || name.length > 100) {
      setFeedback({ kind: "error", text: "Enter a name under 100 characters." });
      return;
    }

    let image: string | null;
    try {
      image = normalizeProfileImage(value(form, "image"));
    } catch (error) {
      setFeedback({
        kind: "error",
        text: error instanceof Error ? error.message : "Enter a valid image URL.",
      });
      return;
    }

    setPending("profile");
    setFeedback(null);
    const result = await authClient.updateUser({ name, image });
    if (result.error) {
      setFeedback({ kind: "error", text: getSafeAuthError(result.error) });
    } else {
      await refetch();
      setFeedback({ kind: "success", text: "Profile updated." });
    }
    setPending(undefined);
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const currentPassword = value(form, "currentPassword");
    const newPassword = value(form, "newPassword");
    const confirmation = value(form, "passwordConfirmation");
    if (!isValidPassword(newPassword)) {
      setFeedback({ kind: "error", text: "Use 12 to 128 characters for your password." });
      return;
    }
    if (newPassword !== confirmation) {
      setFeedback({ kind: "error", text: "Passwords do not match." });
      return;
    }

    setPending("password");
    setFeedback(null);
    const result = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    });
    if (result.error) {
      setFeedback({ kind: "error", text: getSafeAuthError(result.error) });
    } else {
      formElement.reset();
      await loadSecurityData();
      setFeedback({
        kind: "success",
        text: "Password changed and other sessions revoked.",
      });
    }
    setPending(undefined);
  }

  async function linkGoogle() {
    setPending("google");
    setFeedback(null);
    const result = await authClient.linkSocial({
      provider: "google",
      callbackURL: "/profile",
    });
    if (result.error) {
      setFeedback({ kind: "error", text: getSafeAuthError(result.error) });
      setPending(undefined);
    }
  }

  async function unlinkGoogle() {
    if (!googleAccount || accounts.length < 2) return;
    setPending("google");
    setFeedback(null);
    const result = await authClient.unlinkAccount({
      providerId: googleAccount.providerId,
      accountId: googleAccount.accountId,
    });
    if (result.error) {
      setFeedback({ kind: "error", text: getSafeAuthError(result.error) });
    } else {
      await loadSecurityData();
      setFeedback({ kind: "success", text: "Google account unlinked." });
    }
    setPending(undefined);
  }

  async function revokeSession(session: ActiveSession) {
    setPending(`session:${session.id}`);
    setFeedback(null);
    const result = await authClient.revokeSession({ token: session.token });
    if (result.error) {
      setFeedback({ kind: "error", text: getSafeAuthError(result.error) });
    } else {
      await loadSecurityData();
      setFeedback({ kind: "success", text: "Session revoked." });
    }
    setPending(undefined);
  }

  async function revokeOtherSessions() {
    setPending("other-sessions");
    setFeedback(null);
    const result = await authClient.revokeOtherSessions();
    if (result.error) {
      setFeedback({ kind: "error", text: getSafeAuthError(result.error) });
    } else {
      await loadSecurityData();
      setFeedback({ kind: "success", text: "Other sessions revoked." });
    }
    setPending(undefined);
  }

  async function signOut() {
    setPending("sign-out");
    const result = await authClient.signOut();
    if (result.error) {
      setFeedback({ kind: "error", text: getSafeAuthError(result.error) });
      setPending(undefined);
      return;
    }
    window.location.assign("/");
  }

  async function requestDeletion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const confirmation = value(new FormData(event.currentTarget), "confirmation");
    if (!user.emailVerified || !canConfirmAccountDeletion(confirmation, user.email)) {
      setFeedback({
        kind: "error",
        text: "Verify the account and enter its email address exactly.",
      });
      return;
    }

    setPending("delete");
    setFeedback(null);
    const result = await authClient.deleteUser({ callbackURL: "/" });
    if (result.error) {
      setFeedback({ kind: "error", text: getSafeAuthError(result.error) });
    } else {
      setFeedback({
        kind: "success",
        text: "Check your verified email to confirm permanent account deletion.",
      });
    }
    setPending(undefined);
  }

  return (
    <>
      <ToolPageHeader
        actions={
          <Button
            disabled={Boolean(pending)}
            onClick={signOut}
            type="button"
            variant="outline"
          >
            {pending === "sign-out" ? "Signing out…" : "Sign out"}
          </Button>
        }
        className="pt-16"
        description={user.email}
        eyebrow="Account center"
        title="Manage your SmartTools account."
      />

      {feedback && (
        <AlertBanner className="mb-6 max-w-3xl" variant={feedback.kind}>
          {feedback.text}
        </AlertBanner>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard aria-label="Profile">
          <SectionHeading
            description="Your display details across SmartTools."
            eyebrow="01"
            title="Profile"
          />
          <form className="grid gap-4" onSubmit={updateProfile}>
            <Field htmlFor="profile-name" label="Name">
              <Input
                defaultValue={user.name}
                id="profile-name"
                maxLength={100}
                name="name"
                required
              />
            </Field>
            <Field htmlFor="profile-image" label="Image URL">
              <Input
                defaultValue={user.image ?? ""}
                id="profile-image"
                inputMode="url"
                maxLength={2048}
                name="image"
                placeholder="https://example.com/avatar.png"
                type="url"
              />
            </Field>
            <Button className="w-fit" disabled={Boolean(pending)} type="submit">
              {pending === "profile" ? "Saving…" : "Save profile"}
            </Button>
          </form>
        </SectionCard>

        <SectionCard aria-label="Sign-in identities">
          <SectionHeading
            description="Google and password methods linked to this account."
            eyebrow="02"
            title="Sign-in identities"
          />
          {loadingSecurity ? (
            <LoadingState label="Loading identities…" />
          ) : (
            <ul className="grid gap-3">
              {accounts.map((account) => (
                <li
                  className="flex min-w-0 items-center justify-between gap-4 rounded-lg border border-border bg-muted/30 p-4"
                  key={account.id}
                >
                  <div className="grid min-w-0 gap-1">
                    <strong className="truncate text-sm">
                      {providerName(account.providerId)}
                    </strong>
                    <span className="text-xs text-muted-foreground">
                      Connected {formatDate(account.createdAt)}
                    </span>
                  </div>
                  {account.providerId === "google" && accounts.length > 1 && (
                    <Button
                      className="text-destructive"
                      disabled={Boolean(pending)}
                      onClick={unlinkGoogle}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      Unlink
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {!googleAccount && (
            <Button
              className="w-full"
              disabled={Boolean(pending)}
              onClick={linkGoogle}
              type="button"
              variant="outline"
            >
              {pending === "google" ? "Connecting…" : "Link Google account"}
            </Button>
          )}
          {googleAccount && accounts.length === 1 && (
            <p className="text-xs leading-5 text-muted-foreground">
              Add another sign-in method before unlinking your only identity.
            </p>
          )}
        </SectionCard>

        <SectionCard aria-label="Password">
          <SectionHeading
            description="Changing it signs out your other devices."
            eyebrow="03"
            title="Password"
          />
          {loadingSecurity ? (
            <LoadingState label="Checking password access…" />
          ) : hasPassword ? (
            <form className="grid gap-4" onSubmit={changePassword}>
              <Field htmlFor="current-password" label="Current password">
                <Input
                  autoComplete="current-password"
                  id="current-password"
                  name="currentPassword"
                  required
                  type="password"
                />
              </Field>
              <Field
                description="12–128 characters"
                htmlFor="profile-new-password"
                label="New password"
              >
                <Input
                  autoComplete="new-password"
                  id="profile-new-password"
                  maxLength={128}
                  minLength={12}
                  name="newPassword"
                  required
                  type="password"
                />
              </Field>
              <Field
                htmlFor="profile-confirm-password"
                label="Confirm new password"
              >
                <Input
                  autoComplete="new-password"
                  id="profile-confirm-password"
                  maxLength={128}
                  minLength={12}
                  name="passwordConfirmation"
                  required
                  type="password"
                />
              </Field>
              <Button className="w-fit" disabled={Boolean(pending)} type="submit">
                {pending === "password" ? "Updating…" : "Change password"}
              </Button>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">
              This account currently signs in through Google.
            </p>
          )}
        </SectionCard>

        <SectionCard aria-label="Active sessions" className="lg:col-span-2">
          <SectionHeading
            action={
              sessions.length > 1 ? (
                <Button
                  disabled={Boolean(pending)}
                  onClick={revokeOtherSessions}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Revoke others
                </Button>
              ) : undefined
            }
            description="Review devices with access to your account."
            eyebrow="04"
            title="Active sessions"
          />
          {loadingSecurity ? (
            <LoadingState label="Loading sessions…" />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {sessions.map((session) => {
                const isCurrent = session.id === currentSessionId;
                return (
                  <li
                    className="flex min-w-0 items-start justify-between gap-4 rounded-lg border border-border bg-muted/30 p-4"
                    key={session.id}
                  >
                    <div className="grid min-w-0 gap-1">
                      <strong className="text-sm">
                        {isCurrent ? "This device" : session.userAgent || "Unknown device"}
                      </strong>
                      <span className="break-words text-xs leading-5 text-muted-foreground">
                        {session.ipAddress || "IP unavailable"} · Started {formatDate(session.createdAt)}
                      </span>
                    </div>
                    {isCurrent ? (
                      <StatusBadge variant="success">Current</StatusBadge>
                    ) : (
                      <Button
                        className="text-destructive"
                        disabled={Boolean(pending)}
                        onClick={() => revokeSession(session)}
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        {pending === `session:${session.id}` ? "Revoking…" : "Revoke"}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        <DangerZone aria-label="Delete account" className="space-y-6 lg:col-span-2">
          <SectionHeading
            description="Permanently remove your account after email confirmation."
            eyebrow="05"
            title="Delete account"
          />
          <form className="grid gap-4" onSubmit={requestDeletion}>
            <Field
              htmlFor="delete-confirmation"
              label={`Type ${user.email} to continue`}
            >
              <Input
                autoComplete="off"
                id="delete-confirmation"
                name="confirmation"
                required
                type="email"
              />
            </Field>
            <Checkbox
              label="I understand that account deletion cannot be undone."
              name="understood"
              required
            />
            <Button
              className="w-full sm:w-fit"
              disabled={Boolean(pending) || !user.emailVerified}
              type="submit"
              variant="destructive"
            >
              {pending === "delete" ? "Sending confirmation…" : "Email deletion confirmation"}
            </Button>
          </form>
        </DangerZone>
      </div>
    </>
  );
}
