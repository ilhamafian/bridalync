"use client";

import { BookingAddOnPicker } from "@/components/BookingAddOnPicker";
import { BookingContactForm } from "@/components/BookingContactForm";
import { BookingQuotation } from "@/components/BookingQuotation";
import {
  BookingPackagePicker,
  type PackageOption,
} from "@/components/BookingPackagePicker";
import { BookingSessionList } from "@/components/BookingSessionList";
import { BookingStylePicker } from "@/components/BookingStylePicker";
import { SessionLocationPicker } from "@/components/SessionLocationPicker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { calculateBookingQuotation } from "@/utils/booking/pricing";
import type { AddOn } from "@/schemas/addOnSchema";
import type { Address } from "@/schemas/addressSchema";
import { Client } from "@/schemas/clientSchema";
import type { SessionForm } from "@/schemas/sessionSchema";
import type { PublicSetting, TimeSlot } from "@/schemas/settingSchema";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { PublicUser } from "@/schemas/userSchema";

type BookingStep =
  | "intro"
  | "name"
  | "events"
  | "datetime"
  | "location"
  | "style"
  | "addons"
  | "details"
  | "review"
  | "t&c"
  | "payment";

const BASE_STEP_ORDER: BookingStep[] = [
  "intro",
  "name",
  "events",
  "datetime",
  "location",
  "style",
  "addons",
  "details",
  "review",
  "t&c",
  "payment",
];

function buildStepOrder(hasStyles: boolean, hasAddOns: boolean): BookingStep[] {
  return BASE_STEP_ORDER.filter((step) => {
    if (step === "style" && !hasStyles) return false;
    if (step === "addons" && !hasAddOns) return false;
    return true;
  });
}

type SessionTemplate = {
  name: string;
  order: number;
};

type ClientPackage = {
  _id?: unknown;
  name: string;
  price: number;
  deposit: number;
  order: number;
  session_templates: SessionTemplate[];
};

type ClientStyle = {
  _id?: unknown;
  name: string;
  price: number;
  image_src?: string;
};

type CatalogAddOn = AddOn & { _id?: unknown };

const EMPTY_CONTACT: Client = {
  name: "",
  mobile: "",
  country_code: "+60",
  email: "",
};

type LocationCoordinates = Address["location"];

type TravelDistanceResponse = {
  distanceKm: number;
};

type SessionRoadDistance = {
  requestKey: string;
  status: "loading" | "ready" | "error";
  distanceKm?: number;
};

function buildLocationKey(location: LocationCoordinates): string {
  return `${location.lat.toFixed(6)},${location.lng.toFixed(6)}`;
}

function buildTravelDistanceRequestKey(
  origin: LocationCoordinates,
  destination: LocationCoordinates
): string {
  return `${buildLocationKey(origin)}->${buildLocationKey(destination)}`;
}

function formatRoadDistanceLabel(distanceKm: number): string {
  return `${distanceKm.toFixed(distanceKm >= 10 ? 1 : 2)} km away by road`;
}

async function requestTravelDistance(
  origin: LocationCoordinates,
  destination: LocationCoordinates,
  signal: AbortSignal
): Promise<TravelDistanceResponse> {
  const response = await fetch("/api/travel-distance", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ origin, destination }),
    signal,
  });

  const payload = (await response.json()) as {
    distanceKm?: unknown;
    error?: unknown;
  };

  if (!response.ok || typeof payload.distanceKm !== "number") {
    throw new Error(
      typeof payload.error === "string"
        ? payload.error
        : "Unable to calculate road distance."
    );
  }

  return { distanceKm: payload.distanceKm };
}

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

function sortPackages(packages: ClientPackage[]): ClientPackage[] {
  return [...packages].sort((a, b) => a.order - b.order);
}

function toPackageOptions(packages: ClientPackage[]): PackageOption[] {
  return sortPackages(packages)
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
  const [styles, setStyles] = useState<ClientStyle[]>([]);
  const [addOns, setAddOns] = useState<AddOn[]>([]);
  const [settings, setSettings] = useState<PublicSetting | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [sessions, setSessions] = useState<SessionForm[]>([]);
  const [sameLocationForAll, setSameLocationForAll] = useState(true);
  const [sharedLocation, setSharedLocation] = useState<Address | null>(null);
  const [sessionRoadDistances, setSessionRoadDistances] = useState<
    Record<string, SessionRoadDistance>
  >({});
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(
    null
  );
  const [contact, setContact] = useState<Client>(EMPTY_CONTACT);
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const sessionRoadDistancesRef = useRef(sessionRoadDistances);
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

  const stepOrder = useMemo(() => {
    const hasStyles = styles.length > 0 && settings?.charge_by === "style";
    const hasAddOns = addOns.length > 0;
    return buildStepOrder(hasStyles, hasAddOns);
  }, [styles, addOns, settings?.charge_by]);

  const styleOptions = useMemo(
    () =>
      styles
        .map((style) => ({
          id: normalizePackageId(style._id),
          name: style.name,
          price: style.price,
          imageSrc: style.image_src,
        }))
        .filter((style) => style.id.length > 0),
    [styles]
  );

  const addOnOptions = useMemo(
    () =>
      (addOns as CatalogAddOn[]).map((addOn, index) => {
        const id = normalizePackageId(addOn._id);
        return {
          id: id.length > 0 ? id : `addon-${index}`,
          name: addOn.name,
          price: addOn.price,
        };
      }),
    [addOns]
  );

  const selectedStyle = useMemo(
    () => styleOptions.find((style) => style.id === selectedStyleId) ?? null,
    [styleOptions, selectedStyleId]
  );

  const selectedAddOnItems = useMemo(
    () =>
      addOnOptions.filter((addOn) => selectedAddOnIds.includes(addOn.id)),
    [addOnOptions, selectedAddOnIds]
  );

  const travelOrigin = settings?.travel.enabled
    ? settings.travel.location.location
    : null;

  const quotation = useMemo(
    () =>
      calculateBookingQuotation({
        chargeBy: settings?.charge_by ?? "package",
        selectedPackage: selectedPackage
          ? {
              name: selectedPackage.name,
              price: selectedPackage.price,
              deposit: selectedPackage.deposit,
            }
          : null,
        selectedStyle: selectedStyle
          ? { name: selectedStyle.name, price: selectedStyle.price }
          : null,
        selectedAddOns: selectedAddOnItems.map((addOn) => ({
          name: addOn.name,
          price: addOn.price,
        })),
      }),
    [settings, selectedPackage, selectedStyle, selectedAddOnItems]
  );

  const contactDetailsValid =
    contact.name.trim().length > 0 && contact.email.trim().length > 0;

  const fetchClient = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/client/${client}`);
      const data = await response.json();
      const fetchedPackages = (data.packages ?? []) as ClientPackage[];
      const packageOptions = toPackageOptions(fetchedPackages);
      setUser(data.user as PublicUser);
      setClientPackages(fetchedPackages);
      setStyles((data.styles as ClientStyle[] | undefined) ?? []);
      setAddOns((data.add_ons as CatalogAddOn[] | undefined) ?? []);
      setSettings((data.settings as PublicSetting | undefined) ?? null);
      setSelectedPackageId((current) => current ?? packageOptions[0]?.id ?? null);
      setSelectedStyleId(null);
      setSelectedAddOnIds([]);
      setTermsAccepted(false);
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
    setSelectedStyleId(null);
    setSelectedAddOnIds([]);
    setTermsAccepted(false);
  }, [selectedPackageId]);

  useEffect(() => {
    if (!sameLocationForAll || !sharedLocation) return;
    setSessions((current) =>
      current.map((session) => ({ ...session, location: sharedLocation }))
    );
  }, [sameLocationForAll, sharedLocation]);

  useEffect(() => {
    sessionRoadDistancesRef.current = sessionRoadDistances;
  }, [sessionRoadDistances]);

  useEffect(() => {
    if (!travelOrigin) {
      setSessionRoadDistances({});
      return;
    }

    const sessionsWithLocation = sessions.filter(
      (session): session is SessionForm & { location: Address } =>
        Boolean(session.location)
    );

    if (sessionsWithLocation.length === 0) {
      setSessionRoadDistances({});
      return;
    }

    const requestGroups = new Map<
      string,
      {
        requestKey: string;
        destination: LocationCoordinates;
        sessionKeys: string[];
      }
    >();

    for (const session of sessionsWithLocation) {
      const requestKey = buildTravelDistanceRequestKey(
        travelOrigin,
        session.location.location
      );
      const existingGroup = requestGroups.get(requestKey);

      if (existingGroup) {
        existingGroup.sessionKeys.push(session.client_key);
        continue;
      }

      requestGroups.set(requestKey, {
        requestKey,
        destination: session.location.location,
        sessionKeys: [session.client_key],
      });
    }

    const currentDistances = sessionRoadDistancesRef.current;
    const groupsToFetch = Array.from(requestGroups.values()).filter((group) =>
      !group.sessionKeys.some((sessionKey) => {
        const currentDistance = currentDistances[sessionKey];
        return (
          currentDistance?.requestKey === group.requestKey &&
          currentDistance.status === "ready"
        );
      })
    );

    setSessionRoadDistances((current) => {
      const next: Record<string, SessionRoadDistance> = {};

      for (const group of requestGroups.values()) {
        const cachedDistance = group.sessionKeys
          .map((sessionKey) => current[sessionKey])
          .find(
            (entry) =>
              entry?.requestKey === group.requestKey && entry.status === "ready"
          );

        const sharedEntry =
          cachedDistance ?? ({ requestKey: group.requestKey, status: "loading" } as const);

        for (const sessionKey of group.sessionKeys) {
          next[sessionKey] = sharedEntry;
        }
      }

      return next;
    });

    if (groupsToFetch.length === 0) return;

    const abortController = new AbortController();

    void Promise.all(
      groupsToFetch.map(async (group) => {
        try {
          const result = await requestTravelDistance(
            travelOrigin,
            group.destination,
            abortController.signal
          );

          setSessionRoadDistances((current) => {
            let changed = false;
            const next = { ...current };

            for (const sessionKey of group.sessionKeys) {
              const currentDistance = current[sessionKey];
              if (!currentDistance || currentDistance.requestKey !== group.requestKey) {
                continue;
              }

              next[sessionKey] = {
                requestKey: group.requestKey,
                status: "ready",
                distanceKm: result.distanceKm,
              };
              changed = true;
            }

            return changed ? next : current;
          });
        } catch (error) {
          if (abortController.signal.aborted) return;

          console.error(error);

          setSessionRoadDistances((current) => {
            let changed = false;
            const next = { ...current };

            for (const sessionKey of group.sessionKeys) {
              const currentDistance = current[sessionKey];
              if (!currentDistance || currentDistance.requestKey !== group.requestKey) {
                continue;
              }

              next[sessionKey] = {
                requestKey: group.requestKey,
                status: "error",
              };
              changed = true;
            }

            return changed ? next : current;
          });
        }
      })
    );

    return () => {
      abortController.abort();
    };
  }, [sessions, travelOrigin?.lat, travelOrigin?.lng]);

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

  const sessionLocationHelperTextByKey = useMemo(() => {
    const messages: Record<string, string | undefined> = {};

    if (!travelOrigin) {
      return messages;
    }

    for (const session of sessions) {
      if (!session.location) {
        messages[session.client_key] = undefined;
        continue;
      }

      const roadDistance = sessionRoadDistances[session.client_key];
      if (!roadDistance) {
        messages[session.client_key] = undefined;
        continue;
      }

      if (roadDistance.status === "loading") {
        messages[session.client_key] = "Calculating road distance...";
        continue;
      }

      if (roadDistance.status === "error") {
        messages[session.client_key] = "Road distance unavailable right now.";
        continue;
      }

      messages[session.client_key] = formatRoadDistanceLabel(
        roadDistance.distanceKm ?? 0
      );
    }

    return messages;
  }, [sessions, sessionRoadDistances, travelOrigin]);

  const sharedLocationHelperText =
    sameLocationForAll && sessions.length > 0
      ? sessionLocationHelperTextByKey[sessions[0].client_key]
      : undefined;

  function goToNextStep() {
    const index = stepOrder.indexOf(step);
    if (index < stepOrder.length - 1) {
      setStep(stepOrder[index + 1]);
    }
  }

  function goToPreviousStep() {
    const index = stepOrder.indexOf(step);
    if (index > 0) {
      setStep(stepOrder[index - 1]);
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
            Hi, I'm {user?.name}. Your professional {user?.role}.
          </h1>
        </button>
      )}
      {step === "name" && (
        <div className="flex flex-1 flex-col items-center justify-center">
          <Input type="text" placeholder="Enter your name" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} />
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
              sharedLocationHelperText={sharedLocationHelperText}
              sessionLocationHelperTextByKey={sessionLocationHelperTextByKey}
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
      {step === "style" && (
        <div className="flex w-full max-w-md flex-1 flex-col items-center justify-center">
          <h1 className="mb-4 max-w-md text-center text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            What style do you want?
          </h1>
          <p className="mb-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
            Pick the look you&apos;re going for.
          </p>
          <div className="flex w-full flex-col items-end gap-4">
            <BookingStylePicker
              styles={styleOptions}
              selectedStyleId={selectedStyleId}
              onStyleChange={setSelectedStyleId}
            />
            <Button
              size="lg"
              className="bg-chart-4 text-white hover:bg-chart-4/90"
              disabled={!selectedStyleId}
              onClick={goToNextStep}
            >
              Next
              <ChevronRightIcon />
            </Button>
          </div>
        </div>
      )}
      {step === "addons" && (
        <div className="flex w-full max-w-md flex-1 flex-col items-center justify-center">
          <h1 className="mb-4 max-w-md text-center text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Any add-ons?
          </h1>
          <p className="mb-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
            Optional extras — pick any that apply, or skip.
          </p>
          <div className="flex w-full flex-col items-end gap-4">
            <BookingAddOnPicker
              addOns={addOnOptions}
              selectedAddOnIds={selectedAddOnIds}
              onSelectionChange={setSelectedAddOnIds}
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
      {step === "details" && (
        <div className="flex w-full max-w-md flex-1 flex-col items-center justify-center">
          <h1 className="mb-4 max-w-md text-center text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Can I get your details?
          </h1>
          <BookingContactForm value={contact} onChange={setContact} />
          <Button
            size="lg"
            className="bg-chart-4 text-white hover:bg-chart-4/90"
            disabled={!contactDetailsValid}
            onClick={goToNextStep}
          >
              Next
              <ChevronRightIcon />
            </Button>
        </div>
      )}
      {step === "review" && (
        <div className="flex w-full max-w-md flex-1 flex-col items-center">
          <h1 className="mb-4 max-w-md text-center text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Review your booking
          </h1>
          <div className="flex w-full flex-col items-end gap-4">
            <BookingQuotation
              quotation={quotation}
              sessions={sessions}
              companyName={settings?.invoice.company_name}
              balanceDueBeforeDays={settings?.payment.balance_due_before}
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
      {step === "t&c" && (
        <div className="flex w-full max-w-md flex-1 flex-col items-center">
          <h1 className="mb-4 max-w-md text-center text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Terms and Conditions
          </h1>
          <div className="flex w-full flex-col items-end gap-4">
            <Card className="mx-auto w-full min-h-128 min-w-72 [--card-spacing:--spacing(6)] sm:min-w-80">
              <CardContent className="flex flex-col gap-4 pt-(--card-spacing)">
                <div className="max-h-96 overflow-y-auto rounded-md border border-border bg-muted/30 p-3">
                  <p className="whitespace-pre-line text-xs text-muted-foreground">
                    {settings?.invoice.terms_and_conditions ??
                      "No terms and conditions available."}
                  </p>
                </div>
                <label className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(event) => setTermsAccepted(event.target.checked)}
                    className="mt-0.5 size-4 shrink-0 rounded border-border accent-primary"
                  />
                  <span>I have read and agree to the terms and conditions</span>
                </label>
              </CardContent>
            </Card>
            <Button
              size="lg"
              className="bg-chart-4 text-white hover:bg-chart-4/90"
              disabled={!termsAccepted}
              onClick={goToNextStep}
            >
              Agree and continue
              <ChevronRightIcon />
            </Button>
          </div>
    
        </div>
      )}
    </div>
  );
}