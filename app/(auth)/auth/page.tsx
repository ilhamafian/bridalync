"use client";

import { CheckIcon, EyeIcon, EyeOffIcon } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { LandingLogo } from "@/components/landing/landing-logo";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { cn } from "@/lib/utils";
import { signupPasswordSchema } from "@/schemas/auth";
import {
  isOnboardingComplete,
  type OnboardingProgress,
} from "@/schemas/onboardingSchema";
import { LEGAL_URLS } from "@/lib/site";
import {
  BETA_NOT_ALLOWED_CODE,
  BETA_NOT_ALLOWED_MESSAGE,
  SIGNUP_ENABLED,
} from "@/utils/auth/signup";

type AuthTab = "login" | "signup";
type SignupStep = "credentials" | "verify-email";
type LoginStep = "credentials" | "forgot-email" | "forgot-reset";

const SatinRidges = dynamic(
  () => import("@/components/satin-ridges").then((mod) => mod.SatinRidges),
  { ssr: false }
);

const PAGE_BG = "#230b17";

const GLASS_SHADOW =
  "shadow-[0_10px_40px_rgb(0_0_0/0.18),inset_0_1px_0_rgb(255_255_255/0.45)]";

const inputClassName = cn(
  "h-12 w-full rounded-xl border border-white/15 bg-black/40 px-3 text-base text-white",
  "placeholder:text-white/40",
  "outline-none focus-visible:ring-2 focus-visible:ring-white/40"
);

const labelClassName = "text-sm font-medium text-zinc-200";

const quietLinkClassName =
  "text-sm text-zinc-400 underline decoration-zinc-500 underline-offset-4 transition-colors hover:text-white disabled:opacity-50";

const BRAND_POINTS = [
  "Share one booking link with your clients",
  "Take deposits and full payments online",
  "Approve requests and keep track of every session",
];

/** Wide screens: brand panel left of the form, over the shared satin background. */
function AuthBrandPanel({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative w-1/2 max-w-3xl shrink-0 flex-col p-12 xl:p-16",
        className
      )}
    >
      <LandingLogo variant="light" />
      <div className="flex max-w-lg flex-1 flex-col justify-center gap-8">
        <div className="flex flex-col gap-4">
          <p className="font-serif text-6xl leading-none tracking-tight text-rose-200 italic xl:text-7xl [text-shadow:0_2px_24px_rgb(35_11_23/0.45)]">
            Bridalync
          </p>
          <p className="max-w-md text-lg leading-relaxed text-zinc-300 [text-shadow:0_1px_12px_rgb(35_11_23/0.4)]">
            Bookings, payments and clients in one place.
          </p>
        </div>
        <ul className="flex flex-col gap-3">
          {BRAND_POINTS.map((point) => (
            <li key={point} className="flex items-center gap-3 text-sm text-zinc-200">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-rose-200 ring-1 ring-white/25">
                <CheckIcon className="size-3.5" />
              </span>
              {point}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function GlassSubmit({
  disabled,
  children,
}: {
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="mt-1 block w-full rounded-full disabled:cursor-not-allowed disabled:opacity-60"
    >
      <LiquidGlass
        tint={0.32}
        className={cn(
          GLASS_SHADOW,
          "w-full text-white ring-1 ring-white/40 transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:scale-100"
        )}
        contentClassName="flex w-full items-center justify-center px-7 py-3 text-sm font-medium [text-shadow:0_1px_2px_rgb(0_0_0/0.25)]"
      >
        {children}
      </LiquidGlass>
    </button>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  minLength,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  minLength?: number;
  hint?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="flex flex-col gap-1.5">
      <span className={labelClassName}>{label}</span>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          placeholder="••••••••"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={cn(inputClassName, "pr-10")}
          minLength={minLength}
          required
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-white/50 transition-colors hover:text-white"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
        >
          {visible ? (
            <EyeOffIcon className="size-4" />
          ) : (
            <EyeIcon className="size-4" />
          )}
        </button>
      </div>
      {hint ? (
        <span className="text-xs text-zinc-400">{hint}</span>
      ) : null}
    </label>
  );
}

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
    onboarding?: OnboardingProgress;
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

function isBetaNotAllowed(payload: unknown) {
  return (
    payload !== null &&
    typeof payload === "object" &&
    "code" in payload &&
    payload.code === BETA_NOT_ALLOWED_CODE
  );
}

function getRedirectPath(tab: AuthTab, payload: AuthSuccessPayload) {
  if (payload.redirectTo) return payload.redirectTo;
  if (tab === "signup") return "/onboarding";
  if (isOnboardingComplete(payload.freelancer?.onboarding)) return "/dashboard";
  return "/onboarding";
}

export default function AuthPage() {
  const router = useRouter();
  const [tab, setTab] = useState<AuthTab>("login");
  const [signupStep, setSignupStep] = useState<SignupStep>("credentials");
  const [loginStep, setLoginStep] = useState<LoginStep>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [betaBlockedOpen, setBetaBlockedOpen] = useState(false);
  const [betaBlockedMessage, setBetaBlockedMessage] = useState(
    BETA_NOT_ALLOWED_MESSAGE
  );

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("dark");
    root.style.colorScheme = "dark";
    return () => {
      root.classList.remove("dark");
      root.style.colorScheme = "";
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleError = params.get("error");
    if (!googleError) return;

    const messages: Record<string, string> = {
      google_denied: "Google sign-in was cancelled.",
      google_failed: "Google sign-in failed. Try again.",
      google_config: "Google sign-in is not configured yet.",
      google_email: "Google did not provide a verified email address.",
      google_conflict: "This email is already linked to a different Google account.",
      google_signup:
        "No Bridalync account exists for this Google email. Join the waitlist and we'll reach out.",
      google_beta: BETA_NOT_ALLOWED_MESSAGE,
    };

    if (googleError === "google_beta") {
      setBetaBlockedMessage(BETA_NOT_ALLOWED_MESSAGE);
      setBetaBlockedOpen(true);
    } else if (messages[googleError]) {
      setError(messages[googleError]);
    }

    window.history.replaceState({}, "", "/auth");
  }, []);

  const activeTab: AuthTab = SIGNUP_ENABLED ? tab : "login";
  const isVerifyStep =
    SIGNUP_ENABLED && activeTab === "signup" && signupStep === "verify-email";
  const isForgotEmailStep = activeTab === "login" && loginStep === "forgot-email";
  const isForgotResetStep = activeTab === "login" && loginStep === "forgot-reset";
  const isAlternateStep = isVerifyStep || isForgotEmailStep || isForgotResetStep;

  async function handleSendPasswordResetCode() {
    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const payload: unknown = await response.json();
    if (!response.ok) {
      setError(getErrorMessage(payload));
      return false;
    }

    setLoginStep("forgot-reset");
    setVerificationCode("");
    return true;
  }

  function showBetaBlocked(payload: unknown) {
    setBetaBlockedMessage(getErrorMessage(payload) || BETA_NOT_ALLOWED_MESSAGE);
    setBetaBlockedOpen(true);
  }

  async function handleSendVerificationCode() {
    const response = await fetch("/api/auth/send-verification-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const payload: unknown = await response.json();
    if (isBetaNotAllowed(payload)) {
      showBetaBlocked(payload);
      return false;
    }
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
      if (activeTab === "login" && loginStep === "forgot-email") {
        await handleSendPasswordResetCode();
        return;
      }

      if (activeTab === "login" && loginStep === "forgot-reset") {
        const passwordResult = signupPasswordSchema.safeParse(password);
        if (!passwordResult.success) {
          setError(
            passwordResult.error.issues[0]?.message ??
              "Password does not meet requirements."
          );
          return;
        }

        const response = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            code: verificationCode,
            password,
          }),
        });

        const payload: unknown = await response.json();
        if (!response.ok) {
          setError(getErrorMessage(payload));
          return;
        }

        router.push(getRedirectPath("login", payload as AuthSuccessPayload));
        return;
      }

      if (activeTab === "signup" && signupStep === "credentials") {
        if (!SIGNUP_ENABLED) {
          setError(
            "Signup is invite-only during closed beta. Join the waitlist instead."
          );
          return;
        }

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

      if (activeTab === "signup" && !SIGNUP_ENABLED) {
        setError(
          "Signup is invite-only during closed beta. Join the waitlist instead."
        );
        return;
      }

      const endpoint =
        activeTab === "login" ? "/api/auth/login" : "/api/auth/signup";
      const body =
        activeTab === "login"
          ? { email, password }
          : { email, password, code: verificationCode };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const payload: unknown = await response.json();
      if (activeTab === "signup" && isBetaNotAllowed(payload)) {
        showBetaBlocked(payload);
        return;
      }
      if (!response.ok) {
        setError(getErrorMessage(payload));
        return;
      }

      router.push(getRedirectPath(activeTab, payload as AuthSuccessPayload));
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogout() {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        const payload: unknown = await response.json();
        setError(getErrorMessage(payload));
        return;
      }

      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoggingOut(false);
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

  async function handleResendResetCode() {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await handleSendPasswordResetCode();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="dark @container/auth relative flex min-h-0 flex-1 overflow-hidden bg-[#230b17] text-zinc-100"
      style={{ colorScheme: "dark" }}
    >
      <SatinRidges
        colors={["#961b45", "#ff6653"]}
        backgroundColor={PAGE_BG}
        angle={-33}
        scale={1.35}
        depth={1}
        warp={1}
        gloss={0.4}
        highlight={0.85}
        lightAngle={-70}
        sheen={0.65}
        speed={1}
        seed={12}
        clickRipples={false}
        dpr={1}
        detail={0}
        className="pointer-events-none absolute inset-0 h-full w-full"
      />
      <div className="relative z-10 flex min-h-0 min-w-0 flex-1">
        <AuthBrandPanel className="hidden @4xl/auth:flex" />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center overflow-y-auto px-4 py-6 sm:px-8">
          <div className="flex w-full max-w-md flex-col @4xl/auth:my-auto">
            <div className="mb-8 @4xl/auth:hidden">
              <LandingLogo variant="light" />
            </div>
            <div className="rounded-[1.75rem] bg-black/35 p-5 ring-1 ring-white/15 sm:p-6">
              <h1 className="text-2xl font-medium tracking-tight text-white sm:text-3xl">
                {isVerifyStep
                  ? "Verify your email"
                  : isForgotEmailStep
                    ? "Reset your password"
                    : isForgotResetStep
                      ? "Choose a new password"
                      : activeTab === "login"
                        ? "Welcome back"
                        : "Create your account"}
              </h1>
              <p className="mt-2 mb-5 text-sm leading-relaxed text-zinc-400">
                {isVerifyStep
                  ? `We sent a 6-digit code to ${email}. Enter it below to finish creating your account.`
                  : isForgotEmailStep
                    ? "Enter your email and we'll send you a 6-digit reset code."
                    : isForgotResetStep
                      ? `We sent a 6-digit code to ${email}. Enter it below with your new password.`
                      : activeTab === "login"
                        ? "Log in to manage your bookings and clients."
                        : "Sign up to share your booking link and grow your business."}
              </p>

              {!SIGNUP_ENABLED && !isAlternateStep ? (
                <p className="mb-8 rounded-2xl bg-black/40 px-4 py-3 text-center text-sm text-zinc-300 ring-1 ring-white/10">
                  Signup is invite-only during closed beta.{" "}
                  <Link href="/#waitlist" className={quietLinkClassName}>
                    Join the waitlist
                  </Link>{" "}
                  and we&apos;ll reach out.
                </p>
              ) : null}

              {!isAlternateStep && SIGNUP_ENABLED ? (
                <p className="mb-4 text-xs text-zinc-400">
                  Closed beta — signup is limited to invited emails.
                </p>
              ) : null}

              {!isAlternateStep && SIGNUP_ENABLED && (
                <div
                  role="tablist"
                  aria-label="Authentication mode"
                  className="mb-5 flex w-full rounded-full bg-black/40 p-1 ring-1 ring-white/10"
                >
                  {(["login", "signup"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      role="tab"
                      aria-selected={activeTab === value}
                      className={cn(
                        "flex-1 rounded-full py-2.5 text-sm font-medium transition-colors",
                        activeTab === value
                          ? "bg-white/15 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.35)]"
                          : "text-zinc-400 hover:text-white"
                      )}
                      onClick={() => {
                        setTab(value);
                        setSignupStep("credentials");
                        setLoginStep("credentials");
                        setError(null);
                      }}
                    >
                      {value === "login" ? "Log in" : "Sign up"}
                    </button>
                  ))}
                </div>
              )}

              {!isAlternateStep && (
                <>
                  <div className="flex w-full flex-col gap-3">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => {
                        window.location.href = `/api/auth/google/start?intent=${
                          activeTab === "signup" ? "signup" : "login"
                        }`;
                      }}
                      className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white/5 text-sm font-medium text-white ring-1 ring-white/20 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <GoogleIcon />
                      Continue with Google
                    </button>
                  </div>

                  <p className="mt-3 text-xs leading-relaxed text-zinc-400">
                    By continuing, you agree to our{" "}
                    <span className="whitespace-nowrap">
                      <a href={LEGAL_URLS.terms} className={quietLinkClassName}>
                        Terms of Service
                      </a>{" "}
                      and{" "}
                      <a href={LEGAL_URLS.privacy} className={quietLinkClassName}>
                        Privacy Policy
                      </a>
                    </span>
                    .
                  </p>

                  <div className="my-4 flex w-full items-center gap-3">
                    <div className="h-px flex-1 bg-white/15" />
                    <span className="text-xs text-zinc-500">or</span>
                    <div className="h-px flex-1 bg-white/15" />
                  </div>
                </>
              )}

              <form
                onSubmit={(event) => void handleSubmit(event)}
                className="flex w-full flex-col gap-3"
                aria-label={
                  isVerifyStep
                    ? "Verify email form"
                    : isForgotEmailStep
                      ? "Forgot password form"
                      : isForgotResetStep
                        ? "Reset password form"
                        : activeTab === "login"
                          ? "Log in form"
                          : "Sign up form"
                }
              >
                {isVerifyStep || isForgotResetStep ? (
                  <>
                    <label className="flex flex-col gap-1.5">
                      <span className={labelClassName}>
                        {isForgotResetStep ? "Reset code" : "Verification code"}
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

                    {isForgotResetStep ? (
                      <PasswordField
                        label="New password"
                        value={password}
                        onChange={setPassword}
                        autoComplete="new-password"
                        minLength={8}
                        hint="At least 8 characters with uppercase, lowercase, a number, and a symbol."
                      />
                    ) : null}
                  </>
                ) : (
                  <>
                    <label className="flex flex-col gap-1.5">
                      <span className={labelClassName}>Email</span>
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

                    {!isForgotEmailStep ? (
                      <PasswordField
                        label="Password"
                        value={password}
                        onChange={setPassword}
                        autoComplete={
                          activeTab === "login" ? "current-password" : "new-password"
                        }
                        minLength={activeTab === "signup" ? 8 : 1}
                        hint={
                          activeTab === "signup"
                            ? "At least 8 characters with uppercase, lowercase, a number, and a symbol."
                            : undefined
                        }
                      />
                    ) : null}

                    {activeTab === "login" && loginStep === "credentials" ? (
                      <div className="-mt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setLoginStep("forgot-email");
                            setError(null);
                          }}
                          className={quietLinkClassName}
                        >
                          Forgot password?
                        </button>
                      </div>
                    ) : null}
                  </>
                )}

                {error && (
                  <p className="text-center text-sm text-rose-300" role="alert">
                    {error}
                  </p>
                )}

                <GlassSubmit disabled={isSubmitting}>
                  {isSubmitting
                    ? isVerifyStep
                      ? "Verifying..."
                      : isForgotEmailStep
                        ? "Sending code..."
                        : isForgotResetStep
                          ? "Resetting..."
                          : activeTab === "login"
                            ? "Logging in..."
                            : "Sending code..."
                    : isVerifyStep
                      ? "Verify and create account"
                      : isForgotEmailStep
                        ? "Send reset code"
                        : isForgotResetStep
                          ? "Reset password"
                          : activeTab === "login"
                            ? "Log in"
                            : "Continue"}
                </GlassSubmit>

                {isVerifyStep && (
                  <div className="flex flex-col items-center gap-2">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => void handleResendCode()}
                      className={quietLinkClassName}
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
                      className={quietLinkClassName}
                    >
                      Back
                    </button>
                  </div>
                )}

                {isForgotResetStep && (
                  <div className="flex flex-col items-center gap-2">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => void handleResendResetCode()}
                      className={quietLinkClassName}
                    >
                      Resend code
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => {
                        setLoginStep("forgot-email");
                        setVerificationCode("");
                        setPassword("");
                        setError(null);
                      }}
                      className={quietLinkClassName}
                    >
                      Back
                    </button>
                  </div>
                )}

                {isForgotEmailStep && (
                  <div className="flex flex-col items-center gap-2">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => {
                        setLoginStep("credentials");
                        setError(null);
                      }}
                      className={quietLinkClassName}
                    >
                      Back to log in
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={betaBlockedOpen} onOpenChange={setBetaBlockedOpen}>
        <DialogContent
          className="gap-6 bg-[#230b17] p-8 text-white ring-white/15 sm:max-w-md [&_[data-slot=dialog-close]]:text-white [&_[data-slot=dialog-close]]:hover:bg-white/10"
        >
          <DialogHeader className="gap-2 pr-8">
            <DialogTitle className="text-2xl font-semibold tracking-tight text-white">
              Not approved for closed beta
            </DialogTitle>
            <DialogDescription className="text-base text-white/70">
              {betaBlockedMessage}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <button
              type="button"
              onClick={() => setBetaBlockedOpen(false)}
              className="rounded-full px-4 py-2 text-sm font-medium text-white/80 ring-1 ring-white/20 transition-colors hover:bg-white/10"
            >
              Close
            </button>
            <Link
              href="/#waitlist"
              onClick={() => setBetaBlockedOpen(false)}
              className="inline-flex rounded-full"
            >
              <LiquidGlass
                tint={0.22}
                className={cn(
                  GLASS_SHADOW,
                  "text-white transition-transform duration-200 hover:scale-[1.03] active:scale-[0.97] motion-reduce:transition-none motion-reduce:hover:scale-100"
                )}
                contentClassName="flex items-center px-4 py-2 text-sm font-medium [text-shadow:0_1px_2px_rgb(0_0_0/0.25)]"
              >
                Join waitlist
              </LiquidGlass>
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
