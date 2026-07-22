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
import { calculateBookingQuotation, formatRm, applyPaymentOption, requiresFullPayment } from "@/utils/booking/pricing";
import {
  isSlotTaken,
  normalizeSessionDate,
  toDateKey,
  type PublicBookedSlot,
} from "@/utils/booking/availability";
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
  price?: number;
  deposit?: number;
  order: number;
  session_templates: SessionTemplate[];
};

type StyleVariant = {
  name: string;
  order: number;
  price: number;
  deposit: number;
  image_url?: string;
};

type ClientStyleCategory = {
  _id?: unknown;
  name: string;
  order: number;
  variants: StyleVariant[];
};

type SelectedStyleForBooking = {
  id: string;
  name: string;
  price: number;
  deposit: number;
  categoryName: string;
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

function getErrorMessage(payload: unknown) {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }

  return "Something went wrong. Please try again.";
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

function buildStyleVariantId(styleDocId: string, variantOrder: number): string {
  return `${styleDocId}:${variantOrder}`;
}

function toPackageOptions(packages: ClientPackage[]): PackageOption[] {
  return sortPackages(packages)
    .map((pkg) => ({
      id: normalizePackageId(pkg._id),
      name: pkg.name,
      price: pkg.price ?? 0,
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
  const [styles, setStyles] = useState<ClientStyleCategory[]>([]);
  const [addOns, setAddOns] = useState<AddOn[]>([]);
  const [settings, setSettings] = useState<PublicSetting | null>(null);
  const [bookedSlots, setBookedSlots] = useState<PublicBookedSlot[]>([]);
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
  const [selectedStyleCategoryId, setSelectedStyleCategoryId] = useState<
    string | null
  >(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentOption, setPaymentOption] = useState<"deposit" | "full">(
    "deposit"
  );
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

  const isDateFullyBooked = (date: Date) =>
    timeSlots.length > 0 &&
    timeSlots.every((slot) =>
      isSlotTaken(date, slot, bookedSlots, sessions)
    );

  const selectedDateKey = selectedDate ? toDateKey(selectedDate) : null;

  const stepOrder = useMemo(() => {
    const hasStyles = styles.length > 0 && settings?.charge_by === "style";
    const hasAddOns = addOns.length > 0;
    return buildStepOrder(hasStyles, hasAddOns);
  }, [styles, addOns, settings?.charge_by]);

  const styleCategories = useMemo(
    () =>
      [...styles]
        .sort((a, b) => a.order - b.order)
        .map((style) => ({
          id: normalizePackageId(style._id),
          name: style.name,
        }))
        .filter((style) => style.id.length > 0),
    [styles]
  );

  const styleVariants = useMemo(() => {
    if (!selectedStyleCategoryId) return [];

    const category = styles.find(
      (style) => normalizePackageId(style._id) === selectedStyleCategoryId
    );
    if (!category) return [];

    return [...category.variants]
      .sort((a, b) => a.order - b.order)
      .map((variant) => ({
        id: buildStyleVariantId(selectedStyleCategoryId, variant.order),
        name: variant.name,
        price: variant.price,
        deposit: variant.deposit,
        imageSrc: variant.image_url,
      }));
  }, [selectedStyleCategoryId, styles]);

  const selectedStyle = useMemo((): SelectedStyleForBooking | null => {
    if (!selectedVariantId) return null;

    const separatorIndex = selectedVariantId.lastIndexOf(":");
    if (separatorIndex === -1) return null;

    const styleDocId = selectedVariantId.slice(0, separatorIndex);
    const variantOrder = Number.parseInt(
      selectedVariantId.slice(separatorIndex + 1),
      10
    );
    if (!styleDocId || Number.isNaN(variantOrder)) return null;

    const category = styles.find(
      (style) => normalizePackageId(style._id) === styleDocId
    );
    if (!category) return null;

    const variant = category.variants.find(
      (item) => item.order === variantOrder
    );
    if (!variant) return null;

    return {
      id: selectedVariantId,
      name: variant.name,
      price: variant.price,
      deposit: variant.deposit,
      categoryName: category.name,
    };
  }, [selectedVariantId, styles]);

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

  const chargeBy = settings?.charge_by ?? "package";

  const selectedAddOnItems = useMemo(
    () =>
      addOnOptions.filter((addOn) => selectedAddOnIds.includes(addOn.id)),
    [addOnOptions, selectedAddOnIds]
  );

  const travelOrigin = settings?.travel.enabled
    ? settings.travel.location.location
    : null;

  const distanceKmBySessionKey = useMemo(() => {
    const distances: Record<string, number | undefined> = {};

    for (const [sessionKey, roadDistance] of Object.entries(sessionRoadDistances)) {
      distances[sessionKey] =
        roadDistance.status === "ready" ? roadDistance.distanceKm : undefined;
    }

    return distances;
  }, [sessionRoadDistances]);

  const quotation = useMemo(
    () =>
      calculateBookingQuotation({
        chargeBy,
        selectedPackage: selectedPackage
          ? {
              name: selectedPackage.name,
              price: selectedPackage.price ?? 0,
              deposit:
                chargeBy === "style" ? 0 : (selectedPackage.deposit ?? 0),
            }
          : null,
        selectedStyle: selectedStyle
          ? {
              name: selectedStyle.name,
              price: selectedStyle.price,
              deposit: selectedStyle.deposit,
            }
          : null,
        selectedAddOns: selectedAddOnItems.map((addOn) => ({
          name: addOn.name,
          price: addOn.price,
        })),
        travel:
          settings?.travel.enabled === true
            ? {
                enabled: true,
                ratePerKm: settings.travel.rate_per_km,
                timeSlots: settings.time_slots,
                sessions,
                distanceKmBySessionKey,
              }
            : undefined,
      }),
    [
      settings,
      chargeBy,
      selectedPackage,
      selectedStyle,
      selectedAddOnItems,
      sessions,
      distanceKmBySessionKey,
    ]
  );

  const balanceDueBeforeDays = settings?.payment.balance_due_before ?? 3;
  const mustPayFull = useMemo(
    () => requiresFullPayment(sessions, balanceDueBeforeDays),
    [sessions, balanceDueBeforeDays]
  );
  const effectivePaymentOption = mustPayFull ? "full" : paymentOption;
  const payableQuotation = useMemo(
    () => applyPaymentOption(quotation, effectivePaymentOption),
    [quotation, effectivePaymentOption]
  );

  useEffect(() => {
    if (mustPayFull && paymentOption !== "full") {
      setPaymentOption("full");
    }
  }, [mustPayFull, paymentOption]);

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
      setStyles((data.styles as ClientStyleCategory[] | undefined) ?? []);
      setAddOns((data.add_ons as CatalogAddOn[] | undefined) ?? []);
      setSettings((data.settings as PublicSetting | undefined) ?? null);
      setBookedSlots(
        (data.booked_slots as PublicBookedSlot[] | undefined) ?? []
      );
      setSelectedPackageId((current) => current ?? packageOptions[0]?.id ?? null);
      setSelectedStyleCategoryId(null);
      setSelectedVariantId(null);
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
    setSelectedStyleCategoryId(null);
    setSelectedVariantId(null);
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
    if (isSlotTaken(selectedDate, selectedTimeSlot, bookedSlots, sessions)) {
      return;
    }

    setSessions((current) => [
      ...current,
      {
        client_key: crypto.randomUUID(),
        status: "scheduled",
        order: nextSessionTemplate.order,
        name: nextSessionTemplate.name,
        date: normalizeSessionDate(selectedDate),
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

  async function handlePay() {
    if (isPaying || !selectedPackageId || sessions.length === 0) return;

    setIsPaying(true);
    setPaymentError(null);

    try {
      const bookingResponse = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          freelancerUsername: client,
          intent: "booking",
          contact,
          packageId: selectedPackageId,
          style: selectedStyle
            ? {
                id: selectedStyle.id,
                name: selectedStyle.name,
                price: selectedStyle.price,
                deposit: selectedStyle.deposit,
                categoryName: selectedStyle.categoryName,
              }
            : undefined,
          addOns: selectedAddOnItems,
          sessions,
          distanceKmBySessionKey,
          paymentOption: effectivePaymentOption,
        }),
      });

      const bookingPayload: unknown = await bookingResponse.json();
      if (!bookingResponse.ok) {
        throw new Error(getErrorMessage(bookingPayload));
      }

      const bookingId =
        bookingPayload &&
        typeof bookingPayload === "object" &&
        "id" in bookingPayload &&
        typeof bookingPayload.id === "string"
          ? bookingPayload.id
          : null;

      if (!bookingId) {
        throw new Error("Could not create booking.");
      }

      const checkoutResponse = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          freelancerUsername: client,
        }),
      });

      const checkoutPayload: unknown = await checkoutResponse.json();
      if (!checkoutResponse.ok) {
        throw new Error(getErrorMessage(checkoutPayload));
      }

      if (
        checkoutPayload &&
        typeof checkoutPayload === "object" &&
        "url" in checkoutPayload &&
        typeof checkoutPayload.url === "string"
      ) {
        window.location.href = checkoutPayload.url;
        return;
      }

      throw new Error("Could not start Stripe Checkout.");
    } catch (error) {
      setPaymentError(
        error instanceof Error ? error.message : "Payment could not be started."
      );
    } finally {
      setIsPaying(false);
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
                    disabled={[
                      { before: new Date() },
                      (date) => isDateFullyBooked(date),
                    ]}
                    captionLayout="dropdown"
                    className="p-0 [--cell-size:--spacing(10)] md:[--cell-size:--spacing(12)]"
                  />
                </CardContent>
                <CardFooter className="w-full flex-col items-stretch gap-3 border-t bg-card">
                  <p className="text-sm font-medium text-foreground">
                    Available slots
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {timeSlots.map((slot) => {
                      const slotTaken = isSlotTaken(
                        selectedDate,
                        slot,
                        bookedSlots,
                        sessions
                      );

                      return (
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
                        disabled={!selectedDate || slotTaken}
                        className={cn(
                          "h-8 w-full",
                          slotTaken && "opacity-50"
                        )}
                        onClick={() => setSelectedTimeSlot(slot)}
                      >
                        {formatTimeSlot(slot)}
                      </Button>
                      );
                    })}
                  </div>
                  {selectedDateKey &&
                    timeSlots.every((slot) =>
                      isSlotTaken(selectedDate, slot, bookedSlots, sessions)
                    ) && (
                      <p className="text-sm text-muted-foreground">
                        All time slots are booked on this date.
                      </p>
                    )}
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
                  disabled={
                    !selectedDate ||
                    !selectedTimeSlot ||
                    isSlotTaken(
                      selectedDate,
                      selectedTimeSlot,
                      bookedSlots,
                      sessions
                    )
                  }
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
            {selectedStyleCategoryId
              ? "Choose your variant"
              : "What style do you want?"}
          </h1>
          <p className="mb-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
            {selectedStyleCategoryId
              ? "Pick the specific look within this style."
              : "Pick the look category you are going for."}
          </p>
          <div className="flex w-full flex-col items-end gap-4">
            {!selectedStyleCategoryId ? (
              <BookingStylePicker
                mode="category"
                categories={styleCategories}
                selectedCategoryId={selectedStyleCategoryId}
                onCategoryChange={(categoryId) => {
                  setSelectedStyleCategoryId(categoryId);
                  setSelectedVariantId(null);
                }}
              />
            ) : (
              <BookingStylePicker
                mode="variant"
                variants={styleVariants}
                selectedVariantId={selectedVariantId}
                onVariantChange={setSelectedVariantId}
              />
            )}
            <div className="flex w-full flex-col gap-2">
              {selectedStyleCategoryId && (
                <Button
                  type="button"
                  variant="ghost"
                  size="lg"
                  className="w-full"
                  onClick={() => {
                    if (selectedVariantId) {
                      setSelectedVariantId(null);
                      return;
                    }
                    setSelectedStyleCategoryId(null);
                  }}
                >
                  Back
                </Button>
              )}
              <Button
                size="lg"
                className="bg-chart-4 text-white hover:bg-chart-4/90"
                disabled={!selectedVariantId}
                onClick={goToNextStep}
              >
                Next
                <ChevronRightIcon />
              </Button>
            </div>
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
              quotation={payableQuotation}
              sessions={sessions}
              companyName={settings?.invoice.company_name}
              balanceDueBeforeDays={balanceDueBeforeDays}
              paymentOption={effectivePaymentOption}
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
      {step === "payment" && (
        <div className="flex w-full max-w-md flex-1 flex-col items-center">
          <h1 className="mb-4 max-w-md text-center text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {effectivePaymentOption === "full"
              ? "Pay in full"
              : "Choose how to pay"}
          </h1>
          <p className="mb-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
            {mustPayFull
              ? `Your session is within ${balanceDueBeforeDays} day${
                  balanceDueBeforeDays === 1 ? "" : "s"
                }, so full payment is required.`
              : "Pay a deposit now, or settle the full amount upfront. Secure card payment through Stripe."}
          </p>
          <div className="flex w-full flex-col items-end gap-4">
            {!mustPayFull && quotation.depositRm > 0 && (
              <div
                className="flex w-full flex-col gap-2"
                role="radiogroup"
                aria-label="Payment option"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={effectivePaymentOption === "deposit"}
                  onClick={() => setPaymentOption("deposit")}
                  className={cn(
                    "flex w-full flex-col items-start gap-0.5 rounded-lg border px-3 py-3 text-left text-sm transition-colors",
                    effectivePaymentOption === "deposit"
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:bg-muted/40"
                  )}
                >
                  <span className="font-medium text-foreground">
                    Pay deposit — {formatRm(quotation.depositRm)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Balance of {formatRm(quotation.balanceRm)} due{" "}
                    {balanceDueBeforeDays} day
                    {balanceDueBeforeDays === 1 ? "" : "s"} before your session.
                  </span>
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={effectivePaymentOption === "full"}
                  onClick={() => setPaymentOption("full")}
                  className={cn(
                    "flex w-full flex-col items-start gap-0.5 rounded-lg border px-3 py-3 text-left text-sm transition-colors",
                    effectivePaymentOption === "full"
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:bg-muted/40"
                  )}
                >
                  <span className="font-medium text-foreground">
                    Pay in full — {formatRm(quotation.totalRm)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Nothing left to pay later.
                  </span>
                </button>
              </div>
            )}
            <BookingQuotation
              quotation={payableQuotation}
              sessions={sessions}
              companyName={settings?.invoice.company_name}
              balanceDueBeforeDays={balanceDueBeforeDays}
              paymentOption={effectivePaymentOption}
            />
            {paymentError && (
              <p className="w-full text-sm text-destructive" role="alert">
                {paymentError}
              </p>
            )}
            <Button
              size="lg"
              className="h-11 w-full bg-chart-4 text-white hover:bg-chart-4/90"
              disabled={isPaying || payableQuotation.depositRm <= 0}
              onClick={() => void handlePay()}
            >
              {isPaying
                ? "Redirecting to Stripe…"
                : effectivePaymentOption === "full"
                  ? `Pay ${formatRm(payableQuotation.totalRm)} now`
                  : `Pay ${formatRm(payableQuotation.depositRm)} deposit`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}