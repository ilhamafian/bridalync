"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
import { cn } from "@/lib/utils";
import type { Address, LatLng } from "@/schemas/addressSchema";
import type { Booking } from "@/schemas/bookingSchema";
import type { PackageDayMode, PackageSession } from "@/schemas/packageSchema";
import type { RegionPrices, TimeSlot } from "@/schemas/settingSchema";
import { useRegionQuote } from "@/hooks/use-venue-regions";
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
import { formatRm, roundRm } from "@/utils/booking/pricing";
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
    image_url?: string;
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
  /** Null when the travel fee is turned off in Settings. */
  travel: BookingFormTravel | null;
};

type VenueDistance =
  | { status: "loading" }
  | { status: "ready"; distanceKm: number }
  | { status: "error" };

function venueKey(location: LatLng) {
  return `${location.lat.toFixed(6)},${location.lng.toFixed(6)}`;
}

type DashboardStatus = "confirmed" | "completed" | "cancelled";

type SessionFormRow = {
  client_key: string;
  name: string;
  packageId: string;
  styleId: string;
  order: number;
  date: string;
  /** Consecutive slots for this session; saved as their merged span. */
  time_slots: TimeSlot[];
  /** HH:mm the client must be ready by; blank = not set. */
  ready_by: string;
  location: Address | null;
};

type BookingFormState = {
  contact_name: string;
  contact_email: string;
  contact_mobile: string;
  contact_country_code: string;
  packageIds: string[];
  addOnIds: string[];
  sessions: SessionFormRow[];
  status: DashboardStatus;
  paymentOption: "deposit" | "full";
  /** Edited (discounted) total as typed; null = use the full price. */
  totalRm: string | null;
};

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

function toDashboardStatus(status: Booking["status"]): DashboardStatus {
  if (status === "completed" || status === "cancelled") return status;
  return "confirmed";
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

function emptyForm(): BookingFormState {
  return {
    contact_name: "",
    contact_email: "",
    contact_mobile: "",
    contact_country_code: DEFAULT_COUNTRY_CODE,
    packageIds: [],
    addOnIds: [],
    sessions: [],
    status: "confirmed",
    paymentOption: "deposit",
    totalRm: null,
  };
}

function bookingToForm(
  booking: SerializedBooking,
  timeSlots: TimeSlot[]
): BookingFormState {
  const fallbackSlot = timeSlots[0];

  return {
    contact_name: booking.contact.name,
    contact_email: booking.contact.email,
    contact_mobile: booking.contact.mobile ?? "",
    contact_country_code: booking.contact.country_code ?? DEFAULT_COUNTRY_CODE,
    packageIds: booking.packageIds,
    addOnIds: booking.addOnIds,
    sessions: booking.sessions.map((session, index) => ({
      client_key: session.client_key ?? createRowId(),
      name: session.name,
      packageId: session.packageId,
      styleId: session.styleId ?? "",
      order: session.order ?? index,
      date: toDateInputValue(session.date),
      time_slots: session.time_slot
        ? expandSessionSlots(session.time_slot, timeSlots)
        : fallbackSlot
          ? [fallbackSlot]
          : [],
      ready_by: session.ready_by ?? "",
      location: session.location ?? null,
    })),
    status: toDashboardStatus(booking.status),
    paymentOption: booking.paymentOption,
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
  travel,
  onSaved,
  onCancel,
  className,
  actionsClassName,
}: BookingFormCatalog & {
  booking: SerializedBooking | null;
  onSaved: (booking: SerializedBooking) => void;
  onCancel: () => void;
  className?: string;
  actionsClassName?: string;
}) {
  const editingId = booking?._id ?? null;
  const isGoogleImport = booking?.source === "google_calendar";
  const [form, setForm] = useState<BookingFormState>(() =>
    booking ? bookingToForm(booking, timeSlots) : emptyForm()
  );
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

  const styleOptions = useMemo(
    () =>
      styles.flatMap((style) =>
        style.variants.map((variant) => ({
          id: `${style._id}:${variant.order}`,
          label: `${style.name} — ${variant.name}`,
          name: variant.name,
          price: variant.price,
          deposit: variant.deposit,
          categoryName: style.name,
        }))
      ),
    [styles]
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

  const fullPriceRm = useMemo(() => {
    const eventHotDatePrice = selectedEvent
      ? getEventHotDatePrice(
          hotDatePriceMap,
          form.sessions
            .filter((session) => session.date)
            .map((session) => `${session.date}T12:00:00`),
          selectedEvent._id
        )
      : undefined;
    const sessionsRm =
      chargeBy === "package" && selectedEvent
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
    const addOnsRm = addOns
      .filter((addOn) => form.addOnIds.includes(addOn._id))
      .reduce((sum, addOn) => sum + roundRm(addOn.price), 0);
    const regionFeeRm =
      regionPricing && !regionPricing.perEvent && regionPriceRm !== null
        ? roundRm(regionPriceRm)
        : 0;
    return sessionsRm + addOnsRm + travelQuote.feeRm + regionFeeRm;
  }, [
    travelQuote.feeRm,
    regionPricing,
    regionPriceRm,
    chargeBy,
    selectedEvent,
    form.packageIds,
    form.sessions,
    form.addOnIds,
    packages,
    addOns,
    hotDatePriceMap,
    resolveSessionStyle,
    timeSlots,
  ]);

  const editedTotalRm =
    form.totalRm === null || form.totalRm.trim() === ""
      ? null
      : Number(form.totalRm);
  const totalError =
    editedTotalRm === null
      ? null
      : !Number.isFinite(editedTotalRm) || editedTotalRm < 0
        ? "Enter a valid total."
        : roundRm(editedTotalRm) > fullPriceRm
          ? `Total can't be more than the full price of ${formatRm(fullPriceRm)}.`
          : null;
  const discountRm =
    editedTotalRm !== null && !totalError
      ? fullPriceRm - roundRm(editedTotalRm)
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
    const event = packages.find((pkg) => pkg._id === packageId);
    if (!event) return;
    setForm((current) => {
      const sessions = sessionsFromEvent(event, current.sessions, timeSlots);
      const sharedDate = sessions.find((session) => session.date)?.date ?? "";
      return {
        ...current,
        packageIds: [packageId],
        sessions:
          event.dayMode === "same_day"
            ? sessions.map((session) => ({ ...session, date: sharedDate }))
            : sessions,
      };
    });
  }

  function updateSessionDate(clientKey: string, date: string) {
    if (dayMode === "same_day") {
      setForm((current) => ({
        ...current,
        sessions: current.sessions.map((session) => ({ ...session, date })),
      }));
      return;
    }
    updateSession(clientKey, { date });
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
    if (!isGoogleImport && !isLegacy && !selectedEvent) {
      return { error: "Choose an event." };
    }

    if (!form.contact_name.trim()) {
      return { error: "Client name is required." };
    }

    if (!form.contact_email.trim()) {
      return { error: "Client email is required." };
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
      if (!isGoogleImport && chargeBy === "style" && !session.styleId) {
        return { error: "Each session needs a style." };
      }
      if (!session.date) {
        return { error: "Each session needs a date." };
      }
      if (session.time_slots.length === 0) {
        return { error: "Each session needs a time slot." };
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

    return {
      payload: {
        contact: {
          name: form.contact_name.trim(),
          email: form.contact_email.trim(),
          mobile: form.contact_mobile.trim() || undefined,
          country_code: form.contact_country_code || undefined,
        },
        sessions: form.sessions.map((session, index) => ({
          client_key: session.client_key,
          status: "scheduled" as const,
          name: session.name.trim(),
          packageId: session.packageId,
          order: index,
          date: new Date(`${session.date}T12:00:00`),
          time_slot: mergeSlots(session.time_slots),
          ready_by: session.ready_by || undefined,
          location: session.location!,
          style: resolveSessionStyle(session),
        })),
        status: form.status,
        ...(isGoogleImport
          ? {}
          : {
              packageIds: form.packageIds,
              addOns: selectedAddOns,
              paymentOption: form.paymentOption,
              ...(discountRm > 0 && editedTotalRm !== null
                ? { totalRm: roundRm(editedTotalRm) }
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
                value={selectedEvent?._id ?? ""}
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
              </RadioGroup>
            </div>

            {addOns.length > 0 ? (
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
                </ul>
              </div>
            ) : null}
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
              {chargeBy === "style" && !isGoogleImport ? (
                <Field label="Style">
                  <Select
                    value={session.styleId || undefined}
                    onValueChange={(value) =>
                      updateSession(session.client_key, { styleId: value })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select style" />
                    </SelectTrigger>
                    <SelectContent>
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
              <Field label={isLegacy ? "Time slots" : "Time slot"}>
                <div className="grid grid-cols-2 gap-2">
                  {availableTimeSlots.map((slot) => {
                    const selected = session.time_slots.some(
                      (item) => timeSlotKey(item) === timeSlotKey(slot)
                    );
                    return (
                      <Button
                        key={timeSlotKey(slot)}
                        type="button"
                        size="sm"
                        variant={selected ? "default" : "outline"}
                        aria-pressed={selected}
                        onClick={() => toggleSessionSlot(session, slot)}
                      >
                        {slot.startTime} – {slot.endTime}
                      </Button>
                    );
                  })}
                </div>
                {isLegacy ? (
                  <p className="text-xs text-muted-foreground">
                    {session.time_slots.length > 1
                      ? `${session.time_slots.length} consecutive slots, each charged the session price.`
                      : "Pick neighbouring slots to book a longer session."}
                  </p>
                ) : null}
              </Field>
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
              value={form.status}
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
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
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
                    inputMode="numeric"
                    min={0}
                    max={fullPriceRm}
                    step={1}
                    value={form.totalRm ?? String(fullPriceRm)}
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
