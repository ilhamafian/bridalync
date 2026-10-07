"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  IconAdjustmentsHorizontal,
  IconSearch,
} from "@tabler/icons-react";

import { BackButton } from "@/components/dashboard/BackButton";
import { glassCardClassName } from "@/components/dashboard/HomeBookingCard";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Booking } from "@/schemas/bookingSchema";
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

type BookingFilter =
  | "all"
  | "active"
  | "requests"
  | "needs_verification"
  | "deposit"
  | "full"
  | "confirmed"
  | "completed"
  | "cancelled";

type BookingSort = "upcoming" | "latest";

const BOOKING_FILTERS: { value: BookingFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Not completed" },
  { value: "requests", label: "Requests" },
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
    return booking.paymentOption === "full" ||
      booking.requestPaymentOption === "full"
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
    case "active":
      return (
        booking.status !== "completed" &&
        booking.status !== "cancelled" &&
        booking.status !== "failed"
      );
    case "requests":
      return booking.status === "requested";
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

function digitsOnly(value: string | undefined) {
  return (value ?? "").replace(/\D/g, "");
}

function matchesBookingSearch(booking: SerializedBooking, query: string) {
  const text = query.trim().toLowerCase();
  if (!text) return true;

  const { name, email, mobile, country_code } = booking.contact;
  if (name.toLowerCase().includes(text)) return true;
  if (email.toLowerCase().includes(text)) return true;

  const queryDigits = digitsOnly(text);
  if (!queryDigits) return false;
  const mobileDigits = digitsOnly(mobile).replace(/^0+/, "");
  if (!mobileDigits) return false;
  return [
    mobileDigits,
    `0${mobileDigits}`,
    `${digitsOnly(country_code)}${mobileDigits}`,
  ].some((candidate) => candidate.includes(queryDigits));
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
    case "requested":
      return "Booking request";
    case "confirmed":
      return "Confirmed";
    case "completed":
      return "Completed";
    case "cancelled":
      return booking.requestDeclinedAt ? "Request declined" : "Cancelled";
    case "pending":
      return booking.requestApprovedAt
        ? "Approved · awaiting payment"
        : "Awaiting payment";
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
): "default" | "success" | "destructive" | "outline" {
  switch (status) {
    case "confirmed":
      return "default";
    case "completed":
      return "success";
    case "cancelled":
    case "failed":
      return "destructive";
    default:
      return "outline";
  }
}

function bookingBadgeVariant(
  booking: SerializedBooking
): "default" | "success" | "destructive" | "outline" {
  if (needsPaymentVerification(booking)) return "destructive";
  if (booking.status === "requested") return "destructive";
  if (booking.depositVerificationStatus === "rejected") return "destructive";
  return statusBadgeVariant(booking.status);
}

export function BookingsManager({
  initialBookings,
}: {
  initialBookings: SerializedBooking[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [bookings, setBookings] = useState(initialBookings);
  const [statusFilter, setStatusFilter] = useState<BookingFilter>("all");
  const [sortOrder, setSortOrder] = useState<BookingSort>("upcoming");
  const [searchQuery, setSearchQuery] = useState("");
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

  const filterParam = searchParams.get("filter");
  const sortParam = searchParams.get("sort");
  useEffect(() => {
    if (BOOKING_FILTERS.some((filter) => filter.value === filterParam)) {
      setStatusFilter(filterParam as BookingFilter);
    }
    if (BOOKING_SORTS.some((sort) => sort.value === sortParam)) {
      setSortOrder(sortParam as BookingSort);
    }
  }, [filterParam, sortParam]);

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
      router.refresh();
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

  const requestCount = useMemo(
    () => bookings.filter((booking) => booking.status === "requested").length,
    [bookings]
  );

  const filteredBookings = useMemo(() => {
    const filtered = bookings.filter(
      (booking) =>
        matchesBookingFilter(booking, statusFilter) &&
        matchesBookingSearch(booking, searchQuery)
    );
    const sorted = sortBookings(filtered, sortOrder);

    if (statusFilter === "needs_verification") {
      return sorted;
    }

    const needsAction = (booking: SerializedBooking) =>
      booking.status === "requested" || needsPaymentVerification(booking);
    const needsReview = sorted.filter(needsAction);
    const rest = sorted.filter((booking) => !needsAction(booking));
    return [...needsReview, ...rest];
  }, [bookings, statusFilter, sortOrder, searchQuery]);

  const activeFilterLabel =
    BOOKING_FILTERS.find((filter) => filter.value === statusFilter)?.label ??
    statusFilter;

  function openDetails(booking: SerializedBooking) {
    router.push(`/dashboard/bookings/${encodeURIComponent(booking._id)}`, {
      scroll: false,
    });
  }

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <BackButton />

      <div>
        <h2 className="text-lg font-semibold">Booking Finder</h2>
        <p className="text-sm text-muted-foreground">
          Manage and find bookings
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <IconSearch className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-foreground/70" />
            <Input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search name, email or phone"
              aria-label="Search bookings by name, email or phone"
              className="h-10 rounded-lg border-zinc-900/10 bg-white/40 pl-9 text-sm shadow-sm backdrop-blur-sm placeholder:text-foreground/50 md:text-sm dark:border-white/20 dark:bg-white/10"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Sort bookings"
                className="size-10 shrink-0 rounded-lg border border-zinc-900/10 bg-white/40 shadow-sm backdrop-blur-sm hover:bg-white/50 dark:border-white/20 dark:bg-white/10 dark:hover:bg-white/15"
              >
                <IconAdjustmentsHorizontal className="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-100 w-40 min-w-40">
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={sortOrder}
                onValueChange={(value) => setSortOrder(value as BookingSort)}
              >
                {BOOKING_SORTS.map((sort) => (
                  <DropdownMenuRadioItem key={sort.value} value={sort.value}>
                    {sort.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div
          role="group"
          aria-label="Filter bookings"
          className="-mx-4 flex gap-2 overflow-x-auto px-4 py-1 no-scrollbar lg:-mx-6 lg:px-6"
        >
          {BOOKING_FILTERS.map((filter) => {
            const active = statusFilter === filter.value;
            return (
              <button
                key={filter.value}
                type="button"
                aria-pressed={active}
                onClick={() => setStatusFilter(filter.value)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-white/30 text-foreground shadow-sm ring-1 ring-white/60 backdrop-blur-sm hover:bg-white/40 dark:bg-white/10 dark:ring-white/15 dark:hover:bg-white/15"
                )}
              >
                {filter.value === "needs_verification" &&
                pendingVerificationCount > 0
                  ? `${filter.label} (${pendingVerificationCount})`
                  : filter.value === "requests" && requestCount > 0
                    ? `${filter.label} (${requestCount})`
                    : filter.label}
              </button>
            );
          })}
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
            <CardTitle>
              {searchQuery.trim() ? "No matching bookings" : "No bookings yet"}
            </CardTitle>
            <CardDescription>
              {searchQuery.trim()
                ? "Try a different name, email or phone number."
                : statusFilter === "all"
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
                      : cn(
                          glassCardClassName,
                          "hover:bg-white/40 dark:hover:bg-white/15"
                        )
                  )}
                  onClick={() => openDetails(booking)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openDetails(booking);
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
    </div>
  );
}
