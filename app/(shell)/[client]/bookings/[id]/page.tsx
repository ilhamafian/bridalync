"use client";

import {
  CheckCircle2Icon,
  HourglassIcon,
  MessageCircleIcon,
  XCircleIcon,
} from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type ReactNode } from "react";

import { AnimatedFlow } from "@/components/animated-flow";
import { ManualPaymentStep } from "@/components/booking/ManualPaymentStep";
import { BookingInvoice } from "@/components/BookingQuotation";
import { BookingSessionList } from "@/components/BookingSessionList";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useLocale } from "@/components/LocaleProvider";
import { Button } from "@/components/ui/button";
import type { PublicBooking } from "@/schemas/bookingSchema";
import {
  applyPaymentOption,
  formatRm,
  resolveRequestPaymentOption,
} from "@/utils/booking/pricing";
import { cn } from "@/lib/utils";
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
  const manualSubmitted = paymentState === "manual-submitted";

  const [booking, setBooking] = useState<PublicBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmingTooLong, setConfirmingTooLong] = useState(false);
  const [payingBalance, setPayingBalance] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [showManualBalance, setShowManualBalance] = useState(false);
  const [requestPayOption, setRequestPayOption] = useState<"deposit" | "full">(
    "full"
  );

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

    async function syncCheckoutIfNeeded() {
      if (!returnedFromDepositCheckout && !returnedFromBalanceCheckout) {
        return;
      }

      try {
        await fetch("/api/stripe/checkout/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookingId,
            freelancerUsername: client,
            purpose: returnedFromBalanceCheckout ? "balance" : "deposit",
          }),
        });
      } catch {
        // Polling still covers confirmation if sync fails.
      }
    }

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

    void (async () => {
      await syncCheckoutIfNeeded();
      if (!cancelled) {
        await loadBooking();
      }
    })();

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

  async function refreshBooking() {
    const refresh = await fetch(
      `/api/bookings/${bookingId}?client=${encodeURIComponent(client)}`
    );
    if (refresh.ok) setBooking((await refresh.json()) as PublicBooking);
  }

  /** Approved booking request, stylist on Stripe. */
  async function handlePayRequest(paymentOption: "deposit" | "full") {
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
          purpose: "deposit",
          paymentOption,
        }),
      });
      const payload: unknown = await response.json();
      if (
        response.ok &&
        payload &&
        typeof payload === "object" &&
        "url" in payload &&
        typeof payload.url === "string"
      ) {
        window.location.href = payload.url;
        return;
      }
      throw new Error(
        payload &&
          typeof payload === "object" &&
          "error" in payload &&
          typeof payload.error === "string"
          ? payload.error
          : t.couldNotStartCheckout
      );
    } catch (requestPayError) {
      setPayError(
        requestPayError instanceof Error
          ? requestPayError.message
          : t.couldNotStartCheckout
      );
    } finally {
      setPayingBalance(false);
    }
  }

  /** Approved booking request, stylist on manual transfer. */
  async function handleRequestReceipt(
    receipt: File,
    paymentOption: "deposit" | "full"
  ) {
    if (payingBalance || !booking) return;

    setPayingBalance(true);
    setPayError(null);
    try {
      const formData = new FormData();
      formData.append("receipt", receipt);
      formData.append("client", client);
      formData.append("paymentOption", paymentOption);
      const response = await fetch(`/api/bookings/${bookingId}/manual-deposit`, {
        method: "POST",
        body: formData,
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          payload &&
            typeof payload === "object" &&
            "error" in payload &&
            typeof payload.error === "string"
            ? payload.error
            : t.paymentCouldNotStart
        );
      }
      await refreshBooking();
    } catch (receiptError) {
      setPayError(
        receiptError instanceof Error
          ? receiptError.message
          : t.paymentCouldNotStart
      );
    } finally {
      setPayingBalance(false);
    }
  }

  async function handleManualBalanceReceipt(receipt: File) {
    if (payingBalance || !booking) return;

    setPayingBalance(true);
    setPayError(null);

    try {
      const formData = new FormData();
      formData.append("receipt", receipt);
      const response = await fetch(`/api/bookings/${bookingId}/manual-balance`, {
        method: "POST",
        body: formData,
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

      const refresh = await fetch(
        `/api/bookings/${bookingId}?client=${encodeURIComponent(client)}`
      );
      const refreshed = (await refresh.json()) as PublicBooking;
      setBooking(refreshed);
      setShowManualBalance(false);
    } catch (manualError) {
      setPayError(
        manualError instanceof Error
          ? manualError.message
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
  const awaitingManualVerification =
    isPending &&
    booking.paymentChannel === "manual_transfer" &&
    booking.depositVerificationStatus === "pending";
  const outstandingBalance = hasOutstandingBalance(booking);
  const balanceReceiptPending = booking.balanceVerificationStatus === "pending";
  const isConfirmingDeposit = isPending && returnedFromDepositCheckout;
  const isConfirmingBalance =
    returnedFromBalanceCheckout && outstandingBalance;
  const isFullyPaid =
    isSuccess &&
    (booking.paymentOption === "full" || booking.invoice.balanceRm === 0);
  const usesManualBalance =
    (booking.stylistPaymentMethod ?? "manual_transfer") === "manual_transfer";
  const isRequested = booking.status === "requested";
  const isDeclinedRequest =
    booking.status === "cancelled" && Boolean(booking.requestDeclinedAt);
  const awaitingRequestPayment =
    isPending &&
    Boolean(booking.requestApprovedAt) &&
    !awaitingManualVerification &&
    !isConfirmingDeposit;
  const requestState = isRequested
    ? "requested"
    : isDeclinedRequest
      ? "declined"
      : awaitingRequestPayment
        ? "approved"
        : null;
  const balanceDueBeforeDays = booking.balanceDueBeforeDays ?? 3;
  const requestCanPayDeposit =
    resolveRequestPaymentOption(
      booking.invoice,
      booking.sessions,
      balanceDueBeforeDays,
      "deposit"
    ) === "deposit";
  const requestOption = requestCanPayDeposit ? requestPayOption : "full";
  const requestPaysInFull = requestOption === "full";
  const requestAmountDueRm = requestPaysInFull
    ? booking.invoice.totalRm
    : booking.invoice.depositRm;
  const freelancerName = booking.freelancer?.name ?? t.stylist;
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
        {requestState ? (
          <div className="flex flex-col items-center gap-3 text-center">
            {requestState === "requested" && (
              <HourglassIcon className="size-12 text-rose-900 dark:text-rose-400" />
            )}
            {requestState === "approved" && (
              <CheckCircle2Icon className="size-12 text-rose-900 dark:text-rose-400" />
            )}
            {requestState === "declined" && (
              <XCircleIcon className="size-12 text-rose-900 dark:text-rose-400" />
            )}
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              {requestState === "requested" && t.requestSentTitle}
              {requestState === "approved" && t.requestApprovedTitle}
              {requestState === "declined" && t.requestDeclinedTitle}
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {requestState === "requested" &&
                format(t.requestSentBody, {
                  name: freelancerName,
                  email: booking.contact.email,
                })}
              {requestState === "approved" &&
                format(t.requestApprovedBody, {
                  name: freelancerName,
                  amount: formatRm(requestAmountDueRm),
                })}
              {requestState === "declined" &&
                format(t.requestDeclinedBody, { name: freelancerName })}
            </p>
            {requestState === "approved" &&
            booking.depositVerificationStatus === "rejected" ? (
              <p className="text-sm text-destructive" role="alert">
                {t.requestReceiptRejected}
              </p>
            ) : null}
          </div>
        ) : (
        <div className="flex flex-col items-center gap-3 text-center">
          {(isFullyPaid || isCompleted) && (
            <CheckCircle2Icon className="size-12 text-rose-900 dark:text-rose-400" />
          )}
          {isSuccess && outstandingBalance && !isConfirmingBalance && (
            <CheckCircle2Icon className="size-12 text-rose-900 dark:text-rose-400" />
          )}
          {awaitingManualVerification && (
            <CheckCircle2Icon className="size-12 text-rose-900 dark:text-rose-400" />
          )}
          {isFailure && <XCircleIcon className="size-12 text-rose-900 dark:text-rose-400" />}
          {(isConfirmingDeposit || isConfirmingBalance) && (
            <div className="size-12 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-rose-900 dark:border-t-rose-400" />
          )}
          {isPending && !isConfirmingDeposit && !awaitingManualVerification && (
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
            {awaitingManualVerification && t.bookingPending}
            {isPending &&
              !isConfirmingDeposit &&
              !awaitingManualVerification &&
              t.bookingPending}
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
                {t.webhookHint}
              </span>
            )}
            {(awaitingManualVerification || manualSubmitted) &&
              t.bookingAwaitingVerification}
            {isPending &&
              !isConfirmingDeposit &&
              !awaitingManualVerification &&
              !manualSubmitted &&
              t.bookingAwaitingPayment}
            {balanceReceiptPending && t.balanceReceiptPending}
          </p>
        </div>
        )}

        <div className="w-full space-y-2">
          <p className="text-sm font-medium text-foreground">
            {t.bookingDetails}
          </p>
          <div className={frostedPanelClassName}>
            <p className="font-medium text-foreground">{booking.packageNames}</p>
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

        {requestState === "approved" && requestCanPayDeposit ? (
          <div
            className="flex w-full flex-col gap-2"
            role="radiogroup"
            aria-label={t.paymentOptionLabel}
          >
            {(["full", "deposit"] as const).map((option) => {
              const selected = requestOption === option;
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setRequestPayOption(option)}
                  className={cn(
                    "flex w-full flex-col items-start gap-0.5 rounded-lg px-3 py-3 text-left text-sm transition-colors",
                    selected
                      ? "bg-rose-800 text-white shadow-sm"
                      : "bg-white/30 shadow-sm ring-1 ring-white/60 backdrop-blur-sm hover:bg-white/40 dark:bg-white/10 dark:ring-white/15 dark:hover:bg-white/15"
                  )}
                >
                  <span className="font-medium">
                    {option === "full"
                      ? format(t.payFullOption, {
                          amount: formatRm(booking.invoice.totalRm),
                        })
                      : format(t.payDepositOption, {
                          amount: formatRm(booking.invoice.depositRm),
                        })}
                  </span>
                  <span
                    className={cn(
                      "text-xs",
                      selected ? "text-white/80" : "text-muted-foreground"
                    )}
                  >
                    {option === "full"
                      ? t.noBalanceLater
                      : format(t.balanceDue, {
                          amount: formatRm(booking.invoice.balanceRm),
                          days: balanceDueBeforeDays,
                        })}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

        <BookingInvoice
          invoice={
            requestState === "approved" && requestPaysInFull
              ? applyPaymentOption(booking.invoice, "full")
              : booking.invoice
          }
          paymentOption={
            requestState === "approved" ? requestOption : booking.paymentOption
          }
        />

        {requestState === "approved" &&
          (usesManualBalance ? (
            booking.manualTransfer ? (
              <ManualPaymentStep
                amountLabel={format(t.transferAmountDue, {
                  amount: formatRm(requestAmountDueRm),
                })}
                submitLabel={t.submitReceiptConfirm}
                submittingLabel={t.submittingReceipt}
                isSubmitting={payingBalance}
                error={payError}
                transfer={booking.manualTransfer}
                onSubmit={(file) => void handleRequestReceipt(file, requestOption)}
              />
            ) : (
              <p className="text-center text-sm text-destructive" role="alert">
                This stylist has not set up payment details yet. Please contact
                them to complete your booking.
              </p>
            )
          ) : (
            <div className="flex w-full flex-col gap-2">
              <Button
                size="lg"
                className="h-11 w-full bg-rose-800 text-white hover:bg-rose-800/90"
                disabled={payingBalance}
                onClick={() => void handlePayRequest(requestOption)}
              >
                {payingBalance
                  ? t.redirectingStripe
                  : format(requestPaysInFull ? t.payNow : t.payDepositNow, {
                      amount: formatRm(requestAmountDueRm),
                    })}
              </Button>
              {payError && (
                <p className="text-center text-sm text-destructive">{payError}</p>
              )}
            </div>
          ))}

        {outstandingBalance &&
          !isConfirmingBalance &&
          !balanceReceiptPending &&
          !showManualBalance && (
            <div className="flex w-full flex-col gap-2">
              <Button
                size="lg"
                className="h-11 w-full bg-rose-800 text-white hover:bg-rose-800/90"
                disabled={payingBalance}
                onClick={() => {
                  if (usesManualBalance) {
                    setShowManualBalance(true);
                    return;
                  }
                  void handlePayBalance();
                }}
              >
                {payingBalance
                  ? t.startingCheckout
                  : format(t.payRemainingBalance, {
                      amount: formatRm(booking.invoice.balanceRm),
                    })}
              </Button>
              {payError && (
                <p className="text-center text-sm text-destructive">{payError}</p>
              )}
            </div>
          )}

        {outstandingBalance && showManualBalance && (
          booking.manualTransfer ? (
            <ManualPaymentStep
              amountLabel={format(t.transferAmountDue, {
                amount: formatRm(booking.invoice.balanceRm),
              })}
              submitLabel={t.submitBalanceReceipt}
              submittingLabel={t.submittingReceipt}
              isSubmitting={payingBalance}
              error={payError}
              transfer={booking.manualTransfer}
              onSubmit={(file) => void handleManualBalanceReceipt(file)}
            />
          ) : (
            <p className="text-center text-sm text-destructive" role="alert">
              This stylist has not set up payment details yet. Please contact
              them to pay the balance.
            </p>
          )
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
