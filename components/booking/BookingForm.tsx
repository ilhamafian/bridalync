"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { DepositField } from "@/components/catalog/DepositField";
import { ProcessingFeeHint } from "@/components/catalog/ProcessingFeeHint";
import { usePaymentMethod } from "@/components/dashboard/PaymentMethodProvider";
import { useStyleTerms } from "@/components/dashboard/StyleTermsProvider";
import { LocationMapPicker, MapsProvider } from "@/components/LocationMapPicker";
import {
  DEFAULT_COUNTRY_CODE,
  PhoneNumberInput,
} from "@/components/PhoneNumberInput";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Address, LatLng } from "@/schemas/addressSchema";
import {
  BOOKING_REMARKS_MAX_LENGTH,
  CUSTOM_EVENT_DESCRIPTION_MAX_LENGTH,
  CUSTOM_EVENT_NAME_MAX_LENGTH,
  MAX_BOOKING_PAX,
  OTHERS_EVENT_ID,
  type Booking,
} from "@/schemas/bookingSchema";
import { getBookingParty, getBookingPax } from "@/utils/booking/clientInfo";
import type {
  DepositType,
  PackageDayMode,
  PackageSession,
} from "@/schemas/packageSchema";
import type {
  MorningCallSetting,
  RegionPrices,
  TimeSlot,
} from "@/schemas/settingSchema";
import { useRegionQuote } from "@/hooks/use-venue-regions";
import {
  isValidInstagramUsername,
  normalizeInstagramUsername,
} from "@/utils/booking/clientInfo";
import {
  SLOT_HOLDING_STATUSES,
  timeRangesOverlap,
  toDateKey,
} from "@/utils/booking/availability";
import {
  getRegionEventPrice,
  getRegionLabel,
} from "@/utils/booking/regions";
import {
  getDayModeError,
  hasOverlappingSessions,
} from "@/utils/booking/events";
import {
  buildHotDatePriceMap,
  getEventHotDatePrice,
  getPackageHotDatePrice,
  getStyleHotDatePrice,
  resolveEffectivePrice,
  type HotDateLookup,
} from "@/utils/booking/hotDates";
import { getMorningCallCharge } from "@/utils/booking/morningCall";
import { getStyleExtraRm, hasStyleExtras } from "@/utils/booking/styleExtras";
import {
  calculateClientFeesRm,
  formatRm,
  roundRm,
  roundSen,
  toSen,
} from "@/utils/booking/pricing";
import type { SerializedBooking } from "@/utils/booking/serializeBooking";
import {
  countSessionSlots,
  expandSessionSlots,
  mergeSlots,
  sortTimeSlots,
  toggleConsecutiveSlot,
} from "@/utils/booking/slots";
import { calculateTravelFeeRm } from "@/utils/booking/travel";

export type PackageCatalogItem = {
  _id: string;
  name: string;
  price: number;
  deposit: number;
  /** Full event price per region, used when travel is charged by region per event. */
  regionPrices?: RegionPrices;
  sessions: PackageSession[];
  dayMode: PackageDayMode;
};

export type StyleCatalogItem = {
  _id: string;
  name: string;
  variants: {
    name: string;
    order: number;
    price: number;
    deposit: number;
    event_extra_price?: number;
    image_urls: string[];
  }[];
};

export type AddOnCatalogItem = {
  _id: string;
  name: string;
  price: number;
};

export type BookingFormTravel =
  | {
      kind: "distance";
      origin: LatLng;
      ratePerKm: number;
      longDistanceRatePerKm?: number;
    }
  /** One price per region, folded into the booking price. */
  | { kind: "region_fixed"; prices: RegionPrices }
  /** Each event's `regionPrices` is its full price per region. */
  | { kind: "region_per_event" };

export type BookingFormCatalog = {
  packages: PackageCatalogItem[];
  styles: StyleCatalogItem[];
  addOns: AddOnCatalogItem[];
  chargeBy: "package" | "style";
  timeSlots: TimeSlot[];
  morningCall?: MorningCallSetting | null;
  /** Null when the travel fee is turned off in Settings. */
  travel: BookingFormTravel | null;
};

/** What's already taken, so the slot picker can disable it (the server rejects these on create). */
export type BookingFormOccupancy = {
  bookings: SerializedBooking[];
  /** YYYY-MM-DD */
  blockedDates: string[];
  blockedSlots: Array<{ date: string } & TimeSlot>;
};

type VenueDistance =
  | { status: "loading" }
  | { status: "ready"; distanceKm: number }
  | { status: "error" };

const NO_STYLE_VALUE = "__none__";

function venueKey(location: LatLng) {
  return `${location.lat.toFixed(6)},${location.lng.toFixed(6)}`;
}

type DashboardStatus = Booking["status"];

type SessionFormRow = {
  client_key: string;
  name: string;
  packageId: string;
  styleId: string;
  order: number;
  date: string;
  /** Consecutive slots for this session; saved as their merged span. */
  time_slots: TimeSlot[];
  /** Others bookings: the typed start/end, kept even while the range is incomplete. */
  customStart: string;
  customEnd: string;
  /** HH:mm the client must be ready by; blank = not set. */
  ready_by: string;
  location: Address | null;
};

type CustomAddOnRow = {
  id: string;
  name: string;
  price: string;
};

type BookingFormState = {
  contact_name: string;
  contact_email: string;
  contact_mobile: string;
  contact_country_code: string;
  /** Optional on this form, whatever Client information is set to. */
  instagram: string;
  /** Total people including the booker. */
  pax: number;
  /** Names for guests after the booker (length should be pax - 1). */
  guestNames: string[];
  packageIds: string[];
  /** A one-off event instead of a catalog event. */
  isOthers: boolean;
  othersName: string;
  othersDescription: string;
  othersPrice: string;
  othersDeposit: string;
  othersDepositType: DepositType;
  addOnIds: string[];
  /** Custom add-on rows, shown when Others is ticked in Add-ons. */
  customAddOnsEnabled: boolean;
  customAddOnRows: CustomAddOnRow[];
  sessions: SessionFormRow[];
  status: DashboardStatus;
  paymentOption: "deposit" | "full";
  remarks: string;
  /** Edited (discounted) total as typed; null = use the full price. */
  totalRm: string | null;
};

const UNPAID_STATUS_LABELS: Partial<Record<DashboardStatus, string>> = {
  requested: "Booking request",
  pending: "Awaiting payment",
  failed: "Payment failed",
  enquiry: "Enquiry",
};

/**
 * Unpaid bookings (request, awaiting payment, failed, enquiry) keep their status or get cancelled;
 * they're confirmed by approving the request / verifying the payment, not from this form.
 */
function getStatusOptions(
  initialStatus: DashboardStatus | undefined
): { value: DashboardStatus; label: string }[] {
  const unpaidLabel = initialStatus ? UNPAID_STATUS_LABELS[initialStatus] : undefined;
  if (initialStatus && unpaidLabel) {
    return [
      { value: initialStatus, label: unpaidLabel },
      { value: "cancelled", label: "Cancelled" },
    ];
  }
  return STATUS_OPTIONS;
}

const STATUS_OPTIONS: { value: DashboardStatus; label: string }[] = [
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const inputClassName = cn(
  "h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground",
  "placeholder:text-muted-foreground",
  "outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
);

function createRowId() {
  return crypto.randomUUID();
}

/** `<input type="time">` may include seconds; slots are stored as HH:mm. */
function toHmTime(value: string) {
  const match = /^(\d{2}:\d{2})/.exec(value);
  return match?.[1] ?? "";
}

function emptyCustomAddOn(): CustomAddOnRow {
  return { id: createRowId(), name: "", price: "" };
}

function parseRmInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return roundRm(amount);
}

function timeSlotKey(slot: TimeSlot) {
  return `${slot.startTime}|${slot.endTime}`;
}

function getRowSlotCount(session: SessionFormRow, timeSlots: TimeSlot[]) {
  return session.time_slots.length > 0
    ? countSessionSlots(mergeSlots(session.time_slots), timeSlots)
    : 1;
}

function toDateInputValue(value: string | Date | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** One row per session of the event, keeping the date, slot, style and venue already entered at each position. */
function sessionsFromEvent(
  event: PackageCatalogItem,
  existingSessions: SessionFormRow[],
  timeSlots: TimeSlot[]
): SessionFormRow[] {
  const defaultSlot = timeSlots[0];

  return event.sessions.map((session, index) => {
    const existing = existingSessions[index];
    return {
      client_key: existing?.client_key ?? createRowId(),
      name: session.name,
      packageId: event._id,
      styleId: existing?.styleId ?? "",
      order: index,
      date: existing?.date ?? "",
      time_slots: existing?.time_slots.length
        ? [existing.time_slots[0]]
        : defaultSlot
          ? [defaultSlot]
          : [],
      customStart: "",
      customEnd: "",
      ready_by: existing?.ready_by ?? "",
      location: existing?.location ?? null,
    };
  });
}

function sameIds(left: string[], right: string[]) {
  return (
    left.length === right.length && left.every((id, index) => id === right[index])
  );
}

function emptySession(name = ""): SessionFormRow {
  return {
    client_key: createRowId(),
    name,
    packageId: OTHERS_EVENT_ID,
    styleId: "",
    order: 0,
    date: "",
    time_slots: [],
    customStart: "",
    customEnd: "",
    ready_by: "",
    location: null,
  };
}

function emptyForm(): BookingFormState {
  return {
    contact_name: "",
    contact_email: "",
    contact_mobile: "",
    contact_country_code: DEFAULT_COUNTRY_CODE,
    instagram: "",
    pax: 1,
    guestNames: [],
    packageIds: [],
    isOthers: false,
    othersName: "",
    othersDescription: "",
    othersPrice: "",
    othersDeposit: "",
    othersDepositType: "fixed",
    addOnIds: [],
    customAddOnsEnabled: false,
    customAddOnRows: [],
    sessions: [],
    status: "pending",
    paymentOption: "deposit",
    remarks: "",
    totalRm: null,
  };
}

function bookingToForm(
  booking: SerializedBooking,
  timeSlots: TimeSlot[]
): BookingFormState {
  const fallbackSlot = timeSlots[0];
  const isOthers = Boolean(booking.customEvent);

  const party = getBookingParty(booking);
  const pax = getBookingPax(booking);
  return {
    contact_name: booking.contact.name,
    contact_email: booking.contact.email,
    contact_mobile: booking.contact.mobile ?? "",
    contact_country_code: booking.contact.country_code ?? DEFAULT_COUNTRY_CODE,
    instagram: booking.clientDetails?.instagram ?? "",
    pax,
    guestNames: party.slice(1).map((member) => member.name),
    packageIds: isOthers ? [] : booking.packageIds,    isOthers,
    othersName: booking.customEvent?.name ?? "",
    othersDescription: booking.customEvent?.description ?? "",
    othersPrice:
      booking.customEvent?.price != null ? String(booking.customEvent.price) : "",
    othersDeposit:
      booking.customEvent?.deposit != null
        ? String(booking.customEvent.deposit)
        : "",
    othersDepositType: booking.customEvent?.depositType ?? "fixed",
    addOnIds: booking.addOnIds,
    customAddOnsEnabled: (booking.customAddOns?.length ?? 0) > 0,
    customAddOnRows: (booking.customAddOns ?? []).map((addOn) => ({
      id: createRowId(),
      name: addOn.name,
      price: String(addOn.price),
    })),
    sessions: booking.sessions.map((session, index) => {
      const slots = session.time_slot
        ? isOthers
          ? [session.time_slot]
          : expandSessionSlots(session.time_slot, timeSlots)
        : fallbackSlot
          ? [fallbackSlot]
          : [];
      const span = slots.length > 0 ? mergeSlots(slots) : null;
      return {
        client_key: session.client_key ?? createRowId(),
        name: session.name,
        packageId: isOthers ? OTHERS_EVENT_ID : session.packageId,
        styleId: session.styleId ?? "",
        order: session.order ?? index,
        date: toDateInputValue(session.date),
        time_slots: slots,
        customStart: isOthers ? (span?.startTime ?? "") : "",
        customEnd: isOthers ? (span?.endTime ?? "") : "",
        ready_by: session.ready_by ?? "",
        location: session.location ?? null,
      };
    }),
    status: booking.status,
    paymentOption: booking.paymentOption,
    remarks: booking.remarks ?? "",
    totalRm: booking.invoice.breakdown?.discountRm
      ? String(booking.invoice.totalRm)
      : null,
  };
}

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

/** Create (no `booking`) or edit form; remount with a new `key` to reset. */
export function BookingForm({
  booking,
  packages,
  styles,
  addOns,
  chargeBy,
  timeSlots,
  morningCall,
  travel,
  occupancy,
  onSaved,
  onCancel,
  className,
  actionsClassName,
}: BookingFormCatalog & {
  booking: SerializedBooking | null;
  occupancy?: BookingFormOccupancy;
  onSaved: (booking: SerializedBooking) => void;
  onCancel: () => void;
  className?: string;
  actionsClassName?: string;
}) {
  const styleTerms = useStyleTerms();
  const editingId = booking?._id ?? null;
  const isGoogleImport = booking?.source === "google_calendar";
  const [form, setForm] = useState<BookingFormState>(() =>
    booking ? bookingToForm(booking, timeSlots) : emptyForm()
  );
  const creating = !editingId;
  const isOthers = form.isOthers && !isGoogleImport;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hotDates, setHotDates] = useState<HotDateLookup[]>([]);

  /** Booked before multi-session events and its events are unchanged: keeps its old sessions and pricing. */
  const isLegacy =
    booking !== null &&
    !booking.dayMode &&
    !isGoogleImport &&
    booking.packageIds.length > 0 &&
    sameIds(form.packageIds, booking.packageIds);
  const selectedEvent =
    !isLegacy && form.packageIds.length === 1
      ? packages.find((pkg) => pkg._id === form.packageIds[0]) ?? null
      : null;
  const dayMode = selectedEvent?.dayMode ?? null;

  useEffect(() => {
    let cancelled = false;
    async function loadHotDates() {
      try {
        const response = await fetch("/api/hot-dates");
        const data = await response.json().catch(() => ({}));
        if (!response.ok || cancelled) return;
        setHotDates((data.hot_dates as HotDateLookup[] | undefined) ?? []);
      } catch {
        // Manual bookings still work with catalog prices if this fails.
      }
    }
    void loadHotDates();
    return () => {
      cancelled = true;
    };
  }, []);

  const hotDatePriceMap = useMemo(
    () => buildHotDatePriceMap(hotDates),
    [hotDates]
  );

  const [venueDistances, setVenueDistances] = useState<
    Record<string, VenueDistance>
  >({});
  const requestedVenuesRef = useRef(new Set<string>());

  const distanceTravel = travel?.kind === "distance" ? travel : null;

  /** Region pricing applies to new-style bookings only; legacy ones keep their catalog prices. */
  const regionPricing = useMemo(
    () =>
      travel?.kind === "region_fixed"
        ? { prices: travel.prices, perEvent: false }
        : travel?.kind === "region_per_event" && selectedEvent
          ? { prices: selectedEvent.regionPrices, perEvent: true }
          : null,
    [travel, selectedEvent]
  );
  const venueLocations = useMemo(
    () => form.sessions.map((session) => session.location),
    [form.sessions]
  );
  const regionQuote = useRegionQuote(
    venueLocations,
    regionPricing?.prices,
    regionPricing !== null && !isGoogleImport
  );
  const regionPriceRm =
    regionQuote.status === "ready" && regionQuote.result?.ok
      ? regionQuote.result.priceRm
      : null;

  useEffect(() => {
    if (!distanceTravel) return;

    for (const session of form.sessions) {
      if (!session.location) continue;
      const destination = session.location.location;
      const key = venueKey(destination);
      if (requestedVenuesRef.current.has(key)) continue;
      requestedVenuesRef.current.add(key);

      void fetch("/api/travel-distance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin: distanceTravel.origin, destination }),
      })
        .then(async (response) => {
          const data = await response.json().catch(() => ({}));
          if (!response.ok || typeof data.distanceKm !== "number") {
            throw new Error("Travel distance request failed.");
          }
          setVenueDistances((current) => ({
            ...current,
            [key]: { status: "ready", distanceKm: data.distanceKm },
          }));
        })
        .catch(() => {
          requestedVenuesRef.current.delete(key);
          setVenueDistances((current) => ({
            ...current,
            [key]: { status: "error" },
          }));
        });
    }
  }, [distanceTravel, form.sessions]);

  const travelQuote = useMemo(() => {
    if (!distanceTravel) return { status: "ready" as const, feeRm: 0 };

    const distanceKmBySessionKey: Record<string, number> = {};
    let status: VenueDistance["status"] = "ready";
    for (const session of form.sessions) {
      if (!session.location) continue;
      const distance = venueDistances[venueKey(session.location.location)];
      if (distance?.status === "ready") {
        distanceKmBySessionKey[session.client_key] = distance.distanceKm;
      } else if (distance?.status === "error") {
        status = "error";
      } else if (status !== "error") {
        status = "loading";
      }
    }

    const feeRm = roundRm(
      calculateTravelFeeRm({
        sessions: form.sessions
          .filter((session) => session.location && session.time_slots.length > 0)
          .map((session) => ({
            client_key: session.client_key,
            date: new Date(`${session.date || "1970-01-01"}T12:00:00`),
            time_slot: mergeSlots(session.time_slots),
            location: session.location!,
          })),
        timeSlots,
        ratePerKm: distanceTravel.ratePerKm,
        longDistanceRatePerKm: distanceTravel.longDistanceRatePerKm,
        distanceKmBySessionKey,
      })
    );

    return { status, feeRm };
  }, [distanceTravel, form.sessions, venueDistances, timeSlots]);

  const styleExtrasOffered = chargeBy === "package" && hasStyleExtras(styles);
  const styleOptional =
    isOthers || (chargeBy === "package" && styleTerms.kind !== "look");
  const styleOptions = useMemo(
    () =>
      styles.flatMap((style) =>
        style.variants.map((variant) => {
          const extraRm =
            !isOthers && chargeBy === "package" ? getStyleExtraRm(variant) : 0;
          return {
            id: `${style._id}:${variant.order}`,
            label: `${style.name} — ${variant.name}${
              extraRm > 0 ? ` (+${formatRm(extraRm)})` : ""
            }`,
            name: variant.name,
            price: variant.price,
            deposit: variant.deposit,
            extraRm,
            categoryName: style.name,
          };
        })
      ),
    [styles, chargeBy, isOthers]
  );

  const resolveSessionStyle = useCallback(
    (session: SessionFormRow) => {
      const selectedStyle = styleOptions.find(
        (option) => option.id === session.styleId
      );
      if (!selectedStyle) return undefined;

      const separatorIndex = selectedStyle.id.lastIndexOf(":");
      const styleDocId = selectedStyle.id.slice(0, separatorIndex);
      const variantOrder = Number.parseInt(
        selectedStyle.id.slice(separatorIndex + 1),
        10
      );
      const overridePrice =
        session.date && styleDocId && !Number.isNaN(variantOrder)
          ? getStyleHotDatePrice(
              hotDatePriceMap,
              session.date,
              styleDocId,
              variantOrder
            )
          : undefined;

      return {
        id: selectedStyle.id,
        name: selectedStyle.name,
        price: resolveEffectivePrice(selectedStyle.price, overridePrice),
        deposit: selectedStyle.deposit,
        categoryName: selectedStyle.categoryName,
      };
    },
    [styleOptions, hotDatePriceMap]
  );

  const customAddOnsRm = useMemo(
    () =>
      form.customAddOnsEnabled
        ? form.customAddOnRows.reduce((sum, row) => {
            const price = parseRmInput(row.price);
            return price === null ? sum : sum + price;
          }, 0)
        : 0,
    [form.customAddOnsEnabled, form.customAddOnRows]
  );

  const basePriceRm = useMemo(() => {
    const othersPrice = parseRmInput(form.othersPrice);
    const eventHotDatePrice = selectedEvent
      ? getEventHotDatePrice(
          hotDatePriceMap,
          form.sessions
            .filter((session) => session.date)
            .map((session) => `${session.date}T12:00:00`),
          selectedEvent._id
        )
      : [];
    const sessionsRm = isOthers
      ? roundRm(othersPrice ?? 0)
      : chargeBy === "package" && selectedEvent
        ? roundRm(
            regionPricing?.perEvent && regionPriceRm !== null
              ? getRegionEventPrice(regionPriceRm, eventHotDatePrice)
              : resolveEffectivePrice(selectedEvent.price, eventHotDatePrice)
          )
        : chargeBy === "package"
        ? form.packageIds.reduce((sum, packageId) => {
            const pkg = packages.find((item) => item._id === packageId);
            if (!pkg) return sum;
            const session = form.sessions.find(
              (item) => item.packageId === packageId
            );
            const overridePrice = session?.date
              ? getPackageHotDatePrice(hotDatePriceMap, session.date, packageId)
              : undefined;
            const slotCount = session ? getRowSlotCount(session, timeSlots) : 1;
            return (
              sum +
              roundRm(resolveEffectivePrice(pkg.price, overridePrice) * slotCount)
            );
          }, 0)
        : form.sessions.reduce(
            (sum, session) =>
              sum +
              roundRm(
                (resolveSessionStyle(session)?.price ?? 0) *
                  getRowSlotCount(session, timeSlots)
              ),
            0
          );
    const addOnsRm =
      addOns
        .filter((addOn) => form.addOnIds.includes(addOn._id))
        .reduce((sum, addOn) => sum + roundRm(addOn.price), 0) + customAddOnsRm;
    const regionFeeRm =
      regionPricing && !regionPricing.perEvent && regionPriceRm !== null
        ? roundRm(regionPriceRm)
        : 0;
    const styleExtrasRm = isOthers
      ? 0
      : chargeBy === "package"
        ? form.sessions.reduce(
            (sum, session) =>
              sum +
              (styleOptions.find((option) => option.id === session.styleId)
                ?.extraRm ?? 0),
            0
          )
        : 0;
    const morningCallRm =
      getMorningCallCharge(
        morningCall,
        form.sessions
          .filter((session) => session.time_slots.length > 0)
          .map((session) => ({ time_slot: mergeSlots(session.time_slots) }))
      )?.amountRm ?? 0;
    return (
      sessionsRm * form.pax +
      styleExtrasRm * form.pax +
      addOnsRm +
      travelQuote.feeRm +
      regionFeeRm +
      morningCallRm
    );
  }, [
    styleOptions,
    morningCall,
    travelQuote.feeRm,
    regionPricing,
    regionPriceRm,
    chargeBy,
    selectedEvent,
    isOthers,
    form.othersPrice,
    form.pax,
    customAddOnsRm,
    form.packageIds,
    form.sessions,
    form.addOnIds,
    packages,
    addOns,
    hotDatePriceMap,
    resolveSessionStyle,
    timeSlots,
  ]);
  const { usesPaymentGateway } = usePaymentMethod();
  const includesProcessingFee = booking
    ? Boolean(booking.invoice.breakdown?.processingFeeRm)
    : usesPaymentGateway;
  const includesPlatformFee = booking
    ? Boolean(booking.invoice.breakdown?.platformFeeRm)
    : true;
  const processingFeeRm = includesProcessingFee
    ? calculateClientFeesRm(basePriceRm, true, includesPlatformFee)
    : 0;
  const fullPriceRm = roundSen(basePriceRm + processingFeeRm);

  const editedTotalRm =
    form.totalRm === null || form.totalRm.trim() === ""
      ? null
      : Number(form.totalRm);
  const totalError =
    editedTotalRm === null
      ? null
      : !Number.isFinite(editedTotalRm) || editedTotalRm < 0
        ? "Enter a valid total."
        : toSen(editedTotalRm) > toSen(fullPriceRm)
          ? `Total can't be more than the full price of ${formatRm(fullPriceRm)}.`
          : null;
  const discountRm =
    editedTotalRm !== null && !totalError
      ? roundSen(fullPriceRm - roundSen(editedTotalRm))
      : 0;

  /** Settings slots plus any legacy/imported times a session already uses. */
  const availableTimeSlots = useMemo(() => {
    const byKey = new Map(timeSlots.map((slot) => [timeSlotKey(slot), slot]));
    for (const session of form.sessions) {
      for (const slot of session.time_slots) {
        if (!byKey.has(timeSlotKey(slot))) byKey.set(timeSlotKey(slot), slot);
      }
    }
    return sortTimeSlots(Array.from(byKey.values()));
  }, [timeSlots, form.sessions]);

  function selectEvent(packageId: string) {
    if (packageId === OTHERS_EVENT_ID) {
      selectOthers();
      return;
    }
    const event = packages.find((pkg) => pkg._id === packageId);
    if (!event) return;
    setForm((current) => {
      const sessions = sessionsFromEvent(event, current.sessions, timeSlots);
      const sharedDate = sessions.find((session) => session.date)?.date ?? "";
      return {
        ...current,
        isOthers: false,
        packageIds: [packageId],
        sessions:
          event.dayMode === "same_day"
            ? sessions.map((session) => ({ ...session, date: sharedDate }))
            : sessions,
      };
    });
  }

  function selectOthers() {
    setForm((current) => {
      const existing = current.sessions[0];
      const span =
        existing && existing.time_slots.length > 0
          ? mergeSlots(existing.time_slots)
          : null;
      const session: SessionFormRow = {
        ...(existing ?? emptySession()),
        name: current.othersName.trim() || "Session",
        packageId: OTHERS_EVENT_ID,
        order: 0,
        time_slots: span ? [span] : [],
        customStart: existing?.customStart || span?.startTime || "",
        customEnd: existing?.customEnd || span?.endTime || "",
      };
      return {
        ...current,
        isOthers: true,
        packageIds: [],
        sessions: [session],
      };
    });
  }

  function updateCustomTime(
    session: SessionFormRow,
    patch: { start?: string; end?: string }
  ) {
    const start = toHmTime(
      patch.start ??
        (session.customStart || session.time_slots[0]?.startTime || "")
    );
    const end = toHmTime(
      patch.end ??
        (session.customEnd ||
          (session.time_slots.length > 0
            ? mergeSlots(session.time_slots).endTime
            : ""))
    );
    updateSession(session.client_key, {
      customStart: start,
      customEnd: end,
      time_slots: start && end && start < end ? [{ startTime: start, endTime: end }] : [],
    });
  }

  function updateSessionDate(clientKey: string, date: string) {
    const withDate = (session: SessionFormRow): SessionFormRow => ({
      ...session,
      date,
      time_slots: isOthers
        ? session.time_slots
        : session.time_slots.filter((slot) => !getSlotConflict(date, slot)),
    });
    setForm((current) => ({
      ...current,
      sessions: current.sessions.map((session) =>
        dayMode === "same_day" || session.client_key === clientKey
          ? withDate(session)
          : session
      ),
    }));
  }

  const takenByDate = useMemo(() => {
    const byDate = new Map<string, Array<{ slot: TimeSlot; label: string }>>();
    const add = (dateKey: string, slot: TimeSlot, label: string) => {
      if (!dateKey) return;
      const list = byDate.get(dateKey) ?? [];
      list.push({ slot, label });
      byDate.set(dateKey, list);
    };
    for (const other of occupancy?.bookings ?? []) {
      if (other._id === editingId) continue;
      if (!SLOT_HOLDING_STATUSES.includes(other.status)) continue;
      for (const session of other.sessions) {
        if (session.status === "cancelled" || !session.time_slot) continue;
        add(
          toDateKey(session.date),
          session.time_slot,
          `Booked · ${other.contact.name}`
        );
      }
    }
    for (const blocked of occupancy?.blockedSlots ?? []) {
      add(blocked.date, blocked, "Blocked");
    }
    return byDate;
  }, [occupancy, editingId]);
  const blockedDateKeys = useMemo(
    () => new Set(occupancy?.blockedDates ?? []),
    [occupancy]
  );

  /** Why a slot can't be booked on `dateKey`, or null when it's free. */
  function getSlotConflict(dateKey: string, slot: TimeSlot): string | null {
    if (!dateKey) return null;
    if (blockedDateKeys.has(dateKey)) return "Date blocked";
    return (
      takenByDate
        .get(dateKey)
        ?.find((taken) => timeRangesOverlap(taken.slot, slot))?.label ?? null
    );
  }

  function toggleSessionSlot(session: SessionFormRow, slot: TimeSlot) {
    const selected = session.time_slots.some(
      (item) => timeSlotKey(item) === timeSlotKey(slot)
    );
    updateSession(session.client_key, {
      time_slots: isLegacy
        ? toggleConsecutiveSlot(session.time_slots, slot, availableTimeSlots)
        : selected
          ? []
          : [slot],
    });
  }

  function toggleAddOn(addOnId: string, checked: boolean) {
    setForm((current) => ({
      ...current,
      addOnIds: checked
        ? [...current.addOnIds, addOnId]
        : current.addOnIds.filter((id) => id !== addOnId),
    }));
  }

  function updateSession(clientKey: string, patch: Partial<SessionFormRow>) {
    setForm((current) => ({
      ...current,
      sessions: current.sessions.map((session) =>
        session.client_key === clientKey ? { ...session, ...patch } : session
      ),
    }));
  }

  function buildPayload() {
    if (!isGoogleImport && !isLegacy && !selectedEvent && !isOthers) {
      return { error: "Choose an event." };
    }

    if (!form.contact_name.trim()) {
      return { error: "Client name is required." };
    }

    if (!form.contact_email.trim()) {
      return { error: "Client email is required." };
    }

    const instagram = normalizeInstagramUsername(form.instagram);
    if (instagram && !isValidInstagramUsername(instagram)) {
      return { error: "Enter a valid Instagram username." };
    }

    let othersEvent: {
      name: string;
      description?: string;
      price: number;
      deposit: number;
      depositType: DepositType;
    } | null = null;
    if (isOthers) {
      const name = form.othersName.trim();
      if (!name) return { error: "Enter a title for this event." };
      const price = parseRmInput(form.othersPrice);
      if (price === null) return { error: "Enter a price for this event." };
      const deposit = parseRmInput(form.othersDeposit);
      if (deposit === null) return { error: "Enter the deposit." };
      if (form.othersDepositType === "percent" && deposit > 100) {
        return { error: "Deposit can't be more than 100%." };
      }
      const description = form.othersDescription.trim();
      othersEvent = {
        name,
        ...(description ? { description } : {}),
        price,
        deposit,
        depositType: form.othersDepositType,
      };
    }

    const customAddOns: { name: string; price: number }[] = [];
    if (!isGoogleImport && form.customAddOnsEnabled) {
      if (form.customAddOnRows.length === 0) {
        return { error: "Add a title and price, or turn off Others." };
      }
      for (const row of form.customAddOnRows) {
        const name = row.name.trim();
        const price = parseRmInput(row.price);
        if (!name || price === null) {
          return { error: "Each custom add-on needs a title and a price." };
        }
        customAddOns.push({ name, price });
      }
    }

    if (form.sessions.length === 0) {
      return { error: "Add at least one session." };
    }

    if (isLegacy && form.sessions.length !== form.packageIds.length) {
      return { error: "Each selected event needs one session." };
    }

    for (const session of form.sessions) {
      if (!session.name.trim()) {
        return { error: "Each session needs a name." };
      }
      if (!session.packageId) {
        return { error: "Each session needs an event." };
      }
      if (
        !isGoogleImport &&
        !isOthers &&
        chargeBy === "style" &&
        !session.styleId
      ) {
        return { error: `Each session needs a ${styleTerms.one}.` };
      }
      if (!session.date) {
        return { error: "Each session needs a date." };
      }
      if (isOthers) {
        if (!session.customStart || !session.customEnd) {
          return { error: "Enter a start and end time." };
        }
        if (session.customStart >= session.customEnd) {
          return { error: "End time must be after the start time." };
        }
      }
      if (session.time_slots.length === 0) {
        return { error: isOthers ? "Enter a start and end time." : "Each session needs a time slot." };
      }
      if (isOthers) {
        const conflict = getSlotConflict(session.date, mergeSlots(session.time_slots));
        if (conflict) {
          return {
            error:
              conflict === "Date blocked"
                ? "This date is blocked."
                : `That time is unavailable (${conflict}).`,
          };
        }
      }
      if (!session.location) {
        return { error: "Each session needs a location." };
      }
    }

    if (dayMode) {
      const sessionDates = form.sessions.map(
        (session) => `${session.date}T12:00:00`
      );
      const dayModeError = getDayModeError(dayMode, sessionDates);
      if (dayModeError) return { error: dayModeError };
      if (
        hasOverlappingSessions(
          form.sessions.map((session, index) => ({
            date: sessionDates[index],
            time_slot: mergeSlots(session.time_slots),
          }))
        )
      ) {
        return { error: "Sessions in the same booking can't overlap." };
      }
    }

    if (!isGoogleImport && travelQuote.status === "loading") {
      return { error: "Still calculating the travel fee. Try again in a moment." };
    }

    if (!isGoogleImport && travelQuote.status === "error") {
      return {
        error: "Couldn't calculate the travel fee. Check the locations and try again.",
      };
    }

    if (regionPricing && !isGoogleImport) {
      if (regionQuote.status === "loading") {
        return { error: "Still checking the venue's state. Try again in a moment." };
      }
      if (regionQuote.status === "error") {
        return {
          error: "Couldn't check the venue's state. Check the locations and try again.",
        };
      }
      if (regionQuote.result && !regionQuote.result.ok) {
        return { error: regionQuote.result.error };
      }
    }

    if (!isGoogleImport && totalError) {
      return { error: totalError };
    }

    const selectedAddOns = addOns
      .filter((addOn) => form.addOnIds.includes(addOn._id))
      .map((addOn) => ({
        id: addOn._id,
        name: addOn.name,
        price: addOn.price,
      }));

    const contactName = form.contact_name.trim();
    const guestNames = form.guestNames
      .slice(0, Math.max(0, form.pax - 1))
      .map((name) => name.trim());
    while (guestNames.length < form.pax - 1) {
      guestNames.push("");
    }
    if (form.pax > 1 && guestNames.some((name) => !name)) {
      return { error: "Add a name for each person." };
    }

    return {
      payload: {
        contact: {
          name: contactName,
          email: form.contact_email.trim(),
          mobile: form.contact_mobile.trim() || undefined,
          country_code: form.contact_country_code || undefined,
        },
        pax: form.pax,
        party: [
          {
            name: contactName,
            ...(instagram ? { clientDetails: { instagram } } : {}),
          },
          ...guestNames.map((name) => ({ name })),
        ],
        instagram,
        sessions: form.sessions.map((session, index) => ({
          client_key: session.client_key,
          status: "scheduled" as const,
          name: (isOthers ? othersEvent?.name : session.name.trim()) || session.name.trim(),
          packageId: isOthers ? OTHERS_EVENT_ID : session.packageId,
          order: index,
          date: new Date(`${session.date}T12:00:00`),
          time_slot: mergeSlots(session.time_slots),
          ready_by: session.ready_by || undefined,
          location: session.location!,
          style: resolveSessionStyle(session),
        })),
        status: creating ? "pending" : form.status,
        remarks: form.remarks.trim(),
        ...(isGoogleImport
          ? {}
          : {
              packageIds: isOthers ? [] : form.packageIds,
              customEvent: othersEvent,
              customAddOns,
              addOns: selectedAddOns,
              paymentOption: form.paymentOption,
              ...(discountRm > 0 && editedTotalRm !== null
                ? { totalRm: roundSen(editedTotalRm) }
                : {}),
            }),
      },
    };
  }

  async function handleSave() {
    const built = buildPayload();
    if ("error" in built && built.error) {
      setError(built.error);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(
        editingId ? `/api/bookings/${editingId}` : "/api/bookings/manual",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(built.payload),
        }
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(
          typeof data.error === "string" ? data.error : "Failed to save booking."
        );
        return;
      }

      onSaved(data.booking as SerializedBooking);
    } catch {
      setError("Failed to save booking.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <MapsProvider>
      <div className={cn("flex flex-col gap-4", className)}>
        <Field label="Client name">
          <Input
            className={inputClassName}
            value={form.contact_name}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                contact_name: event.target.value,
              }))
            }
            placeholder="Aisha Rahman"
          />
        </Field>

        <Field label="Email">
          <Input
            className={inputClassName}
            type="email"
            value={form.contact_email}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                contact_email: event.target.value,
              }))
            }
            placeholder="client@email.com"
          />
        </Field>

        <Field label="Phone">
          <PhoneNumberInput
            countryCode={form.contact_country_code}
            mobile={form.contact_mobile}
            onCountryCodeChange={(code) =>
              setForm((current) => ({
                ...current,
                contact_country_code: code,
              }))
            }
            onMobileChange={(mobile) =>
              setForm((current) => ({
                ...current,
                contact_mobile: mobile,
              }))
            }
            inputClassName={inputClassName}
          />
        </Field>

        <Field label="Instagram (optional)">
          <Input
            className={inputClassName}
            value={form.instagram}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                instagram: event.target.value,
              }))
            }
            placeholder="username"
            autoCapitalize="off"
            autoCorrect="off"
          />
          <p className="text-xs text-muted-foreground">
            Optional. A name, @name, or profile link.
          </p>
        </Field>

        <Field label="People">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="size-9 shrink-0"
              disabled={form.pax <= 1}
              aria-label="Fewer people"
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  pax: current.pax - 1,
                  guestNames: current.guestNames.slice(0, current.pax - 2),
                }))
              }
            >
              −
            </Button>
            <span className="min-w-16 text-center text-sm tabular-nums">
              {form.pax}
            </span>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="size-9 shrink-0"
              disabled={form.pax >= MAX_BOOKING_PAX}
              aria-label="More people"
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  pax: current.pax + 1,
                  guestNames: [...current.guestNames, ""],
                }))
              }
            >
              +
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Including the client. Event/style price × people; add-ons and travel
            once.
          </p>
        </Field>

        {form.pax > 1
          ? Array.from({ length: form.pax - 1 }, (_, index) => (
              <Field key={index} label={`Guest ${index + 2} name`}>
                <Input
                  className={inputClassName}
                  value={form.guestNames[index] ?? ""}
                  onChange={(event) =>
                    setForm((current) => {
                      const guestNames = [...current.guestNames];
                      guestNames[index] = event.target.value;
                      return { ...current, guestNames };
                    })
                  }
                  placeholder={`Guest ${index + 2}`}
                />
              </Field>
            ))
          : null}

        <Separator />

        {isGoogleImport ? (
          <p className="text-sm text-muted-foreground">
            This booking was imported from Google Calendar. Add the session
            location below. Events and invoices are not attached.
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <Label>Event</Label>
              {isLegacy ? (
                <p className="text-xs text-muted-foreground">
                  Booked before multi-session events
                  {booking?.packageNames ? ` (${booking.packageNames})` : ""}.
                  Choosing an event replaces its sessions.
                </p>
              ) : null}
              <RadioGroup
                value={isOthers ? OTHERS_EVENT_ID : (selectedEvent?._id ?? "")}
                onValueChange={selectEvent}
                className="gap-2"
              >
                {packages.map((pkg) => (
                  <label
                    key={pkg._id}
                    htmlFor={`package-${pkg._id}`}
                    className="flex cursor-pointer items-center gap-3 rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <RadioGroupItem value={pkg._id} id={`package-${pkg._id}`} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span>{pkg.name}</span>
                      {pkg.sessions.length > 1 ? (
                        <span className="text-xs text-muted-foreground">
                          {pkg.sessions.map((session) => session.name).join(", ")}
                          {" · "}
                          {pkg.dayMode === "same_day"
                            ? "Same day"
                            : "Different days"}
                        </span>
                      ) : null}
                    </span>
                    {chargeBy === "package" ? (
                      <span className="shrink-0 text-muted-foreground">
                        {formatRm(pkg.price)}
                      </span>
                    ) : null}
                  </label>
                ))}
                <label
                  htmlFor="package-others"
                  className="flex cursor-pointer items-center gap-3 rounded-md border border-border px-3 py-2 text-sm"
                >
                  <RadioGroupItem value={OTHERS_EVENT_ID} id="package-others" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span>Others</span>
                    <span className="text-xs text-muted-foreground">
                      A booking you don&apos;t usually offer
                    </span>
                  </span>
                </label>
              </RadioGroup>
              {isOthers ? (
                <div className="mt-1 flex flex-col gap-3">
                  <Field label="Title">
                    <Input
                      className={inputClassName}
                      value={form.othersName}
                      maxLength={CUSTOM_EVENT_NAME_MAX_LENGTH}
                      onChange={(event) => {
                        const name = event.target.value;
                        setForm((current) => ({
                          ...current,
                          othersName: name,
                          sessions: current.sessions.map((session, index) =>
                            index === 0
                              ? { ...session, name: name.trim() || "Session" }
                              : session
                          ),
                        }));
                      }}
                      placeholder="Trial for a friend"
                    />
                  </Field>
                  <Field label="Description (optional)">
                    <Textarea
                      value={form.othersDescription}
                      maxLength={CUSTOM_EVENT_DESCRIPTION_MAX_LENGTH}
                      rows={3}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          othersDescription: event.target.value,
                        }))
                      }
                      placeholder="What this booking includes"
                    />
                  </Field>
                  <Field label="Price (RM)">
                    <Input
                      className={inputClassName}
                      type="number"
                      min="0"
                      step="1"
                      inputMode="decimal"
                      value={form.othersPrice}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          othersPrice: event.target.value,
                        }))
                      }
                      placeholder="350"
                    />
                    <ProcessingFeeHint amountRm={form.othersPrice} />
                  </Field>
                  <DepositField
                    value={form.othersDeposit}
                    type={form.othersDepositType}
                    onValueChange={(value) =>
                      setForm((current) => ({ ...current, othersDeposit: value }))
                    }
                    onTypeChange={(type) =>
                      setForm((current) => ({
                        ...current,
                        othersDepositType: type,
                      }))
                    }
                  />
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <Label>Add-ons</Label>
              <ul className="flex flex-col gap-2">
                {addOns.map((addOn) => {
                  const checked = form.addOnIds.includes(addOn._id);
                  return (
                    <li
                      key={addOn._id}
                      className="flex items-center gap-3 rounded-md border border-border px-3 py-2"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) =>
                          toggleAddOn(addOn._id, value === true)
                        }
                        id={`addon-${addOn._id}`}
                      />
                      <label
                        htmlFor={`addon-${addOn._id}`}
                        className="flex flex-1 cursor-pointer items-center justify-between gap-2 text-sm"
                      >
                        <span>{addOn.name}</span>
                        <span className="text-muted-foreground">
                          {formatRm(addOn.price)}
                        </span>
                      </label>
                    </li>
                  );
                })}
                <li className="flex flex-col gap-3 rounded-md border border-border px-3 py-2">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={form.customAddOnsEnabled}
                      onCheckedChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          customAddOnsEnabled: value === true,
                          customAddOnRows:
                            value === true && current.customAddOnRows.length === 0
                              ? [emptyCustomAddOn()]
                              : current.customAddOnRows,
                        }))
                      }
                      id="addon-others"
                    />
                    <label htmlFor="addon-others" className="cursor-pointer text-sm">
                      Others
                    </label>
                  </div>
                  {form.customAddOnsEnabled
                    ? form.customAddOnRows.map((row, index) => (
                        <div key={row.id} className="flex flex-col gap-2 pl-7">
                          <Input
                            className={inputClassName}
                            value={row.name}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                customAddOnRows: current.customAddOnRows.map((item) =>
                                  item.id === row.id
                                    ? { ...item, name: event.target.value }
                                    : item
                                ),
                              }))
                            }
                            placeholder="Title"
                            aria-label={`Custom add-on ${index + 1} title`}
                          />
                          <div className="flex items-start gap-2">
                            <div className="flex min-w-0 flex-1 flex-col gap-1">
                              <Input
                                className={inputClassName}
                                type="number"
                                min="0"
                                step="1"
                                inputMode="decimal"
                                value={row.price}
                                onChange={(event) =>
                                  setForm((current) => ({
                                    ...current,
                                    customAddOnRows: current.customAddOnRows.map(
                                      (item) =>
                                        item.id === row.id
                                          ? { ...item, price: event.target.value }
                                          : item
                                    ),
                                  }))
                                }
                                placeholder="Price (RM)"
                                aria-label={`Custom add-on ${index + 1} price`}
                              />
                              <ProcessingFeeHint
                                amountRm={row.price}
                                includeFixed={false}
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="shrink-0"
                              onClick={() =>
                                setForm((current) => {
                                  const customAddOnRows = current.customAddOnRows.filter(
                                    (item) => item.id !== row.id
                                  );
                                  return {
                                    ...current,
                                    customAddOnRows,
                                    customAddOnsEnabled: customAddOnRows.length > 0,
                                  };
                                })
                              }
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))
                    : null}
                  {form.customAddOnsEnabled ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="ml-7 self-start"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          customAddOnRows: [
                            ...current.customAddOnRows,
                            emptyCustomAddOn(),
                          ],
                        }))
                      }
                    >
                      Add another
                    </Button>
                  ) : null}
                </li>
              </ul>
            </div>
          </>
        )}

        <Separator />

        <div className="flex flex-col gap-4">
          <Label>Sessions</Label>
          {dayMode && form.sessions.length > 1 ? (
            <p className="text-xs text-muted-foreground">
              {dayMode === "same_day"
                ? "All sessions are on the same day."
                : "Each session is on a different day."}
            </p>
          ) : null}
          {form.sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Choose an event to add its sessions.
            </p>
          ) : null}
          {form.sessions.map((session, index) => (
            <div
              key={session.client_key}
              className="flex flex-col gap-3 rounded-lg border border-border p-3"
            >
              {isGoogleImport ? (
                <>
                  <p className="text-sm font-medium">Session {index + 1}</p>
                  <Field label="Name">
                    <Input
                      className={inputClassName}
                      value={session.name}
                      onChange={(event) =>
                        updateSession(session.client_key, {
                          name: event.target.value,
                        })
                      }
                    />
                  </Field>
                </>
              ) : (
                <p className="text-sm font-medium">
                  {session.name || `Session ${index + 1}`}
                </p>
              )}
              {(isOthers
                ? styleOptions.length > 0
                : chargeBy === "style" ||
                  styleTerms.kind === "look" ||
                  styleExtrasOffered) &&
              !isGoogleImport ? (
                <Field
                  label={
                    styleOptional ? `${styleTerms.One} (optional)` : styleTerms.One
                  }
                >
                  <Select
                    value={
                      session.styleId ||
                      (styleOptional ? NO_STYLE_VALUE : undefined)
                    }
                    onValueChange={(value) =>
                      updateSession(session.client_key, {
                        styleId: value === NO_STYLE_VALUE ? "" : value,
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={`Select ${styleTerms.one}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {styleOptional ? (
                        <SelectItem value={NO_STYLE_VALUE}>
                          No {styleTerms.one}
                        </SelectItem>
                      ) : null}
                      {styleOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              ) : null}
              <Field label="Date">
                <Input
                  className={inputClassName}
                  type="date"
                  value={session.date}
                  onChange={(event) =>
                    updateSessionDate(session.client_key, event.target.value)
                  }
                />
              </Field>
              {isOthers ? (
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Start time">
                    <Input
                      className={inputClassName}
                      type="time"
                      value={session.customStart}
                      onChange={(event) =>
                        updateCustomTime(session, { start: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="End time">
                    <Input
                      className={inputClassName}
                      type="time"
                      value={session.customEnd}
                      onChange={(event) =>
                        updateCustomTime(session, { end: event.target.value })
                      }
                    />
                  </Field>
                </div>
              ) : (
              <Field label={isLegacy ? "Time slots" : "Time slot"}>
                <div className="grid grid-cols-2 gap-2">
                  {availableTimeSlots.map((slot) => {
                    const selected = session.time_slots.some(
                      (item) => timeSlotKey(item) === timeSlotKey(slot)
                    );
                    const conflict = getSlotConflict(session.date, slot);
                    return (
                      <Button
                        key={timeSlotKey(slot)}
                        type="button"
                        size="sm"
                        variant={selected ? "default" : "outline"}
                        aria-pressed={selected}
                        disabled={Boolean(conflict) && !selected}
                        className={cn(conflict && "h-auto flex-col gap-0 py-1.5")}
                        onClick={() => toggleSessionSlot(session, slot)}
                      >
                        <span>
                          {slot.startTime} – {slot.endTime}
                        </span>
                        {conflict ? (
                          <span className="max-w-full truncate text-[11px] font-normal">
                            {conflict}
                          </span>
                        ) : null}
                      </Button>
                    );
                  })}
                </div>
                {session.date && blockedDateKeys.has(session.date) ? (
                  <p className="text-xs text-destructive">
                    This date is blocked. Pick another date or unblock it first.
                  </p>
                ) : null}
                {isLegacy ? (
                  <p className="text-xs text-muted-foreground">
                    {session.time_slots.length > 1
                      ? `${session.time_slots.length} consecutive slots, each charged the session price.`
                      : "Pick neighbouring slots to book a longer session."}
                  </p>
                ) : null}
              </Field>
              )}
              {isOthers && session.date && blockedDateKeys.has(session.date) ? (
                <p className="text-xs text-destructive">
                  This date is blocked. Pick another date or unblock it first.
                </p>
              ) : null}
              {isOthers &&
              session.time_slots.length > 0 &&
              getSlotConflict(session.date, mergeSlots(session.time_slots)) &&
              getSlotConflict(session.date, mergeSlots(session.time_slots)) !==
                "Date blocked" ? (
                <p className="text-xs text-destructive">
                  {getSlotConflict(session.date, mergeSlots(session.time_slots))}
                </p>
              ) : null}
              <Field label="Ready by">
                <Input
                  className={inputClassName}
                  type="time"
                  value={session.ready_by}
                  onChange={(event) =>
                    updateSession(session.client_key, {
                      ready_by: event.target.value,
                    })
                  }
                />
              </Field>
              <Field label="Location">
                <LocationMapPicker
                  value={session.location}
                  onChange={(location) =>
                    updateSession(session.client_key, { location })
                  }
                  hint={
                    isGoogleImport
                      ? "Imported events have no location. Search or pin the venue."
                      : undefined
                  }
                />
              </Field>
            </div>
          ))}
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-3">
          <Field label="Status">
            <Select
              value={creating ? "pending" : form.status}
              disabled={creating}
              onValueChange={(value) =>
                setForm((current) => ({
                  ...current,
                  status: value as DashboardStatus,
                }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {creating ? (
                  <SelectItem value="pending">Awaiting payment</SelectItem>
                ) : (
                  getStatusOptions(booking?.status).map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </Field>
          {isGoogleImport ? null : (
            <Field label="Payment">
              <Select
                value={form.paymentOption}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    paymentOption: value as "deposit" | "full",
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposit">Deposit</SelectItem>
                  <SelectItem value="full">Full</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          )}
        </div>
        {creating && !isGoogleImport ? (
          <p className="-mt-1 text-xs text-muted-foreground">
            The slot is held until the client pays. After creating the booking,
            copy its payment link and send it to them. They pay the deposit or
            the full amount, whichever you choose here.
          </p>
        ) : null}

        <Field label="Remarks (optional)">
          <Textarea
            value={form.remarks}
            onChange={(event) =>
              setForm((current) => ({ ...current, remarks: event.target.value }))
            }
            maxLength={BOOKING_REMARKS_MAX_LENGTH}
            rows={3}
            placeholder="Notes for yourself, e.g. parking, special requests"
          />
          <p className="text-xs text-muted-foreground">
            Only you can see this; it isn&apos;t shown to the client.
          </p>
        </Field>

        {isGoogleImport ? null : (
          <>
            <Separator />

            <div className="flex flex-col gap-3">
              {regionPricing ? (
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">State pricing</span>
                  <span
                    className={cn(
                      "text-right",
                      regionQuote.status === "ready" &&
                        regionQuote.result?.ok === false &&
                        "text-destructive"
                    )}
                  >
                    {regionQuote.status === "loading"
                      ? "Checking…"
                      : regionQuote.status === "error"
                        ? "Unavailable"
                        : !regionQuote.result
                          ? "Pick a location"
                          : regionQuote.result.ok
                            ? `${getRegionLabel(regionQuote.result.regionId)} · included`
                            : regionQuote.result.error}
                  </span>
                </div>
              ) : null}
              {distanceTravel ? (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Travel fee</span>
                  <span className="tabular-nums">
                    {travelQuote.status === "loading"
                      ? "Calculating…"
                      : travelQuote.status === "error"
                        ? "Unavailable"
                        : formatRm(travelQuote.feeRm)}
                  </span>
                </div>
              ) : null}
              {processingFeeRm > 0 ? (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Fees</span>
                  <span className="tabular-nums">
                    {formatRm(processingFeeRm)}
                  </span>
                </div>
              ) : null}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Full price</span>
                <span className="tabular-nums">{formatRm(fullPriceRm)}</span>
              </div>
              {discountRm > 0 ? (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="text-primary tabular-nums">
                    {formatRm(-discountRm)}
                  </span>
                </div>
              ) : null}

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="booking-total">Total</Label>
                  {form.totalRm !== null ? (
                    <button
                      type="button"
                      className="text-xs font-medium text-primary hover:underline"
                      onClick={() =>
                        setForm((current) => ({ ...current, totalRm: null }))
                      }
                    >
                      Reset to full price
                    </button>
                  ) : null}
                </div>
                <div className="relative">
                  <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
                    RM
                  </span>
                  <Input
                    id="booking-total"
                    className={cn(
                      inputClassName,
                      "pl-11 text-base font-semibold tabular-nums"
                    )}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={fullPriceRm}
                    step={0.01}
                    value={
                      form.totalRm ??
                      (Number.isInteger(fullPriceRm)
                        ? String(fullPriceRm)
                        : fullPriceRm.toFixed(2))
                    }
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        totalRm: event.target.value,
                      }))
                    }
                    aria-invalid={totalError ? true : undefined}
                  />
                </div>
                <p
                  className={cn(
                    "text-xs",
                    totalError ? "text-destructive" : "text-muted-foreground"
                  )}
                >
                  {totalError ??
                    "Lower the total to give the client a discount."}
                </p>
              </div>
            </div>
          </>
        )}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>

      <div className={cn("flex gap-2", actionsClassName)}>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="min-h-11 flex-1"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="lg"
          className="min-h-11 flex-1"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving…" : editingId ? "Save changes" : "Create booking"}
        </Button>
      </div>
    </MapsProvider>
  );
}
