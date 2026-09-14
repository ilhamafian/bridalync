"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LoginStep = "credentials" | "verify-code";

export default function AdminLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<LoginStep>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendLoginCode() {
    const response = await fetch("/api/admin/auth/send-login-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(
        typeof data.error === "string" ? data.error : "Could not send code."
      );
      return false;
    }

    setStep("verify-code");
    setCode("");
    return true;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (step === "credentials") {
        await sendLoginCode();
        return;
      }

      const response = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, code }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(
          typeof data.error === "string" ? data.error : "Could not sign in."
        );
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch {
      setError(step === "credentials" ? "Could not send code." : "Could not sign in.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendCode() {
    setLoading(true);
    setError(null);

    try {
      await sendLoginCode();
    } catch {
      setError("Could not send code.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Admin sign in</CardTitle>
          <CardDescription>
            {step === "credentials"
              ? "Verify manual payment receipts for Bridalync bookings."
              : `Enter the 6-digit code sent to ${email}.`}
          </CardDescription>
        </CardHeader>
        <form onSubmit={(event) => void handleSubmit(event)}>
          <CardContent className="flex flex-col gap-4">
            {step === "verify-code" ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="admin-code">Verification code</Label>
                <Input
                  id="admin-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  className="text-center tracking-[0.3em]"
                  minLength={6}
                  maxLength={6}
                  pattern="\d{6}"
                  required
                  autoFocus
                />
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="admin-email">Email</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="admin-password">Password</Label>
                  <Input
                    id="admin-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </div>
              </>
            )}
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? step === "credentials"
                  ? "Sending code…"
                  : "Signing in…"
                : step === "credentials"
                  ? "Continue"
                  : "Sign in"}
            </Button>
            {step === "verify-code" ? (
              <div className="flex w-full items-center justify-between gap-2 text-sm">
                <button
                  type="button"
                  className="text-muted-foreground underline-offset-4 hover:underline"
                  disabled={loading}
                  onClick={() => {
                    setStep("credentials");
                    setCode("");
                    setError(null);
                  }}
                >
                  Back
                </button>
                <button
                  type="button"
                  className="text-muted-foreground underline-offset-4 hover:underline"
                  disabled={loading}
                  onClick={() => void handleResendCode()}
                >
                  Resend code
                </button>
              </div>
            ) : null}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
