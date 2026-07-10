"use client";

import { useMemo, useState } from "react";
import { IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";

import { LocationMapPicker, MapsProvider } from "@/components/LocationMapPicker";
import {
  DEFAULT_COUNTRY_CODE,
  PhoneNumberInput,
} from "@/components/PhoneNumberInput";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { Address } from "@/schemas/addressSchema";
import type { BookingRecord } from "@/schemas/bookingRecord";
import type { TimeSlot } from "@/schemas/settingSchema";
import {
  formatRm,
  getEarliestSessionDate,
} from "@/utils/booking/pricing";
import type { SerializedBooking } from "@/utils/booking/serializeBooking";
import { formatLocationAddress } from "@/utils/session";

export type PackageCatalogItem = {
  _id: string;
  name: string;
  price: number;
  deposit: number;
  session_templates: { name: string; order: number }[];
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

type BookingFilter =
  | "all"
  | "deposit"
  | "full"
  | "confirmed"
  | "completed"
  | "cancelled";

type DashboardStatus = "confirmed" | "completed" | "cancelled";

type SessionFormRow = {
  client_key: string;
  name: string;
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
  packageId: string;
  styleId: string;
  addOnIds: string[];
  sessions: SessionFormRow[];
  status: DashboardStatus;
  paymentOption: "deposit" | "full";
};

const BOOKING_FILTERS: { value: BookingFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "deposit", label: "Deposit paid" },
  { value: "full", label: "Fully paid" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_OPTIONS: { value: DashboardStatus; label: string }[] = [
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

function isFullyPaid(booking: SerializedBooking) {
  return booking.paymentOption === "full" || booking.invoice.balanceRm <= 0;
}

function isDepositPaid(booking: SerializedBooking) {
  return (
    booking.status !== "cancelled" &&
    booking.status !== "failed" &&
    booking.paymentOption === "deposit" &&
    booking.invoice.balanceRm > 0 &&
    (booking.status === "confirmed" ||
      booking.status === "completed" ||
      booking.status === "pending")
  );
}

function matchesBookingFilter(
  booking: SerializedBooking,
  filter: BookingFilter
) {
  switch (filter) {
    case "all":
      return true;
    case "deposit":
      return isDepositPaid(booking);
    case "full":
      return (
        booking.status !== "cancelled" &&
        booking.status !== "failed" &&
        isFullyPaid(booking)
      );
    case "confirmed":
      return booking.status === "confirmed";
    case "completed":
      return booking.status === "completed";
    case "cancelled":
      return booking.status === "cancelled";
    default:
      return true;
  }
}

function toDashboardStatus(status: BookingRecord["status"]): DashboardStatus {
  if (status === "completed" || status === "cancelled") return status;
  return "confirmed";
}

function statusLabel(status: BookingRecord["status"]) {
  switch (status) {
    case "confirmed":
      return "Confirmed";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    case "pending":
      return "Awaiting payment";
    case "enquiry":
      return "Enquiry";
    case "failed":
      return "Payment failed";
    default:
      return status;
  }
}

function paymentLabel(booking: SerializedBooking) {
  return isFullyPaid(booking) ? "Fully paid" : "Deposit paid";
}

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

function formatListDate(value: string | undefined) {
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No date";
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function statusBadgeVariant(
  status: BookingRecord["status"]
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "confirmed":
      return "default";
    case "completed":
      return "secondary";
    case "cancelled":
    case "failed":
      return "destructive";
    default:
      return "outline";
  }
}

function sessionsFromPackage(
  pkg: PackageCatalogItem | undefined,
  timeSlots: TimeSlot[]
): SessionFormRow[] {
  const defaultSlot = timeSlots[0];
  const templates =
    pkg?.session_templates?.length
      ? pkg.session_templates
      : [{ name: "Session 1", order: 0 }];

  return templates.map((template, index) => ({
    client_key: createRowId(),
    name: template.name,
    order: template.order ?? index,
    date: "",
    time_slot_key: defaultSlot ? timeSlotKey(defaultSlot) : "",
    location: null,
  }));
}

function emptyForm(timeSlots: TimeSlot[]): BookingFormState {
  return {
    contact_name: "",
    contact_email: "",
    contact_mobile: "",
    contact_country_code: DEFAULT_COUNTRY_CODE,
    packageId: "",
    styleId: "",
    addOnIds: [],
    sessions: sessionsFromPackage(undefined, timeSlots),
    status: "confirmed",
    paymentOption: "deposit",
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
    packageId: booking.packageId,
    styleId: booking.styleId ?? "",
    addOnIds: booking.addOnIds,
    sessions: booking.sessions.map((session, index) => ({
      client_key: session.client_key ?? createRowId(),
      name: session.name,
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

export function BookingsManager({
  initialBookings,
  packages,
  styles,
  addOns,
  chargeBy,
  timeSlots,
}: {
  initialBookings: SerializedBooking[];
  packages: PackageCatalogItem[];
  styles: StyleCatalogItem[];
  addOns: AddOnCatalogItem[];
  chargeBy: "package" | "style";
  timeSlots: TimeSlot[];
}) {
  const [bookings, setBookings] = useState(initialBookings);
  const [statusFilter, setStatusFilter] = useState<BookingFilter>("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BookingFormState>(() => emptyForm(timeSlots));
  const [deleteTarget, setDeleteTarget] = useState<SerializedBooking | null>(
    null
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

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) =>
      matchesBookingFilter(booking, statusFilter)
    );
  }, [bookings, statusFilter]);

  const activeFilterLabel =
    BOOKING_FILTERS.find((filter) => filter.value === statusFilter)?.label ??
    statusFilter;
  function openCreate() {
    setEditingId(null);
    setForm(emptyForm(timeSlots));
    setError(null);
    setSheetOpen(true);
  }

  function openEdit(booking: SerializedBooking) {
    setEditingId(booking._id);
    setForm(bookingToForm(booking, timeSlots));
    setError(null);
    setSheetOpen(true);
  }

  function handlePackageChange(packageId: string) {
    const pkg = packages.find((item) => item._id === packageId);
    setForm((current) => ({
      ...current,
      packageId,
      sessions: sessionsFromPackage(pkg, timeSlots),
    }));
  }

  function toggleAddOn(addOnId: string, checked: boolean) {
    setForm((current) => ({
      ...current,
      addOnIds: checked
        ? [...current.addOnIds, addOnId]
        : current.addOnIds.filter((id) => id !== addOnId),
    }));
  }

  function updateSession(
    clientKey: string,
    patch: Partial<SessionFormRow>
  ) {
    setForm((current) => ({
      ...current,
      sessions: current.sessions.map((session) =>
        session.client_key === clientKey ? { ...session, ...patch } : session
      ),
    }));
  }

  function buildPayload() {
    const selectedPackage = packages.find((pkg) => pkg._id === form.packageId);
    if (!selectedPackage) {
      return { error: "Select a package." };
    }

    if (!form.contact_name.trim()) {
      return { error: "Client name is required." };
    }

    if (!form.contact_email.trim()) {
      return { error: "Client email is required." };
    }

    if (chargeBy === "style" && !form.styleId) {
      return { error: "Select a style." };
    }

    if (form.sessions.length === 0) {
      return { error: "Add at least one session." };
    }

    for (const session of form.sessions) {
      if (!session.name.trim()) {
        return { error: "Each session needs a name." };
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

    const selectedStyle = styleOptions.find(
      (option) => option.id === form.styleId
    );
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
        packageId: form.packageId,
        style: selectedStyle
          ? {
              id: selectedStyle.id,
              name: selectedStyle.name,
              price: selectedStyle.price,
              deposit: selectedStyle.deposit,
              categoryName: selectedStyle.categoryName,
            }
          : undefined,
        addOns: selectedAddOns,
        sessions: form.sessions.map((session, index) => ({
          client_key: session.client_key,
          status: "scheduled" as const,
          name: session.name.trim(),
          order: index,
          date: new Date(`${session.date}T12:00:00`),
          time_slot: parseTimeSlotKey(session.time_slot_key)!,
          location: session.location!,
        })),
        paymentOption: form.paymentOption,
        status: form.status,
      },
    };
  }

  async function handleSave() {
    const built = buildPayload();
    if ("error" in built && built.error) {
      setError(built.error);
      return;
    }

    const payload = built.payload!;
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(
        editingId ? `/api/bookings/${editingId}` : "/api/bookings/manual",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          typeof data.error === "string"
            ? data.error
            : "Failed to save booking.";
        setError(message);
        return;
      }

      const saved = data.booking as SerializedBooking;
      setBookings((current) => {
        if (editingId) {
          return current.map((booking) =>
            booking._id === editingId ? saved : booking
          );
        }
        return [saved, ...current];
      });
      setSheetOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;

    const response = await fetch(`/api/bookings/${deleteTarget._id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      setError("Failed to delete booking.");
      setDeleteTarget(null);
      return;
    }

    setBookings((current) =>
      current.filter((booking) => booking._id !== deleteTarget._id)
    );
    setDeleteTarget(null);
  }

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Bookings</h2>
          <p className="text-sm text-muted-foreground">
            Manage client bookings and add bookings manually.
          </p>
        </div>
        <Button type="button" onClick={openCreate}>
          <IconPlus className="size-4" />
          Add booking
        </Button>
      </div>

      {error && !sheetOpen ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}

      <div className="flex items-center gap-2">
        <Label htmlFor="booking-filter" className="shrink-0 text-sm">
          Filter
        </Label>
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as BookingFilter)}
        >
          <SelectTrigger id="booking-filter" className="w-[11.5rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BOOKING_FILTERS.map((filter) => (
              <SelectItem key={filter.value} value={filter.value}>
                {filter.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredBookings.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No bookings yet</CardTitle>
            <CardDescription>
              {statusFilter === "all"
                ? "Add a booking manually or wait for clients to book."
                : `No ${activeFilterLabel.toLowerCase()} bookings.`}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {filteredBookings.map((booking) => {
            const earliest = getEarliestSessionDate(booking.sessions);
            return (
              <li key={booking._id}>
                <Card>
                  <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="truncate text-base">
                          {booking.contact.name}
                        </CardTitle>
                        <Badge variant={statusBadgeVariant(booking.status)}>
                          {statusLabel(booking.status)}
                        </Badge>
                        {booking.status !== "cancelled" &&
                        booking.status !== "failed" &&
                        booking.status !== "enquiry" ? (
                          <Badge variant="outline">
                            {paymentLabel(booking)}
                          </Badge>
                        ) : null}
                      </div>
                      <CardDescription className="mt-1">
                        {booking.packageName}
                        {booking.styleName ? ` · ${booking.styleName}` : ""}
                      </CardDescription>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {earliest
                          ? formatListDate(earliest.toISOString())
                          : "No session date"}
                        {" · "}
                        {formatRm(booking.invoice.totalRm)}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(booking)}
                        aria-label="Edit booking"
                      >
                        <IconPencil className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(booking)}
                        aria-label="Delete booking"
                      >
                        <IconTrash className="size-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  {booking.sessions[0]?.location ? (
                    <CardContent className="pt-0 text-sm text-muted-foreground">
                      {formatLocationAddress(booking.sessions[0].location)}
                    </CardContent>
                  ) : null}
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="bottom"
          contained
          className="max-h-[85dvh] overflow-y-auto rounded-t-2xl"
        >
          <SheetHeader>
            <SheetTitle>
              {editingId ? "Edit booking" : "New booking"}
            </SheetTitle>
          </SheetHeader>

          <MapsProvider>
            <div className="flex flex-col gap-4 px-6 pb-4">
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

              <Field label="Package">
                <Select
                  value={form.packageId || undefined}
                  onValueChange={handlePackageChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select package" />
                  </SelectTrigger>
                  <SelectContent>
                    {packages.map((pkg) => (
                      <SelectItem key={pkg._id} value={pkg._id}>
                        {pkg.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {(chargeBy === "style" || styleOptions.length > 0) && (
                <Field label={chargeBy === "style" ? "Style" : "Style (optional)"}>
                  <Select
                    value={form.styleId || undefined}
                    onValueChange={(value) =>
                      setForm((current) => ({ ...current, styleId: value }))
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
              )}

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
                          updateSession(session.client_key, {
                            time_slot_key: value,
                          })
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
              </div>

              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : null}
            </div>
          </MapsProvider>

          <SheetFooter className="gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSheetOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : editingId ? "Save changes" : "Create booking"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete booking?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the booking for{" "}
              {deleteTarget?.contact.name ?? "this client"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
