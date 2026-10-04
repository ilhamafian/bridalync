"use client";

import { useState } from "react";
import { IconMail } from "@tabler/icons-react";

import {
  IconBadge,
  RowText,
  SettingsFeedback,
  SettingsSection,
  settingsCardClassName,
  settingsListClassName,
} from "@/components/dashboard/settings/SettingsUi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { signupPasswordSchema } from "@/schemas/auth";

const inputClassName = cn(
  "h-10 w-full rounded-md border border-border bg-white/60 px-3 text-sm text-foreground dark:bg-white/5",
  "placeholder:text-muted-foreground",
  "outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
);

function errorMessage(data: unknown, fallback: string) {
  const error = (data as { error?: unknown } | null)?.error;
  return typeof error === "string" ? error : fallback;
}

export function ResetPasswordSettings({ email }: { email: string }) {
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function sendCode() {
    setSending(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(errorMessage(data, "Failed to send the code."));
        return;
      }
      setCodeSent(true);
      setSuccess(`We sent a 6-digit code to ${email}.`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  }

  async function updatePassword() {
    setError(null);
    setSuccess(null);

    if (!/^\d{6}$/.test(code.trim())) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    const parsedPassword = signupPasswordSchema.safeParse(password);
    if (!parsedPassword.success) {
      setError(parsedPassword.error.issues[0]?.message ?? "Invalid password.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: code.trim(), password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(errorMessage(data, "Failed to update your password."));
        return;
      }
      setCodeSent(false);
      setCode("");
      setPassword("");
      setConfirmPassword("");
      setSuccess("Password updated.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <SettingsSection title="Email">
        <div className={settingsListClassName}>
          <div className="flex items-center gap-3 px-4 py-3">
            <IconBadge icon={IconMail} />
            <RowText
              title={email}
              description="The reset code is sent to your account email."
            />
          </div>
        </div>
      </SettingsSection>

      {codeSent ? (
        <SettingsSection
          title="New password"
          action={
            <button
              type="button"
              className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
              onClick={() => void sendCode()}
              disabled={sending || saving}
            >
              {sending ? "Sending…" : "Resend code"}
            </button>
          }
        >
          <div className={settingsCardClassName}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reset-code">Code</Label>
              <Input
                id="reset-code"
                className={cn(inputClassName, "tracking-[0.3em] tabular-nums")}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/g, ""))
                }
                placeholder="123456"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reset-password">New password</Label>
              <Input
                id="reset-password"
                className={inputClassName}
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reset-password-confirm">Confirm password</Label>
              <Input
                id="reset-password-confirm"
                className={inputClassName}
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              At least 8 characters with an uppercase letter, a lowercase
              letter, a number and a special character.
            </p>
          </div>
        </SettingsSection>
      ) : null}

      <SettingsFeedback error={error} success={success} />

      {codeSent ? (
        <Button
          type="button"
          size="lg"
          className="min-h-11"
          onClick={() => void updatePassword()}
          disabled={saving || sending}
        >
          {saving ? "Updating…" : "Update password"}
        </Button>
      ) : (
        <Button
          type="button"
          size="lg"
          className="min-h-11"
          onClick={() => void sendCode()}
          disabled={sending}
        >
          {sending ? "Sending…" : "Send reset code"}
        </Button>
      )}
    </div>
  );
}
