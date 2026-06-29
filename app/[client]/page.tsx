"use client";

import { notFound } from "next/navigation";
import { use, useEffect, useMemo, useState } from "react";
import { ChevronRightIcon } from "lucide-react";

import { BookingPackagePicker } from "@/components/BookingPackagePicker";
import { BookingSessionList } from "@/components/BookingSessionList";
import {
  CalendarBookedDates,
  type TimeSlotId,
} from "@/components/CalendarBookedDates";
import { SessionLocationPicker } from "@/components/SessionLocationPicker";
import { Button } from "@/components/ui/button";
import type { BookingPackageId, LocationId } from "@/lib/booking/constants";
import {
  getEventTypeLabel,
  getNextEventToSchedule,
  getRequiredSessionCount,
  isPackageScheduleComplete,
  isSlotTaken,
  toDateKey,
} from "@/lib/booking/utils";
import type { BookingFreelancer } from "@/lib/schemas/freelancer";
import type { BookingSession } from "@/lib/schemas/booking";
import { cn } from "@/lib/utils";

type BookingStep = "intro" | "events" | "datetime" | "location";

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

  const [freelancer, setFreelancer] = useState<BookingFreelancer | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound_, setNotFound] = useState(false);
  const [step, setStep] = useState<BookingStep>("intro");
  const [isIntroExiting, setIsIntroExiting] = useState(false);
  const [isEventsExiting, setIsEventsExiting] = useState(false);
  const [isDateTimeExiting, setIsDateTimeExiting] = useState(false);

  const [selectedPackageId, setSelectedPackageId] =
    useState<BookingPackageId | null>(null);
  const [sessions, setSessions] = useState<BookingSession[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlotId | null>(null);

  const [sameLocationForAll, setSameLocationForAll] = useState(true);
  const [sharedLocationId, setSharedLocationId] = useState<LocationId | null>(
    null
  );

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
  const canContinueLocation = sessions.every((session) => session.locationId);

  const requiredSessionCount = selectedPackageId
    ? getRequiredSessionCount(selectedPackageId)
    : 0;

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
        locationId: null,
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
    setSharedLocationId(null);
    setIsDateTimeExiting(true);
  }

  function handleDateTimeExitEnd(event: React.AnimationEvent<HTMLDivElement>) {
    if (!isDateTimeExiting || event.currentTarget !== event.target) return;
    setStep("location");
    setIsDateTimeExiting(false);
  }

  function handleSameLocationForAllChange(checked: boolean) {
    setSameLocationForAll(checked);
    if (checked && sharedLocationId) {
      setSessions((current) =>
        current.map((session) => ({
          ...session,
          locationId: sharedLocationId,
        }))
      );
    }
  }

  function handleSharedLocationChange(locationId: string) {
    const nextLocationId = locationId as LocationId;
    setSharedLocationId(nextLocationId);
    if (sameLocationForAll) {
      setSessions((current) =>
        current.map((session) => ({
          ...session,
          locationId: nextLocationId,
        }))
      );
    }
  }

  function handleSessionLocationChange(sessionId: string, locationId: string) {
    const nextLocationId = locationId as LocationId;
    setSessions((current) =>
      current.map((session) =>
        session.id === sessionId
          ? { ...session, locationId: nextLocationId }
          : session
      )
    );
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
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-6 pt-16 pb-16 dark:bg-zinc-950">
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
            enterAnimationClass
          )}
          style={{ animationDuration: `${STEP_TRANSITION_MS}ms` }}
        >
          <h1 className="mb-4 text-center text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Where should we meet?
          </h1>
          <p className="mb-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
            Choose a location for each session, or use the same one for all.
          </p>

          <div className="flex w-full flex-col items-end gap-4">
            <SessionLocationPicker
              sessions={sessions}
              sameLocationForAll={sameLocationForAll}
              onSameLocationForAllChange={handleSameLocationForAllChange}
              sharedLocationId={sharedLocationId}
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
              disabled={!canContinueLocation}
              className="bg-chart-4 text-white hover:bg-chart-4/90"
            >
              Next
              <ChevronRightIcon />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
