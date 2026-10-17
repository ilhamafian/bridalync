"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  IconBrush,
  IconBuildingBank,
  IconCheck,
  IconCreditCard,
  IconReceipt,
  IconUserHeart,
  IconWoman,
  type Icon,
} from "@tabler/icons-react";

import { CompanyLogoUpload } from "@/components/CompanyLogoUpload";
import { PaymentQrUpload } from "@/components/PaymentQrUpload";
import { glassCardClassName } from "@/components/dashboard/HomeBookingCard";
import { PaymentMethodProvider } from "@/components/dashboard/PaymentMethodProvider";
import {
  IconBadge,
  RowText,
  SettingsSection,
  settingsCardClassName,
  settingsListClassName,
  settingsRowClassName,
} from "@/components/dashboard/settings/SettingsUi";
import {
  DISABLED_TRAVEL_LOCATION,
  TravelSettingsFields,
  useTravelSettingsForm,
} from "@/components/dashboard/settings/TravelSettingsFields";
import { PhoneNumberInput, isValidPhoneNumber, DEFAULT_COUNTRY_CODE } from "@/components/PhoneNumberInput";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import {
  DEFAULT_TERMS_AND_CONDITIONS,
  type PaymentMethod,
  type TravelSetting,
} from "@/schemas/settingSchema";
import { getStyleTerms } from "@/utils/styleTerms";
import {
  PAYMENT_PROCESSING_FEE_FIXED_RM,
  PAYMENT_PROCESSING_FEE_PERCENT,
  PLATFORM_FEE_ENABLED,
  PLATFORM_FEE_PERCENT,
} from "@/utils/booking/pricing";
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
import {
  getDefaultChargeBy,
  userRoleSchema,
  type UserRole,
} from "@/schemas/roleSchema";

type RoleOption = {
  value: UserRole;
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
  payment: {
    title: "How will clients pay you?",
    description: "Clients pay for bookings online, straight to your account.",
  },
  username: {
    title: "Choose a username",
    description:
      "Set your public booking link and WhatsApp number so clients can reach you.",
  },
  preview_profile: {
    title: "Preview booking profile",
    description: "Congratulation! You have completed the onboarding process.",
  },
};

const TOTAL_STEPS = ONBOARDING_STEP_ORDER.length;

const DEFAULT_ONBOARDING_TRAVEL: TravelSetting = {
  enabled: false,
  rate_per_km: 1,
  location: DISABLED_TRAVEL_LOCATION,
};

const inputClassName = cn(
  "h-10 w-full rounded-md border border-border bg-white/60 px-3 text-sm text-foreground dark:bg-white/5",
  "placeholder:text-muted-foreground",
  "outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
);

const textareaClassName = cn(
  "min-h-80 w-full rounded-md border border-border bg-white/60 px-3 py-2 text-sm text-foreground dark:bg-white/5",
  "placeholder:text-muted-foreground",
  "outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
);

const ROLE_ICONS: Record<UserRole, Icon> = {
  makeupartist: IconBrush,
  hijabstylist: IconWoman,
  brideassistant: IconUserHeart,
};

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

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
    <div className="flex w-full flex-col gap-2 @4xl/onboarding:hidden">
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
                  isComplete || isCurrent ? "bg-primary" : "bg-white/50"
                )}
              />
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Step {currentIndex + 1} of {TOTAL_STEPS}
        {signedInEmail ? ` · Signed in as ${signedInEmail}` : null}
      </p>
    </div>
  );
}

/** Wide screens: replaces the progress bar with a list of every step. */
function OnboardingStepsAside({
  currentStep,
  signedInEmail,
  className,
}: {
  currentStep: OnboardingStepId;
  signedInEmail?: string;
  className?: string;
}) {
  const currentIndex = ONBOARDING_STEP_ORDER.indexOf(currentStep);

  return (
    <aside
      className={cn(
        "h-full w-80 shrink-0 flex-col gap-6 overflow-y-auto border-r border-white/50 bg-white/25 px-4 py-8 backdrop-blur-md",
        className
      )}
    >
      <p className="px-3 font-serif text-2xl font-semibold tracking-tight text-rose-900">
        Bridalync
      </p>
      <ol className="flex flex-col gap-1" aria-label="Onboarding steps">
        {ONBOARDING_STEP_ORDER.map((stepId, index) => {
          const isComplete = index < currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <li
              key={stepId}
              aria-current={isCurrent ? "step" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm",
                isCurrent
                  ? "bg-white/60 font-medium text-rose-900 shadow-sm"
                  : isComplete
                    ? "text-foreground"
                    : "text-muted-foreground"
              )}
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full text-xs",
                  isComplete || isCurrent
                    ? "bg-primary text-primary-foreground"
                    : "bg-white/50 text-muted-foreground"
                )}
              >
                {isComplete ? <IconCheck className="size-3.5" /> : index + 1}
              </span>
              {STEP_CONFIG[stepId].title}
            </li>
          );
        })}
      </ol>
      {signedInEmail ? (
        <p className="mt-auto truncate text-xs text-muted-foreground">
          Signed in as {signedInEmail}
        </p>
      ) : null}
    </aside>
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

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-0 flex-1 items-center justify-center px-6 py-16 text-sm text-muted-foreground">
          Loading onboarding…
        </div>
      }
    >
      <OnboardingPageContent />
    </Suspense>
  );
}

function OnboardingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<OnboardingStepId>("role");
  const [user, setUser] = useState<OnboardingUser | null>(null);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const travelForm = useTravelSettingsForm(DEFAULT_ONBOARDING_TRAVEL);
  const [companyName, setCompanyName] = useState("");
  const [termsAndConditions, setTermsAndConditions] = useState(
    DEFAULT_TERMS_AND_CONDITIONS
  );
  const [companyRegistrationNumber, setCompanyRegistrationNumber] = useState("");
  const [companyLogo, setCompanyLogo] = useState("");
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("payment_gateway");
  const [qrImageUrl, setQrImageUrl] = useState("");
  const [payeeName, setPayeeName] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [isUploadingQr, setIsUploadingQr] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [mobile, setMobile] = useState("");
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  const [appUrl, setAppUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stepFromUrl = searchParams.get("step");
  const stripeStatus = searchParams.get("stripe");

  useEffect(() => {
    fetch("/api/onboarding")
      .then(async (res) => {
        if (res.status === 401) {
          router.replace("/dashboard");
          return null;
        }
        return res.ok ? res.json() : null;
      })
      .then((data) => {
        if (data?.user) {
          setUser(data.user);
          const savedRole = userRoleSchema.safeParse(data.user.role);
          if (savedRole.success) setSelectedRole(savedRole.data);
          if (data.user.name) setDisplayName(data.user.name);
          if (data.user.username) setUsername(data.user.username);
          if (data.user.mobile) setMobile(data.user.mobile);
          if (data.user.country_code) setCountryCode(data.user.country_code);
        }
        if (Array.isArray(data?.roles)) setRoles(data.roles);
        if (
          stepFromUrl &&
          ONBOARDING_STEP_ORDER.includes(stepFromUrl as OnboardingStepId)
        ) {
          setStep(stepFromUrl as OnboardingStepId);
        } else if (data?.resumeStep) {
          setStep(data.resumeStep);
        }
        if (typeof data?.appUrl === "string") setAppUrl(data.appUrl);

        if (stripeStatus === "incomplete" || stripeStatus === "missing") {
          setError(
            "Stripe setup is incomplete. Continue to finish setup — it takes about 3 minutes and requires your SSM and Tax Identification Number."
          );
        } else if (stripeStatus === "error") {
          setError("Something went wrong with Stripe. Continue to try again.");
        }
      })
      .catch(() => setError("Could not load onboarding data."))
      .finally(() => setIsLoading(false));
  }, [router, stepFromUrl, stripeStatus]);

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

      if (
        payload &&
        typeof payload === "object" &&
        "stripeUrl" in payload &&
        typeof payload.stripeUrl === "string"
      ) {
        window.location.href = payload.stripeUrl;
        return;
      }

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

    const chargeBy = getDefaultChargeBy(selectedRole);
    const result = travelForm.buildTravel(chargeBy);
    if ("error" in result) {
      setError(result.error);
      return;
    }

    await runStep(
      {
        step: "role_travel",
        role: selectedRole,
        charge_by: chargeBy,
        travel: result.travel,
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
    if (isUploadingLogo) {
      setError("Wait for the logo upload to finish.");
      return;
    }

    await runStep(
      {
        step: "invoice",
        company_name: companyName.trim(),
        terms_and_conditions: termsAndConditions.trim(),
        company_registration_number: companyRegistrationNumber.trim() || undefined,
        company_logo: companyLogo || undefined,
      },
      "payment"
    );
  }

  async function handleContinueFromPayment() {
    if (isUploadingQr) {
      setError("Wait for the QR upload to finish.");
      return;
    }

    if (paymentMethod === "manual_transfer") {
      if (
        !qrImageUrl.trim() ||
        !payeeName.trim() ||
        !bankName.trim() ||
        !accountNumber.trim()
      ) {
        setError(
          "Upload your payment QR and fill in payee name, bank, and account number."
        );
        return;
      }

      await runStep(
        {
          step: "payment",
          method: "manual_transfer",
          qr_image_url: qrImageUrl.trim(),
          payee_name: payeeName.trim(),
          bank_name: bankName.trim(),
          account_number: accountNumber.trim(),
        },
        "username"
      );
      return;
    }

    await runStep(
      {
        step: "payment",
        method: "payment_gateway",
      },
      null
    );
  }

  async function handleContinueFromUsername() {
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setError("Enter what clients should call you.");
      return;
    }

    const normalizedUsername = username.trim().toLowerCase();
    if (normalizedUsername.length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }
    if (!/^[a-z0-9_-]+$/.test(normalizedUsername)) {
      setError("Use letters, numbers, hyphens, or underscores only.");
      return;
    }

    const trimmedMobile = mobile.trim();
    if (!trimmedMobile) {
      setError("Enter your WhatsApp number.");
      return;
    }
    if (!isValidPhoneNumber(trimmedMobile)) {
      setError("Enter a valid phone number.");
      return;
    }

    await runStep(
      {
        step: "username",
        name: trimmedName,
        username: normalizedUsername,
        mobile: trimmedMobile,
        country_code: countryCode,
      },
      "preview_profile"
    );
  }

  function handleComplete() {
    router.push("/dashboard");
  }

  function handleBack() {
    const previousStep = getPreviousStep(step);
    if (!previousStep) return;
    setError(null);
    setStep(previousStep);
  }

  const stepConfig = STEP_CONFIG[step];
  const previousStep =
    step === "preview_profile" ? null : getPreviousStep(step);
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
      ? "Go to dashboard"
      : step === "payment" && paymentMethod === "payment_gateway"
        ? isSubmitting
          ? "Opening Stripe…"
          : "Continue to Stripe"
        : isSubmitting
          ? "Saving…"
          : "Continue";

  return (
    <div className="@container/onboarding relative flex min-h-0 flex-1">
      <OnboardingStepsAside
        className="hidden @4xl/onboarding:flex"
        currentStep={step}
        signedInEmail={user?.email}
      />
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto px-4 pt-8 pb-16 md:px-8">
        <div className="mx-auto flex w-full max-w-md flex-col gap-4">
          <p className="font-serif text-2xl font-semibold tracking-tight text-rose-900 @4xl/onboarding:hidden">
            Bridalync
          </p>
          <section>
            <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
              {stepConfig.title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {stepConfig.description}
            </p>
          </section>

          <OnboardingProgressBar
            currentStep={step}
            signedInEmail={user?.email}
          />

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="flex w-full flex-col gap-4">
              {step === "role" && (
                <SettingsSection title="Your role">
                  <RadioGroup
                    value={selectedRole ?? ""}
                    onValueChange={(value) => {
                      const parsed = userRoleSchema.safeParse(value);
                      if (!parsed.success) return;
                      setSelectedRole(parsed.data);
                      setError(null);
                    }}
                    className={settingsListClassName}
                  >
                    {roles.map((role) => (
                      <label
                        key={role.value}
                        className={cn(settingsRowClassName, "cursor-pointer")}
                      >
                        <IconBadge icon={ROLE_ICONS[role.value]} />
                        <RowText title={role.label} />
                        <RadioGroupItem value={role.value} aria-label={role.label} />
                      </label>
                    ))}
                  </RadioGroup>
                </SettingsSection>
              )}

              {step === "travel" && (
                <PaymentMethodProvider initialMethod="payment_gateway">
                  <TravelSettingsFields
                    form={travelForm}
                    chargeBy={
                      selectedRole ? getDefaultChargeBy(selectedRole) : "package"
                    }
                    styleTerms={getStyleTerms(selectedRole)}
                  />
                </PaymentMethodProvider>
              )}

              {step === "invoice" && (
                <div className={settingsCardClassName}>
                  <Field label="Company / business name">
                    <input
                      type="text"
                      value={companyName}
                      onChange={(event) => setCompanyName(event.target.value)}
                      className={inputClassName}
                    />
                  </Field>

                  <Field label="Company registration number (optional)">
                    <input
                      type="text"
                      value={companyRegistrationNumber}
                      onChange={(event) =>
                        setCompanyRegistrationNumber(event.target.value)
                      }
                      className={inputClassName}
                    />
                  </Field>

                  <CompanyLogoUpload
                    value={companyLogo}
                    onChange={(url) => {
                      setError(null);
                      setCompanyLogo(url);
                    }}
                    disabled={isSubmitting}
                    uploadEndpoint="/api/onboarding/upload"
                    uploadFolder={null}
                    onUploadingChange={setIsUploadingLogo}
                    label="Company logo (optional)"
                    hint="JPEG, PNG, WebP, or GIF. Large images are compressed automatically. Cropped to 16:9."
                  />

                  <Field label="Terms and conditions">
                    <textarea
                      value={termsAndConditions}
                      onChange={(event) =>
                        setTermsAndConditions(event.target.value)
                      }
                      className={textareaClassName}
                    />
                  </Field>
                </div>
              )}

              {step === "payment" && (
                <>
                  <SettingsSection title="How clients pay">
                    <RadioGroup
                      value={paymentMethod}
                      onValueChange={(value) => {
                        setPaymentMethod(value as PaymentMethod);
                        setError(null);
                      }}
                      className={settingsListClassName}
                    >
                      <label className={cn(settingsRowClassName, "cursor-pointer")}>
                        <IconBadge icon={IconCreditCard} />
                        <RowText
                          title="Payment Gateway"
                          description="Clients pay online with Stripe (card / FPX). Setup takes about 3 minutes and requires your SSM and Tax Identification Number."
                        />
                        <RadioGroupItem value="payment_gateway" aria-label="Payment Gateway" />
                      </label>
                      <label className={cn(settingsRowClassName, "cursor-pointer")}>
                        <IconBadge icon={IconBuildingBank} />
                        <RowText
                          title="Manual Transfer"
                          description="Clients pay via your QR or bank transfer and upload a receipt. You verify payments in Bookings."
                        />
                        <RadioGroupItem value="manual_transfer" aria-label="Manual Transfer" />
                      </label>
                    </RadioGroup>
                  </SettingsSection>

                  {paymentMethod === "manual_transfer" ? (
                    <SettingsSection title="Transfer details">
                      <div className={settingsCardClassName}>
                        <PaymentQrUpload
                          value={qrImageUrl}
                          onChange={(url) => {
                            setError(null);
                            setQrImageUrl(url);
                          }}
                          disabled={isSubmitting}
                          uploadEndpoint="/api/onboarding/upload"
                          uploadFolder="payment-qr"
                          onUploadingChange={setIsUploadingQr}
                          onError={(message) => setError(message)}
                        />
                        <Field label="Payee / account name">
                          <input
                            type="text"
                            value={payeeName}
                            onChange={(event) => setPayeeName(event.target.value)}
                            placeholder="e.g. Your business name"
                            className={inputClassName}
                          />
                        </Field>
                        <Field label="Bank name">
                          <input
                            type="text"
                            value={bankName}
                            onChange={(event) => setBankName(event.target.value)}
                            placeholder="e.g. Maybank"
                            className={inputClassName}
                          />
                        </Field>
                        <Field label="Account number">
                          <input
                            type="text"
                            value={accountNumber}
                            onChange={(event) => setAccountNumber(event.target.value)}
                            placeholder="e.g. 1234 5678 9012"
                            className={inputClassName}
                          />
                        </Field>
                      </div>
                    </SettingsSection>
                  ) : (
                    <>
                      <SettingsSection title="Fees">
                        <div className={settingsListClassName}>
                          <div className={settingsRowClassName}>
                            <IconBadge icon={IconReceipt} />
                            <RowText
                              title="Built into client prices"
                              description={
                                PLATFORM_FEE_ENABLED
                                  ? `A ${PLATFORM_FEE_PERCENT}% Bridalync platform fee, then Stripe's ${PAYMENT_PROCESSING_FEE_PERCENT}% + RM${PAYMENT_PROCESSING_FEE_FIXED_RM} payment processing fee, are added to the prices your clients pay. You keep your full price.`
                                  : `Stripe's ${PAYMENT_PROCESSING_FEE_PERCENT}% + RM${PAYMENT_PROCESSING_FEE_FIXED_RM} payment processing fee is added to the prices your clients pay. You keep your full price.`
                              }
                            />
                          </div>
                        </div>
                      </SettingsSection>

                      <p className="text-xs text-muted-foreground">
                        Continue opens Stripe setup in about 3 minutes. Have
                        your SSM and Tax Identification Number ready. When you
                        finish, you&apos;ll return here to complete your
                        profile.
                      </p>
                    </>
                  )}
                </>
              )}

              {step === "username" && (
                <div className={settingsCardClassName}>
                  <Field
                    label="What should clients call you?"
                    htmlFor="display-name"
                    hint="Your first name or a short nickname — shown on your booking page."
                  >
                    <input
                      id="display-name"
                      type="text"
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      placeholder="e.g. Sarah or Kak Sarah"
                      className={inputClassName}
                      aria-label="What clients should call you"
                    />
                  </Field>

                  <Field
                    label="WhatsApp number"
                    htmlFor="stylist-mobile"
                    hint="Clients will use this to message you after booking."
                  >
                    <PhoneNumberInput
                      mobileInputId="stylist-mobile"
                      countryCode={countryCode}
                      mobile={mobile}
                      onCountryCodeChange={setCountryCode}
                      onMobileChange={setMobile}
                      inputClassName={inputClassName}
                    />
                  </Field>

                  <Field
                    label="Username"
                    hint="Letters, numbers, hyphens, and underscores only."
                  >
                    <div
                      className={cn(
                        "flex h-10 w-full overflow-hidden rounded-md border border-border bg-white/60",
                        "focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30"
                      )}
                    >
                      <span className="flex shrink-0 items-center border-r border-border bg-white/40 px-3 text-sm text-muted-foreground">
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
                  </Field>
                </div>
              )}

              {step === "preview_profile" && (
                <div className="flex w-full flex-col gap-4">
                  <div className={cn(glassCardClassName, "overflow-hidden")}>
                    <div className="flex items-center gap-2 border-b border-white/50 bg-white/30 px-3 py-2.5">
                      <div className="flex gap-1.5">
                        <span className="size-2.5 rounded-full bg-red-400/80" />
                        <span className="size-2.5 rounded-full bg-amber-400/80" />
                        <span className="size-2.5 rounded-full bg-green-400/80" />
                      </div>
                      <div className="min-w-0 flex-1 truncate rounded-md bg-white/50 px-2.5 py-1 text-center text-xs text-muted-foreground ring-1 ring-white/60">
                        {profileDisplayUrl}
                      </div>
                    </div>
                    {profilePath ? (
                      <iframe
                        src={profilePath}
                        title="Booking profile preview"
                        className="h-72 w-full border-0 bg-white @4xl/onboarding:h-[32rem]"
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
                      className="min-h-11 bg-white/40"
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
                      className="min-h-11 bg-white/40"
                      disabled
                    >
                      View your profile
                    </Button>
                  )}
                </div>
              )}

              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}

              <div className="flex w-full flex-col gap-2">
                <Button
                  type="button"
                  size="lg"
                  className="min-h-11"
                  disabled={
                    isSubmitting ||
                    isUploadingLogo ||
                    isUploadingQr ||
                    (step === "role" && !selectedRole)
                  }
                  onClick={() => {
                    if (step === "role") handleContinueFromRole();
                    else if (step === "travel") void handleContinueFromTravel();
                    else if (step === "invoice") void handleContinueFromInvoice();
                    else if (step === "payment") void handleContinueFromPayment();
                    else if (step === "username")
                      void handleContinueFromUsername();
                    else handleComplete();
                  }}
                >
                  {continueLabel}
                </Button>

                {previousStep && (
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="min-h-11 bg-white/40"
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
    </div>
  );
}
