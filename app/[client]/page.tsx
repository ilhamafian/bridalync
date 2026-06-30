"use client";

import { notFound, useRouter } from "next/navigation";
import { use, useEffect, useMemo, useState } from "react";
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
import type {
  BookingAddOnId,
  BookingPackageId,
  BookingStyleId,
} from "@/lib/booking/constants";
import { buildBookingMessage, buildWhatsAppUrl } from "@/lib/booking/messages";
import { calculateBookingInvoice, formatRm } from "@/lib/booking/pricing";
import {
  getEventTypeLabel,
  getNextEventToSchedule,
  getRequiredSessionCount,
  isPackageScheduleComplete,
  isSlotTaken,
  toDateKey,
} from "@/lib/booking/utils";
import type { BookingFreelancer } from "@/lib/schemas/freelancer";
import type { AddOnsSelection, BookingContact, BookingSession, SessionLocation } from "@/lib/schemas/booking";
import { bookingContactSchema } from "@/lib/schemas/booking";
import { cn } from "@/lib/utils";

type BookingStep =
  | "intro"
  | "events"
  | "datetime"
  | "location"
  | "style"
  | "addons"
  | "details"
  | "review";

const EMPTY_CONTACT: BookingContact = {
  name: "",
  phone: "",
  email: "",
};

const INTRO_DURATION_MS = 3000;
const STEP_TRANSITION_MS = 300;

const exitAnimationClass =
  "animate-out fade-out zoom-out-95 blur-out-sm fill-mode-forwards duration-300";

const enterAnimationClass = "animate-in fade-in zoom-in-95 duration-300";

export default function ClientPage({
  params,
}: {
  params: Promise<{ client: string }>;
}) {
  const { client } = use(params);
  const router = useRouter();

  const [freelancer, setFreelancer] = useState<BookingFreelancer | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound_, setNotFound] = useState(false);
  const [step, setStep] = useState<BookingStep>("intro");
  const [isIntroExiting, setIsIntroExiting] = useState(false);
  const [isEventsExiting, setIsEventsExiting] = useState(false);
  const [isDateTimeExiting, setIsDateTimeExiting] = useState(false);
  const [isLocationExiting, setIsLocationExiting] = useState(false);
  const [isStyleExiting, setIsStyleExiting] = useState(false);
  const [isAddOnsExiting, setIsAddOnsExiting] = useState(false);
  const [isDetailsExiting, setIsDetailsExiting] = useState(false);
  const [bookingSubmitState, setBookingSubmitState] = useState<
    | "idle"
    | "submitting"
    | "awaiting_payment"
    | "completing_payment"
    | "submitted"
    | "error"
  >("idle");
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [pendingBookingId, setPendingBookingId] = useState<string | null>(null);

  const [selectedPackageId, setSelectedPackageId] =
    useState<BookingPackageId | null>(null);
  const [sessions, setSessions] = useState<BookingSession[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlotId | null>(null);

  const [sameLocationForAll, setSameLocationForAll] = useState(true);
  const [sharedLocation, setSharedLocation] = useState<SessionLocation | null>(
    null
  );
  const [selectedStyleId, setSelectedStyleId] =
    useState<BookingStyleId | null>(null);
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<BookingAddOnId[]>(
    []
  );
  const [addOnsSelection, setAddOnsSelection] =
    useState<AddOnsSelection | null>(null);
  const [contact, setContact] = useState<BookingContact>(EMPTY_CONTACT);

  const currentEventType = useMemo(() => {
    if (!selectedPackageId) return null;
    return getNextEventToSchedule(selectedPackageId, sessions);
  }, [selectedPackageId, sessions]);

  const canAddSession = Boolean(
    selectedPackageId &&
      currentEventType &&
      selectedDate &&
      selectedSlot &&
      !isSlotTaken(toDateKey(selectedDate), selectedSlot, sessions)
  );

  const canContinueEvents = Boolean(selectedPackageId);
  const canContinueDateTime = Boolean(
    selectedPackageId &&
      isPackageScheduleComplete(selectedPackageId, sessions)
  );
  const canContinueLocation = sessions.every((session) => session.location);
  const canContinueStyle = Boolean(selectedStyleId);
  const canContinueAddOns = selectedAddOnIds.length > 0;
  const canContinueDetails = bookingContactSchema.safeParse(contact).success;

  const requiredSessionCount = selectedPackageId
    ? getRequiredSessionCount(selectedPackageId)
    : 0;

  const invoice = useMemo(() => {
    if (!selectedPackageId || !addOnsSelection) return null;
    return calculateBookingInvoice(selectedPackageId, addOnsSelection);
  }, [selectedPackageId, addOnsSelection]);

  const canSubmitBooking = Boolean(
    selectedPackageId &&
      selectedStyleId &&
      addOnsSelection &&
      canContinueDetails &&
      invoice &&
      (bookingSubmitState === "idle" || bookingSubmitState === "error")
  );

  const canCompletePayment = Boolean(
    pendingBookingId && bookingSubmitState === "awaiting_payment"
  );

  useEffect(() => {
    fetch(`/api/freelancers/${client}`)
      .then((res) => {
        if (res.status === 404) {
          setNotFound(true);
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) setFreelancer(data);
      })
      .finally(() => setLoading(false));
  }, [client]);

  useEffect(() => {
    if (step !== "intro" || !freelancer) return;

    const timer = window.setTimeout(() => {
      setIsIntroExiting(true);
    }, INTRO_DURATION_MS);

    return () => window.clearTimeout(timer);
  }, [step, freelancer]);

  function handleIntroExitEnd(event: React.AnimationEvent<HTMLDivElement>) {
    if (!isIntroExiting || event.currentTarget !== event.target) return;
    setStep("events");
    setIsIntroExiting(false);
  }

  function handlePackageChange(packageId: BookingPackageId) {
    setSelectedPackageId(packageId);
    setSessions([]);
    setSelectedDate(undefined);
    setSelectedSlot(null);
  }

  function handleEventsNext() {
    if (!canContinueEvents || isEventsExiting) return;
    setSessions([]);
    setSelectedDate(undefined);
    setSelectedSlot(null);
    setIsEventsExiting(true);
  }

  function handleEventsExitEnd(event: React.AnimationEvent<HTMLDivElement>) {
    if (!isEventsExiting || event.currentTarget !== event.target) return;
    setStep("datetime");
    setIsEventsExiting(false);
  }

  function handleAddSession() {
    if (
      !canAddSession ||
      !selectedPackageId ||
      !currentEventType ||
      !selectedDate ||
      !selectedSlot
    ) {
      return;
    }

    setSessions((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        eventType: currentEventType,
        date: toDateKey(selectedDate),
        slotId: selectedSlot,
        location: null,
      },
    ]);
    setSelectedSlot(null);
  }

  function handleRemoveSession(sessionId: string) {
    setSessions((current) =>
      current.filter((session) => session.id !== sessionId)
    );
  }

  function handleDateTimeNext() {
    if (!canContinueDateTime || isDateTimeExiting) return;
    setSameLocationForAll(true);
    setSharedLocation(null);
    setIsDateTimeExiting(true);
  }

  function handleDateTimeExitEnd(event: React.AnimationEvent<HTMLDivElement>) {
    if (!isDateTimeExiting || event.currentTarget !== event.target) return;
    setStep("location");
    setIsDateTimeExiting(false);
  }

  function handleSameLocationForAllChange(checked: boolean) {
    setSameLocationForAll(checked);
    if (checked && sharedLocation) {
      setSessions((current) =>
        current.map((session) => ({
          ...session,
          location: sharedLocation,
        }))
      );
    }
  }

  function handleSharedLocationChange(location: SessionLocation) {
    setSharedLocation(location);
    if (sameLocationForAll) {
      setSessions((current) =>
        current.map((session) => ({
          ...session,
          location,
        }))
      );
    }
  }

  function handleSessionLocationChange(
    sessionId: string,
    location: SessionLocation
  ) {
    setSessions((current) =>
      current.map((session) =>
        session.id === sessionId ? { ...session, location } : session
      )
    );
  }

  function handleLocationNext() {
    if (!canContinueLocation || isLocationExiting) return;
    setSelectedStyleId(null);
    setIsLocationExiting(true);
  }

  function handleLocationExitEnd(event: React.AnimationEvent<HTMLDivElement>) {
    if (!isLocationExiting || event.currentTarget !== event.target) return;
    setStep("style");
    setIsLocationExiting(false);
  }

  function handleStyleNext() {
    if (!canContinueStyle || isStyleExiting) return;
    setSelectedAddOnIds([]);
    setAddOnsSelection(null);
    setIsStyleExiting(true);
  }

  function handleStyleExitEnd(event: React.AnimationEvent<HTMLDivElement>) {
    if (!isStyleExiting || event.currentTarget !== event.target) return;
    setStep("addons");
    setIsStyleExiting(false);
  }

  function advanceFromAddOns(selection: AddOnsSelection) {
    if (isAddOnsExiting) return;
    setAddOnsSelection(selection);
    setContact(EMPTY_CONTACT);
    setIsAddOnsExiting(true);
  }

  function handleAddOnsSkip() {
    advanceFromAddOns("skipped");
  }

  function handleAddOnsNext() {
    if (!canContinueAddOns || isAddOnsExiting) return;

    if (selectedAddOnIds.includes("not-sure-yet")) {
      advanceFromAddOns("not-sure");
      return;
    }

    advanceFromAddOns(
      selectedAddOnIds.filter(
        (id): id is "gandik" | "sanggul-lintang" =>
          id === "gandik" || id === "sanggul-lintang"
      )
    );
  }

  function handleAddOnsExitEnd(event: React.AnimationEvent<HTMLDivElement>) {
    if (!isAddOnsExiting || event.currentTarget !== event.target) return;
    setStep("details");
    setIsAddOnsExiting(false);
  }

  function handleDetailsNext() {
    if (!canContinueDetails || isDetailsExiting) return;
    setBookingSubmitState("idle");
    setBookingError(null);
    setPendingBookingId(null);
    setIsDetailsExiting(true);
  }

  function handleDetailsExitEnd(event: React.AnimationEvent<HTMLDivElement>) {
    if (!isDetailsExiting || event.currentTarget !== event.target) return;
    setStep("review");
    setIsDetailsExiting(false);
  }

  const isStepTransitioning =
    isEventsExiting ||
    isDateTimeExiting ||
    isLocationExiting ||
    isStyleExiting ||
    isAddOnsExiting ||
    isDetailsExiting;

  function restoreAddOnSelectionFromDraft() {
    if (!addOnsSelection || addOnsSelection === "skipped") {
      setSelectedAddOnIds([]);
      return;
    }

    if (addOnsSelection === "not-sure") {
      setSelectedAddOnIds(["not-sure-yet"]);
      return;
    }

    setSelectedAddOnIds(addOnsSelection);
  }

  function handleBack() {
    if (
      isStepTransitioning ||
      bookingSubmitState === "completing_payment" ||
      bookingSubmitState === "submitting"
    ) {
      return;
    }

    switch (step) {
      case "events":
        setIsIntroExiting(false);
        setStep("intro");
        break;
      case "datetime":
        setIsDateTimeExiting(false);
        setStep("events");
        break;
      case "location":
        setIsLocationExiting(false);
        setStep("datetime");
        break;
      case "style":
        setIsStyleExiting(false);
        setStep("location");
        break;
      case "addons":
        setIsAddOnsExiting(false);
        setStep("style");
        break;
      case "details":
        setIsDetailsExiting(false);
        restoreAddOnSelectionFromDraft();
        setStep("addons");
        break;
      case "review":
        setBookingSubmitState("idle");
        setPendingBookingId(null);
        setBookingError(null);
        setStep("details");
        break;
    }
  }

  async function handleBookNow() {
    if (
      !canSubmitBooking ||
      !selectedPackageId ||
      !selectedStyleId ||
      !addOnsSelection
    ) {
      return;
    }

    setBookingSubmitState("submitting");
    setBookingError(null);

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          freelancerUsername: client,
          packageId: selectedPackageId,
          sessions,
          style: selectedStyleId,
          addOns: addOnsSelection,
          contact,
          intent: "booking",
        }),
      });

      if (!response.ok) {
        throw new Error("Booking request failed");
      }

      const data = (await response.json()) as { id: string };
      setPendingBookingId(data.id);
      setBookingSubmitState("awaiting_payment");
    } catch {
      setBookingSubmitState("error");
      setBookingError("Something went wrong. Please try again.");
    }
  }

  async function handlePaymentOutcome(outcome: "confirmed" | "failed") {
    if (!canCompletePayment || !pendingBookingId) return;

    setBookingSubmitState("completing_payment");
    setBookingError(null);

    try {
      const response = await fetch(`/api/bookings/${pendingBookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          freelancerUsername: client,
          status: outcome,
        }),
      });

      if (!response.ok) {
        throw new Error("Payment update failed");
      }

      router.push(`/${client}/bookings/${pendingBookingId}`);
    } catch {
      setBookingSubmitState("awaiting_payment");
      setBookingError("Could not update your booking. Please try again.");
    }
  }

  async function handleEnquiry() {
    if (
      !canSubmitBooking ||
      !selectedPackageId ||
      !selectedStyleId ||
      !addOnsSelection ||
      !invoice
    ) {
      return;
    }

    if (!freelancer?.mobile || !freelancer.country_code) {
      setBookingError(
        "Unable to contact the stylist right now. Please try again later."
      );
      setBookingSubmitState("error");
      return;
    }

    setBookingSubmitState("submitting");
    setBookingError(null);

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          freelancerUsername: client,
          packageId: selectedPackageId,
          sessions,
          style: selectedStyleId,
          addOns: addOnsSelection,
          contact,
          intent: "enquiry",
        }),
      });

      if (!response.ok) {
        throw new Error("Enquiry request failed");
      }

      const message = buildBookingMessage({
        freelancerName: freelancer.name,
        contact,
        packageId: selectedPackageId,
        styleId: selectedStyleId,
        sessions,
        addOns: addOnsSelection,
        invoice,
        intent: "enquiry",
      });

      window.open(
        buildWhatsAppUrl(
          freelancer.country_code,
          freelancer.mobile,
          message
        ),
        "_blank",
        "noopener,noreferrer"
      );

      setBookingSubmitState("submitted");
    } catch {
      setBookingSubmitState("error");
      setBookingError("Something went wrong. Please try again.");
    }
  }

  if (notFound_) notFound();

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
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
            disabled={
              isStepTransitioning ||
              bookingSubmitState === "completing_payment" ||
              bookingSubmitState === "submitting"
            }
            onClick={handleBack}
          >
            <ChevronLeftIcon />
            Back
          </Button>
        </div>
      )}
      {step === "intro" && (
        <div
          className={cn(
            "flex flex-1 flex-col items-center justify-center",
            isIntroExiting && exitAnimationClass
          )}
          style={{ animationDuration: `${STEP_TRANSITION_MS}ms` }}
          onAnimationEnd={handleIntroExitEnd}
        >
          <h1 className="max-w-md text-center text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Hi, I&apos;m {freelancer?.name}, your professional{" "}
            {freelancer?.role}.
          </h1>
        </div>
      )}

      {step === "events" && (
        <div
          className={cn(
            "flex w-full max-w-md flex-col items-center",
            enterAnimationClass,
            isEventsExiting && exitAnimationClass
          )}
          style={{ animationDuration: `${STEP_TRANSITION_MS}ms` }}
          onAnimationEnd={handleEventsExitEnd}
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
              onPackageChange={handlePackageChange}
            />
            <Button
              size="lg"
              disabled={!canContinueEvents || isEventsExiting}
              className="bg-chart-4 text-white hover:bg-chart-4/90"
              onClick={handleEventsNext}
            >
              Next
              <ChevronRightIcon />
            </Button>
          </div>
        </div>
      )}

      {step === "datetime" && selectedPackageId && (
        <div
          className={cn(
            "flex w-full max-w-md flex-col items-center",
            enterAnimationClass,
            isDateTimeExiting && exitAnimationClass
          )}
          style={{ animationDuration: `${STEP_TRANSITION_MS}ms` }}
          onAnimationEnd={handleDateTimeExitEnd}
        >
          <h1 className="mb-2 text-center text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Let&apos;s plan your sessions
          </h1>
          <p className="mb-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
            {sessions.length} of {requiredSessionCount} session
            {requiredSessionCount === 1 ? "" : "s"} scheduled
          </p>

          <div className="flex w-full flex-col items-end gap-4">
            <CalendarBookedDates
              currentEventType={currentEventType}
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
                onRemove={handleRemoveSession}
                emptyMessage="No sessions yet — pick a date and time below."
              />
            </div>

            <div className="flex w-full justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="lg"
                disabled={!canAddSession}
                onClick={handleAddSession}
              >
                {currentEventType
                  ? `Add ${getEventTypeLabel(currentEventType)} session`
                  : "Add session"}
              </Button>
              <Button
                size="lg"
                disabled={!canContinueDateTime || isDateTimeExiting}
                className="bg-chart-4 text-white hover:bg-chart-4/90"
                onClick={handleDateTimeNext}
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
            enterAnimationClass,
            isLocationExiting && exitAnimationClass
          )}
          style={{ animationDuration: `${STEP_TRANSITION_MS}ms` }}
          onAnimationEnd={handleLocationExitEnd}
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
              onSameLocationForAllChange={handleSameLocationForAllChange}
              sharedLocation={sharedLocation}
              onSharedLocationChange={handleSharedLocationChange}
              onSessionLocationChange={handleSessionLocationChange}
            />

            {canContinueLocation && (
              <div className="w-full space-y-2">
                <p className="text-sm font-medium text-foreground">Summary</p>
                <BookingSessionList sessions={sessions} showLocation />
              </div>
            )}

            <Button
              size="lg"
              disabled={!canContinueLocation || isLocationExiting}
              className="bg-chart-4 text-white hover:bg-chart-4/90"
              onClick={handleLocationNext}
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
            enterAnimationClass,
            isStyleExiting && exitAnimationClass
          )}
          style={{ animationDuration: `${STEP_TRANSITION_MS}ms` }}
          onAnimationEnd={handleStyleExitEnd}
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
              disabled={!canContinueStyle || isStyleExiting}
              className="bg-chart-4 text-white hover:bg-chart-4/90"
              onClick={handleStyleNext}
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
            enterAnimationClass,
            isAddOnsExiting && exitAnimationClass
          )}
          style={{ animationDuration: `${STEP_TRANSITION_MS}ms` }}
          onAnimationEnd={handleAddOnsExitEnd}
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
              <Button
                type="button"
                variant="outline"
                size="lg"
                disabled={isAddOnsExiting}
                onClick={handleAddOnsSkip}
              >
                Skip
              </Button>
              <Button
                size="lg"
                disabled={!canContinueAddOns || isAddOnsExiting}
                className="bg-chart-4 text-white hover:bg-chart-4/90"
                onClick={handleAddOnsNext}
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
            enterAnimationClass,
            isDetailsExiting && exitAnimationClass
          )}
          style={{ animationDuration: `${STEP_TRANSITION_MS}ms` }}
          onAnimationEnd={handleDetailsExitEnd}
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
              disabled={!canContinueDetails || isDetailsExiting}
              className="bg-chart-4 text-white hover:bg-chart-4/90"
              onClick={handleDetailsNext}
            >
              Next
              <ChevronRightIcon />
            </Button>
          </div>
        </div>
      )}

      {step === "review" && invoice && selectedPackageId && selectedStyleId && (
        <div
          className={cn(
            "flex w-full max-w-md flex-col items-center",
            enterAnimationClass
          )}
          style={{ animationDuration: `${STEP_TRANSITION_MS}ms` }}
        >
          <h1 className="mb-4 text-center text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Your booking summary
          </h1>
          <p className="mb-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
            Review your invoice, then confirm or send an enquiry.
          </p>

          <div className="flex w-full flex-col gap-4">
            <BookingInvoice invoice={invoice} />

            {bookingSubmitState === "submitted" && (
              <p className="text-center text-sm text-emerald-700 dark:text-emerald-400">
                Enquiry sent. Continue in WhatsApp to chat with{" "}
                {freelancer?.name}.
              </p>
            )}

            {bookingSubmitState === "awaiting_payment" && (
              <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
                Pay the {formatRm(invoice.depositRm)} deposit, then choose the
                payment result below.
              </p>
            )}

            {bookingError && (
              <p className="text-center text-sm text-destructive">
                {bookingError}
              </p>
            )}

            <div className="flex w-full flex-col gap-2">
              {canCompletePayment ? (
                <>
                  <Button
                    size="lg"
                    disabled={bookingSubmitState === "completing_payment"}
                    className="h-11 w-full bg-chart-4 text-white hover:bg-chart-4/90"
                    onClick={() => void handlePaymentOutcome("confirmed")}
                  >
                    {bookingSubmitState === "completing_payment"
                      ? "Processing..."
                      : "Success"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    disabled={bookingSubmitState === "completing_payment"}
                    className="h-11 w-full"
                    onClick={() => void handlePaymentOutcome("failed")}
                  >
                    Fail
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="lg"
                    disabled={!canSubmitBooking}
                    className="h-11 w-full bg-chart-4 text-white hover:bg-chart-4/90"
                    onClick={() => void handleBookNow()}
                  >
                    {bookingSubmitState === "submitting"
                      ? "Creating booking..."
                      : "Book now"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    disabled={!canSubmitBooking}
                    className="h-11 w-full"
                    onClick={() => void handleEnquiry()}
                  >
                    I have an enquiry
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
