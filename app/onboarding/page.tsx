"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { LocationMapPicker, MapsProvider } from "@/components/LocationMapPicker";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MALAYSIAN_BANKS } from "@/constants/malaysianBanks";
import { cn } from "@/lib/utils";
import type { Address } from "@/schemas/addressSchema";
import { DEFAULT_TERMS_AND_CONDITIONS } from "@/schemas/settingSchema";
import {
  buildProfileDisplayUrl,
  buildProfileUrl,
  formatAppHost,
} from "@/utils/appUrl";
import {
  ONBOARDING_STEP_ORDER,
  type OnboardingStepId,
  type OnboardingStepRequest,
  type OnboardingUser,
} from "@/schemas/onboardingSchema";

type UserRole = {
  value: string;
  label: string;
};

const STEP_CONFIG: Record<
  OnboardingStepId,
  { title: string; description: string }
> = {
  role: {
    title: "Choose your role",
    description: "Tell clients what services you offer.",
  },
  travel: {
    title: "Travel settings",
    description:
      "Let clients know if you travel to them and where you are based.",
  },
  invoice: {
    title: "Invoice details",
    description: "These details appear on invoices sent to clients.",
  },
  bank_account: {
    title: "Bank account",
    description: "Where should we send the payments to?",
  },
  username: {
    title: "Choose a username",
    description: "This becomes your public booking link.",
  },
  preview_profile: {
    title: "Preview booking profile",
    description: "Congratulation! You have completed the onboarding process.",
  },
};

const TOTAL_STEPS = ONBOARDING_STEP_ORDER.length;

const inputClassName = cn(
  "h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground",
  "placeholder:text-muted-foreground",
  "outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
);

const textareaClassName = cn(
  "min-h-80 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground",
  "placeholder:text-muted-foreground",
  "outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
);

function getPreviousStep(step: OnboardingStepId): OnboardingStepId | null {
  const index = ONBOARDING_STEP_ORDER.indexOf(step);
  return index > 0 ? ONBOARDING_STEP_ORDER[index - 1] : null;
}

function OnboardingProgressBar({
  currentStep,
  signedInEmail,
}: {
  currentStep: OnboardingStepId;
  signedInEmail?: string;
}) {
  const currentIndex = ONBOARDING_STEP_ORDER.indexOf(currentStep);

  return (
    <div className="mb-8 flex w-full flex-col gap-3">
      <div
        className="flex w-full gap-1.5"
        role="progressbar"
        aria-valuenow={currentIndex + 1}
        aria-valuemin={1}
        aria-valuemax={TOTAL_STEPS}
        aria-label={`Onboarding step ${currentIndex + 1} of ${TOTAL_STEPS}`}
      >
        {ONBOARDING_STEP_ORDER.map((stepId, index) => {
          const isComplete = index < currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <div
              key={stepId}
              className="flex flex-1 flex-col gap-1.5"
              aria-current={isCurrent ? "step" : undefined}
            >
              <div
                className={cn(
                  "h-1.5 w-full rounded-full transition-colors",
                  isComplete || isCurrent ? "bg-primary" : "bg-border",
                  isCurrent && "ring-2 ring-primary/30 ring-offset-1 ring-offset-zinc-50 dark:ring-offset-zinc-950"
                )}
              />
            </div>
          );
        })}
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Step {currentIndex + 1} of {TOTAL_STEPS}
        {signedInEmail ? ` · Signed in as ${signedInEmail}` : null}
      </p>
    </div>
  );
}

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

function getChargeBy(role: string): "offering" | "style" {
  if (role === "hijabstylist") return "style";
  return "offering";
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStepId>("role");
  const [user, setUser] = useState<OnboardingUser | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [travelEnabled, setTravelEnabled] = useState(false);
  const [ratePerKm, setRatePerKm] = useState("1.00");
  const [location, setLocation] = useState<Address | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [termsAndConditions, setTermsAndConditions] = useState(
    DEFAULT_TERMS_AND_CONDITIONS
  );
  const [companyRegistrationNumber, setCompanyRegistrationNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [username, setUsername] = useState("");
  const [appUrl, setAppUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/onboarding")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setUser(data.user);
          if (data.user.role) setSelectedRole(data.user.role);
          if (data.user.username) setUsername(data.user.username);
        }
        if (Array.isArray(data?.roles)) setRoles(data.roles);
        if (data?.resumeStep) setStep(data.resumeStep);
        if (typeof data?.appUrl === "string") setAppUrl(data.appUrl);
      })
      .catch(() => setError("Could not load onboarding data."))
      .finally(() => setIsLoading(false));
  }, []);

  async function submitStep(body: OnboardingStepRequest) {
    const response = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const payload: unknown = await response.json();
    if (!response.ok) {
      throw new Error(getErrorMessage(payload));
    }

    return payload;
  }

  async function runStep(
    body: OnboardingStepRequest,
    nextStep: OnboardingStepId | "dashboard" | null
  ) {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = await submitStep(body);

      if (nextStep === "dashboard") {
        router.push(
          payload &&
            typeof payload === "object" &&
            "redirectTo" in payload &&
            typeof payload.redirectTo === "string"
            ? payload.redirectTo
            : "/dashboard"
        );
        return;
      }

      if (nextStep) {
        setStep(nextStep);
      }
    } catch (stepError) {
      setError(
        stepError instanceof Error
          ? stepError.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleContinueFromRole() {
    if (!selectedRole) {
      setError("Choose a role to continue.");
      return;
    }

    setError(null);
    setStep("travel");
  }

  async function handleContinueFromTravel() {
    if (!selectedRole) {
      setError("Choose a role to continue.");
      return;
    }

    if (travelEnabled && !location) {
      setError("Pick a location on the map to enable travel.");
      return;
    }

    const parsedRate = Number.parseFloat(ratePerKm);
    if (travelEnabled && (Number.isNaN(parsedRate) || parsedRate < 0)) {
      setError("Enter a valid travel rate per km.");
      return;
    }

    await runStep(
      {
        step: "role_travel",
        role: selectedRole as "hijabstylist" | "makeupartist",
        charge_by: getChargeBy(selectedRole),
        travel: travelEnabled
          ? {
              enabled: true,
              rate_per_km: parsedRate,
              location: location!,
            }
          : { enabled: false },
      },
      "invoice"
    );
  }

  async function handleContinueFromInvoice() {
    if (!companyName.trim()) {
      setError("Enter your company or business name.");
      return;
    }
    if (!termsAndConditions.trim()) {
      setError("Enter your terms and conditions.");
      return;
    }

    await runStep(
      {
        step: "invoice",
        company_name: companyName.trim(),
        terms_and_conditions: termsAndConditions.trim(),
        company_registration_number: companyRegistrationNumber.trim() || undefined,
      },
      "bank_account"
    );
  }

  async function handleContinueFromBankAccount() {
    if (!bankName || !accountNumber.trim() || !accountName.trim()) {
      setError("Fill in all bank account fields.");
      return;
    }

    await runStep(
      {
        step: "bank_account",
        bank_name: bankName,
        account_number: accountNumber.trim(),
        account_name: accountName.trim(),
      },
      "username"
    );
  }

  async function handleContinueFromUsername() {
    const normalizedUsername = username.trim().toLowerCase();
    if (normalizedUsername.length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }
    if (!/^[a-z0-9_-]+$/.test(normalizedUsername)) {
      setError("Use letters, numbers, hyphens, or underscores only.");
      return;
    }

    await runStep(
      {
        step: "username",
        username: normalizedUsername,
      },
      "preview_profile"
    );
  }

  async function handleComplete() {
    await runStep({ step: "preview_profile" }, "dashboard");
  }

  function handleBack() {
    const previousStep = getPreviousStep(step);
    if (!previousStep) return;
    setError(null);
    setStep(previousStep);
  }

  const stepConfig = STEP_CONFIG[step];
  const previousStep = getPreviousStep(step);
  const profileUsername = username || user?.username || "";
  const profileHost = appUrl ? formatAppHost(appUrl) : "";
  const profilePath =
    profileUsername && appUrl
      ? buildProfileUrl(appUrl, profileUsername)
      : profileUsername
        ? `/${profileUsername}`
        : "";
  const profileDisplayUrl =
    profileUsername && appUrl
      ? buildProfileDisplayUrl(appUrl, profileUsername)
      : profileHost
        ? `${profileHost}/your-name`
        : "your-name";
  const continueLabel =
    step === "preview_profile"
      ? isSubmitting
        ? "Finishing…"
        : "Go to dashboard"
      : isSubmitting
        ? "Saving…"
        : "Continue";

  return (
    <div className="relative flex min-h-0 flex-1 flex-col items-center overflow-y-auto bg-zinc-50 px-6 pb-16 pt-10 dark:bg-zinc-950">
      <div className="flex w-full max-w-md flex-col items-center">
        <p className="mb-2 text-sm font-medium text-primary">Bridalync</p>
        <h1 className="mb-2 text-center text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {stepConfig.title}
        </h1>
        <p className="mb-4 text-center text-sm text-zinc-600 dark:text-zinc-400">
          {stepConfig.description}
        </p>

        <OnboardingProgressBar
          currentStep={step}
          signedInEmail={user?.email}
        />

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="flex w-full flex-col gap-4">
            {step === "role" && (
              <div className="flex w-full flex-col gap-2">
                {roles.map((role) => (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => {
                      setSelectedRole(role.value);
                      setError(null);
                    }}
                    className={cn(
                      "rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors",
                      selectedRole === role.value
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border bg-background text-foreground hover:bg-muted/50"
                    )}
                  >
                    {role.label}
                  </button>
                ))}
              </div>
            )}

            {step === "travel" && (
              <>
                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-border bg-background px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Enable travel fee
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Charge clients for travel to their location.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={travelEnabled}
                    onChange={(event) => {
                      setTravelEnabled(event.target.checked);
                      setError(null);
                    }}
                    className="size-4 rounded border-border accent-primary"
                  />
                </label>

                {travelEnabled && (
                  <>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-sm font-medium text-foreground">
                        Rate per km (RM)
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        value={ratePerKm}
                        onChange={(event) => setRatePerKm(event.target.value)}
                        className={inputClassName}
                        required
                      />
                    </label>

                    <div className="flex flex-col gap-2">
                      <p className="text-sm font-medium text-foreground">
                        Your base location
                      </p>
                      <MapsProvider>
                        <LocationMapPicker
                          value={location}
                          onChange={setLocation}
                        />
                      </MapsProvider>
                    </div>
                  </>
                )}
              </>
            )}

            {step === "invoice" && (
              <>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">
                    Company / business name
                  </span>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(event) => setCompanyName(event.target.value)}
                    className={inputClassName}
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">
                    Company registration number (optional)
                  </span>
                  <input
                    type="text"
                    value={companyRegistrationNumber}
                    onChange={(event) =>
                      setCompanyRegistrationNumber(event.target.value)
                    }
                    className={inputClassName}
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">
                    Terms and conditions
                  </span>
                  <textarea
                    value={termsAndConditions}
                    onChange={(event) =>
                      setTermsAndConditions(event.target.value)
                    }
                    className={textareaClassName}
                  />
                </label>
                
              </>
            )}

            {step === "bank_account" && (
              <>
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">
                    Bank name
                  </span>
                  <Select
                    value={bankName || undefined}
                    onValueChange={setBankName}
                  >
                    <SelectTrigger className="h-10 w-full text-sm">
                      <SelectValue placeholder="Select a bank" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="w-(--radix-select-trigger-width)">
                      {MALAYSIAN_BANKS.map((bank) => (
                        <SelectItem key={bank.value} value={bank.value}>
                          {bank.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">
                    Account number
                  </span>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(event) => setAccountNumber(event.target.value)}
                    className={inputClassName}
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">
                    Account name
                  </span>
                  <input
                    type="text"
                    value={accountName}
                    onChange={(event) => setAccountName(event.target.value)}
                    className={inputClassName}
                  />
                </label>

              </>
            )}

            {step === "username" && (
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">
                  Username:
                </span>
                <div
                  className={cn(
                    "flex h-10 w-full overflow-hidden rounded-md border border-border bg-background",
                    "focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30"
                  )}
                >
                  <span className="flex shrink-0 items-center border-r border-border bg-muted/40 px-3 text-sm text-muted-foreground">
                    {profileHost ? `${profileHost}/` : "…/"}
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(event) =>
                      setUsername(
                        event.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9_-]/g, "")
                      )
                    }
                    placeholder="your-name"
                    className="min-w-0 flex-1 border-0 bg-transparent px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                    aria-label="Username"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Letters, numbers, hyphens, and underscores only.
                </p>
              </div>
            )}

            {step === "preview_profile" && (
              <div className="flex w-full flex-col gap-4">
                <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
                  <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-2.5">
                    <div className="flex gap-1.5">
                      <span className="size-2.5 rounded-full bg-red-400/80" />
                      <span className="size-2.5 rounded-full bg-amber-400/80" />
                      <span className="size-2.5 rounded-full bg-green-400/80" />
                    </div>
                    <div className="min-w-0 flex-1 truncate rounded-md border border-border/60 bg-background px-2.5 py-1 text-center text-xs text-muted-foreground">
                      {profileDisplayUrl}
                    </div>
                  </div>
                  {profilePath ? (
                    <iframe
                      src={profilePath}
                      title="Booking profile preview"
                      className="h-72 w-full border-0 bg-white dark:bg-zinc-950"
                    />
                  ) : (
                    <div className="flex h-72 items-center justify-center px-6 text-center text-sm text-muted-foreground">
                      Your profile preview will appear here once a username is
                      set.
                    </div>
                  )}
                </div>

                {profilePath ? (
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="h-11 w-full rounded-xl text-sm"
                  >
                    <a
                      href={profilePath}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View your profile
                    </a>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="h-11 w-full rounded-xl text-sm"
                    disabled
                  >
                    View your profile
                  </Button>
                )}
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <div className="flex w-full flex-col gap-2">
              <Button
                type="button"
                size="lg"
                className="h-11 w-full rounded-xl text-sm"
                disabled={isSubmitting || (step === "role" && !selectedRole)}
                onClick={() => {
                  if (step === "role") handleContinueFromRole();
                  else if (step === "travel") void handleContinueFromTravel();
                  else if (step === "invoice") void handleContinueFromInvoice();
                  else if (step === "bank_account")
                    void handleContinueFromBankAccount();
                  else if (step === "username")
                    void handleContinueFromUsername();
                  else void handleComplete();
                }}
              >
                {continueLabel}
              </Button>

              {previousStep && (
                <Button
                  type="button"
                  variant="ghost"
                  size="lg"
                  className="h-11 w-full rounded-xl text-sm"
                  disabled={isSubmitting}
                  onClick={handleBack}
                >
                  Back
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
