"use client";

import { notFound } from "next/navigation";
import { use, useEffect, useState } from "react";
import { ChevronRightIcon } from "lucide-react";

import {
  CalendarBookedDates,
  type TimeSlotId,
} from "@/components/CalendarBookedDates";
import { LocationSelector } from "@/components/LocationSelector";
import { Button } from "@/components/ui/button";
import type { BookingFreelancer } from "@/lib/schemas/freelancer";
import { cn } from "@/lib/utils";

type BookingStep = "datetime" | "location";

const STEP_TRANSITION_MS = 300;

export default function ClientPage({
  params,
}: {
  params: Promise<{ client: string }>;
}) {
  const { client } = use(params);

  const [freelancer, setFreelancer] = useState<BookingFreelancer | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound_, setNotFound] = useState(false);
  const [step, setStep] = useState<BookingStep>("datetime");
  const [isDateTimeExiting, setIsDateTimeExiting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlotId | null>(null);

  const canContinue = Boolean(selectedDate && selectedSlot);

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

  function handleNext() {
    if (!canContinue || isDateTimeExiting) return;
    setIsDateTimeExiting(true);
  }

  function handleDateTimeExitEnd(event: React.AnimationEvent<HTMLDivElement>) {
    if (!isDateTimeExiting || event.currentTarget !== event.target) return;
    setStep("location");
    setIsDateTimeExiting(false);
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
      {step === "datetime" && (
        <div
          className={cn(
            "flex w-full flex-col items-center",
            isDateTimeExiting &&
              "animate-out fade-out zoom-out-95 blur-out-sm fill-mode-forwards duration-300"
          )}
          style={{ animationDuration: `${STEP_TRANSITION_MS}ms` }}
          onAnimationEnd={handleDateTimeExitEnd}
        >
          <h1 className="mb-8 max-w-md text-center text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Welcome! I’m {freelancer?.name},<br />
            your hijabsylist.
          </h1>
          <p className="mb-4 text-center text-sm text-zinc-600 dark:text-zinc-400">
            Choose a date below to get started.
          </p>
          <div className="flex flex-col items-end gap-4">
            <CalendarBookedDates
              date={selectedDate}
              onDateChange={setSelectedDate}
              selectedSlot={selectedSlot}
              onSlotChange={setSelectedSlot}
            />
            <Button
              size="lg"
              disabled={!canContinue || isDateTimeExiting}
              className="bg-chart-4 text-white hover:bg-chart-4/90"
              onClick={handleNext}
            >
              Next
              <ChevronRightIcon />
            </Button>
          </div>
        </div>
      )}

      {step === "location" && (
        <div
          className="flex w-full animate-in flex-col items-center fade-in zoom-in-95 duration-300"
          style={{ animationDuration: `${STEP_TRANSITION_MS}ms` }}
        >
          <h1 className="mb-8 max-w-md text-center text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Where should we meet?
          </h1>
          <p className="mb-4 text-center text-sm text-zinc-600 dark:text-zinc-400">
            Choose a location for your appointment.
          </p>
          <LocationSelector />
        </div>
      )}
    </div>
  );
}
