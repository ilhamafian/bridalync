"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  IconBed,
  IconBrandStripe,
  IconBuildingBank,
  IconCar,
  IconClock,
  IconCreditCard,
  IconMap,
  IconMapPin,
  IconPackage,
  IconRoute,
  IconPlus,
  IconSparkles,
  IconSunrise,
  IconTrash,
  IconUserHeart,
} from "@tabler/icons-react";

import { ProcessingFeeHint } from "@/components/catalog/ProcessingFeeHint";
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
import { useStyleTerms } from "@/components/dashboard/StyleTermsProvider";
import { LocationMapPicker, MapsProvider } from "@/components/LocationMapPicker";
import { PaymentQrUpload } from "@/components/PaymentQrUpload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Address } from "@/schemas/addressSchema";
import type { ClientInfoSetting } from "@/schemas/clientInfoSchema";
import {
  getDefaultTimeSlots,
  hasManualTransferDetails,
  type AccommodationProvider,
  type MorningCallSetting,
  type PaymentMethod,
  type RegionId,
  type RegionPrices,
  type TimeSlot,
  type TravelMode,
  type TravelRegionMode,
} from "@/schemas/settingSchema";
import { RegionPriceList } from "@/components/RegionPriceList";
import {
  MALAYSIA_REGIONS,
  parseRegionPriceInputs,
  toRegionPriceInputs,
  type RegionPriceInputs,
} from "@/utils/booking/regions";
import {
  buildReviewRequestMessage,
  DEFAULT_REVIEW_REQUEST_TEMPLATE,
  REVIEW_REQUEST_PLACEHOLDERS,
  REVIEW_REQUEST_TEMPLATE_MAX_LENGTH,
} from "@/utils/booking/messages";
import { DEFAULT_MORNING_CALL_BEFORE } from "@/utils/booking/morningCall";
import { LONG_DISTANCE_THRESHOLD_KM } from "@/utils/booking/travel";
import type { SettingsCategory } from "@/utils/dashboardShell";

type StatesTab = "areas" | "travel-days";

export type SettingsItem = {
  _id: string;
  charge_by: "package" | "style";
  travel: {
    enabled: boolean;
    mode?: TravelMode;
    rate_per_km: number;
    long_distance_rate_per_km?: number;
    location: Address;
    region_mode?: TravelRegionMode;
    region_prices?: RegionPrices;
    accommodation_by?: AccommodationProvider;
    base_region?: RegionId;
    travel_buffer_regions?: RegionId[];
    unserved_regions?: RegionId[];
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
  morning_call?: MorningCallSetting | null;
  messages: { review_request?: string };
  client_info: ClientInfoSetting;
  booking_requests: boolean;
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
  | "messages"
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
  freelancerName,
  onChargeByChange,
  onTravelChange,
  onPaymentMethodChange,
}: {
  category: SettingsCategory | null;
  initialSettings: SettingsItem;
  isStripeConnected: boolean;
  hasStripeAccount: boolean;
  freelancerName: string;
  onChargeByChange?: (chargeBy: SettingsItem["charge_by"]) => void;
  onTravelChange?: (travel: SettingsItem["travel"]) => void;
  onPaymentMethodChange?: (method: PaymentMethod) => void;
}) {
  const styleTerms = useStyleTerms();
  const [settings, setSettings] = useState(initialSettings);
  const [chargeBy, setChargeBy] = useState(initialSettings.charge_by);
  const [travelEnabled, setTravelEnabled] = useState(
    initialSettings.travel.enabled
  );
  const [ratePerKm, setRatePerKm] = useState(
    String(initialSettings.travel.rate_per_km || "")
  );
  const [longDistanceRatePerKm, setLongDistanceRatePerKm] = useState(
    String(initialSettings.travel.long_distance_rate_per_km ?? "")
  );
  const [travelLocation, setTravelLocation] = useState<Address | null>(
    initialSettings.travel.enabled &&
      initialSettings.travel.location.placeId !== DISABLED_TRAVEL_LOCATION.placeId
      ? initialSettings.travel.location
      : null
  );
  const [travelMode, setTravelMode] = useState<TravelMode>(
    initialSettings.travel.mode ?? "distance"
  );
  const [regionMode, setRegionMode] = useState<TravelRegionMode>(
    initialSettings.travel.region_mode ?? "fixed"
  );
  const [regionPrices, setRegionPrices] = useState<RegionPriceInputs>(() =>
    toRegionPriceInputs(initialSettings.travel.region_prices)
  );
  const [accommodationBy, setAccommodationBy] = useState<AccommodationProvider>(
    initialSettings.travel.accommodation_by ?? "self"
  );
  const [baseRegion, setBaseRegion] = useState<RegionId | null>(
    initialSettings.travel.base_region ?? null
  );
  const [bufferRegions, setBufferRegions] = useState<RegionId[]>(
    initialSettings.travel.travel_buffer_regions ?? []
  );
  const [unservedRegions, setUnservedRegions] = useState<RegionId[]>(
    initialSettings.travel.unserved_regions ?? []
  );
  const hiddenPriceRegions = unservedRegions.filter((id) => id !== baseRegion);
  const travelDayRegions = MALAYSIA_REGIONS.filter(
    (region) =>
      region.id !== baseRegion && !unservedRegions.includes(region.id)
  );
  const [statesTab, setStatesTab] = useState<StatesTab>("areas");
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
  const [morningCallEnabled, setMorningCallEnabled] = useState(
    initialSettings.morning_call?.enabled ?? false
  );
  const [morningCallBefore, setMorningCallBefore] = useState(
    initialSettings.morning_call?.before ?? DEFAULT_MORNING_CALL_BEFORE
  );
  const [morningCallPrice, setMorningCallPrice] = useState(
    String(initialSettings.morning_call?.price ?? "")
  );
  const morningCallSlots = timeSlots.filter(
    (slot) => slot.startTime < morningCallBefore
  );
  const [reviewTemplate, setReviewTemplate] = useState(
    initialSettings.messages?.review_request?.trim() ||
      DEFAULT_REVIEW_REQUEST_TEMPLATE
  );
  const reviewTemplateRef = useRef<HTMLTextAreaElement>(null);

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
    setLongDistanceRatePerKm(
      String(next.travel.long_distance_rate_per_km ?? "")
    );
    setTravelLocation(
      next.travel.enabled && next.travel.location.placeId !== DISABLED_TRAVEL_LOCATION.placeId
        ? next.travel.location
        : null
    );
    setTravelMode(next.travel.mode ?? "distance");
    setRegionMode(next.travel.region_mode ?? "fixed");
    setRegionPrices(toRegionPriceInputs(next.travel.region_prices));
    setAccommodationBy(next.travel.accommodation_by ?? "self");
    setBaseRegion(next.travel.base_region ?? null);
    setBufferRegions(next.travel.travel_buffer_regions ?? []);
    setUnservedRegions(next.travel.unserved_regions ?? []);
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
    setMorningCallEnabled(next.morning_call?.enabled ?? false);
    setMorningCallBefore(
      next.morning_call?.before ?? DEFAULT_MORNING_CALL_BEFORE
    );
    setMorningCallPrice(String(next.morning_call?.price ?? ""));
    setReviewTemplate(
      next.messages?.review_request?.trim() || DEFAULT_REVIEW_REQUEST_TEMPLATE
    );
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
    const saved = await patchSettings("charge_by", payload);
    if (saved) onChargeByChange?.(saved.charge_by);
  }

  async function saveTravel() {
    if (accommodationBy === "client" && !baseRegion) {
      setSectionError((current) => ({
        ...current,
        travel: "Pick your base state.",
      }));
      return;
    }
    const accommodation = {
      accommodation_by: accommodationBy,
      ...(baseRegion ? { base_region: baseRegion } : {}),
      travel_buffer_regions: bufferRegions.filter(
        (id) => id !== baseRegion && !unservedRegions.includes(id)
      ),
      unserved_regions: hiddenPriceRegions,
    };

    if (travelEnabled && travelMode === "region") {
      const parsedPrices = parseRegionPriceInputs(regionPrices);
      if (!parsedPrices) {
        setSectionError((current) => ({
          ...current,
          travel: "Enter a valid price for each state, or leave it blank.",
        }));
        return;
      }
      const effectiveRegionMode =
        settings.charge_by === "package" ? regionMode : "fixed";
      if (
        effectiveRegionMode === "fixed" &&
        Object.keys(parsedPrices).every((id) =>
          hiddenPriceRegions.includes(id as RegionId)
        )
      ) {
        setSectionError((current) => ({
          ...current,
          travel: "Enter a price for at least one state you serve.",
        }));
        return;
      }

      const saved = await patchSettings("travel", {
        travel: {
          enabled: true,
          mode: "region",
          region_mode: effectiveRegionMode,
          region_prices: parsedPrices,
          location: travelLocation ?? settings.travel.location,
          ...accommodation,
        },
      });
      if (saved) {
      onTravelChange?.(saved.travel);
      router.refresh();
    }
      return;
    }

    if (travelEnabled) {
      const parsedRate = Number.parseFloat(ratePerKm);
      if (Number.isNaN(parsedRate) || parsedRate < 0) {
        setSectionError((current) => ({
          ...current,
          travel: "Enter a valid travel rate per km.",
        }));
        return;
      }
      const longDistanceRaw = longDistanceRatePerKm.trim();
      const parsedLongDistanceRate =
        longDistanceRaw === "" ? null : Number.parseFloat(longDistanceRaw);
      if (
        parsedLongDistanceRate !== null &&
        (Number.isNaN(parsedLongDistanceRate) || parsedLongDistanceRate < 0)
      ) {
        setSectionError((current) => ({
          ...current,
          travel: `Enter a valid rate for trips over ${LONG_DISTANCE_THRESHOLD_KM} km.`,
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

      const saved = await patchSettings("travel", {
        travel: {
          enabled: true,
          mode: "distance",
          rate_per_km: parsedRate,
          long_distance_rate_per_km: parsedLongDistanceRate,
          location: travelLocation,
          ...accommodation,
        },
      });
      if (saved) {
      onTravelChange?.(saved.travel);
      router.refresh();
    }
      return;
    }

    const saved = await patchSettings("travel", {
      travel: {
        enabled: false,
        rate_per_km: 0,
        location: DISABLED_TRAVEL_LOCATION,
        ...accommodation,
      },
    });
    if (saved) {
      onTravelChange?.(saved.travel);
      router.refresh();
    }
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

    const saved = await patchSettings("payment", {
      payment: {
        balance_due_before: days,
        method: paymentMethod,
        ...transferDetails,
      },
    });
    if (saved) {
      onPaymentMethodChange?.(saved.payment.method ?? "manual_transfer");
    }
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

    const price = morningCallPrice.trim() === "" ? 0 : Number(morningCallPrice);
    if (morningCallEnabled) {
      if (!morningCallBefore) {
        setSectionError((current) => ({
          ...current,
          time_slots: "Pick the morning call time.",
        }));
        return;
      }
      if (!Number.isFinite(price) || price <= 0) {
        setSectionError((current) => ({
          ...current,
          time_slots: "Enter a morning call charge above RM 0.",
        }));
        return;
      }
    }

    const saved = await patchSettings("time_slots", {
      time_slots: timeSlots,
      morning_call: {
        enabled: morningCallEnabled,
        before: morningCallBefore || DEFAULT_MORNING_CALL_BEFORE,
        price: Number.isFinite(price) && price > 0 ? price : 0,
      },
    });
    if (saved) router.refresh();
  }

  async function saveMessages() {
    const template = reviewTemplate.trim();
    if (template.length > REVIEW_REQUEST_TEMPLATE_MAX_LENGTH) {
      setSectionError((current) => ({
        ...current,
        messages: `Keep the message under ${REVIEW_REQUEST_TEMPLATE_MAX_LENGTH} characters.`,
      }));
      return;
    }

    const saved = await patchSettings("messages", {
      messages: {
        review_request:
          template === DEFAULT_REVIEW_REQUEST_TEMPLATE ? "" : template,
      },
    });
    if (saved) router.refresh();
  }

  function insertPlaceholder(token: string) {
    const textarea = reviewTemplateRef.current;
    const start = textarea?.selectionStart ?? reviewTemplate.length;
    const end = textarea?.selectionEnd ?? reviewTemplate.length;
    setReviewTemplate(
      (current) => current.slice(0, start) + token + current.slice(end)
    );
    requestAnimationFrame(() => {
      if (!textarea) return;
      textarea.focus();
      const caret = start + token.length;
      textarea.setSelectionRange(caret, caret);
    });
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
                title="By event"
                description="Recommended for makeup artists"
              />
              <RadioGroupItem value="package" aria-label="By event" />
            </label>
            <label className={cn(settingsRowClassName, "cursor-pointer")}>
              <IconBadge icon={IconSparkles} />
              <RowText
                title={`By ${styleTerms.one}`}
                description={
                  styleTerms.kind === "look"
                    ? "Clients pick a look for each session"
                    : "Recommended for hijab stylists"
                }
              />
              <RadioGroupItem value="style" aria-label={`By ${styleTerms.one}`} />
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
                description="Charge clients for travelling to their venue."
              />
              <Switch
                checked={travelEnabled}
                onCheckedChange={setTravelEnabled}
              />
            </label>
          </div>
        </SettingsSection>

        {travelEnabled ? (
          <SettingsSection title="Charge by">
            <RadioGroup
              value={travelMode}
              onValueChange={(value) => setTravelMode(value as TravelMode)}
              className={settingsListClassName}
            >
              <label className={cn(settingsRowClassName, "cursor-pointer")}>
                <IconBadge icon={IconRoute} />
                <RowText
                  title="By distance"
                  description="A rate per km from your base location."
                />
                <RadioGroupItem value="distance" aria-label="By distance" />
              </label>
              <label className={cn(settingsRowClassName, "cursor-pointer")}>
                <IconBadge icon={IconMap} />
                <RowText
                  title="By state"
                  description="A price for each state you serve."
                />
                <RadioGroupItem value="region" aria-label="By state" />
              </label>
            </RadioGroup>
          </SettingsSection>
        ) : null}

        {travelEnabled && travelMode === "region" ? (
          <>
            {settings.charge_by === "package" ? (
              <SettingsSection title="State pricing">
                <RadioGroup
                  value={regionMode}
                  onValueChange={(value) =>
                    setRegionMode(value as TravelRegionMode)
                  }
                  className={settingsListClassName}
                >
                  <label className={cn(settingsRowClassName, "cursor-pointer")}>
                    <IconBadge icon={IconMapPin} />
                    <RowText
                      title="Fixed charge"
                      description="One price per state, added to every event."
                    />
                    <RadioGroupItem value="fixed" aria-label="Fixed charge" />
                  </label>
                  <label className={cn(settingsRowClassName, "cursor-pointer")}>
                    <IconBadge icon={IconPackage} />
                    <RowText
                      title="Different charge by event"
                      description="Each event has its own price per state."
                    />
                    <RadioGroupItem
                      value="per_event"
                      aria-label="Different charge by event"
                    />
                  </label>
                </RadioGroup>
              </SettingsSection>
            ) : null}

            {settings.charge_by === "package" && regionMode === "per_event" ? (
              <div className={settingsCardClassName}>
                <p className="text-muted-foreground">
                  Set each event&apos;s price per state in Events &amp;{" "}
                  {styleTerms.many}.
                  The price already includes travel, so clients see one price
                  for the event.
                </p>
              </div>
            ) : (
              <SettingsSection title="Prices">
                <RegionPriceList
                  value={regionPrices}
                  onChange={setRegionPrices}
                  feeHint="extra"
                  hiddenRegions={hiddenPriceRegions}
                />
                <p className="text-xs text-muted-foreground">
                  The state&apos;s price is included in the booking price, not
                  shown as a separate travel fee. Leave a state blank if you
                  don&apos;t serve it. When sessions are in different states,
                  the highest price is charged once.
                </p>
              </SettingsSection>
            )}
          </>
        ) : null}

        {travelEnabled && travelMode === "distance" ? (
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
            <SettingsSection title={`Over ${LONG_DISTANCE_THRESHOLD_KM} km`}>
              <div className={settingsCardClassName}>
                <Field label="Rate per km (RM)">
                  <Input
                    className={inputClassName}
                    type="number"
                    min="0"
                    step="0.01"
                    value={longDistanceRatePerKm}
                    onChange={(event) =>
                      setLongDistanceRatePerKm(event.target.value)
                    }
                    placeholder={ratePerKm || "1.50"}
                  />
                </Field>
                <p className="text-xs text-muted-foreground">
                  When the client is more than {LONG_DISTANCE_THRESHOLD_KM} km
                  away, this rate is used for the whole trip instead. For
                  example, 120 km away at RM 1.50/km adds RM 360. Leave blank to
                  use your normal rate.
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

        <SettingsSection title="Out-of-state accommodation & transport">
          <RadioGroup
            value={accommodationBy}
            onValueChange={(value) =>
              setAccommodationBy(value as AccommodationProvider)
            }
            className={settingsListClassName}
          >
            <label className={cn(settingsRowClassName, "cursor-pointer")}>
              <IconBadge icon={IconBed} />
              <RowText
                title="Provided by me"
                description="You arrange your own stay and transport."
              />
              <RadioGroupItem value="self" aria-label="Provided by me" />
            </label>
            <label className={cn(settingsRowClassName, "cursor-pointer")}>
              <IconBadge icon={IconUserHeart} />
              <RowText
                title="Provided by the client"
                description="Clients outside your base state are told they must provide them."
              />
              <RadioGroupItem value="client" aria-label="Provided by the client" />
            </label>
          </RadioGroup>
          {accommodationBy === "client" ? (
            <div className={settingsCardClassName}>
              <Field label="Your base state">
                <Select
                  value={baseRegion ?? undefined}
                  onValueChange={(value) => setBaseRegion(value as RegionId)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {MALAYSIA_REGIONS.map((region) => (
                      <SelectItem key={region.id} value={region.id}>
                        {region.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <p className="text-xs text-muted-foreground">
                When a session&apos;s venue is in another state, the client
                must agree to provide your accommodation and transport before
                continuing their booking.
              </p>
            </div>
          ) : null}
        </SettingsSection>

        <SettingsSection title="States">
          <Tabs
            value={statesTab}
            onValueChange={(value) => setStatesTab(value as StatesTab)}
            className="gap-3"
          >
            <TabsList className="grid h-10! w-full grid-cols-2 bg-white/30 shadow-sm ring-1 ring-white/60 backdrop-blur-sm dark:bg-white/10 dark:ring-white/15">
              <TabsTrigger value="areas" className="text-sm">
                Service areas
              </TabsTrigger>
              <TabsTrigger value="travel-days" className="text-sm">
                Travel days
              </TabsTrigger>
            </TabsList>

            <TabsContent value="areas" className="flex flex-col gap-2">
              <p className="text-xs text-muted-foreground">
                States you take bookings in. Clients with a venue in a state
                that&apos;s off are asked to change location.
              </p>
              <div className={settingsListClassName}>
                {MALAYSIA_REGIONS.map((region) => {
                  const isBase = region.id === baseRegion;
                  const served = isBase || !unservedRegions.includes(region.id);
                  return (
                    <label
                      key={region.id}
                      className={cn(
                        settingsRowClassName,
                        "py-2.5",
                        isBase ? "hover:bg-transparent" : "cursor-pointer"
                      )}
                    >
                      <RowText
                        title={region.label}
                        description={
                          isBase
                            ? "Your base state · always on"
                            : served
                              ? undefined
                              : "Clients can't book here"
                        }
                      />
                      <Switch
                        checked={served}
                        disabled={isBase}
                        onCheckedChange={(checked) =>
                          setUnservedRegions((current) =>
                            checked
                              ? current.filter((id) => id !== region.id)
                              : [...current, region.id]
                          )
                        }
                        aria-label={`Take bookings in ${region.label}`}
                      />
                    </label>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="travel-days" className="flex flex-col gap-2">
              <p className="text-xs text-muted-foreground">
                For bookings in these states, the day before and after each
                session is blocked so other clients can&apos;t book them.
                Applies once a booking holds its slot (booked, or a request you
                approved). Only states you serve are listed.
              </p>
              {travelDayRegions.length > 0 ? (
                <div className={settingsListClassName}>
                  {travelDayRegions.map((region) => (
                    <label
                      key={region.id}
                      className={cn(settingsRowClassName, "cursor-pointer py-2.5")}
                    >
                      <RowText title={region.label} />
                      <Switch
                        checked={bufferRegions.includes(region.id)}
                        onCheckedChange={(checked) =>
                          setBufferRegions((current) =>
                            checked
                              ? [...current, region.id]
                              : current.filter((id) => id !== region.id)
                          )
                        }
                        aria-label={`Block travel days for ${region.label}`}
                      />
                    </label>
                  ))}
                </div>
              ) : (
                <div className={settingsCardClassName}>
                  <p className="text-muted-foreground">
                    Turn on a state in Service areas to set travel days for it.
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </SettingsSection>
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

  if (category === "messages") {
    const isDefault = reviewTemplate.trim() === DEFAULT_REVIEW_REQUEST_TEMPLATE;
    const preview = buildReviewRequestMessage({
      clientName: "Aisyah Rahman",
      freelancerName,
      reviewUrl: "https://bridalync.com/you/review/…",
      template: reviewTemplate,
    });

    return (
      <SettingsPanel
        error={sectionError.messages}
        success={sectionSuccess.messages}
        saving={savingSection === "messages"}
        onSave={saveMessages}
      >
        <SettingsSection title="Leave review">
          <div className={settingsCardClassName}>
            <p className="text-xs text-muted-foreground">
              Sent on WhatsApp when you tap Leave Review on a completed booking.
            </p>
            <Textarea
              ref={reviewTemplateRef}
              className={textareaClassName}
              value={reviewTemplate}
              maxLength={REVIEW_REQUEST_TEMPLATE_MAX_LENGTH}
              onChange={(event) => setReviewTemplate(event.target.value)}
              aria-label="Leave review message"
            />
            <div className="flex flex-wrap gap-2">
              {REVIEW_REQUEST_PLACEHOLDERS.map(({ token, description }) => (
                <button
                  key={token}
                  type="button"
                  title={description}
                  onClick={() => insertPlaceholder(token)}
                  className="rounded-full border border-zinc-900/10 bg-white/40 px-2.5 py-1 font-mono text-xs backdrop-blur-sm hover:bg-white/60 dark:border-white/20 dark:bg-white/10 dark:hover:bg-white/15"
                >
                  {token}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Tap a placeholder to insert it. If you leave out {"{review_link}"},
              the link is added at the end.
            </p>
            <Button
              type="button"
              variant="outline"
              className="self-start"
              disabled={isDefault}
              onClick={() => setReviewTemplate(DEFAULT_REVIEW_REQUEST_TEMPLATE)}
            >
              Reset to default
            </Button>
          </div>
        </SettingsSection>
        <SettingsSection title="Preview">
          <div className={settingsCardClassName}>
            <p className="text-sm break-words whitespace-pre-wrap">{preview}</p>
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

        <SettingsSection title="Morning call">
          <div className={settingsListClassName}>
            <label className={cn(settingsRowClassName, "cursor-pointer")}>
              <IconBadge icon={IconSunrise} />
              <RowText
                title="Charge for early sessions"
                description="Add a charge when a session starts before a set time."
              />
              <Switch
                checked={morningCallEnabled}
                onCheckedChange={setMorningCallEnabled}
              />
            </label>
          </div>
          {morningCallEnabled ? (
            <div className={settingsCardClassName}>
              <Field label="Sessions starting before">
                <Input
                  className={inputClassName}
                  type="time"
                  value={morningCallBefore}
                  onChange={(event) =>
                    setMorningCallBefore(event.target.value)
                  }
                />
              </Field>
              <Field label="Charge per session (RM)">
                <Input
                  className={inputClassName}
                  type="number"
                  min="0"
                  step="1"
                  value={morningCallPrice}
                  onChange={(event) => setMorningCallPrice(event.target.value)}
                  placeholder="50"
                />
              </Field>
              <ProcessingFeeHint
                amountRm={morningCallPrice}
                includeFixed={false}
              />
              <p className="text-xs text-muted-foreground">
                {morningCallSlots.length > 0
                  ? `Charged on your ${morningCallSlots
                      .map((slot) => `${slot.startTime}–${slot.endTime}`)
                      .join(", ")} slot${morningCallSlots.length === 1 ? "" : "s"}. `
                  : "None of your slots start before this time. "}
                It&apos;s included in the session price clients see and
                listed as &quot;Morning call&quot; on the invoice.
              </p>
            </div>
          ) : null}
        </SettingsSection>
      </SettingsPanel>
    );
  }

  return null;
}

