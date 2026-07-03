"use client";

import {
  BookingPackagePicker,
  type PackageOption,
} from "@/components/BookingPackagePicker";
import { BookingSessionList } from "@/components/BookingSessionList";
import { SessionLocationPicker } from "@/components/SessionLocationPicker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Address } from "@/schemas/addressSchema";
import type { SessionForm } from "@/schemas/sessionSchema";
import type { PublicSetting, TimeSlot } from "@/schemas/settingSchema";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type BookingStep =
  | "intro"
  | "name"
  | "events"
  | "datetime"
  | "location"
  | "style"
  | "addons"
  | "details"
  | "review";

const STEP_ORDER: BookingStep[] = [
  "intro",
  "name",
  "events",
  "datetime",
  "location",
  "style",
  "addons",
  "details",
  "review",
];

type SessionTemplate = {
  name: string;
  order: number;
};

type ClientPackage = {
  _id?: unknown;
  name: string;
  price: number;
  session_templates: SessionTemplate[];
};

function normalizePackageId(id: unknown): string {
  if (typeof id === "string") return id;
  if (
    id &&
    typeof id === "object" &&
    "$oid" in id &&
    typeof (id as { $oid: unknown }).$oid === "string"
  ) {
    return (id as { $oid: string }).$oid;
  }
  return "";
}

function toPackageOptions(packages: ClientPackage[]): PackageOption[] {
  return packages
    .map((pkg) => ({
      id: normalizePackageId(pkg._id),
      name: pkg.name,
      price: pkg.price,
      sessionCount: pkg.session_templates.length,
    }))
    .filter((pkg) => pkg.id.length > 0);
}

function sortSessionTemplates(templates: SessionTemplate[]): SessionTemplate[] {
  return [...templates].sort((a, b) => a.order - b.order);
}

function getNextSessionTemplate(
  templates: SessionTemplate[],
  scheduled: SessionForm[]
): SessionTemplate | null {
  const scheduledOrders = new Set(scheduled.map((session) => session.order));
  return (
    sortSessionTemplates(templates).find(
      (template) => !scheduledOrders.has(template.order)
    ) ?? null
  );
}

function formatTimeSlot(slot: TimeSlot): string {
  return `${slot.startTime} – ${slot.endTime}`;
}

export default function ClientPage() {
  const params = useParams();
  const client = params.client as string;
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<BookingStep>("intro");
  const [clientPackages, setClientPackages] = useState<ClientPackage[]>([]);
  const [settings, setSettings] = useState<PublicSetting | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionForm[]>([]);
  const [sameLocationForAll, setSameLocationForAll] = useState(true);
  const [sharedLocation, setSharedLocation] = useState<Address | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(
    null
  );

  const packages = useMemo(
    () => toPackageOptions(clientPackages),
    [clientPackages]
  );

  const selectedPackage = useMemo(
    () =>
      clientPackages.find(
        (pkg) => normalizePackageId(pkg._id) === selectedPackageId
      ) ?? null,
    [clientPackages, selectedPackageId]
  );

  const sessionTemplates = useMemo(
    () => sortSessionTemplates(selectedPackage?.session_templates ?? []),
    [selectedPackage]
  );

  const nextSessionTemplate = useMemo(
    () => getNextSessionTemplate(sessionTemplates, sessions),
    [sessionTemplates, sessions]
  );

  const timeSlots = settings?.time_slots ?? [];

  const fetchClient = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/client/${client}`);
      const data = await response.json();
      const fetchedPackages = (data.packages ?? []) as ClientPackage[];
      const packageOptions = toPackageOptions(fetchedPackages);
      setClientPackages(fetchedPackages);
      setSettings((data.settings as PublicSetting | undefined) ?? null);
      setSelectedPackageId((current) => current ?? packageOptions[0]?.id ?? null);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClient();
  }, [client]);

  useEffect(() => {
    setSessions([]);
    setSelectedDate(undefined);
    setSelectedTimeSlot(null);
    setSharedLocation(null);
  }, [selectedPackageId]);

  useEffect(() => {
    if (!sameLocationForAll || !sharedLocation) return;
    setSessions((current) =>
      current.map((session) => ({ ...session, location: sharedLocation }))
    );
  }, [sameLocationForAll, sharedLocation]);

  function handleAddSession() {
    if (!nextSessionTemplate || !selectedDate || !selectedTimeSlot) return;

    setSessions((current) => [
      ...current,
      {
        client_key: crypto.randomUUID(),
        status: "scheduled",
        order: nextSessionTemplate.order,
        name: nextSessionTemplate.name,
        date: selectedDate,
        time_slot: selectedTimeSlot,
      },
    ]);
    setSelectedDate(undefined);
    setSelectedTimeSlot(null);
  }

  function handleRemoveSession(clientKey: string) {
    setSessions((current) => {
      const removed = current.find((session) => session.client_key === clientKey);
      if (!removed) return current;

      return current.filter((session) => session.order < removed.order);
    });
  }

  const allSessionsScheduled =
    sessionTemplates.length > 0 &&
    sessions.length === sessionTemplates.length;

  const allLocationsSet =
    sessions.length > 0 && sessions.every((session) => session.location);

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

  return(
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
          className={cn("flex flex-1 flex-col items-center justify-center")}
          onClick={goToNextStep}
        >
          <h1 className="max-w-md text-center text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Hi, nice to meet you! Can you tell me your name?
          </h1>
        </button>
      )}
      {step === "name" && (
        <div className="flex flex-1 flex-col items-center justify-center">
          <Input type="text" placeholder="Enter your name" />
          <Button
            size="lg"
            className="bg-chart-4 text-white hover:bg-chart-4/90"
            onClick={goToNextStep}
          >
            Next
            <ChevronRightIcon />
          </Button>
        </div>
        
      )}
      {step === "events" && (
        <div className="flex w-full max-w-md flex-1 flex-col items-center justify-center">
          <h1 className="mb-4 max-w-md text-center text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            What are you booking for?
          </h1>
          <p className="mb-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
            Choose the package that matches your event.
          </p>

          <div className="flex w-full flex-col items-end gap-4">
            {loading ? (
              <p className="w-full text-center text-sm text-muted-foreground">
                Loading packages...
              </p>
            ) : (
              <BookingPackagePicker
                packages={packages}
                selectedPackageId={selectedPackageId}
                onPackageChange={setSelectedPackageId}
              />
            )}
            <Button
              size="lg"
              className="bg-chart-4 text-white hover:bg-chart-4/90"
              disabled={!selectedPackageId}
              onClick={goToNextStep}
            >
              Next
              <ChevronRightIcon />
            </Button>
          </div>
        </div>
      )}

      {step === "datetime" && (
        <div className="flex w-full max-w-md flex-1 flex-col items-center">
          <h1 className="mb-2 max-w-md text-center text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {nextSessionTemplate
              ? `When would you like to book your ${nextSessionTemplate.name} session?`
              : "All sessions scheduled"}
          </h1>
          <p className="mb-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
            {sessions.length} of {sessionTemplates.length} session
            {sessionTemplates.length === 1 ? "" : "s"} scheduled
          </p>

          <div className="flex w-full flex-col items-end gap-4">
            {nextSessionTemplate && (
              <Card className="mx-auto w-full min-w-72 [--card-spacing:--spacing(6)] sm:min-w-80">
                <CardContent className="flex flex-col gap-4 pt-(--card-spacing)">
                  <p className="text-sm text-muted-foreground">
                    Scheduling session {nextSessionTemplate.order + 1} of{" "}
                    {sessionTemplates.length}:{" "}
                    <span className="font-medium text-foreground">
                      {nextSessionTemplate.name}
                    </span>
                  </p>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      setSelectedDate(date);
                      setSelectedTimeSlot(null);
                    }}
                    disabled={{ before: new Date() }}
                    captionLayout="dropdown"
                    className="p-0 [--cell-size:--spacing(10)] md:[--cell-size:--spacing(12)]"
                  />
                </CardContent>
                <CardFooter className="w-full flex-col items-stretch gap-3 border-t bg-card">
                  <p className="text-sm font-medium text-foreground">
                    Available slots
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {timeSlots.map((slot) => (
                      <Button
                        key={`${slot.startTime}-${slot.endTime}`}
                        type="button"
                        variant={
                          selectedTimeSlot?.startTime === slot.startTime &&
                          selectedTimeSlot?.endTime === slot.endTime
                            ? "default"
                            : "outline"
                        }
                        size="lg"
                        disabled={!selectedDate}
                        className="h-8 w-full"
                        onClick={() => setSelectedTimeSlot(slot)}
                      >
                        {formatTimeSlot(slot)}
                      </Button>
                    ))}
                  </div>
                </CardFooter>
              </Card>
            )}

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
              {nextSessionTemplate && (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  disabled={!selectedDate || !selectedTimeSlot}
                  onClick={handleAddSession}
                >
                  Add {nextSessionTemplate.name} session
                </Button>
              )}
              <Button
                size="lg"
                className="bg-chart-4 text-white hover:bg-chart-4/90"
                disabled={!allSessionsScheduled}
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
        <div className="flex w-full max-w-md flex-1 flex-col items-center justify-center">
          <h1 className="mb-4 max-w-md text-center text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Where would you like to book your session?
          </h1>

          <div className="flex w-full flex-col items-end gap-4">
            <SessionLocationPicker
              sessions={sessions}
              sameLocationForAll={sameLocationForAll}
              onSameLocationForAllChange={setSameLocationForAll}
              sharedLocation={sharedLocation}
              onSharedLocationChange={setSharedLocation}
              onSessionLocationChange={(clientKey, location) =>
                setSessions((current) =>
                  current.map((session) =>
                    session.client_key === clientKey
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
              disabled={!allLocationsSet}
              onClick={goToNextStep}
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