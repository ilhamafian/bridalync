"use client";

import { useEffect, useMemo, useState } from "react";
import { IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";

import { BookingDetailSheet } from "@/components/booking/BookingDetailSheet";
import {
  BookingForm,
  type AddOnCatalogItem,
  type PackageCatalogItem,
  type StyleCatalogItem,
} from "@/components/booking/BookingForm";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { Booking } from "@/schemas/bookingSchema";
import type { TimeSlot } from "@/schemas/settingSchema";
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

export type {
  AddOnCatalogItem,
  PackageCatalogItem,
  StyleCatalogItem,
} from "@/components/booking/BookingForm";

type BookingFilter =
  | "all"
  | "needs_verification"
  | "deposit"
  | "full"
  | "confirmed"
  | "completed"
  | "cancelled";

type BookingSort = "upcoming" | "latest";

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
  const [error, setError] = useState<string | null>(null);
  const [editingBooking, setEditingBooking] =
    useState<SerializedBooking | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<SerializedBooking | null>(
    null
  );
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
  function openCreate() {
    setEditingBooking(null);
    setFormKey((current) => current + 1);
    setError(null);
    setSheetOpen(true);
  }

  function openEdit(booking: SerializedBooking) {
    setSelectedBooking(null);
    setEditingBooking(booking);
    setFormKey((current) => current + 1);
    setError(null);
    setSheetOpen(true);
  }

  function handleSaved(saved: SerializedBooking) {
    setBookings((current) =>
      current.some((booking) => booking._id === saved._id)
        ? current.map((booking) => (booking._id === saved._id ? saved : booking))
        : [saved, ...current]
    );
    setSheetOpen(false);
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
              {editingBooking
                ? editingBooking.source === "google_calendar"
                  ? "Edit imported booking"
                  : "Edit booking"
                : "New booking"}
            </SheetTitle>
          </SheetHeader>

          <BookingForm
            key={formKey}
            booking={editingBooking}
            packages={packages}
            styles={styles}
            addOns={addOns}
            chargeBy={chargeBy}
            timeSlots={timeSlots}
            onSaved={handleSaved}
            onCancel={() => setSheetOpen(false)}
            className="px-6 pb-4"
            actionsClassName="px-6 pb-6"
          />
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
