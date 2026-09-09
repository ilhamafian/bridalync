"use client";

import { CheckCircle2Icon, MessageCircleIcon, XCircleIcon } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type ReactNode } from "react";

import { AnimatedFlow } from "@/components/animated-flow";
import { BookingInvoice } from "@/components/BookingQuotation";
import { BookingSessionList } from "@/components/BookingSessionList";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useLocale } from "@/components/LocaleProvider";
import { Button } from "@/components/ui/button";
import type { PublicBooking } from "@/schemas/bookingSchema";
import { formatRm } from "@/utils/booking/pricing";
import {
  buildBookingResultMessage,
  buildWhatsAppUrl,
} from "@/utils/booking/messages";

const frostedPanelClassName =
  "rounded-lg bg-white/30 p-3 shadow-sm ring-1 ring-white/60 backdrop-blur-sm dark:bg-white/10 dark:ring-white/15";

function BookingResultLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
      <AnimatedFlow
        variant="blush"
        flowSpeed={0.9}
        distortionWarp={1.4}
        filmGrain={0.25}
        rotationAngle={120}
        className="pointer-events-none absolute inset-0 min-h-0"
      />
      <div className="pointer-events-none fixed top-4 right-6 z-50">
        <div className="pointer-events-auto">
          <LanguageSelector />
        </div>
      </div>
      <div className="relative z-10 flex min-h-0 w-full flex-1 flex-col items-center overflow-y-auto overscroll-y-contain px-6 pb-16 pt-16">
        {children}
      </div>
    </div>
  );
}

export default function BookingResultPage() {
  const { t } = useLocale();

  return (
    <Suspense
      fallback={
        <BookingResultLayout>
          <div className="flex min-h-0 flex-1 items-center justify-center py-16 text-sm text-muted-foreground">
            {t.loadingBooking}
          </div>
        </BookingResultLayout>
      }
    >
      <BookingResultPageContent />
    </Suspense>
  );
}

function hasOutstandingBalance(booking: PublicBooking) {
  return (
    booking.status === "confirmed" &&
    booking.paymentOption === "deposit" &&
    booking.invoice.balanceRm > 0
  );
}

function BookingResultPageContent() {
  const { t, format } = useLocale();
  const params = useParams();
  const searchParams = useSearchParams();
  const client = params.client as string;
  const bookingId = params.id as string;
  const paymentState = searchParams.get("payment");
  const returnedFromDepositCheckout = paymentState === "success";
  const returnedFromBalanceCheckout = paymentState === "balance-success";

  const [booking, setBooking] = useState<PublicBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmingTooLong, setConfirmingTooLong] = useState(false);
  const [payingBalance, setPayingBalance] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  useEffect(() => {
    const waitingOnDeposit =
      returnedFromDepositCheckout && booking?.status === "pending";
    const waitingOnBalance =
      returnedFromBalanceCheckout &&
      booking != null &&
      hasOutstandingBalance(booking);

    if (!waitingOnDeposit && !waitingOnBalance) {
      setConfirmingTooLong(false);
      return;
    }

    const timer = setTimeout(() => {
      setConfirmingTooLong(true);
    }, 30000);

    return () => clearTimeout(timer);
  }, [booking, returnedFromBalanceCheckout, returnedFromDepositCheckout]);

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
              : t.bookingNotFound
          );
        }

        if (cancelled) return;

        const nextBooking = payload as PublicBooking;
        setBooking(nextBooking);
        setError(null);

        const waitingOnDeposit =
          nextBooking.status === "pending" && returnedFromDepositCheckout;
        const waitingOnBalance =
          returnedFromBalanceCheckout && hasOutstandingBalance(nextBooking);

        if (waitingOnDeposit || waitingOnBalance) {
          pollTimer = setTimeout(() => {
            void loadBooking({ silent: true });
          }, 2500);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : t.couldNotLoadBooking
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
  }, [
    bookingId,
    client,
    returnedFromBalanceCheckout,
    returnedFromDepositCheckout,
    t,
  ]);

  async function handlePayBalance() {
    if (payingBalance || !booking) return;

    setPayingBalance(true);
    setPayError(null);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          freelancerUsername: client,
          purpose: "balance",
        }),
      });
      const payload: unknown = await response.json();

      if (!response.ok) {
        throw new Error(
          payload &&
            typeof payload === "object" &&
            "error" in payload &&
            typeof payload.error === "string"
            ? payload.error
            : t.couldNotStartBalancePayment
        );
      }

      if (
        payload &&
        typeof payload === "object" &&
        "url" in payload &&
        typeof payload.url === "string"
      ) {
        window.location.href = payload.url;
        return;
      }

      throw new Error(t.couldNotStartBalancePayment);
    } catch (payBalanceError) {
      setPayError(
        payBalanceError instanceof Error
          ? payBalanceError.message
          : t.couldNotStartBalancePayment
      );
    } finally {
      setPayingBalance(false);
    }
  }

  if (loading) {
    return (
      <BookingResultLayout>
        <div className="flex min-h-0 flex-1 items-center justify-center py-16 text-sm text-muted-foreground">
          {t.loadingBooking}
        </div>
      </BookingResultLayout>
    );
  }

  if (error || !booking) {
    return (
      <BookingResultLayout>
        <div className="flex min-h-0 flex-1 items-center justify-center py-16 text-sm text-destructive">
          {error ?? t.bookingNotFound}
        </div>
      </BookingResultLayout>
    );
  }

  const isSuccess = booking.status === "confirmed";
  const isCompleted = booking.status === "completed";
  const isFailure = booking.status === "failed";
  const isPending = booking.status === "pending";
  const outstandingBalance = hasOutstandingBalance(booking);
  const isConfirmingDeposit = isPending && returnedFromDepositCheckout;
  const isConfirmingBalance =
    returnedFromBalanceCheckout && outstandingBalance;
  const isFullyPaid =
    isSuccess &&
    (booking.paymentOption === "full" || booking.invoice.balanceRm === 0);
  const whatsAppUrl =
    booking.freelancer?.mobile && booking.freelancer.country_code
      ? buildWhatsAppUrl(
          booking.freelancer.country_code,
          booking.freelancer.mobile,
          buildBookingResultMessage(booking.freelancer.name, booking)
        )
      : null;

  return (
    <BookingResultLayout>
      <div className="flex w-full max-w-md flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          {(isFullyPaid || isCompleted) && (
            <CheckCircle2Icon className="size-12 text-rose-900 dark:text-rose-400" />
          )}
          {isSuccess && outstandingBalance && !isConfirmingBalance && (
            <CheckCircle2Icon className="size-12 text-rose-900 dark:text-rose-400" />
          )}
          {isFailure && <XCircleIcon className="size-12 text-rose-900 dark:text-rose-400" />}
          {(isConfirmingDeposit || isConfirmingBalance) && (
            <div className="size-12 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-rose-900 dark:border-t-rose-400" />
          )}
          {isPending && !isConfirmingDeposit && (
            <div className="size-12 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-rose-900 dark:border-t-rose-400" />
          )}

          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {isConfirmingBalance && t.confirmingPayment}
            {isConfirmingDeposit && t.confirmingPayment}
            {!isConfirmingDeposit &&
              !isConfirmingBalance &&
              isCompleted &&
              t.bookingCompleted}
            {!isConfirmingDeposit &&
              !isConfirmingBalance &&
              !isCompleted &&
              isFullyPaid &&
              t.bookingFullyPaid}
            {!isConfirmingDeposit &&
              !isConfirmingBalance &&
              !isCompleted &&
              isSuccess &&
              outstandingBalance &&
              t.bookingConfirmed}
            {isFailure && t.paymentFailed}
            {isPending && !isConfirmingDeposit && t.bookingPending}
          </h1>

          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {isCompleted && t.sessionDoneBeautifully}
            {!isConfirmingDeposit &&
              !isConfirmingBalance &&
              !isCompleted &&
              isFullyPaid &&
              format(t.paymentReceived, {
                amount: formatRm(booking.invoice.totalRm),
              })}
            {!isConfirmingDeposit &&
              !isConfirmingBalance &&
              !isCompleted &&
              isSuccess &&
              outstandingBalance &&
              format(t.depositReceived, {
                depositAmount: formatRm(booking.invoice.depositRm),
                balanceAmount: formatRm(booking.invoice.balanceRm),
              })}
            {isFailure && t.paymentNotProcessed}
            {(isConfirmingDeposit || isConfirmingBalance) && t.paymentAccepted}
            {(isConfirmingDeposit || isConfirmingBalance) && confirmingTooLong && (
              <span className="mt-2 block text-xs text-muted-foreground">
                {t.webhookHint}{" "}
                <code className="rounded bg-muted px-1 py-0.5">
                  stripe listen --forward-to localhost:3000/api/stripe/webhooks
                  --forward-connect-to localhost:3000/api/stripe/webhooks
                </code>
                .
              </span>
            )}
            {isPending && !isConfirmingDeposit && t.bookingAwaitingPayment}
          </p>
        </div>

        <div className="w-full space-y-2">
          <p className="text-sm font-medium text-foreground">
            {t.bookingDetails}
          </p>
          <div className={frostedPanelClassName}>
            <p className="font-medium text-foreground">{booking.packageName}</p>
            {booking.styleName && (
              <p className="mt-1 text-xs text-muted-foreground">
                {t.styleLabel}: {booking.styleName}
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              {booking.contact.name} · {booking.contact.email}
            </p>
          </div>
        </div>

        <div className="w-full space-y-2">
          <p className="text-sm font-medium text-foreground">
            {t.sessionsHeading}
          </p>
          <BookingSessionList
            sessions={booking.sessions}
            showLocation
            frosted
          />
        </div>

        <BookingInvoice
          invoice={booking.invoice}
          paymentOption={booking.paymentOption}
        />

        {outstandingBalance && !isConfirmingBalance && (
          <div className="flex w-full flex-col gap-2">
            <Button
              size="lg"
              className="h-11 w-full bg-rose-800 text-white hover:bg-rose-800/90"
              disabled={payingBalance}
              onClick={() => void handlePayBalance()}
            >
              {payingBalance
                ? "Starting checkout…"
                : `Pay remaining balance (${formatRm(booking.invoice.balanceRm)})`}
            </Button>
            {payError && (
              <p className="text-center text-sm text-destructive">{payError}</p>
            )}
          </div>
        )}

        {whatsAppUrl && (
          <Button
            size="lg"
            variant="outline"
            className="h-11 w-full gap-2"
            asChild
          >
            <a href={whatsAppUrl} target="_blank" rel="noopener noreferrer">
              <MessageCircleIcon className="size-4 text-rose-900 dark:text-rose-400" />
              WhatsApp {booking.freelancer?.name ?? "stylist"}
            </a>
          </Button>
        )}
      </div>
    </BookingResultLayout>
  );
}
