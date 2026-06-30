"use client";

import { useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { BookingAddOnPicker } from "@/components/BookingAddOnPicker";
import { BookingContactForm } from "@/components/BookingContactForm";
import { BookingInvoice } from "@/components/BookingInvoice";
import { BookingPackagePicker } from "@/components/BookingPackagePicker";
import { BookingSessionList } from "@/components/BookingSessionList";
import { BookingStylePicker } from "@/components/BookingStylePicker";
import {
  CalendarBookedDates,
  type TimeSlotId,
} from "@/components/CalendarBookedDates";
import { SessionLocationPicker } from "@/components/SessionLocationPicker";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { BookingInvoiceSummary } from "@/utils/booking/pricing";

type BookingPackageId = string;

type BookingStep =
  | "intro"
  | "events"
  | "datetime"
  | "location"
  | "style"
  | "addons"
  | "details"
  | "review";

const STEP_ORDER: BookingStep[] = [
  "intro",
  "events",
  "datetime",
  "location",
  "style",
  "addons",
  "details",
  "review",
];

const MOCK_USER = {
  name: "Sarah",
  role: "bridal stylist",
};

const MOCK_PACKAGE_ID = "akad-nikah" as BookingPackageId;
const MOCK_REQUIRED_SESSION_COUNT = 2;
const MOCK_CURRENT_EVENT_LABEL = "Akad Nikah";

const MOCK_INVOICE: BookingInvoiceSummary = {
  lineItems: [
    { label: "Akad Nikah", amountRm: 350 },
    { label: "Gandik", amountRm: 80 },
  ],
  totalRm: 430,
  depositRm: 100,
  balanceRm: 330,
};

const MOCK_DEPOSIT_LABEL = "RM100";

const EMPTY_CONTACT: any = {
  name: "",
  phone: "",
  email: "",
};

const enterAnimationClass = "animate-in fade-in zoom-in-95 duration-300";

export default function ClientPage() {
  const [step, setStep] = useState<BookingStep>("intro");

  const [selectedPackageId, setSelectedPackageId] =
    useState<BookingPackageId | null>(MOCK_PACKAGE_ID);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlotId | null>(null);

  const [sameLocationForAll, setSameLocationForAll] = useState(true);
  const [sharedLocation, setSharedLocation] = useState<any | null>(
    null
  );
  const [selectedStyleId, setSelectedStyleId] =
    useState<string | null>("neat-clean");
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>(
    []
  );
  const [contact, setContact] = useState<any>(EMPTY_CONTACT);

  function goToNextStep() {
    const index = STEP_ORDER.indexOf(step);
    if (index < STEP_ORDER.length - 1) {
      setStep(STEP_ORDER[index + 1]);
    }
  }

  function goToPreviousStep() {
    const index = STEP_ORDER.indexOf(step);
    if (index > 0) {
      setStep(STEP_ORDER[index - 1]);
    }
  }

  return (
    <div
      className={cn(
        "relative flex min-h-0 flex-1 flex-col items-center overflow-y-auto bg-zinc-50 px-6 pb-16 dark:bg-zinc-950",
        step === "intro" ? "pt-16" : "pt-4"
      )}
    >
      {step !== "intro" && (
        <div className="sticky top-0 z-10 mb-4 w-full max-w-md self-center bg-zinc-50 pt-2 dark:bg-zinc-950">
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="-ml-2 text-muted-foreground hover:text-foreground"
            onClick={goToPreviousStep}
          >
            <ChevronLeftIcon />
            Back
          </Button>
        </div>
      )}

      {step === "intro" && (
        <button
          type="button"
          className={cn(
            "flex flex-1 flex-col items-center justify-center",
            enterAnimationClass
          )}
          onClick={goToNextStep}
        >
          <h1 className="max-w-md text-center text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Hi, I&apos;m {MOCK_USER.name}, your professional {MOCK_USER.role}.
          </h1>
        </button>
      )}

      {step === "events" && (
        <div
          className={cn(
            "flex w-full max-w-md flex-col items-center",
            enterAnimationClass
          )}
        >
          <h1 className="mb-4 text-center text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            What are you booking for?
          </h1>
          <p className="mb-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
            Choose the package that matches your event.
          </p>

          <div className="flex w-full flex-col items-end gap-4">
            <BookingPackagePicker
              selectedPackageId={selectedPackageId}
              onPackageChange={setSelectedPackageId}
            />
            <Button
              size="lg"
              className="bg-chart-4 text-white hover:bg-chart-4/90"
              onClick={goToNextStep}
            >
              Next
              <ChevronRightIcon />
            </Button>
          </div>
        </div>
      )}

      {step === "datetime" && (
        <div
          className={cn(
            "flex w-full max-w-md flex-col items-center",
            enterAnimationClass
          )}
        >
          <h1 className="mb-2 text-center text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Let&apos;s plan your sessions
          </h1>
          <p className="mb-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
            {sessions.length} of {MOCK_REQUIRED_SESSION_COUNT} sessions scheduled
          </p>

          <div className="flex w-full flex-col items-end gap-4">
            <CalendarBookedDates
              currentEventType={null}
              date={selectedDate}
              onDateChange={setSelectedDate}
              selectedSlot={selectedSlot}
              onSlotChange={setSelectedSlot}
              sessions={sessions}
            />

            <div className="w-full space-y-2">
              <p className="text-sm font-medium text-foreground">
                Your bookings
              </p>
              <BookingSessionList
                sessions={sessions}
                onRemove={(sessionId) =>
                  setSessions((current) =>
                    current.filter((session) => session.id !== sessionId)
                  )
                }
                emptyMessage="No sessions yet — pick a date and time below."
              />
            </div>

            <div className="flex w-full justify-end gap-2">
              <Button type="button" variant="outline" size="lg">
                Add {MOCK_CURRENT_EVENT_LABEL} session
              </Button>
              <Button
                size="lg"
                className="bg-chart-4 text-white hover:bg-chart-4/90"
                onClick={goToNextStep}
              >
                Next
                <ChevronRightIcon />
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === "location" && (
        <div
          className={cn(
            "flex w-full max-w-md flex-col items-center",
            enterAnimationClass
          )}
        >
          <h1 className="mb-4 text-center text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Where should we meet?
          </h1>
          <p className="mb-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
            Search for your styling location, then place the pin on the exact
            spot.
          </p>

          <div className="flex w-full flex-col items-end gap-4">
            <SessionLocationPicker
              sessions={sessions}
              sameLocationForAll={sameLocationForAll}
              onSameLocationForAllChange={setSameLocationForAll}
              sharedLocation={sharedLocation}
              onSharedLocationChange={setSharedLocation}
              onSessionLocationChange={(sessionId, location) =>
                setSessions((current) =>
                  current.map((session) =>
                    session.id === sessionId
                      ? { ...session, location }
                      : session
                  )
                )
              }
            />

            <div className="w-full space-y-2">
              <p className="text-sm font-medium text-foreground">Summary</p>
              <BookingSessionList sessions={sessions} showLocation />
            </div>

            <Button
              size="lg"
              className="bg-chart-4 text-white hover:bg-chart-4/90"
              onClick={goToNextStep}
            >
              Next
              <ChevronRightIcon />
            </Button>
          </div>
        </div>
      )}

      {step === "style" && (
        <div
          className={cn(
            "flex w-full max-w-md flex-col items-center",
            enterAnimationClass
          )}
        >
          <h1 className="mb-4 text-center text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            What style do you want?
          </h1>
          <p className="mb-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
            Pick the look you&apos;re going for.
          </p>

          <div className="flex w-full flex-col items-end gap-4">
            <BookingStylePicker
              selectedStyleId={selectedStyleId}
              onStyleChange={setSelectedStyleId}
            />
            <Button
              size="lg"
              className="bg-chart-4 text-white hover:bg-chart-4/90"
              onClick={goToNextStep}
            >
              Next
              <ChevronRightIcon />
            </Button>
          </div>
        </div>
      )}

      {step === "addons" && (
        <div
          className={cn(
            "flex w-full max-w-md flex-col items-center",
            enterAnimationClass
          )}
        >
          <h1 className="mb-4 text-center text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Any Add Ons?
          </h1>
          <p className="mb-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
            Optional extras — pick any that apply, or skip.
          </p>

          <div className="flex w-full flex-col items-end gap-4">
            <BookingAddOnPicker
              selectedAddOnIds={selectedAddOnIds}
              onSelectionChange={setSelectedAddOnIds}
            />
            <div className="flex w-full justify-end gap-2">
              <Button type="button" variant="outline" size="lg">
                Skip
              </Button>
              <Button
                size="lg"
                className="bg-chart-4 text-white hover:bg-chart-4/90"
                onClick={goToNextStep}
              >
                Next
                <ChevronRightIcon />
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === "details" && (
        <div
          className={cn(
            "flex w-full max-w-md flex-col items-center",
            enterAnimationClass
          )}
        >
          <h1 className="mb-4 text-center text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Can I get your details?
          </h1>
          <p className="mb-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
            So we can confirm your booking and stay in touch.
          </p>

          <div className="flex w-full flex-col items-end gap-4">
            <BookingContactForm value={contact} onChange={setContact} />
            <Button
              size="lg"
              className="bg-chart-4 text-white hover:bg-chart-4/90"
              onClick={goToNextStep}
            >
              Next
              <ChevronRightIcon />
            </Button>
          </div>
        </div>
      )}

      {step === "review" && (
        <div
          className={cn(
            "flex w-full max-w-md flex-col items-center",
            enterAnimationClass
          )}
        >
          <h1 className="mb-4 text-center text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Your booking summary
          </h1>
          <p className="mb-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
            Review your invoice, then confirm or send an enquiry.
          </p>

          <div className="flex w-full flex-col gap-4">
            <BookingInvoice invoice={MOCK_INVOICE} />

            <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
              Pay the {MOCK_DEPOSIT_LABEL} deposit, then choose the payment
              result below.
            </p>

            <div className="flex w-full flex-col gap-2">
              <Button
                size="lg"
                className="h-11 w-full bg-chart-4 text-white hover:bg-chart-4/90"
              >
                Book now
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-11 w-full"
              >
                I have an enquiry
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
