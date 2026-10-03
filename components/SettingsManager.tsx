"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  IconBrandStripe,
  IconBuildingBank,
  IconCar,
  IconClock,
  IconCreditCard,
  IconPackage,
  IconPlus,
  IconSparkles,
  IconTrash,
} from "@tabler/icons-react";

import { CompanyLogoUpload } from "@/components/CompanyLogoUpload";
import {
  IconBadge,
  RowText,
  SettingsFeedback,
  SettingsSection,
  settingsCardClassName,
  settingsListClassName,
  settingsRowClassName,
} from "@/components/dashboard/settings/SettingsUi";
import { LocationMapPicker, MapsProvider } from "@/components/LocationMapPicker";
import { PaymentQrUpload } from "@/components/PaymentQrUpload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Address } from "@/schemas/addressSchema";
import {
  getDefaultTimeSlots,
  hasManualTransferDetails,
  type PaymentMethod,
  type TimeSlot,
} from "@/schemas/settingSchema";
import type { SettingsCategory } from "@/utils/dashboardShell";

export type SettingsItem = {
  _id: string;
  charge_by: "package" | "style";
  travel: {
    enabled: boolean;
    rate_per_km: number;
    location: Address;
  };
  payment: {
    balance_due_before: number;
    method: PaymentMethod;
    qr_image_url?: string;
    payee_name?: string;
    bank_name?: string;
    account_number?: string;
  };
  invoice: {
    company_name: string;
    company_registration_number?: string;
    company_logo?: string;
    terms_and_conditions: string;
  };
  time_slots: TimeSlot[];
  max_booking_year?: number;
};

const DISABLED_TRAVEL_LOCATION: Address = {
  placeId: "travel-disabled",
  formattedAddress: "Travel not enabled",
  displayName: "Travel not enabled",
  location: { lat: 0, lng: 0 },
};

const inputClassName = cn(
  "h-10 w-full rounded-md border border-border bg-white/60 px-3 text-sm text-foreground dark:bg-white/5",
  "placeholder:text-muted-foreground",
  "outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
);

const textareaClassName = cn(
  "min-h-40 w-full rounded-md border border-border bg-white/60 px-3 py-2 text-sm text-foreground dark:bg-white/5",
  "placeholder:text-muted-foreground",
  "outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
);
type SectionKey =
  | "charge_by"
  | "travel"
  | "payment"
  | "invoice"
  | "time_slots"
  | "payouts";

type StripeSetupPhase = "verifying" | "incomplete" | null;

const STRIPE_PAYOUT_MESSAGES: Record<
  string,
  { section: SectionKey; kind: "success" | "error"; message: string }
> = {
  ready: {
    section: "payment",
    kind: "success",
    message: "Stripe is connected. You can enable Payment Gateway.",
  },
  pending: {
    section: "payouts",
    kind: "success",
    message:
      "Stripe is reviewing your account. Payment Gateway unlocks when verification finishes.",
  },
  incomplete: {
    section: "payouts",
    kind: "error",
    message: "Stripe setup is incomplete. Continue setup to finish required details.",
  },
  missing: {
    section: "payouts",
    kind: "error",
    message: "No Stripe account found. Set up Stripe to continue.",
  },
  error: {
    section: "payouts",
    kind: "error",
    message: "Something went wrong with Stripe. Try opening setup again.",
  },
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function SettingsPanel({
  error,
  success,
  saving,
  disabled = false,
  onSave,
  children,
}: {
  error?: string;
  success?: string;
  saving: boolean;
  disabled?: boolean;
  onSave: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      {children}
      <SettingsFeedback error={error} success={success} />
      <Button
        type="button"
        size="lg"
        className="min-h-11"
        onClick={onSave}
        disabled={saving || disabled}
      >
        {saving ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}

function stripeStatusLabel(
  stripeConnected: boolean,
  hasStripeAccount: boolean,
  setupPhase: StripeSetupPhase
) {
  if (stripeConnected) return "Connected";
  if (setupPhase === "verifying") return "Verifying";
  if (hasStripeAccount || setupPhase === "incomplete") return "Setup incomplete";
  return "Not connected";
}

export function SettingsManager({
  category,
  initialSettings,
  isStripeConnected,
  hasStripeAccount,
}: {
  category: SettingsCategory | null;
  initialSettings: SettingsItem;
  isStripeConnected: boolean;
  hasStripeAccount: boolean;
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [chargeBy, setChargeBy] = useState(initialSettings.charge_by);
  const [travelEnabled, setTravelEnabled] = useState(
    initialSettings.travel.enabled
  );
  const [ratePerKm, setRatePerKm] = useState(
    String(initialSettings.travel.rate_per_km || "")
  );
  const [travelLocation, setTravelLocation] = useState<Address | null>(
    initialSettings.travel.enabled ? initialSettings.travel.location : null
  );
  const [balanceDueBefore, setBalanceDueBefore] = useState(
    String(initialSettings.payment.balance_due_before)
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    initialSettings.payment.method ?? "manual_transfer"
  );
  const [qrImageUrl, setQrImageUrl] = useState(
    initialSettings.payment.qr_image_url ?? ""
  );
  const [payeeName, setPayeeName] = useState(
    initialSettings.payment.payee_name ?? ""
  );
  const [bankName, setBankName] = useState(
    initialSettings.payment.bank_name ?? ""
  );
  const [accountNumber, setAccountNumber] = useState(
    initialSettings.payment.account_number ?? ""
  );
  const [uploadingQr, setUploadingQr] = useState(false);
  const [companyName, setCompanyName] = useState(
    initialSettings.invoice.company_name
  );
  const [companyReg, setCompanyReg] = useState(
    initialSettings.invoice.company_registration_number ?? ""
  );
  const [companyLogo, setCompanyLogo] = useState(
    initialSettings.invoice.company_logo ?? ""
  );
  const [terms, setTerms] = useState(
    initialSettings.invoice.terms_and_conditions
  );
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(
    initialSettings.time_slots
  );

  const [savingSection, setSavingSection] = useState<SectionKey | null>(null);
  const [sectionError, setSectionError] = useState<Partial<Record<SectionKey, string>>>({});
  const [sectionSuccess, setSectionSuccess] = useState<Partial<Record<SectionKey, string>>>({});
  const [stripeConnected, setStripeConnected] = useState(isStripeConnected);
  const [stripeSetupPhase, setStripeSetupPhase] = useState<StripeSetupPhase>(
    hasStripeAccount && !isStripeConnected ? "incomplete" : null
  );
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const status = searchParams.get("stripe_payout");
    if (!status) return;

    const feedback = STRIPE_PAYOUT_MESSAGES[status];
    if (feedback) {
      if (feedback.kind === "success") {
        setSectionSuccess((current) => ({
          ...current,
          [feedback.section]: feedback.message,
        }));
        setSectionError((current) => ({
          ...current,
          [feedback.section]: undefined,
        }));
      } else {
        setSectionError((current) => ({
          ...current,
          [feedback.section]: feedback.message,
        }));
        setSectionSuccess((current) => ({
          ...current,
          [feedback.section]: undefined,
        }));
      }
    }

    if (status === "ready") {
      setStripeConnected(true);
      setStripeSetupPhase(null);
    } else if (status === "pending") {
      setStripeConnected(false);
      setStripeSetupPhase("verifying");
    } else if (status === "incomplete" || status === "missing") {
      setStripeConnected(false);
      setStripeSetupPhase(status === "missing" ? null : "incomplete");
    }

    router.replace("/dashboard/settings/payment-method", { scroll: false });
  }, [router, searchParams]);

  function clearSectionFeedback(section: SectionKey) {
    setSectionError((current) => ({ ...current, [section]: undefined }));
    setSectionSuccess((current) => ({ ...current, [section]: undefined }));
  }

  function applySavedSetting(next: SettingsItem) {
    setSettings(next);
    setChargeBy(next.charge_by);
    setTravelEnabled(next.travel.enabled);
    setRatePerKm(String(next.travel.rate_per_km || ""));
    setTravelLocation(next.travel.enabled ? next.travel.location : null);
    setBalanceDueBefore(String(next.payment.balance_due_before));
    setPaymentMethod(next.payment.method ?? "manual_transfer");
    setQrImageUrl(next.payment.qr_image_url ?? "");
    setPayeeName(next.payment.payee_name ?? "");
    setBankName(next.payment.bank_name ?? "");
    setAccountNumber(next.payment.account_number ?? "");
    setCompanyName(next.invoice.company_name);
    setCompanyReg(next.invoice.company_registration_number ?? "");
    setCompanyLogo(next.invoice.company_logo ?? "");
    setTerms(next.invoice.terms_and_conditions);
    setTimeSlots(next.time_slots);
  }

  async function patchSettings(
    section: SectionKey,
    payload: Record<string, unknown>
  ) {
    clearSectionFeedback(section);
    setSavingSection(section);

    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setSectionError((current) => ({
          ...current,
          [section]:
            typeof data.error === "string"
              ? data.error
              : "Failed to save settings.",
        }));
        return null;
      }

      const saved = data.setting as SettingsItem;
      applySavedSetting(saved);
      setSectionSuccess((current) => ({
        ...current,
        [section]: "Saved.",
      }));
      return saved;
    } finally {
      setSavingSection(null);
    }
  }

  async function saveChargeBy() {
    const payload: Record<string, unknown> = { charge_by: chargeBy };
    if (chargeBy !== settings.charge_by) {
      payload.time_slots = getDefaultTimeSlots(chargeBy);
    }
    await patchSettings("charge_by", payload);
  }

  async function saveTravel() {
    if (travelEnabled) {
      const parsedRate = Number.parseFloat(ratePerKm);
      if (Number.isNaN(parsedRate) || parsedRate < 0) {
        setSectionError((current) => ({
          ...current,
          travel: "Enter a valid travel rate per km.",
        }));
        return;
      }
      if (!travelLocation) {
        setSectionError((current) => ({
          ...current,
          travel: "Pick a base location on the map.",
        }));
        return;
      }

      await patchSettings("travel", {
        travel: {
          enabled: true,
          rate_per_km: parsedRate,
          location: travelLocation,
        },
      });
      return;
    }

    await patchSettings("travel", {
      travel: {
        enabled: false,
        rate_per_km: 0,
        location: DISABLED_TRAVEL_LOCATION,
      },
    });
  }

  async function savePayment() {
    const days = Number.parseInt(balanceDueBefore, 10);
    if (!Number.isFinite(days) || days < 0) {
      setSectionError((current) => ({
        ...current,
        payment: "Enter a valid number of days.",
      }));
      return;
    }

    if (paymentMethod === "payment_gateway" && !stripeConnected) {
      setSectionError((current) => ({
        ...current,
        payment: hasStripeAccount
          ? "Wait for Stripe verification to finish before enabling Payment Gateway."
          : "Set up Stripe before enabling Payment Gateway.",
      }));
      return;
    }

    const transferDetails = {
      qr_image_url: qrImageUrl.trim() || undefined,
      payee_name: payeeName.trim() || undefined,
      bank_name: bankName.trim() || undefined,
      account_number: accountNumber.trim() || undefined,
    };

    if (
      paymentMethod === "manual_transfer" &&
      !hasManualTransferDetails({
        qr_image_url: transferDetails.qr_image_url,
        payee_name: transferDetails.payee_name,
        bank_name: transferDetails.bank_name,
        account_number: transferDetails.account_number,
      })
    ) {
      setSectionError((current) => ({
        ...current,
        payment:
          "Upload your payment QR and fill in payee name, bank, and account number.",
      }));
      return;
    }

    await patchSettings("payment", {
      payment: {
        balance_due_before: days,
        method: paymentMethod,
        ...transferDetails,
      },
    });
  }

  async function saveInvoice() {
    if (!companyName.trim()) {
      setSectionError((current) => ({
        ...current,
        invoice: "Company name is required.",
      }));
      return;
    }
    if (!terms.trim()) {
      setSectionError((current) => ({
        ...current,
        invoice: "Terms and conditions are required.",
      }));
      return;
    }

    await patchSettings("invoice", {
      invoice: {
        company_name: companyName.trim(),
        company_registration_number: companyReg.trim() || undefined,
        company_logo: companyLogo,
        terms_and_conditions: terms.trim(),
      },
    });
  }

  async function saveCompanyLogo(url: string) {
    setCompanyLogo(url);
    clearSectionFeedback("invoice");
    setSavingSection("invoice");

    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice: { company_logo: url },
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setSectionError((current) => ({
          ...current,
          invoice:
            typeof data.error === "string"
              ? data.error
              : "Failed to save logo.",
        }));
        return;
      }

      const saved = data.setting as SettingsItem;
      setSettings(saved);
      setCompanyLogo(saved.invoice.company_logo ?? "");
      setSectionSuccess((current) => ({
        ...current,
        invoice: url ? "Logo saved." : "Logo removed.",
      }));
    } finally {
      setSavingSection(null);
    }
  }

  async function saveTimeSlots() {
    if (timeSlots.length === 0) {
      setSectionError((current) => ({
        ...current,
        time_slots: "Add at least one time slot.",
      }));
      return;
    }

    for (const slot of timeSlots) {
      if (!slot.startTime || !slot.endTime) {
        setSectionError((current) => ({
          ...current,
          time_slots: "Each slot needs a start and end time.",
        }));
        return;
      }
      if (slot.startTime >= slot.endTime) {
        setSectionError((current) => ({
          ...current,
          time_slots: "End time must be after start time.",
        }));
        return;
      }
    }

    await patchSettings("time_slots", { time_slots: timeSlots });
  }

  async function handleStripeConnect() {
    clearSectionFeedback("payouts");
    setConnectingStripe(true);

    try {
      const response = await fetch("/api/stripe/connect/account-link", {
        method: "POST",
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.ready === true) {
        setStripeConnected(true);
        setStripeSetupPhase(null);
        setSectionSuccess((current) => ({
          ...current,
          payouts: STRIPE_PAYOUT_MESSAGES.ready.message,
          payment: STRIPE_PAYOUT_MESSAGES.ready.message,
        }));
        setSectionError((current) => ({
          ...current,
          payouts: undefined,
          payment: undefined,
        }));
        router.refresh();
        return;
      }
      if (!response.ok || typeof data.url !== "string") {
        setSectionError((current) => ({
          ...current,
          payouts:
            typeof data.error === "string"
              ? data.error
              : "Could not start Stripe onboarding.",
        }));
        return;
      }

      window.location.href = data.url;
    } finally {
      setConnectingStripe(false);
    }
  }

  function updateTimeSlot(index: number, patch: Partial<TimeSlot>) {
    setTimeSlots((current) =>
      current.map((slot, i) => (i === index ? { ...slot, ...patch } : slot))
    );
  }

  if (category === "pricing-model") {
    return (
      <SettingsPanel
        error={sectionError.charge_by}
        success={sectionSuccess.charge_by}
        saving={savingSection === "charge_by"}
        onSave={saveChargeBy}
      >
        <SettingsSection title="Charge clients by">
          <RadioGroup
            value={chargeBy}
            onValueChange={(value) => setChargeBy(value as "package" | "style")}
            className={settingsListClassName}
          >
            <label className={cn(settingsRowClassName, "cursor-pointer")}>
              <IconBadge icon={IconPackage} />
              <RowText
                title="By package"
                description="Makeup artist style pricing"
              />
              <RadioGroupItem value="package" aria-label="By package" />
            </label>
            <label className={cn(settingsRowClassName, "cursor-pointer")}>
              <IconBadge icon={IconSparkles} />
              <RowText
                title="By style"
                description="Hijab stylist style pricing"
              />
              <RadioGroupItem value="style" aria-label="By style" />
            </label>
          </RadioGroup>
          <p className="text-xs text-muted-foreground">
            Changing this resets your default time slots.
          </p>
        </SettingsSection>
      </SettingsPanel>
    );
  }

  if (category === "travel-fee") {
    return (
      <SettingsPanel
        error={sectionError.travel}
        success={sectionSuccess.travel}
        saving={savingSection === "travel"}
        onSave={saveTravel}
      >
        <SettingsSection title="Travel fee">
          <div className={settingsListClassName}>
            <label className={cn(settingsRowClassName, "cursor-pointer")}>
              <IconBadge icon={IconCar} />
              <RowText
                title="Enable travel fee"
                description="Clients pay based on distance from your base."
              />
              <Switch
                checked={travelEnabled}
                onCheckedChange={setTravelEnabled}
              />
            </label>
          </div>
        </SettingsSection>

        {travelEnabled ? (
          <MapsProvider>
            <SettingsSection title="Rate">
              <div className={settingsCardClassName}>
                <Field label="Rate per km (RM)">
                  <Input
                    className={inputClassName}
                    type="number"
                    min="0"
                    step="0.01"
                    value={ratePerKm}
                    onChange={(event) => setRatePerKm(event.target.value)}
                    placeholder="1.00"
                  />
                </Field>
                <p className="text-xs text-muted-foreground">
                  Travel is charged as a round trip — to the client and back to
                  your base. For example, 10 km away at RM 1/km adds RM 20 to
                  the booking.
                </p>
              </div>
            </SettingsSection>
            <SettingsSection title="Base location">
              <div className={settingsCardClassName}>
                <LocationMapPicker
                  value={travelLocation}
                  onChange={setTravelLocation}
                />
              </div>
            </SettingsSection>
          </MapsProvider>
        ) : null}
      </SettingsPanel>
    );
  }

  if (category === "payment-method") {
    return (
      <SettingsPanel
        error={sectionError.payment}
        success={sectionSuccess.payment}
        saving={savingSection === "payment"}
        disabled={uploadingQr}
        onSave={savePayment}
      >
        <SettingsSection title="How clients pay">
          <RadioGroup
            value={paymentMethod}
            onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
            className={settingsListClassName}
          >
            <label className={cn(settingsRowClassName, "cursor-pointer")}>
              <IconBadge icon={IconBuildingBank} />
              <RowText
                title="Manual Transfer"
                description="Clients pay via your QR or bank transfer and upload a receipt. You verify payments in Bookings before the booking is confirmed."
              />
              <RadioGroupItem value="manual_transfer" aria-label="Manual Transfer" />
            </label>
            <label className={cn(settingsRowClassName, "cursor-pointer")}>
              <IconBadge icon={IconCreditCard} />
              <RowText
                title="Payment Gateway"
                description="Clients pay online with Stripe (card / FPX). Setup takes about 3 minutes and requires your SSM and Tax Identification Number."
              />
              <RadioGroupItem value="payment_gateway" aria-label="Payment Gateway" />
            </label>
          </RadioGroup>
        </SettingsSection>

        {paymentMethod === "manual_transfer" ? (
          <SettingsSection title="Transfer details">
            <div className={settingsCardClassName}>
              <PaymentQrUpload
                value={qrImageUrl}
                onChange={setQrImageUrl}
                disabled={savingSection === "payment" || uploadingQr}
                onUploadingChange={setUploadingQr}
                onError={(message) =>
                  setSectionError((current) => ({
                    ...current,
                    payment: message ?? undefined,
                  }))
                }
              />
              <Field label="Payee / account name">
                <Input
                  className={inputClassName}
                  value={payeeName}
                  onChange={(event) => setPayeeName(event.target.value)}
                  placeholder="e.g. Your business name"
                />
              </Field>
              <Field label="Bank name">
                <Input
                  className={inputClassName}
                  value={bankName}
                  onChange={(event) => setBankName(event.target.value)}
                  placeholder="e.g. Maybank"
                />
              </Field>
              <Field label="Account number">
                <Input
                  className={inputClassName}
                  value={accountNumber}
                  onChange={(event) => setAccountNumber(event.target.value)}
                  placeholder="e.g. 1234 5678 9012"
                />
              </Field>
            </div>
          </SettingsSection>
        ) : null}

        {paymentMethod === "payment_gateway" ? (
          <SettingsSection title="Stripe">
            <div className={settingsCardClassName}>
              <div className="flex items-center gap-3">
                <IconBadge icon={IconBrandStripe} />
                <RowText
                  title="Stripe account"
                  description={
                    stripeConnected
                      ? "Clients can pay you online."
                      : stripeSetupPhase === "verifying"
                        ? "Stripe is reviewing your details. You can enable Payment Gateway once this shows Connected."
                        : "Finish Stripe setup before enabling Payment Gateway. Clients cannot pay online until this is connected."
                  }
                />
                <Badge variant={stripeConnected ? "default" : "secondary"}>
                  {stripeStatusLabel(
                    stripeConnected,
                    hasStripeAccount,
                    stripeSetupPhase
                  )}
                </Badge>
              </div>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="min-h-11"
                onClick={handleStripeConnect}
                disabled={connectingStripe}
              >
                {connectingStripe
                  ? "Opening Stripe…"
                  : stripeConnected
                    ? "Manage Stripe account"
                    : stripeSetupPhase === "verifying"
                      ? "Check Stripe status"
                      : "Set up Stripe"}
              </Button>
              <SettingsFeedback
                error={sectionError.payouts}
                success={sectionSuccess.payouts}
              />
            </div>
          </SettingsSection>
        ) : null}

        <SettingsSection title="Balance due">
          <div className={settingsCardClassName}>
            <Field label="Days before the session">
              <Input
                className={inputClassName}
                type="number"
                min="0"
                step="1"
                value={balanceDueBefore}
                onChange={(event) => setBalanceDueBefore(event.target.value)}
              />
            </Field>
          </div>
        </SettingsSection>
      </SettingsPanel>
    );
  }

  if (category === "invoice") {
    return (
      <SettingsPanel
        error={sectionError.invoice}
        success={sectionSuccess.invoice}
        saving={savingSection === "invoice"}
        disabled={uploadingLogo}
        onSave={saveInvoice}
      >
        <SettingsSection title="Company">
          <div className={settingsCardClassName}>
            <Field label="Company name">
              <Input
                className={inputClassName}
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
              />
            </Field>
            <Field label="Registration number (optional)">
              <Input
                className={inputClassName}
                value={companyReg}
                onChange={(event) => setCompanyReg(event.target.value)}
              />
            </Field>
          </div>
        </SettingsSection>
        <SettingsSection title="Logo">
          <div className={settingsCardClassName}>
            <CompanyLogoUpload
              value={companyLogo}
              onChange={(url) => {
                void saveCompanyLogo(url);
              }}
              disabled={savingSection === "invoice"}
              onUploadingChange={setUploadingLogo}
              hint="JPEG, PNG, WebP, or GIF. Large images are compressed automatically. Cropped to 16:9. Saves automatically."
            />
          </div>
        </SettingsSection>
        <SettingsSection title="Terms and conditions">
          <div className={settingsCardClassName}>
            <Textarea
              className={textareaClassName}
              value={terms}
              onChange={(event) => setTerms(event.target.value)}
              aria-label="Terms and conditions"
            />
          </div>
        </SettingsSection>
      </SettingsPanel>
    );
  }

  if (category === "time-slots") {
    return (
      <SettingsPanel
        error={sectionError.time_slots}
        success={sectionSuccess.time_slots}
        saving={savingSection === "time_slots"}
        onSave={saveTimeSlots}
      >
        <SettingsSection title="Slots">
          <div className={settingsListClassName}>
            {timeSlots.map((slot, index) => (
              <div
                key={`${slot.startTime}-${slot.endTime}-${index}`}
                className="flex items-center gap-2 py-3 pr-2 pl-4"
              >
                <IconBadge icon={IconClock} />
                <Input
                  className={cn(inputClassName, "min-w-0 flex-1 px-2")}
                  type="time"
                  value={slot.startTime}
                  aria-label="Start time"
                  onChange={(event) =>
                    updateTimeSlot(index, { startTime: event.target.value })
                  }
                />
                <span className="text-muted-foreground">–</span>
                <Input
                  className={cn(inputClassName, "min-w-0 flex-1 px-2")}
                  type="time"
                  value={slot.endTime}
                  aria-label="End time"
                  onChange={(event) =>
                    updateTimeSlot(index, { endTime: event.target.value })
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  disabled={timeSlots.length <= 1}
                  onClick={() =>
                    setTimeSlots((current) =>
                      current.filter((_, i) => i !== index)
                    )
                  }
                  aria-label="Remove time slot"
                >
                  <IconTrash className="size-4" />
                </Button>
              </div>
            ))}
            <button
              type="button"
              className={settingsRowClassName}
              onClick={() =>
                setTimeSlots((current) => [
                  ...current,
                  { startTime: "09:00", endTime: "10:00" },
                ])
              }
            >
              <IconBadge icon={IconPlus} />
              <RowText title="Add slot" />
            </button>
          </div>
        </SettingsSection>
      </SettingsPanel>
    );
  }

  return null;
}

