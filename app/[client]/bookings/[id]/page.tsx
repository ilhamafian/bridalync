"use client";

import { CheckCircle2Icon, XCircleIcon } from "lucide-react";

import { BookingInvoice } from "@/components/BookingInvoice";
import { BookingSessionList } from "@/components/BookingSessionList";
import { Button } from "@/components/ui/button";
import type { BookingInvoiceSummary } from "@/utils/booking/pricing";
import type { BookingSession } from "@/schemas/booking";

type BookingStatus = "pending" | "confirmed" | "failed";

const MOCK_STATUS: BookingStatus = "confirmed";

const MOCK_PACKAGE_LABEL = "Akad Nikah";
const MOCK_STYLE_LABEL = "Neat & Clean";
const MOCK_CONTACT_NAME = "Aisyah Rahman";
const MOCK_CONTACT_PHONE = "+60 12-345 6789";
const MOCK_DEPOSIT_LABEL = "RM100";

const MOCK_INVOICE: BookingInvoiceSummary = {
  lineItems: [
    { label: "Akad Nikah", amountRm: 350 },
    { label: "Gandik", amountRm: 80 },
  ],
  totalRm: 430,
  depositRm: 100,
  balanceRm: 330,
};

const MOCK_SESSIONS: BookingSession[] = [
  {
    id: "session-1",
    eventType: "akad",
    date: "2026-08-15",
    slotId: "10-12",
    location: {
      label: "Grand Ballroom",
      address: "123 Jalan Ampang, Kuala Lumpur",
      lat: 3.1579,
      lng: 101.7116,
    },
  },
];

export default function BookingResultPage() {
  const isSuccess = MOCK_STATUS === "confirmed";
  const isFailure = MOCK_STATUS === "failed";
  const isPending = MOCK_STATUS === "pending";

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto bg-zinc-50 px-6 pt-16 pb-16 dark:bg-zinc-950">
      <div className="flex w-full max-w-md flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          {isSuccess && (
            <CheckCircle2Icon className="size-12 text-emerald-600 dark:text-emerald-400" />
          )}
          {isFailure && (
            <XCircleIcon className="size-12 text-destructive" />
          )}
          {isPending && (
            <div className="size-12 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
          )}

          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {isSuccess && "Booking confirmed"}
            {isFailure && "Payment failed"}
            {isPending && "Booking pending"}
          </h1>

          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {isSuccess &&
              `Your deposit of ${MOCK_DEPOSIT_LABEL} was received. The remaining balance is due before your session.`}
            {isFailure &&
              "We couldn't process your deposit. You can try booking again or contact the stylist."}
            {isPending && "Your booking is awaiting payment confirmation."}
          </p>
        </div>

        <div className="w-full space-y-2">
          <p className="text-sm font-medium text-foreground">Booking details</p>
          <div className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm">
            <p className="font-medium text-foreground">{MOCK_PACKAGE_LABEL}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Style: {MOCK_STYLE_LABEL}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {MOCK_CONTACT_NAME} · {MOCK_CONTACT_PHONE}
            </p>
          </div>
        </div>

        <div className="w-full space-y-2">
          <p className="text-sm font-medium text-foreground">Sessions</p>
          <BookingSessionList sessions={MOCK_SESSIONS} showLocation />
        </div>

        <BookingInvoice invoice={MOCK_INVOICE} />

        <div className="flex w-full flex-col gap-2">
          {isFailure && (
            <Button
              size="lg"
              className="h-11 w-full bg-chart-4 text-white hover:bg-chart-4/90"
            >
              Try again
            </Button>
          )}
          <Button
            variant={isFailure ? "outline" : "default"}
            size="lg"
            className={
              isFailure
                ? "h-11 w-full"
                : "h-11 w-full bg-chart-4 text-white hover:bg-chart-4/90"
            }
          >
            WhatsApp
          </Button>
        </div>
      </div>
    </div>
  );
}
