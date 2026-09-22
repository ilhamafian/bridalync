"use client";

import { useEffect, useMemo, useState } from "react";
import { IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";

import { BookingDetailSheet } from "@/components/booking/BookingDetailSheet";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import type { Booking } from "@/schemas/bookingSchema";
import type { TimeSlot } from "@/schemas/settingSchema";
import {
  buildHotDatePriceMap,
  getStyleHotDatePrice,
  resolveEffectivePrice,
  type HotDateLookup,
} from "@/utils/booking/hotDates";
import {
  formatRm,
  getEarliestSessionDate,
} from "@/utils/booking/pricing";
import type { SerializedBooking } from "@/utils/booking/serializeBooking";
import { formatLocationAddress } from "@/utils/session";
import {
  buildWhatsAppProfileUrl,
  formatWhatsAppDisplay,
} from "@/utils/socialLinks";

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

type BookingFilter =
  | "all"
  | "needs_verification"
  | "deposit"
  | "full"
  | "confirmed"
  | "completed"
  | "cancelled";

type BookingSort = "upcoming" | "latest";

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
};

const BOOKING_FILTERS: { value: BookingFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "needs_verification", label: "Needs verification" },
  { value: "deposit", label: "Deposit paid" },
  { value: "full", label: "Fully paid" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const BOOKING_SORTS: { value: BookingSort; label: string }[] = [
  { value: "upcoming", label: "Upcoming" },
  { value: "latest", label: "Latest" },
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
    (booking.status === "confirmed" || booking.status === "completed") &&
    booking.paymentOption === "deposit" &&
    booking.invoice.balanceRm > 0
  );
}

function isDepositVerificationPending(booking: SerializedBooking) {
  return (
    booking.depositVerificationStatus === "pending" &&
    booking.status === "pending"
  );
}

function isBalanceVerificationPending(booking: SerializedBooking) {
  return booking.balanceVerificationStatus === "pending";
}

function needsPaymentVerification(booking: SerializedBooking) {
  return (
    isDepositVerificationPending(booking) ||
    isBalanceVerificationPending(booking)
  );
}

function verificationAmountRm(booking: SerializedBooking): number | null {
  if (isDepositVerificationPending(booking)) {
    return booking.paymentOption === "full"
      ? booking.invoice.totalRm
      : booking.invoice.depositRm;
  }
  if (isBalanceVerificationPending(booking)) {
    return booking.invoice.balanceRm;
  }
  return null;
}

function verificationHint(booking: SerializedBooking): string | null {
  const amount = verificationAmountRm(booking);
  if (amount == null) return null;
  if (isDepositVerificationPending(booking)) {
    return `Deposit receipt waiting · ${formatRm(amount)}`;
  }
  if (isBalanceVerificationPending(booking)) {
    return `Balance receipt waiting · ${formatRm(amount)}`;
  }
  return null;
}

function matchesBookingFilter(
  booking: SerializedBooking,
  filter: BookingFilter
) {
  switch (filter) {
    case "all":
      return true;
    case "needs_verification":
      return needsPaymentVerification(booking);
    case "deposit":
      return isDepositPaid(booking);
    case "full":
      return (
        (booking.status === "confirmed" || booking.status === "completed") &&
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

function startOfLocalDay(date = new Date()) {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day;
}

function bookingCreatedAtMs(booking: SerializedBooking) {
  if (!booking.created_at) return 0;
  const time = new Date(booking.created_at).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function sortBookings(
  bookings: SerializedBooking[],
  sort: BookingSort
): SerializedBooking[] {
  const copy = [...bookings];

  if (sort === "latest") {
    return copy.sort(
      (left, right) => bookingCreatedAtMs(right) - bookingCreatedAtMs(left)
    );
  }

  const todayStart = startOfLocalDay().getTime();

  return copy.sort((left, right) => {
    const leftDate = getEarliestSessionDate(left.sessions)?.getTime();
    const rightDate = getEarliestSessionDate(right.sessions)?.getTime();
    const leftMs = leftDate ?? Number.POSITIVE_INFINITY;
    const rightMs = rightDate ?? Number.POSITIVE_INFINITY;
    const leftUpcoming = leftMs >= todayStart;
    const rightUpcoming = rightMs >= todayStart;

    if (leftUpcoming !== rightUpcoming) {
      return leftUpcoming ? -1 : 1;
    }

    if (leftUpcoming) {
      return leftMs - rightMs;
    }

    return rightMs - leftMs;
  });
}

function toDashboardStatus(status: Booking["status"]): DashboardStatus {
  if (status === "completed" || status === "cancelled") return status;
  return "confirmed";
}

function statusLabel(booking: SerializedBooking) {
  if (isDepositVerificationPending(booking)) {
    return "Review deposit";
  }
  if (booking.depositVerificationStatus === "rejected") {
    return "Receipt rejected";
  }
  if (isBalanceVerificationPending(booking)) {
    return "Review balance";
  }

  switch (booking.status) {
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
      return booking.status;
  }
}

function paymentLabel(booking: SerializedBooking): string | null {
  // Verification-needed bookings already use a strong status badge.
  if (needsPaymentVerification(booking)) {
    return null;
  }
  // Only show paid labels after the booking is actually confirmed/paid.
  if (booking.status !== "confirmed" && booking.status !== "completed") {
    return null;
  }
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
  status: Booking["status"]
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

function bookingBadgeVariant(
  booking: SerializedBooking
): "default" | "secondary" | "destructive" | "outline" {
  if (needsPaymentVerification(booking)) return "destructive";
  if (booking.depositVerificationStatus === "rejected") return "destructive";
  return statusBadgeVariant(booking.status);
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

function emptyForm(timeSlots: TimeSlot[]): BookingFormState {
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
  const [sortOrder, setSortOrder] = useState<BookingSort>("upcoming");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] =
    useState<SerializedBooking | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingSource, setEditingSource] = useState<
    SerializedBooking["source"] | null
  >(null);
  const [form, setForm] = useState<BookingFormState>(() => emptyForm(timeSlots));
  const [deleteTarget, setDeleteTarget] = useState<SerializedBooking | null>(
    null
  );
  const [hotDates, setHotDates] = useState<HotDateLookup[]>([]);
  const [verifyingKey, setVerifyingKey] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifyErrorBookingId, setVerifyErrorBookingId] = useState<
    string | null
  >(null);
  const [receiptPreview, setReceiptPreview] = useState<{
    url: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    setBookings(initialBookings);
  }, [initialBookings]);

  async function verifyPayment(
    bookingId: string,
    type: "deposit" | "balance",
    action: "approve" | "reject"
  ) {
    const key = `${bookingId}:${type}`;
    setVerifyingKey(key);
    setVerifyError(null);
    setVerifyErrorBookingId(null);
    try {
      const response = await fetch(`/api/bookings/${bookingId}/verify-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, type }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setVerifyErrorBookingId(bookingId);
        setVerifyError(
          typeof data.error === "string"
            ? data.error
            : "Could not update payment verification."
        );
        return;
      }
      const updated = data.booking as SerializedBooking | null;
      if (updated) {
        setBookings((current) =>
          current.map((booking) =>
            booking._id === updated._id ? updated : booking
          )
        );
      }
    } catch {
      setVerifyErrorBookingId(bookingId);
      setVerifyError("Could not update payment verification.");
    } finally {
      setVerifyingKey(null);
    }
  }

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

  const pendingVerificationCount = useMemo(
    () => bookings.filter(needsPaymentVerification).length,
    [bookings]
  );

  const filteredBookings = useMemo(() => {
    const filtered = bookings.filter((booking) =>
      matchesBookingFilter(booking, statusFilter)
    );
    const sorted = sortBookings(filtered, sortOrder);

    if (statusFilter === "needs_verification") {
      return sorted;
    }

    const needsReview = sorted.filter(needsPaymentVerification);
    const rest = sorted.filter((booking) => !needsPaymentVerification(booking));
    return [...needsReview, ...rest];
  }, [bookings, statusFilter, sortOrder]);

  const activeFilterLabel =
    BOOKING_FILTERS.find((filter) => filter.value === statusFilter)?.label ??
    statusFilter;
  const isGoogleImport = editingSource === "google_calendar";

  function openCreate() {
    setEditingId(null);
    setEditingSource(null);
    setForm(emptyForm(timeSlots));
    setError(null);
    setSheetOpen(true);
  }

  function openEdit(booking: SerializedBooking) {
    setSelectedBooking(null);
    setEditingId(booking._id);
    setEditingSource(booking.source ?? "bridalync");
    setForm(bookingToForm(booking, timeSlots));
    setError(null);
    setSheetOpen(true);
  }

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
        sessions: form.sessions.map((session, index) => {
          const selectedStyle = styleOptions.find(
            (option) => option.id === session.styleId
          );

          let stylePayload:
            | {
                id: string;
                name: string;
                price: number;
                deposit: number;
                categoryName: string;
              }
            | undefined;

          if (selectedStyle) {
            const separatorIndex = selectedStyle.id.lastIndexOf(":");
            const styleDocId = selectedStyle.id.slice(0, separatorIndex);
            const variantOrder = Number.parseInt(
              selectedStyle.id.slice(separatorIndex + 1),
              10
            );
            const overridePrice =
              session.date &&
              styleDocId &&
              !Number.isNaN(variantOrder)
                ? getStyleHotDatePrice(
                    hotDatePriceMap,
                    session.date,
                    styleDocId,
                    variantOrder
                  )
                : undefined;

            stylePayload = {
              id: selectedStyle.id,
              name: selectedStyle.name,
              price: resolveEffectivePrice(
                selectedStyle.price,
                overridePrice
              ),
              deposit: selectedStyle.deposit,
              categoryName: selectedStyle.categoryName,
            };
          }

          return {
            client_key: session.client_key,
            status: "scheduled" as const,
            name: session.name.trim(),
            packageId: session.packageId,
            order: index,
            date: new Date(`${session.date}T12:00:00`),
            time_slot: parseTimeSlotKey(session.time_slot_key)!,
            location: session.location!,
            style: stylePayload,
          };
        }),
        status: form.status,
        ...(isGoogleImport
          ? {}
          : {
              packageIds: form.packageIds,
              addOns: selectedAddOns,
              paymentOption: form.paymentOption,
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

      <div className="flex min-w-0 items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Label htmlFor="booking-filter" className="shrink-0 text-sm">
            Filter
          </Label>
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as BookingFilter)}
          >
            <SelectTrigger id="booking-filter" className="min-w-0 flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="start">
              {BOOKING_FILTERS.map((filter) => (
                <SelectItem key={filter.value} value={filter.value}>
                  {filter.value === "needs_verification" &&
                  pendingVerificationCount > 0
                    ? `${filter.label} (${pendingVerificationCount})`
                    : filter.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Label htmlFor="booking-sort" className="shrink-0 text-sm">
            Sort
          </Label>
          <Select
            value={sortOrder}
            onValueChange={(value) => setSortOrder(value as BookingSort)}
          >
            <SelectTrigger id="booking-sort" className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="end">
              {BOOKING_SORTS.map((sort) => (
                <SelectItem key={sort.value} value={sort.value}>
                  {sort.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {pendingVerificationCount > 0 ? (
        <button
          type="button"
          onClick={() => setStatusFilter("needs_verification")}
          className={cn(
            "flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors",
            statusFilter === "needs_verification"
              ? "border-amber-500/40 bg-amber-500/10"
              : "border-amber-500/30 bg-amber-500/6 hover:bg-amber-500/10"
          )}
        >
          <span>
            <span className="font-medium text-foreground">
              {pendingVerificationCount} payment
              {pendingVerificationCount === 1 ? "" : "s"} to review
            </span>
            <span className="mt-0.5 block text-muted-foreground">
              {statusFilter === "needs_verification"
                ? "Showing bookings waiting on receipt approval"
                : "Tap to show only bookings waiting on receipt approval"}
            </span>
          </span>
          {statusFilter !== "needs_verification" ? (
            <Badge variant="destructive">Review</Badge>
          ) : null}
        </button>
      ) : null}

      {filteredBookings.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No bookings yet</CardTitle>
            <CardDescription>
              {statusFilter === "all"
                ? "Add a booking manually or wait for clients to book."
                : statusFilter === "needs_verification"
                  ? "No bookings waiting on payment verification."
                  : `No ${activeFilterLabel.toLowerCase()} bookings.`}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {filteredBookings.map((booking) => {
            const earliest = getEarliestSessionDate(booking.sessions);
            const paidLabel = paymentLabel(booking);
            const needsReview = needsPaymentVerification(booking);
            const reviewHint = verificationHint(booking);
            const phone = formatWhatsAppDisplay(
              booking.contact.country_code,
              booking.contact.mobile
            );
            const whatsappUrl = buildWhatsAppProfileUrl(
              booking.contact.country_code,
              booking.contact.mobile
            );

            return (
              <li key={booking._id}>
                <Card
                  role="button"
                  tabIndex={0}
                  className={cn(
                    "cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                    needsReview
                      ? "border-amber-500/35 bg-amber-500/4 hover:bg-amber-500/8"
                      : "hover:bg-muted/40"
                  )}
                  onClick={() => setSelectedBooking(booking)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedBooking(booking);
                    }
                  }}
                >
                  <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="truncate text-base">
                          {booking.contact.name}
                        </CardTitle>
                        <Badge variant={bookingBadgeVariant(booking)}>
                          {statusLabel(booking)}
                        </Badge>
                        {booking.source === "google_calendar" ? (
                          <Badge variant="outline">Google import</Badge>
                        ) : null}
                        {paidLabel &&
                        booking.status !== "cancelled" &&
                        booking.status !== "failed" &&
                        booking.status !== "enquiry" &&
                        booking.source !== "google_calendar" ? (
                          <Badge variant="outline">{paidLabel}</Badge>
                        ) : null}
                        {booking.paymentChannel === "manual_transfer" &&
                        !needsReview ? (
                          <Badge variant="outline">Manual transfer</Badge>
                        ) : null}
                      </div>
                      <CardDescription className="mt-1">
                        {booking.packageNames}
                      </CardDescription>
                      {reviewHint ? (
                        <p className="mt-1 text-sm font-medium text-amber-800 dark:text-amber-300">
                          {reviewHint}
                        </p>
                      ) : null}
                      {whatsappUrl ? (
                        <p className="mt-1 text-sm text-muted-foreground">
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-foreground hover:underline"
                            onClick={(event) => event.stopPropagation()}
                          >
                            {phone}
                          </a>
                        </p>
                      ) : null}
                      <p className="mt-2 text-sm text-muted-foreground">
                        {earliest
                          ? formatListDate(earliest.toISOString())
                          : "No session date"}
                        {" · "}
                        {formatRm(booking.invoice.totalRm)}
                      </p>
                      {booking.depositReceiptUrl || booking.balanceReceiptUrl ? (
                        <div
                          className="mt-2 flex flex-col gap-2"
                          onClick={(event) => event.stopPropagation()}
                          onKeyDown={(event) => event.stopPropagation()}
                        >
                          <p className="text-sm">
                            {booking.depositReceiptUrl ? (
                              <button
                                type="button"
                                className="text-rose-800 underline-offset-2 hover:underline dark:text-rose-400"
                                onClick={() =>
                                  setReceiptPreview({
                                    url: booking.depositReceiptUrl!,
                                    title: "Deposit receipt",
                                  })
                                }
                              >
                                View deposit receipt
                              </button>
                            ) : null}
                            {booking.depositReceiptUrl &&
                            booking.balanceReceiptUrl
                              ? " · "
                              : null}
                            {booking.balanceReceiptUrl ? (
                              <button
                                type="button"
                                className="text-rose-800 underline-offset-2 hover:underline dark:text-rose-400"
                                onClick={() =>
                                  setReceiptPreview({
                                    url: booking.balanceReceiptUrl!,
                                    title: "Balance receipt",
                                  })
                                }
                              >
                                View balance receipt
                              </button>
                            ) : null}
                          </p>
                          {needsReview ? (
                            <div className="flex flex-wrap gap-2">
                              {isDepositVerificationPending(booking) ? (
                                <>
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={
                                      verifyingKey ===
                                      `${booking._id}:deposit`
                                    }
                                    onClick={() =>
                                      void verifyPayment(
                                        booking._id,
                                        "deposit",
                                        "approve"
                                      )
                                    }
                                  >
                                    {verifyingKey ===
                                    `${booking._id}:deposit`
                                      ? "Working…"
                                      : "Approve deposit"}
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={
                                      verifyingKey ===
                                      `${booking._id}:deposit`
                                    }
                                    onClick={() =>
                                      void verifyPayment(
                                        booking._id,
                                        "deposit",
                                        "reject"
                                      )
                                    }
                                  >
                                    Reject deposit
                                  </Button>
                                </>
                              ) : null}
                              {isBalanceVerificationPending(booking) ? (
                                <>
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={
                                      verifyingKey ===
                                      `${booking._id}:balance`
                                    }
                                    onClick={() =>
                                      void verifyPayment(
                                        booking._id,
                                        "balance",
                                        "approve"
                                      )
                                    }
                                  >
                                    {verifyingKey ===
                                    `${booking._id}:balance`
                                      ? "Working…"
                                      : "Approve balance"}
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={
                                      verifyingKey ===
                                      `${booking._id}:balance`
                                    }
                                    onClick={() =>
                                      void verifyPayment(
                                        booking._id,
                                        "balance",
                                        "reject"
                                      )
                                    }
                                  >
                                    Reject balance
                                  </Button>
                                </>
                              ) : null}
                            </div>
                          ) : null}
                          {verifyError &&
                          verifyErrorBookingId === booking._id ? (
                            <p className="text-sm text-destructive">
                              {verifyError}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    <div
                      className="flex shrink-0 gap-1"
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                    >
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

      <BookingDetailSheet
        booking={selectedBooking}
        onClose={() => setSelectedBooking(null)}
        onEdit={openEdit}
      />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="bottom"
          contained
          className="max-h-[85dvh] overflow-y-auto rounded-t-2xl"
        >
          <SheetHeader>
              <SheetTitle>
              {editingId
                ? isGoogleImport
                  ? "Edit imported booking"
                  : "Edit booking"
                : "New booking"}
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

              {isGoogleImport ? (
                <p className="text-sm text-muted-foreground">
                  This booking was imported from Google Calendar. Add the
                  session location below. Packages and invoices are not attached.
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
                            updateSession(session.client_key, {
                              styleId: value,
                            })
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

      <Dialog
        open={Boolean(receiptPreview)}
        onOpenChange={(open) => {
          if (!open) setReceiptPreview(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{receiptPreview?.title ?? "Receipt"}</DialogTitle>
          </DialogHeader>
          {receiptPreview ? (
            <div className="relative max-h-[70vh] overflow-auto rounded-md border border-border bg-muted/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={receiptPreview.url}
                alt={receiptPreview.title}
                className="mx-auto h-auto max-h-[70vh] w-full object-contain"
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

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
