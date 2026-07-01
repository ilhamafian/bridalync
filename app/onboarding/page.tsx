"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { LocationMapPicker, MapsProvider } from "@/components/LocationMapPicker";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Address } from "@/schemas/addressSchema";
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

type SessionTemplate = {
  name: string;
  order: number;
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
  package: {
    title: "Create your first package",
    description: "Add a package clients can book from your profile.",
  },
  invoice: {
    title: "Invoice details",
    description: "These details appear on invoices sent to clients.",
  },
  bank_account: {
    title: "Bank account",
    description: "Where clients should send payments.",
  },
  username: {
    title: "Choose a username",
    description: "This becomes your public booking link.",
  },
  preview_bookings: {
    title: "Preview bookings",
    description: "See how managing bookings will work in your dashboard.",
  },
};

const TOTAL_STEPS = ONBOARDING_STEP_ORDER.length;

const inputClassName = cn(
  "h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground",
  "placeholder:text-muted-foreground",
  "outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
);

const textareaClassName = cn(
  "min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground",
  "placeholder:text-muted-foreground",
  "outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
);

function getStepNumber(step: OnboardingStepId) {
  return ONBOARDING_STEP_ORDER.indexOf(step) + 1;
}

function getPreviousStep(step: OnboardingStepId): OnboardingStepId | null {
  const index = ONBOARDING_STEP_ORDER.indexOf(step);
  return index > 0 ? ONBOARDING_STEP_ORDER[index - 1] : null;
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
  const [packageName, setPackageName] = useState("");
  const [packagePrice, setPackagePrice] = useState("");
  const [sessionTemplates, setSessionTemplates] = useState<SessionTemplate[]>([
    { name: "Standard session", order: 0 },
  ]);
  const [companyName, setCompanyName] = useState("");
  const [termsAndConditions, setTermsAndConditions] = useState("");
  const [companyRegistrationNumber, setCompanyRegistrationNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [username, setUsername] = useState("");
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
      "package"
    );
  }

  async function handleContinueFromPackage() {
    const price = Number.parseFloat(packagePrice);
    if (!packageName.trim()) {
      setError("Enter a package name.");
      return;
    }
    if (Number.isNaN(price) || price < 0) {
      setError("Enter a valid package price.");
      return;
    }

    const templates = sessionTemplates
      .map((template, index) => ({
        name: template.name.trim(),
        order: index,
      }))
      .filter((template) => template.name.length > 0);

    if (templates.length === 0) {
      setError("Add at least one session.");
      return;
    }

    await runStep(
      {
        step: "package",
        name: packageName.trim(),
        price,
        session_templates: templates,
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
    if (!bankName.trim() || !accountNumber.trim() || !accountName.trim()) {
      setError("Fill in all bank account fields.");
      return;
    }

    await runStep(
      {
        step: "bank_account",
        bank_name: bankName.trim(),
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
      "preview_bookings"
    );
  }

  async function handleComplete() {
    await runStep({ step: "preview_bookings" }, "dashboard");
  }

  function handleBack() {
    const previousStep = getPreviousStep(step);
    if (!previousStep) return;
    setError(null);
    setStep(previousStep);
  }

  function updateSessionTemplate(index: number, name: string) {
    setSessionTemplates((current) =>
      current.map((template, templateIndex) =>
        templateIndex === index ? { ...template, name } : template
      )
    );
  }

  function addSessionTemplate() {
    setSessionTemplates((current) => [
      ...current,
      { name: "", order: current.length },
    ]);
  }

  function removeSessionTemplate(index: number) {
    setSessionTemplates((current) =>
      current
        .filter((_, templateIndex) => templateIndex !== index)
        .map((template, templateIndex) => ({ ...template, order: templateIndex }))
    );
  }

  const stepConfig = STEP_CONFIG[step];
  const stepNumber = getStepNumber(step);
  const previousStep = getPreviousStep(step);
  const continueLabel =
    step === "preview_bookings"
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
        <p className="mb-2 text-center text-sm text-zinc-600 dark:text-zinc-400">
          {stepConfig.description}
        </p>
        <p className="mb-8 text-center text-xs text-muted-foreground">
          Step {stepNumber} of {TOTAL_STEPS}
          {user?.email ? ` · Signed in as ${user.email}` : null}
        </p>

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
                      Enable travel
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

            {step === "package" && (
              <>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">
                    Package name
                  </span>
                  <input
                    type="text"
                    value={packageName}
                    onChange={(event) => setPackageName(event.target.value)}
                    placeholder="e.g. Bridal makeup"
                    className={inputClassName}
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">
                    Price (RM)
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={packagePrice}
                    onChange={(event) => setPackagePrice(event.target.value)}
                    className={inputClassName}
                  />
                </label>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">
                      Sessions
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={addSessionTemplate}
                    >
                      Add session
                    </Button>
                  </div>
                  {sessionTemplates.map((template, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={template.name}
                        onChange={(event) =>
                          updateSessionTemplate(index, event.target.value)
                        }
                        placeholder={`Session ${index + 1}`}
                        className={inputClassName}
                      />
                      {sessionTemplates.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSessionTemplate(index)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
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
              </>
            )}

            {step === "bank_account" && (
              <>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">
                    Bank name
                  </span>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(event) => setBankName(event.target.value)}
                    className={inputClassName}
                  />
                </label>

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
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">
                  Username
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="your-name"
                  className={inputClassName}
                />
                <p className="text-xs text-muted-foreground">
                  Letters, numbers, hyphens, and underscores only.
                </p>
              </label>
            )}

            {step === "preview_bookings" && (
              <div className="flex w-full flex-col gap-3">
                <div className="rounded-xl border border-border bg-background px-4 py-3">
                  <p className="text-sm font-medium text-foreground">
                    Upcoming bookings
                  </p>
                  <p className="text-xs text-muted-foreground">
                    View confirmed sessions, deposits, and client details in one
                    place.
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-background px-4 py-3">
                  <p className="text-sm font-medium text-foreground">
                    Enquiries
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Respond to new requests and send invoices when you are ready.
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-background px-4 py-3">
                  <p className="text-sm font-medium text-foreground">
                    Calendar view
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Keep track of your schedule as bookings come in.
                  </p>
                </div>
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
                  else if (step === "package") void handleContinueFromPackage();
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
