"use client";

import { CheckCircle2Icon, MessageCircleIcon, XCircleIcon } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { BookingInvoice } from "@/components/BookingQuotation";
import { BookingSessionList } from "@/components/BookingSessionList";
import { Button } from "@/components/ui/button";
import type { PublicBooking } from "@/schemas/bookingSchema";
import { formatRm } from "@/utils/booking/pricing";
import {
  buildBookingResultMessage,
  buildWhatsAppUrl,
} from "@/utils/booking/messages";

export default function BookingResultPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-0 flex-1 items-center justify-center px-6 py-16 text-sm text-muted-foreground">
          Loading booking…
        </div>
      }
    >
      <BookingResultPageContent />
    </Suspense>
  );
}

function BookingResultPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const client = params.client as string;
  const bookingId = params.id as string;
  const paymentState = searchParams.get("payment");
  const returnedFromCheckout = paymentState === "success";

  const [booking, setBooking] = useState<PublicBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmingTooLong, setConfirmingTooLong] = useState(false);

  useEffect(() => {
    if (!returnedFromCheckout || booking?.status !== "pending") {
      setConfirmingTooLong(false);
      return;
    }

    const timer = setTimeout(() => {
      setConfirmingTooLong(true);
    }, 30000);

    return () => clearTimeout(timer);
  }, [booking?.status, returnedFromCheckout]);

  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | undefined;

    async function loadBooking(options?: { silent?: boolean }) {
      if (!options?.silent) {
        setLoading(true);
      }

      try {
        const response = await fetch(
          `/api/bookings/${bookingId}?client=${encodeURIComponent(client)}`
        );
        const payload: unknown = await response.json();

        if (!response.ok) {
          throw new Error(
            payload &&
              typeof payload === "object" &&
              "error" in payload &&
              typeof payload.error === "string"
              ? payload.error
              : "Booking not found."
          );
        }

        if (cancelled) return;

        const nextBooking = payload as PublicBooking;
        setBooking(nextBooking);
        setError(null);

        if (
          nextBooking.status === "pending" &&
          returnedFromCheckout
        ) {
          pollTimer = setTimeout(() => {
            void loadBooking({ silent: true });
          }, 2500);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Could not load booking."
          );
        }
      } finally {
        if (!cancelled && !options?.silent) {
          setLoading(false);
        }
      }
    }

    void loadBooking();

    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [bookingId, client, returnedFromCheckout]);

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center px-6 py-16 text-sm text-muted-foreground">
        Loading booking…
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center px-6 py-16 text-sm text-destructive">
        {error ?? "Booking not found."}
      </div>
    );
  }

  const isSuccess = booking.status === "confirmed";
  const isFailure = booking.status === "failed";
  const isPending = booking.status === "pending";
  const isConfirmingPayment = isPending && paymentState === "success";
  const whatsAppUrl =
    booking.freelancer?.mobile && booking.freelancer.country_code
      ? buildWhatsAppUrl(
          booking.freelancer.country_code,
          booking.freelancer.mobile,
          buildBookingResultMessage(
            booking.freelancer.name,
            booking
          )
        )
      : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto bg-zinc-50 px-6 pt-16 pb-16 dark:bg-zinc-950">
      <div className="flex w-full max-w-md flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          {isSuccess && (
            <CheckCircle2Icon className="size-12 text-emerald-600 dark:text-emerald-400" />
          )}
          {isFailure && <XCircleIcon className="size-12 text-destructive" />}
          {isPending && (
            <div className="size-12 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
          )}

          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {isSuccess && "Booking confirmed"}
            {isFailure && "Payment failed"}
            {isConfirmingPayment && "Confirming payment"}
            {isPending && !isConfirmingPayment && "Booking pending"}
          </h1>

          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {isSuccess &&
              (booking.paymentOption === "full" ||
              booking.invoice.balanceRm === 0
                ? `Your payment of ${formatRm(booking.invoice.totalRm)} was received. You're all set.`
                : `Your deposit of ${formatRm(booking.invoice.depositRm)} was received. The remaining balance is due before your session.`)}
            {isFailure &&
              "We couldn't process your payment. You can try booking again or contact the stylist."}
            {isConfirmingPayment &&
              "Stripe accepted your payment. We're waiting for confirmation — this usually takes a few seconds."}
            {isConfirmingPayment && confirmingTooLong && (
              <span className="mt-2 block text-xs text-muted-foreground">
                If this takes longer than a minute, the payment webhook may not
                be reaching your app. For local dev, run{" "}
                <code className="rounded bg-muted px-1 py-0.5">
                  stripe listen --forward-to localhost:3000/api/stripe/webhooks
                  --forward-connect-to localhost:3000/api/stripe/webhooks
                </code>
                .
              </span>
            )}
            {isPending &&
              !isConfirmingPayment &&
              "Your booking is awaiting payment. Complete checkout to secure your slot."}
          </p>
        </div>

        <div className="w-full space-y-2">
          <p className="text-sm font-medium text-foreground">Booking details</p>
          <div className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm">
            <p className="font-medium text-foreground">{booking.packageName}</p>
            {booking.styleName && (
              <p className="mt-1 text-xs text-muted-foreground">
                Style: {booking.styleName}
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              {booking.contact.name} · {booking.contact.email}
            </p>
          </div>
        </div>

        <div className="w-full space-y-2">
          <p className="text-sm font-medium text-foreground">Sessions</p>
          <BookingSessionList sessions={booking.sessions} showLocation />
        </div>

        <BookingInvoice
          invoice={booking.invoice}
          paymentOption={booking.paymentOption}
        />

        {whatsAppUrl && (
          <Button
            size="lg"
            variant="outline"
            className="h-11 w-full gap-2"
            asChild
          >
            <a href={whatsAppUrl} target="_blank" rel="noopener noreferrer">
              <MessageCircleIcon className="size-4" />
              WhatsApp {booking.freelancer?.name ?? "stylist"}
            </a>
          </Button>
        )}

      </div>
    </div>
  );
}
