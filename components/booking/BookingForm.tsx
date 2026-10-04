"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { LocationMapPicker, MapsProvider } from "@/components/LocationMapPicker";
import {
  DEFAULT_COUNTRY_CODE,
  PhoneNumberInput,
} from "@/components/PhoneNumberInput";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { Address } from "@/schemas/addressSchema";
import type { Booking } from "@/schemas/bookingSchema";
import type { TimeSlot } from "@/schemas/settingSchema";
import {
  buildHotDatePriceMap,
  getPackageHotDatePrice,
  getStyleHotDatePrice,
  resolveEffectivePrice,
  type HotDateLookup,
} from "@/utils/booking/hotDates";
import { formatRm, roundRm } from "@/utils/booking/pricing";
import type { SerializedBooking } from "@/utils/booking/serializeBooking";

export type PackageCatalogItem = {
  _id: string;
  name: string;
  price: number;
  deposit: number;
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

export type BookingFormCatalog = {
  packages: PackageCatalogItem[];
  styles: StyleCatalogItem[];
  addOns: AddOnCatalogItem[];
  chargeBy: "package" | "style";
  timeSlots: TimeSlot[];
};

type DashboardStatus = "confirmed" | "completed" | "cancelled";

type SessionFormRow = {
  client_key: string;
  name: string;
  packageId: string;
  styleId: string;
  order: number;
  date: string;
  time_slot_key: string;
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

function parseTimeSlotKey(key: string): TimeSlot | null {
  const [startTime, endTime] = key.split("|");
  if (!startTime || !endTime) return null;
  return { startTime, endTime };
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

function sessionsFromPackages(
  packageIds: string[],
  packageCatalog: PackageCatalogItem[],
  existingSessions: SessionFormRow[],
  timeSlots: TimeSlot[]
): SessionFormRow[] {
  const defaultSlot = timeSlots[0];
  const existingByPackageId = new Map(
    existingSessions.map((session) => [session.packageId, session])
  );

  return packageIds.map((packageId, index) => {
    const existing = existingByPackageId.get(packageId);
    if (existing) return existing;

    const pkg = packageCatalog.find((item) => item._id === packageId);
    return {
      client_key: createRowId(),
      name: pkg?.name ?? `Session ${index + 1}`,
      packageId,
      styleId: "",
      order: index,
      date: "",
      time_slot_key: defaultSlot ? timeSlotKey(defaultSlot) : "",
      location: null,
    };
  });
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
      time_slot_key: session.time_slot
        ? timeSlotKey(session.time_slot)
        : fallbackSlot
          ? timeSlotKey(fallbackSlot)
          : "",
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
    const sessionsRm =
      chargeBy === "package"
        ? form.packageIds.reduce((sum, packageId) => {
            const pkg = packages.find((item) => item._id === packageId);
            if (!pkg) return sum;
            const session = form.sessions.find(
              (item) => item.packageId === packageId
            );
            const overridePrice = session?.date
              ? getPackageHotDatePrice(hotDatePriceMap, session.date, packageId)
              : undefined;
            return (
              sum + roundRm(resolveEffectivePrice(pkg.price, overridePrice))
            );
          }, 0)
        : form.sessions.reduce(
            (sum, session) =>
              sum + roundRm(resolveSessionStyle(session)?.price ?? 0),
            0
          );
    const addOnsRm = addOns
      .filter((addOn) => form.addOnIds.includes(addOn._id))
      .reduce((sum, addOn) => sum + roundRm(addOn.price), 0);
    return sessionsRm + addOnsRm;
  }, [
    chargeBy,
    form.packageIds,
    form.sessions,
    form.addOnIds,
    packages,
    addOns,
    hotDatePriceMap,
    resolveSessionStyle,
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

  const availableTimeSlots = useMemo(() => {
    const byKey = new Map(timeSlots.map((slot) => [timeSlotKey(slot), slot]));
    for (const session of form.sessions) {
      const parsed = parseTimeSlotKey(session.time_slot_key);
      if (parsed && !byKey.has(session.time_slot_key)) {
        byKey.set(session.time_slot_key, parsed);
      }
    }
    return Array.from(byKey.values());
  }, [timeSlots, form.sessions]);

  function togglePackageId(packageId: string, checked: boolean) {
    setForm((current) => {
      const packageIds = checked
        ? [...current.packageIds, packageId]
        : current.packageIds.filter((id) => id !== packageId);

      return {
        ...current,
        packageIds,
        sessions: sessionsFromPackages(
          packageIds,
          packages,
          current.sessions,
          timeSlots
        ),
      };
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
    if (!isGoogleImport && form.packageIds.length === 0) {
      return { error: "Select at least one package." };
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

    if (!isGoogleImport && form.sessions.length !== form.packageIds.length) {
      return { error: "Each selected package needs one session." };
    }

    for (const session of form.sessions) {
      if (!session.name.trim()) {
        return { error: "Each session needs a name." };
      }
      if (!session.packageId) {
        return { error: "Each session needs a package." };
      }
      if (!isGoogleImport && chargeBy === "style" && !session.styleId) {
        return { error: "Each session needs a style." };
      }
      if (!session.date) {
        return { error: "Each session needs a date." };
      }
      if (!session.time_slot_key || !parseTimeSlotKey(session.time_slot_key)) {
        return { error: "Each session needs a time slot." };
      }
      if (!session.location) {
        return { error: "Each session needs a location." };
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
          time_slot: parseTimeSlotKey(session.time_slot_key)!,
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
            location below. Packages and invoices are not attached.
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <Label>Packages</Label>
              <ul className="flex flex-col gap-2">
                {packages.map((pkg) => {
                  const checked = form.packageIds.includes(pkg._id);
                  return (
                    <li
                      key={pkg._id}
                      className="flex items-center gap-3 rounded-md border border-border px-3 py-2"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) =>
                          togglePackageId(pkg._id, value === true)
                        }
                        id={`package-${pkg._id}`}
                      />
                      <label
                        htmlFor={`package-${pkg._id}`}
                        className="flex flex-1 cursor-pointer items-center justify-between gap-2 text-sm"
                      >
                        <span>{pkg.name}</span>
                        {chargeBy === "package" ? (
                          <span className="text-muted-foreground">
                            {formatRm(pkg.price)}
                          </span>
                        ) : null}
                      </label>
                    </li>
                  );
                })}
              </ul>
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
          {form.sessions.map((session, index) => (
            <div
              key={session.client_key}
              className="flex flex-col gap-3 rounded-lg border border-border p-3"
            >
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
                    updateSession(session.client_key, {
                      date: event.target.value,
                    })
                  }
                />
              </Field>
              <Field label="Time slot">
                <Select
                  value={session.time_slot_key || undefined}
                  onValueChange={(value) =>
                    updateSession(session.client_key, { time_slot_key: value })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTimeSlots.map((slot) => (
                      <SelectItem
                        key={timeSlotKey(slot)}
                        value={timeSlotKey(slot)}
                      >
                        {slot.startTime} – {slot.endTime}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
