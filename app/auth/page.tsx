"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { signupPasswordSchema } from "@/schemas/auth";

type AuthTab = "login" | "signup";
type SignupStep = "credentials" | "verify-email";

const inputClassName = cn(
  "h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground",
  "placeholder:text-muted-foreground",
  "outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
);

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cn("size-4 shrink-0", className)}
      fill="currentColor"
    >
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cn("size-4 shrink-0", className)}
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

type AuthSuccessPayload = {
  redirectTo?: string;
  freelancer?: {
    onboarding_completed?: boolean;
  };
};

function getErrorMessage(payload: unknown) {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }

  return "Something went wrong. Please try again.";
}

function getRedirectPath(tab: AuthTab, payload: AuthSuccessPayload) {
  if (payload.redirectTo) return payload.redirectTo;
  if (tab === "signup") return "/onboarding";
  if (payload.freelancer?.onboarding_completed) return "/";
  return "/onboarding";
}

export default function AuthPage() {
  const router = useRouter();
  const [tab, setTab] = useState<AuthTab>("login");
  const [signupStep, setSignupStep] = useState<SignupStep>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isVerifyStep = tab === "signup" && signupStep === "verify-email";

  async function handleSendVerificationCode() {
    const response = await fetch("/api/auth/send-verification-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const payload: unknown = await response.json();
    if (!response.ok) {
      setError(getErrorMessage(payload));
      return false;
    }

    setSignupStep("verify-email");
    setVerificationCode("");
    return true;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      if (tab === "signup" && signupStep === "credentials") {
        const passwordResult = signupPasswordSchema.safeParse(password);
        if (!passwordResult.success) {
          setError(
            passwordResult.error.issues[0]?.message ??
              "Password does not meet requirements."
          );
          return;
        }

        await handleSendVerificationCode();
        return;
      }

      const endpoint = tab === "login" ? "/api/auth/login" : "/api/auth/signup";
      const body =
        tab === "login"
          ? { email, password }
          : { email, password, code: verificationCode };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const payload: unknown = await response.json();
      if (!response.ok) {
        setError(getErrorMessage(payload));
        return;
      }

      router.push(getRedirectPath(tab, payload as AuthSuccessPayload));
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResendCode() {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await handleSendVerificationCode();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col items-center overflow-y-auto bg-zinc-50 px-6 pb-16 pt-10 dark:bg-zinc-950">
      <div className="flex w-full max-w-md flex-col items-center">
        <p className="mb-2 text-sm font-medium text-primary">Bridalync</p>
        <h1 className="mb-2 text-center text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {isVerifyStep
            ? "Verify your email"
            : tab === "login"
              ? "Welcome back"
              : "Create your account"}
        </h1>
        <p className="mb-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
          {isVerifyStep
            ? `We sent a 6-digit code to ${email}. Enter it below to finish creating your account.`
            : tab === "login"
              ? "Log in to manage your bookings and clients."
              : "Sign up to share your booking link and grow your business."}
        </p>

        {!isVerifyStep && (
        <div
          role="tablist"
          aria-label="Authentication mode"
          className="mb-8 flex w-full rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900"
        >
          {(["login", "signup"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              className={cn(
                "flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors",
                tab === value
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
              )}
              onClick={() => {
                setTab(value);
                setSignupStep("credentials");
                setError(null);
              }}
            >
              {value === "login" ? "Log in" : "Sign up"}
            </button>
          ))}
        </div>
        )}

        {!isVerifyStep && (
        <>
        <div className="flex w-full flex-col gap-3">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-11 w-full rounded-xl bg-background text-sm font-medium"
          >
            <AppleIcon />
            Continue with Apple
          </Button>

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-11 w-full rounded-xl bg-background text-sm font-medium"
          >
            <GoogleIcon />
            Continue with Google
          </Button>
        </div>

        <div className="my-6 flex w-full items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>
        </>
        )}

        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="flex w-full flex-col gap-4"
          aria-label={
            isVerifyStep
              ? "Verify email form"
              : tab === "login"
                ? "Log in form"
                : "Sign up form"
          }
        >
          {isVerifyStep ? (
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground">
                Verification code
              </span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                value={verificationCode}
                onChange={(event) =>
                  setVerificationCode(
                    event.target.value.replace(/\D/g, "").slice(0, 6)
                  )
                }
                className={cn(inputClassName, "text-center tracking-[0.3em]")}
                minLength={6}
                maxLength={6}
                pattern="\d{6}"
                required
              />
            </label>
          ) : (
            <>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">Email</span>
            <input
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputClassName}
              required
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">Password</span>
            <input
              type="password"
              autoComplete={
                tab === "login" ? "current-password" : "new-password"
              }
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={inputClassName}
              minLength={tab === "signup" ? 8 : 1}
              required
            />
            {tab === "signup" && (
              <span className="text-xs text-muted-foreground">
                At least 8 characters with uppercase, lowercase, a number, and a
                symbol.
              </span>
            )}
          </label>
            </>
          )}

          {error && (
            <p className="text-center text-sm text-destructive">{error}</p>
          )}

          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting}
            className="mt-2 h-11 w-full rounded-xl bg-chart-4 text-sm text-white hover:bg-chart-4/90"
          >
            {isSubmitting
              ? isVerifyStep
                ? "Verifying..."
                : tab === "login"
                  ? "Logging in..."
                  : "Sending code..."
              : isVerifyStep
                ? "Verify and create account"
                : tab === "login"
                  ? "Log in"
                  : "Continue"}
          </Button>

          {isVerifyStep && (
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => void handleResendCode()}
                className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:opacity-50"
              >
                Resend code
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setSignupStep("credentials");
                  setVerificationCode("");
                  setError(null);
                }}
                className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:opacity-50"
              >
                Back
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
