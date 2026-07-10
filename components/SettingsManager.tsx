"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { IconPlus, IconTrash, IconUpload } from "@tabler/icons-react";

import { LocationMapPicker, MapsProvider } from "@/components/LocationMapPicker";
import { PwaSettingsCard } from "@/components/PwaSettingsCard";
import { Badge } from "@/components/ui/badge";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Address } from "@/schemas/addressSchema";
import {
  getDefaultTimeSlots,
  type TimeSlot,
} from "@/schemas/settingSchema";

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
  };
  invoice: {
    company_name: string;
    company_registration_number?: string;
    company_logo?: string;
    terms_and_conditions: string;
  };
  time_slots: TimeSlot[];
};

const DISABLED_TRAVEL_LOCATION: Address = {
  placeId: "travel-disabled",
  formattedAddress: "Travel not enabled",
  displayName: "Travel not enabled",
  location: { lat: 0, lng: 0 },
};

const inputClassName = cn(
  "h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground",
  "placeholder:text-muted-foreground",
  "outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
);

const textareaClassName = cn(
  "min-h-40 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground",
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

export function SettingsManager({
  initialSettings,
  isStripeConnected,
  hasStripeAccount,
}: {
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
  const [stripeConnected] = useState(isStripeConnected);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

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

    await patchSettings("payment", {
      payment: { balance_due_before: days },
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

  async function handleLogoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setSectionError((current) => ({
        ...current,
        invoice: "Choose an image file.",
      }));
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setSectionError((current) => ({
        ...current,
        invoice: "Image must be 4 MB or smaller.",
      }));
      return;
    }

    setUploadingLogo(true);
    clearSectionFeedback("invoice");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "company-logos");

      const response = await fetch("/api/upload/image", {
        method: "POST",
        body: formData,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setSectionError((current) => ({
          ...current,
          invoice:
            typeof data.error === "string"
              ? data.error
              : "Could not upload logo.",
        }));
        return;
      }

      setCompanyLogo(data.url as string);
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleStripeConnect() {
    clearSectionFeedback("payouts");
    setConnectingStripe(true);

    try {
      const response = await fetch("/api/stripe/connect/account-link", {
        method: "POST",
      });
      const data = await response.json().catch(() => ({}));
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

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <div>
        <h2 className="text-lg font-semibold">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Manage pricing, travel, payments, invoice details, and payouts.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pricing model</CardTitle>
          <CardDescription>
            Charge clients by package or by style. Changing this resets your
            default time slots.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={chargeBy}
            onValueChange={(value) =>
              setChargeBy(value as "package" | "style")
            }
            className="gap-3"
          >
            <label className="flex cursor-pointer items-center gap-3 rounded-md border border-border px-3 py-2">
              <RadioGroupItem value="package" id="charge-package" />
              <span className="text-sm">
                <span className="font-medium">By package</span>
                <span className="block text-muted-foreground">
                  Makeup artist style pricing
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-center gap-3 rounded-md border border-border px-3 py-2">
              <RadioGroupItem value="style" id="charge-style" />
              <span className="text-sm">
                <span className="font-medium">By style</span>
                <span className="block text-muted-foreground">
                  Hijab stylist style pricing
                </span>
              </span>
            </label>
          </RadioGroup>
          {sectionError.charge_by ? (
            <p className="mt-3 text-sm text-destructive">
              {sectionError.charge_by}
            </p>
          ) : null}
          {sectionSuccess.charge_by ? (
            <p className="mt-3 text-sm text-muted-foreground">
              {sectionSuccess.charge_by}
            </p>
          ) : null}
        </CardContent>
        <CardFooter>
          <Button
            type="button"
            onClick={saveChargeBy}
            disabled={savingSection === "charge_by"}
          >
            {savingSection === "charge_by" ? "Saving…" : "Save"}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Travel</CardTitle>
          <CardDescription>
            Charge for travel from your base location.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Enable travel fee</p>
              <p className="text-sm text-muted-foreground">
                Clients pay based on distance from your base.
              </p>
            </div>
            <Switch
              checked={travelEnabled}
              onCheckedChange={setTravelEnabled}
            />
          </div>

          {travelEnabled ? (
            <MapsProvider>
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
              <Field label="Base location">
                <LocationMapPicker
                  value={travelLocation}
                  onChange={setTravelLocation}
                />
              </Field>
            </MapsProvider>
          ) : null}

          {sectionError.travel ? (
            <p className="text-sm text-destructive">{sectionError.travel}</p>
          ) : null}
          {sectionSuccess.travel ? (
            <p className="text-sm text-muted-foreground">
              {sectionSuccess.travel}
            </p>
          ) : null}
        </CardContent>
        <CardFooter>
          <Button
            type="button"
            onClick={saveTravel}
            disabled={savingSection === "travel"}
          >
            {savingSection === "travel" ? "Saving…" : "Save"}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment</CardTitle>
          <CardDescription>
            Require full payment when the session is within this many days.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field label="Balance due before (days)">
            <Input
              className={inputClassName}
              type="number"
              min="0"
              step="1"
              value={balanceDueBefore}
              onChange={(event) => setBalanceDueBefore(event.target.value)}
            />
          </Field>
          {sectionError.payment ? (
            <p className="text-sm text-destructive">{sectionError.payment}</p>
          ) : null}
          {sectionSuccess.payment ? (
            <p className="text-sm text-muted-foreground">
              {sectionSuccess.payment}
            </p>
          ) : null}
        </CardContent>
        <CardFooter>
          <Button
            type="button"
            onClick={savePayment}
            disabled={savingSection === "payment"}
          >
            {savingSection === "payment" ? "Saving…" : "Save"}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoice</CardTitle>
          <CardDescription>
            Company details shown on invoices and booking terms.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
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
          <div className="flex flex-col gap-2">
            <Label>Company logo</Label>
            {companyLogo ? (
              <div className="flex items-center gap-3 rounded-lg border p-2">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-muted">
                  <Image
                    src={companyLogo}
                    alt="Company logo"
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </div>
                <div className="flex flex-1 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingLogo}
                    onClick={() => logoInputRef.current?.click()}
                  >
                    <IconUpload className="size-4" />
                    Change
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={uploadingLogo}
                    onClick={() => setCompanyLogo("")}
                  >
                    <IconTrash className="size-4" />
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                disabled={uploadingLogo}
                onClick={() => logoInputRef.current?.click()}
              >
                <IconUpload className="size-4" />
                {uploadingLogo ? "Uploading…" : "Upload logo"}
              </Button>
            )}
            <input
              ref={logoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleLogoUpload}
            />
          </div>
          <Field label="Terms and conditions">
            <Textarea
              className={textareaClassName}
              value={terms}
              onChange={(event) => setTerms(event.target.value)}
            />
          </Field>
          {sectionError.invoice ? (
            <p className="text-sm text-destructive">{sectionError.invoice}</p>
          ) : null}
          {sectionSuccess.invoice ? (
            <p className="text-sm text-muted-foreground">
              {sectionSuccess.invoice}
            </p>
          ) : null}
        </CardContent>
        <CardFooter>
          <Button
            type="button"
            onClick={saveInvoice}
            disabled={savingSection === "invoice" || uploadingLogo}
          >
            {savingSection === "invoice" ? "Saving…" : "Save"}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Time slots</CardTitle>
          <CardDescription>
            Available session windows clients can book.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {timeSlots.map((slot, index) => (
            <div
              key={`${slot.startTime}-${slot.endTime}-${index}`}
              className="flex flex-wrap items-end gap-2 rounded-md border border-border p-3"
            >
              <Field label="Start">
                <Input
                  className={cn(inputClassName, "w-32")}
                  type="time"
                  value={slot.startTime}
                  onChange={(event) =>
                    updateTimeSlot(index, { startTime: event.target.value })
                  }
                />
              </Field>
              <Field label="End">
                <Input
                  className={cn(inputClassName, "w-32")}
                  type="time"
                  value={slot.endTime}
                  onChange={(event) =>
                    updateTimeSlot(index, { endTime: event.target.value })
                  }
                />
              </Field>
              <Button
                type="button"
                variant="ghost"
                size="icon"
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
          <Button
            type="button"
            variant="outline"
            className="w-fit"
            onClick={() =>
              setTimeSlots((current) => [
                ...current,
                { startTime: "09:00", endTime: "10:00" },
              ])
            }
          >
            <IconPlus className="size-4" />
            Add slot
          </Button>
          {sectionError.time_slots ? (
            <p className="text-sm text-destructive">{sectionError.time_slots}</p>
          ) : null}
          {sectionSuccess.time_slots ? (
            <p className="text-sm text-muted-foreground">
              {sectionSuccess.time_slots}
            </p>
          ) : null}
        </CardContent>
        <CardFooter>
          <Button
            type="button"
            onClick={saveTimeSlots}
            disabled={savingSection === "time_slots"}
          >
            {savingSection === "time_slots" ? "Saving…" : "Save"}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payouts</CardTitle>
          <CardDescription>
            Connect Stripe to receive booking deposits.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge variant={stripeConnected ? "default" : "secondary"}>
              {stripeConnected
                ? "Connected"
                : hasStripeAccount
                  ? "Setup incomplete"
                  : "Not connected"}
            </Badge>
          </div>
          {sectionError.payouts ? (
            <p className="text-sm text-destructive">{sectionError.payouts}</p>
          ) : null}
        </CardContent>
        <CardFooter>
          <Button
            type="button"
            onClick={handleStripeConnect}
            disabled={connectingStripe}
          >
            {connectingStripe
              ? "Opening Stripe…"
              : stripeConnected
                ? "Manage payouts in Stripe"
                : "Set up payouts"}
          </Button>
        </CardFooter>
      </Card>

      <PwaSettingsCard />
    </div>
  );
}
