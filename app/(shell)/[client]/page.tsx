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
import { ClientProfile } from "@/components/booking/ClientProfile";
import { usePublicReviews } from "@/hooks/use-public-reviews";
import { ManualPaymentStep } from "@/components/booking/ManualPaymentStep";
import { BookingLoadingState } from "@/components/booking/BookingLoadingState";
import { AnimatedFlow } from "@/components/animated-flow";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useLocale } from "@/components/LocaleProvider";
import { SessionLocationPicker } from "@/components/SessionLocationPicker";
import { TextGenerateEffect } from "@/components/text-generate-effect";
import type { Locale } from "@/locales";
import {
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperTitle,
  StepperTrigger,
} from "@/components/reui/stepper";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  applyPaymentOption,
  calculateBookingQuotation,
  calculateProcessingFeeRm,
  formatRm,
  requiresFullPayment,
  resolveDepositRm,
} from "@/utils/booking/pricing";
import {
  isSlotTaken,
  normalizeSessionDate,
  timeSlotsMatch,
  toDateKey,
  type PublicBookedSlot,
} from "@/utils/booking/availability";
import {
  getEventDayMode,
  getEventSessions,
  isDateAllowedForEvent,
} from "@/utils/booking/events";
import {
  buildBlockedDateSet,
  isDateBlocked,
} from "@/utils/booking/blockedDates";
import {
  getEffectiveBookingUntil,
  isPastBookingWindow,
} from "@/utils/booking/bookingWindow";
import {
  buildHotDatePriceMap,
  getEventHotDatePrice,
  getStyleHotDatePrice,
  resolveEffectivePrice,
  type HotDateLookup,
} from "@/utils/booking/hotDates";
import type { AddOn } from "@/schemas/addOnSchema";
import type { Address } from "@/schemas/addressSchema";
import type {
  DepositType,
  PackageDayMode,
  PackageSession,
} from "@/schemas/packageSchema";
import { Client } from "@/schemas/clientSchema";
import type { SessionForm } from "@/schemas/sessionSchema";
import type {
  PublicSetting,
  RegionPrices,
  TimeSlot,
} from "@/schemas/settingSchema";
import {
  useOutOfStateVenues,
  useRegionQuote,
} from "@/hooks/use-venue-regions";
import {
  getRegionEventPrice,
  getRegionLabel,
  getTravelPricing,
} from "@/utils/booking/regions";
import { toManualTransferDetails } from "@/schemas/settingSchema";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { PublicProfile } from "@/schemas/userSchema";
import { buildWhatsAppProfileUrl } from "@/utils/socialLinks";

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

const PROGRESS_STEPS = [
  { key: "name", titleKey: "stepName" },
  { key: "events", titleKey: "stepEvent" },
  { key: "datetime", titleKey: "stepDate" },
  { key: "location", titleKey: "stepLocation" },
  { key: "style", titleKey: "stepStyle" },
  { key: "payment", titleKey: "stepPayment" },
] as const satisfies readonly { key: string; titleKey: keyof Locale }[];

type ProgressStepKey = (typeof PROGRESS_STEPS)[number]["key"];

function bookingStepToProgressKey(step: BookingStep): ProgressStepKey {
  switch (step) {
    case "name":
      return "name";
    case "events":
      return "events";
    case "datetime":
      return "datetime";
    case "location":
      return "location";
    case "style":
      return "style";
    default:
      return "payment";
  }
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  );
}

const WA_FAB_STORAGE_KEY = "bridalync-wa-fab-position";
const WA_FAB_SIZE = 48;
const WA_FAB_DRAG_THRESHOLD = 6;

type FabPosition = { x: number; y: number };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function readSavedFabPosition(): FabPosition | null {
  try {
    const raw = localStorage.getItem(WA_FAB_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FabPosition>;
    if (typeof parsed.x === "number" && typeof parsed.y === "number") {
      return { x: parsed.x, y: parsed.y };
    }
  } catch {
    // Ignore invalid stored positions.
  }
  return null;
}

function saveFabPosition(position: FabPosition) {
  try {
    localStorage.setItem(WA_FAB_STORAGE_KEY, JSON.stringify(position));
  } catch {
    // Ignore storage failures (private mode, quota, etc).
  }
}

function DraggableWhatsAppButton({ href }: { href: string }) {
  const { t } = useLocale();
  const linkRef = useRef<HTMLAnchorElement>(null);
  const [position, setPosition] = useState<FabPosition | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const positionRef = useRef<FabPosition | null>(null);
  const suppressClickRef = useRef(false);
  const dragRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    const saved = readSavedFabPosition();
    if (!saved) return;

    const parent = linkRef.current?.offsetParent as HTMLElement | null;
    const width = parent?.clientWidth ?? window.innerWidth;
    const height = parent?.clientHeight ?? window.innerHeight;
    const next = {
      x: clamp(saved.x, 0, Math.max(0, width - WA_FAB_SIZE)),
      y: clamp(saved.y, 0, Math.max(0, height - WA_FAB_SIZE)),
    };
    positionRef.current = next;
    setPosition(next);
  }, []);

  useEffect(() => {
    function keepInBounds() {
      setPosition((current) => {
        if (!current) return current;
        const parent = linkRef.current?.offsetParent as HTMLElement | null;
        const width = parent?.clientWidth ?? window.innerWidth;
        const height = parent?.clientHeight ?? window.innerHeight;
        const next = {
          x: clamp(current.x, 0, Math.max(0, width - WA_FAB_SIZE)),
          y: clamp(current.y, 0, Math.max(0, height - WA_FAB_SIZE)),
        };
        if (next.x === current.x && next.y === current.y) return current;
        positionRef.current = next;
        saveFabPosition(next);
        return next;
      });
    }

    window.addEventListener("resize", keepInBounds);
    return () => window.removeEventListener("resize", keepInBounds);
  }, []);

  function measureCurrentPosition(): FabPosition {
    const el = linkRef.current;
    const parent = el?.offsetParent as HTMLElement | null;
    if (!el || !parent) {
      return { x: 16, y: 16 };
    }
    const parentRect = parent.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    return {
      x: rect.left - parentRect.left,
      y: rect.top - parentRect.top,
    };
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLAnchorElement>) {
    if (event.button !== 0) return;
    const el = linkRef.current;
    if (!el) return;

    const origin = position ?? measureCurrentPosition();
    if (!position) {
      positionRef.current = origin;
      setPosition(origin);
    }

    dragRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      originX: origin.x,
      originY: origin.y,
      moved: false,
    };
    suppressClickRef.current = false;
    el.setPointerCapture(event.pointerId);
    setIsDragging(true);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLAnchorElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const dx = event.clientX - drag.startClientX;
    const dy = event.clientY - drag.startClientY;
    if (
      Math.abs(dx) > WA_FAB_DRAG_THRESHOLD ||
      Math.abs(dy) > WA_FAB_DRAG_THRESHOLD
    ) {
      drag.moved = true;
    }

    const parent = linkRef.current?.offsetParent as HTMLElement | null;
    const width = parent?.clientWidth ?? window.innerWidth;
    const height = parent?.clientHeight ?? window.innerHeight;

    const next = {
      x: clamp(drag.originX + dx, 0, Math.max(0, width - WA_FAB_SIZE)),
      y: clamp(drag.originY + dy, 0, Math.max(0, height - WA_FAB_SIZE)),
    };
    positionRef.current = next;
    setPosition(next);
  }

  function endDrag(event: ReactPointerEvent<HTMLAnchorElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    if (drag.moved) {
      suppressClickRef.current = true;
    }

    dragRef.current = null;
    setIsDragging(false);

    try {
      linkRef.current?.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer may already be released.
    }

    if (positionRef.current) {
      saveFabPosition(positionRef.current);
    }
  }

  function handleClick(event: ReactMouseEvent<HTMLAnchorElement>) {
    if (suppressClickRef.current) {
      event.preventDefault();
      suppressClickRef.current = false;
    }
  }

  return (
    <a
      ref={linkRef}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t.chatOnWhatsApp}
      title={t.dragToChat}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClick={handleClick}
      style={
        position
          ? { left: position.x, top: position.y, right: "auto", bottom: "auto" }
          : undefined
      }
      className={cn(
        "absolute z-20 flex size-12 touch-none items-center justify-center rounded-full border border-zinc-900/10 bg-white/40 text-rose-900 shadow-md backdrop-blur-sm select-none hover:bg-white/55 hover:text-rose-900 hover:shadow-lg dark:border-white/20 dark:bg-white/10 dark:text-rose-400 dark:hover:bg-white/15 dark:hover:text-rose-300",
        position ? null : "right-4 bottom-[22%]",
        isDragging
          ? "cursor-grabbing transition-none"
          : "cursor-grab transition-colors active:scale-95"
      )}
    >
      <WhatsAppIcon className="pointer-events-none size-6" />
    </a>
  );
}

type ClientPackage = {
  _id?: unknown;
  name: string;
  description?: string;
  price?: number;
  deposit?: number;
  deposit_type?: DepositType;
  region_prices?: RegionPrices;
  sessions?: PackageSession[];
  day_mode?: PackageDayMode;
  order: number;
};

type StyleVariant = {
  name: string;
  order: number;
  price: number;
  deposit: number;
  deposit_type?: DepositType;
  /** Styles have at most one; makeup artists' looks up to five. */
  image_urls: string[];
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
  depositType?: DepositType;
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

function formatRoadDistance(distanceKm: number): string {
  return distanceKm.toFixed(distanceKm >= 10 ? 1 : 2);
}

function getErrorMessage(payload: unknown, fallback: string) {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }

  return fallback;
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

  // Only ever logged — the UI shows a translated "unavailable" message instead.
  if (!response.ok || typeof payload.distanceKm !== "number") {
    throw new Error(
      typeof payload.error === "string"
        ? payload.error
        : "Travel distance request failed."
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
      description: pkg.description?.trim() || undefined,
    }))
    .filter((pkg) => pkg.id.length > 0);
}

function resolveStyleVariant(
  variantId: string,
  styleCategories: ClientStyleCategory[]
): SelectedStyleForBooking | null {
  const separatorIndex = variantId.lastIndexOf(":");
  if (separatorIndex === -1) return null;

  const styleDocId = variantId.slice(0, separatorIndex);
  const variantOrder = Number.parseInt(variantId.slice(separatorIndex + 1), 10);
  if (!styleDocId || Number.isNaN(variantOrder)) return null;

  const category = styleCategories.find(
    (style) => normalizePackageId(style._id) === styleDocId
  );
  if (!category) return null;

  const variant = category.variants.find((item) => item.order === variantOrder);
  if (!variant) return null;

  return {
    id: variantId,
    name: variant.name,
    price: variant.price,
    deposit: variant.deposit,
    depositType: variant.deposit_type,
    categoryName: category.name,
  };
}

function formatTimeSlot(slot: TimeSlot): string {
  return `${slot.startTime} – ${slot.endTime}`;
}

function ProfilePreviewBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  if (searchParams.get("preview") !== "1") return null;

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/dashboard/profile");
    }
  }

  return (
    <div className="relative z-30 flex shrink-0 items-center gap-3 border-b border-zinc-900/10 bg-white/75 px-4 py-2.5 backdrop-blur-md dark:border-white/15 dark:bg-zinc-950/75">
      <Button type="button" size="sm" variant="outline" className="shrink-0" onClick={handleBack}>
        <ChevronLeftIcon />
        Back
      </Button>
      <p className="min-w-0 flex-1 truncate text-sm text-zinc-700 dark:text-zinc-200">
        Previewing your profile
      </p>
    </div>
  );
}

function ClientPageLanguageSelector() {
  const searchParams = useSearchParams();
  const isPreview = searchParams.get("preview") === "1";

  return (
    <div
      className={cn(
        "pointer-events-none fixed right-6 z-50",
        isPreview ? "top-16" : "top-4"
      )}
    >
      <div className="pointer-events-auto">
        <LanguageSelector />
      </div>
    </div>
  );
}

export default function ClientPage() {
  const params = useParams();
  const { t, format, locale, dateFnsLocale } = useLocale();
  const client = params.client as string;
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<BookingStep>("intro");
  const [clientPackages, setClientPackages] = useState<ClientPackage[]>([]);
  const [styles, setStyles] = useState<ClientStyleCategory[]>([]);
  const [addOns, setAddOns] = useState<AddOn[]>([]);
  const [settings, setSettings] = useState<PublicSetting | null>(null);
  const [bookedSlots, setBookedSlots] = useState<PublicBookedSlot[]>([]);
  const [hotDates, setHotDates] = useState<HotDateLookup[]>([]);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(
    null
  );
  const [user, setUser] = useState<PublicProfile | null>(null);
  const publicReviews = usePublicReviews(client);
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
  const [readyBy, setReadyBy] = useState("");
  const [contact, setContact] = useState<Client>(EMPTY_CONTACT);
  const [styleCategoryBySessionKey, setStyleCategoryBySessionKey] = useState<
    Record<string, string | null>
  >({});
  const [styleVariantBySessionKey, setStyleVariantBySessionKey] = useState<
    Record<string, string | null>
  >({});
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentOption, setPaymentOption] = useState<"deposit" | "full">(
    "full"
  );
  const sessionRoadDistancesRef = useRef(sessionRoadDistances);
  const packages = useMemo(
    () => toPackageOptions(clientPackages),
    [clientPackages]
  );

  const selectedEvent = useMemo(
    () =>
      clientPackages.find(
        (pkg) => normalizePackageId(pkg._id) === selectedPackageId
      ) ?? null,
    [clientPackages, selectedPackageId]
  );

  const eventSessions = useMemo(
    () => (selectedEvent ? getEventSessions(selectedEvent) : []),
    [selectedEvent]
  );
  const dayMode = selectedEvent ? getEventDayMode(selectedEvent) : "same_day";

  const nextSessionToSchedule = useMemo(() => {
    const scheduledOrders = new Set(sessions.map((session) => session.order));
    return (
      eventSessions.find((session) => !scheduledOrders.has(session.order)) ??
      null
    );
  }, [eventSessions, sessions]);

  const scheduledDates = useMemo(
    () => sessions.map((session) => session.date),
    [sessions]
  );

  const timeSlots = useMemo(() => settings?.time_slots ?? [], [settings]);

  const isDateFullyBooked = (date: Date) =>
    timeSlots.length > 0 &&
    timeSlots.every((slot) =>
      isSlotTaken(date, slot, bookedSlots, sessions)
    );

  const blockedDateKeys = useMemo(
    () => buildBlockedDateSet(blockedDates),
    [blockedDates]
  );

  const bookingUntil = useMemo(
    () =>
      getEffectiveBookingUntil({
        booking_until: settings?.booking_until,
        max_booking_year: settings?.max_booking_year,
      }),
    [settings?.booking_until, settings?.max_booking_year]
  );

  const bookingCalendarEndMonth = useMemo(() => {
    const [year, month] = bookingUntil.split("-").map(Number);
    return new Date(year, month - 1, 1);
  }, [bookingUntil]);

  const selectedDateKey = selectedDate ? toDateKey(selectedDate) : null;
  const isSlotSelected = (slot: TimeSlot) =>
    selectedTimeSlot !== null && timeSlotsMatch(selectedTimeSlot, slot);
  const selectionTaken =
    !selectedDate ||
    !selectedTimeSlot ||
    isSlotTaken(selectedDate, selectedTimeSlot, bookedSlots, sessions);

  const stepOrder = useMemo(() => {
    const hasStyles = styles.length > 0 && settings?.charge_by === "style";
    const hasAddOns = addOns.length > 0;
    return buildStepOrder(hasStyles, hasAddOns);
  }, [styles, addOns, settings?.charge_by]);

  const usesLooks = user?.role === "makeupartist";
  const styleText = usesLooks
    ? {
        step: t.stepLook,
        choose: t.chooseLook,
        helper: t.chooseLookHelper,
        forSession: t.chooseLookForSession,
        noneAvailable: t.noLooksAvailable,
      }
    : {
        step: t.stepStyle,
        choose: t.chooseStyle,
        helper: t.chooseStyleHelper,
        forSession: t.chooseStyleForSession,
        noneAvailable: t.noStylesAvailable,
      };

  const progressSteps = useMemo(
    () =>
      PROGRESS_STEPS.filter(
        (progressStep) =>
          progressStep.key !== "style" || stepOrder.includes("style")
      ),
    [stepOrder]
  );

  const progressValue = useMemo(() => {
    const key = bookingStepToProgressKey(step);
    const index = progressSteps.findIndex((progressStep) => progressStep.key === key);
    return index >= 0 ? index + 1 : 1;
  }, [step, progressSteps]);

  const whatsappUrl = useMemo(
    () =>
      user
        ? buildWhatsAppProfileUrl(user.country_code, user.mobile)
        : null,
    [user]
  );

  const styleCategories = useMemo(
    () =>
      [...styles]
        .sort((a, b) => a.order - b.order)
        .map((style) => {
          const id = normalizePackageId(style._id);
          return {
            id,
            name: style.name,
            variants: [...style.variants]
              .sort((a, b) => a.order - b.order)
              .map((variant) => ({
                id: buildStyleVariantId(id, variant.order),
                name: variant.name,
                price: variant.price,
                deposit: variant.deposit,
                imageSrcs: variant.image_urls,
              })),
          };
        })
        .filter((style) => style.id.length > 0),
    [styles]
  );

  const chargeBy = settings?.charge_by ?? "package";

  const hotDatePriceMap = useMemo(
    () => buildHotDatePriceMap(hotDates),
    [hotDates]
  );

  const selectedSessionStyles = useMemo(() => {
    return sessions
      .map((session) => {
        const variantId = styleVariantBySessionKey[session.client_key];
        if (!variantId) return null;

        const variant = resolveStyleVariant(variantId, styles);
        if (!variant) return null;

        const separatorIndex = variantId.lastIndexOf(":");
        const styleDocId = variantId.slice(0, separatorIndex);
        const variantOrder = Number.parseInt(
          variantId.slice(separatorIndex + 1),
          10
        );
        const overridePrice =
          styleDocId && !Number.isNaN(variantOrder)
            ? getStyleHotDatePrice(
                hotDatePriceMap,
                session.date,
                styleDocId,
                variantOrder
              )
            : undefined;

        const price = resolveEffectivePrice(variant.price, overridePrice);
        return {
          name: `${session.name} — ${variant.categoryName} — ${variant.name}`,
          price,
          deposit: resolveDepositRm(variant.deposit, variant.depositType, price),
        };
      })
      .filter((style): style is NonNullable<typeof style> => style !== null);
  }, [sessions, styleVariantBySessionKey, styles, hotDatePriceMap]);

  const allSessionsStyled =
    chargeBy !== "style" ||
    (sessions.length > 0 &&
      sessions.every((session) => styleVariantBySessionKey[session.client_key]));

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

  const selectedAddOnItems = useMemo(
    () =>
      addOnOptions.filter((addOn) => selectedAddOnIds.includes(addOn.id)),
    [addOnOptions, selectedAddOnIds]
  );

  const travelPricing = settings
    ? getTravelPricing(settings.travel, chargeBy)
    : ({ kind: "none" } as const);
  const travelOrigin =
    settings && travelPricing.kind === "distance"
      ? settings.travel.location.location
      : null;
  const regionPrices =
    travelPricing.kind === "region_fixed"
      ? travelPricing.prices
      : travelPricing.kind === "region_per_event"
        ? selectedEvent?.region_prices
        : undefined;
  const regionPricingEnabled =
    travelPricing.kind === "region_fixed" ||
    (travelPricing.kind === "region_per_event" && selectedEvent !== null);
  const venueLocations = useMemo(
    () => sessions.map((session) => session.location),
    [sessions]
  );
  const regionQuote = useRegionQuote(
    venueLocations,
    regionPrices,
    regionPricingEnabled
  );
  const baseRegion = settings?.travel.base_region;
  const accommodationByClient =
    settings?.travel.accommodation_by === "client" && !!baseRegion;
  const outOfStateCheck = useOutOfStateVenues(
    venueLocations,
    baseRegion,
    accommodationByClient
  );
  const [accommodationDialogOpen, setAccommodationDialogOpen] = useState(false);
  const regionPriceRm =
    regionQuote.status === "ready" && regionQuote.result?.ok
      ? regionQuote.result.priceRm
      : null;

  const distanceKmBySessionKey = useMemo(() => {
    const distances: Record<string, number | undefined> = {};

    for (const [sessionKey, roadDistance] of Object.entries(sessionRoadDistances)) {
      distances[sessionKey] =
        roadDistance.status === "ready" ? roadDistance.distanceKm : undefined;
    }

    return distances;
  }, [sessionRoadDistances]);

  const eventPriceRm = useMemo(() => {
    if (!selectedEvent || !selectedPackageId) return 0;
    const hotDatePrice = getEventHotDatePrice(
      hotDatePriceMap,
      scheduledDates,
      selectedPackageId
    );
    return travelPricing.kind === "region_per_event" && regionPriceRm !== null
      ? getRegionEventPrice(regionPriceRm, hotDatePrice)
      : resolveEffectivePrice(selectedEvent.price ?? 0, hotDatePrice);
  }, [
    selectedEvent,
    selectedPackageId,
    hotDatePriceMap,
    scheduledDates,
    travelPricing.kind,
    regionPriceRm,
  ]);

  const quotation = useMemo(
    () =>
      calculateBookingQuotation({
        chargeBy,
        selectedPackages:
          selectedEvent && selectedPackageId
            ? [
                {
                  name: selectedEvent.name,
                  price: eventPriceRm,
                  deposit:
                    chargeBy === "style"
                      ? 0
                      : resolveDepositRm(
                          selectedEvent.deposit,
                          selectedEvent.deposit_type,
                          eventPriceRm
                        ),
                },
              ]
            : [],
        selectedSessionStyles:
          chargeBy === "style" ? selectedSessionStyles : undefined,
        selectedAddOns: selectedAddOnItems.map((addOn) => ({
          name: addOn.name,
          price: addOn.price,
        })),
        travel:
          settings && travelPricing.kind === "distance"
            ? {
                enabled: true,
                ratePerKm: settings.travel.rate_per_km,
                longDistanceRatePerKm:
                  settings.travel.long_distance_rate_per_km,
                timeSlots: settings.time_slots,
                sessions,
                distanceKmBySessionKey,
              }
            : travelPricing.kind === "region_fixed" && regionPriceRm !== null
              ? { kind: "region", feeRm: regionPriceRm }
              : undefined,
      }),
    [
      settings,
      travelPricing.kind,
      regionPriceRm,
      chargeBy,
      selectedEvent,
      selectedPackageId,
      eventPriceRm,
      selectedSessionStyles,
      selectedAddOnItems,
      sessions,
      distanceKmBySessionKey,
    ]
  );

  const balanceDueBeforeDays = settings?.payment.balance_due_before ?? 3;
  const manualTransfer = settings
    ? toManualTransferDetails(settings.payment)
    : null;
  const mustPayFull = useMemo(
    () => requiresFullPayment(sessions, balanceDueBeforeDays),
    [sessions, balanceDueBeforeDays]
  );
  const effectivePaymentOption = mustPayFull ? "full" : paymentOption;
  const payableQuotation = useMemo(
    () => applyPaymentOption(quotation, effectivePaymentOption),
    [quotation, effectivePaymentOption]
  );
  const stripeProcessingFeeRm =
    settings?.payment.method === "payment_gateway" &&
    effectivePaymentOption === "full"
      ? calculateProcessingFeeRm(payableQuotation.totalRm)
      : 0;

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
      setUser(data.user as PublicProfile);
      setClientPackages(fetchedPackages);
      setStyles((data.styles as ClientStyleCategory[] | undefined) ?? []);
      setAddOns((data.add_ons as CatalogAddOn[] | undefined) ?? []);
      setSettings((data.settings as PublicSetting | undefined) ?? null);
      setBookedSlots(
        (data.booked_slots as PublicBookedSlot[] | undefined) ?? []
      );
      setHotDates((data.hot_dates as HotDateLookup[] | undefined) ?? []);
      setBlockedDates(
        (data.blocked_dates as string[] | undefined) ?? []
      );
      setSelectedPackageId(
        (current) => current ?? packageOptions[0]?.id ?? null
      );
      setStyleCategoryBySessionKey({});
      setStyleVariantBySessionKey({});
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
    setSessions((current) =>
      current.filter((session) => session.packageId === selectedPackageId)
    );
    setSelectedDate(undefined);
    setSelectedTimeSlot(null);
    setReadyBy("");
    setSharedLocation(null);
    setSameLocationForAll(true);
    setStyleCategoryBySessionKey({});
    setStyleVariantBySessionKey({});
    setSelectedAddOnIds([]);
    setTermsAccepted(false);
  }, [selectedPackageId]);

  useEffect(() => {
    // Keep session locations in sync whenever the shared picker is in use
    // (explicit "same for all", or a single-session booking).
    const shareAcrossSessions =
      sameLocationForAll || sessions.length === 1;
    if (!shareAcrossSessions || !sharedLocation) return;
    setSessions((current) => {
      if (current.length === 0) return current;
      const alreadySynced = current.every(
        (session) => session.location === sharedLocation
      );
      if (alreadySynced) return current;
      return current.map((session) => ({
        ...session,
        location: sharedLocation,
      }));
    });
  }, [sameLocationForAll, sharedLocation, sessions.length]);

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
    if (
      !nextSessionToSchedule ||
      !selectedPackageId ||
      !selectedDate ||
      !selectedTimeSlot ||
      !readyBy
    ) {
      return;
    }
    if (isPastBookingWindow(selectedDate, bookingUntil)) {
      return;
    }
    if (isDateBlocked(selectedDate, blockedDateKeys)) {
      return;
    }
    if (!isDateAllowedForEvent(dayMode, selectedDate, scheduledDates)) {
      return;
    }
    if (selectionTaken) {
      return;
    }

    const nextSessions: SessionForm[] = [
      ...sessions,
      {
        client_key: crypto.randomUUID(),
        status: "scheduled" as const,
        order: nextSessionToSchedule.order,
        name: nextSessionToSchedule.name,
        packageId: selectedPackageId,
        date: normalizeSessionDate(selectedDate),
        time_slot: selectedTimeSlot,
        ready_by: readyBy,
      },
    ].sort((a, b) => a.order - b.order);
    setSessions(nextSessions);
    setSelectedTimeSlot(null);
    setReadyBy("");
    // Same-day events: the remaining sessions can only go on this date.
    setSelectedDate(
      dayMode === "same_day" && nextSessions.length < eventSessions.length
        ? selectedDate
        : undefined
    );

    if (eventSessions.length === 1) {
      goToNextStep();
    }
  }

  function handleRemoveSession(clientKey: string) {
    setSessions((current) =>
      current.filter((session) => session.client_key !== clientKey)
    );
    setStyleCategoryBySessionKey((current) => {
      const next = { ...current };
      delete next[clientKey];
      return next;
    });
    setStyleVariantBySessionKey((current) => {
      const next = { ...current };
      delete next[clientKey];
      return next;
    });
  }

  const isSingleSessionEvent = eventSessions.length === 1;

  const allSessionsScheduled =
    eventSessions.length > 0 && sessions.length === eventSessions.length;

  const allLocationsSet =
    sessions.length > 0 && sessions.every((session) => session.location);
  const allDistancesReady =
    !travelOrigin ||
    sessions.every(
      (session) => sessionRoadDistances[session.client_key]?.status === "ready"
    );

  const regionReady =
    !regionPricingEnabled ||
    (regionQuote.status === "ready" && regionQuote.result?.ok !== false);
  const regionMessage = !regionPricingEnabled || !allLocationsSet
    ? null
    : regionQuote.status === "loading"
      ? { text: t.checkingVenueState, isError: false }
      : regionQuote.status === "error"
        ? { text: t.venueStateUnavailable, isError: true }
        : regionQuote.result && !regionQuote.result.ok
          ? {
              text: regionQuote.result.regionId
                ? format(t.regionNotServed, {
                    region: getRegionLabel(regionQuote.result.regionId),
                  })
                : t.venueOutsideServiceArea,
              isError: true,
            }
          : null;

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
        messages[session.client_key] = t.calculatingDistance;
        continue;
      }

      if (roadDistance.status === "error") {
        messages[session.client_key] = t.distanceUnavailable;
        continue;
      }

      messages[session.client_key] = format(t.distanceAway, {
        distance: formatRoadDistance(roadDistance.distanceKm ?? 0),
      });
    }

    return messages;
  }, [sessions, sessionRoadDistances, travelOrigin, t, format]);

  const sharedLocationHelperText =
    (sameLocationForAll || sessions.length === 1) && sessions.length > 0
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

  async function handlePay(receipt?: File | null) {
    if (isPaying || !selectedPackageId || !allSessionsScheduled) {
      return;
    }

    const paymentMethod = settings?.payment.method ?? "manual_transfer";
    const isManual = paymentMethod === "manual_transfer";

    if (isManual && !receipt) {
      setPaymentError(t.receiptRequired);
      return;
    }

    setIsPaying(true);
    setPaymentError(null);

    try {
      const bookingPayloadBody = {
        freelancerUsername: client,
        intent: "booking",
        contact,
        packageIds: [selectedPackageId],
        addOns: selectedAddOnItems,
        sessions: sessions.map((session) => {
          const variantId = styleVariantBySessionKey[session.client_key];
          const styleSelection =
            chargeBy === "style" && variantId
              ? resolveStyleVariant(variantId, styles)
              : null;

          if (!styleSelection) {
            return { ...session, style: undefined };
          }

          const separatorIndex = styleSelection.id.lastIndexOf(":");
          const styleDocId = styleSelection.id.slice(0, separatorIndex);
          const variantOrder = Number.parseInt(
            styleSelection.id.slice(separatorIndex + 1),
            10
          );
          const overridePrice =
            styleDocId && !Number.isNaN(variantOrder)
              ? getStyleHotDatePrice(
                  hotDatePriceMap,
                  session.date,
                  styleDocId,
                  variantOrder
                )
              : undefined;

          return {
            ...session,
            style: {
              id: styleSelection.id,
              name: styleSelection.name,
              price: resolveEffectivePrice(
                styleSelection.price,
                overridePrice
              ),
              deposit: styleSelection.deposit,
              categoryName: styleSelection.categoryName,
            },
          };
        }),
        paymentOption: effectivePaymentOption,
      };

      let bookingResponse: Response;
      if (isManual && receipt) {
        const formData = new FormData();
        formData.append("payload", JSON.stringify(bookingPayloadBody));
        formData.append("receipt", receipt);
        bookingResponse = await fetch("/api/bookings", {
          method: "POST",
          body: formData,
        });
      } else {
        bookingResponse = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bookingPayloadBody),
        });
      }

      const bookingPayload: unknown = await bookingResponse.json();
      if (!bookingResponse.ok) {
        throw new Error(getErrorMessage(bookingPayload, t.somethingWentWrong));
      }

      const bookingId =
        bookingPayload &&
        typeof bookingPayload === "object" &&
        "id" in bookingPayload &&
        typeof bookingPayload.id === "string"
          ? bookingPayload.id
          : null;

      if (!bookingId) {
        throw new Error(t.couldNotCreateBooking);
      }

      const requiresCheckout =
        bookingPayload &&
        typeof bookingPayload === "object" &&
        "requiresCheckout" in bookingPayload &&
        bookingPayload.requiresCheckout === true;

      if (!requiresCheckout) {
        window.location.href = `/${client}/bookings/${bookingId}?payment=manual-submitted`;
        return;
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
        throw new Error(getErrorMessage(checkoutPayload, t.somethingWentWrong));
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

      throw new Error(t.couldNotStartCheckout);
    } catch (error) {
      setPaymentError(
        error instanceof Error ? error.message : t.paymentCouldNotStart
      );
    } finally {
      setIsPaying(false);
    }
  }

  return (
    <div className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
      <Suspense fallback={null}>
        <ProfilePreviewBanner />
      </Suspense>
      <AnimatedFlow
        flowSpeed={0.9}
        distortionWarp={1.4}
        filmGrain={0.25}
        rotationAngle={120}
        className="pointer-events-none absolute inset-0 min-h-0"
      />
      <Suspense fallback={null}>
        <ClientPageLanguageSelector />
      </Suspense>
      {step !== "intro" && (
        <div className="relative z-10 flex w-full shrink-0 flex-col items-center gap-3 px-6 pt-4">
          <div className="relative flex w-full max-w-md items-center">
            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="relative z-10 -ml-2 text-muted-foreground hover:text-foreground"
              onClick={goToPreviousStep}
            >
              <ChevronLeftIcon />
              {t.back}
            </Button>
          </div>
          <Stepper value={progressValue} className="w-full max-w-lg px-4 sm:px-8">
            <StepperNav className="gap-2 sm:gap-4">
              {progressSteps.map((progressStep, index) => (
                <StepperItem
                  key={progressStep.key}
                  step={index + 1}
                  className="relative flex-1 items-start"
                >
                  <StepperTrigger
                    className="pointer-events-none flex grow flex-col items-start justify-center gap-2"
                    tabIndex={-1}
                  >
                    <StepperIndicator className="h-1 w-full rounded-full bg-rose-200 data-[state=active]:bg-rose-800 data-[state=completed]:bg-rose-800">
                      <span className="sr-only">{index + 1}</span>
                    </StepperIndicator>
                    <StepperTitle className="text-start text-[10px] font-semibold leading-tight group-data-[state=inactive]/step:text-muted-foreground sm:text-xs">
                      {progressStep.key === "style"
                        ? styleText.step
                        : t[progressStep.titleKey]}
                    </StepperTitle>
                  </StepperTrigger>
                </StepperItem>
              ))}
            </StepperNav>
          </Stepper>
        </div>
      )}
      <div
        className={cn(
          "relative z-10 flex min-h-0 w-full flex-1 flex-col items-center overflow-y-auto overscroll-y-contain px-6 pb-16",
          step === "intro" ? "pt-16" : "pt-4"
        )}
      >
      {step === "intro" && loading && (
        <BookingLoadingState message={t.loadingProfile} />
      )}
      {step === "intro" && user && (
        <ClientProfile
          user={user}
          reviews={publicReviews}
          onBookNow={goToNextStep}
        />
      )}
      {step === "intro" && !user && !loading && (
        <p className="text-sm text-muted-foreground">{t.profileNotFound}</p>
      )}
      {step === "name" && (
        <div className="relative flex w-full max-w-md flex-1 flex-col items-center justify-center">
          <div className="absolute bottom-[calc(50%+3rem)] flex w-full flex-col items-center px-6">
            <TextGenerateEffect
              key={locale}
              words={t.nameQuestion}
              className="mb-6 w-full max-w-md text-center text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50"
            />
          </div>
          <div className="flex w-full flex-col items-end gap-12">
            <div className="relative max-w-full self-center">
              <span
                aria-hidden
                className="invisible block whitespace-pre px-1 text-2xl font-medium tracking-tight"
              >
                {contact.name || t.namePlaceholder}
              </span>
              <input
                type="text"
                autoFocus
                placeholder={t.namePlaceholder}
                value={contact.name}
                onChange={(e) => setContact({ ...contact, name: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && contact.name.trim()) {
                    e.preventDefault()
                    goToNextStep()
                  }
                }}
                className="absolute inset-0 w-full min-w-0 border-0 bg-transparent px-1 text-left text-2xl font-medium tracking-tight text-zinc-900 caret-zinc-900 outline-none placeholder:text-zinc-400 focus:ring-0 dark:text-zinc-50 dark:caret-zinc-50 dark:placeholder:text-zinc-500"
              />
            </div>
            <Button
              size="lg"
              className="mr-4 bg-rose-800 text-white hover:bg-rose-800/90"
              disabled={!contact.name.trim()}
              onClick={goToNextStep}
            >
              {t.next}
              <ChevronRightIcon />
            </Button>
          </div>
        </div>
      )}
      {step === "events" && (
        <div className="flex w-full max-w-md flex-1 flex-col items-center justify-center">
          <h1 className="mb-4 max-w-md text-center text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {t.eventQuestion}
          </h1>
          <p className="mb-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
            {t.eventHelper}
          </p>

          <div className="flex w-full flex-col items-end gap-4">
            {loading ? (
              <BookingLoadingState
                message={t.loadingPackages}
                className="w-full py-10"
              />
            ) : (
              <div className="mx-auto w-full max-w-xs px-2">
                <BookingPackagePicker
                  packages={packages}
                  selectedPackageId={selectedPackageId}
                  onPackageChange={setSelectedPackageId}
                />
              </div>
            )}
            <Button
              size="lg"
              className="mt-4 bg-rose-800 text-white hover:bg-rose-800/90"
              disabled={!selectedEvent}
              onClick={goToNextStep}
            >
              {t.next}
              <ChevronRightIcon />
            </Button>
          </div>
        </div>
      )}

      {step === "datetime" && (
        <div className="flex w-full max-w-md flex-1 flex-col items-center">
          <h1
            className={cn(
              "max-w-md text-center text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50",
              isSingleSessionEvent ? "mb-6" : "mb-2"
            )}
          >
            {nextSessionToSchedule
              ? format(t.bookSession, { sessionName: nextSessionToSchedule.name })
              : t.allSessionsScheduled}
          </h1>
          {!isSingleSessionEvent && (
            <p className="mb-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
              {format(t.sessionsScheduledCount, {
                scheduled: sessions.length,
                total: eventSessions.length,
              })}
              {" · "}
              {dayMode === "same_day" ? t.sameDayHint : t.differentDayHint}
            </p>
          )}

          <div className="flex w-full flex-col items-end gap-4">
            {nextSessionToSchedule && (
              <Card className="mx-auto w-full min-w-72 bg-white/30 shadow-sm ring-white/60 backdrop-blur-sm [--card-spacing:--spacing(6)] sm:min-w-80 dark:bg-white/10 dark:ring-white/15">
                <CardContent className="flex flex-col items-center gap-4 pt-1">
                  <Calendar
                    mode="single"
                    locale={dateFnsLocale}
                    selected={selectedDate}
                    onSelect={(date) => {
                      setSelectedDate(date);
                      setSelectedTimeSlot(null);
                    }}
                    disabled={[
                      { before: new Date() },
                      (date) => isDateFullyBooked(date),
                      (date) => isDateBlocked(date, blockedDateKeys),
                      (date) => isPastBookingWindow(date, bookingUntil),
                      (date) =>
                        !isDateAllowedForEvent(dayMode, date, scheduledDates),
                    ]}
                    endMonth={bookingCalendarEndMonth}
                    captionLayout="dropdown"
                    className="mx-auto p-0 [--cell-size:--spacing(10)] md:[--cell-size:--spacing(12)] [&_button[data-selected-single=true]]:bg-rose-800 [&_button[data-selected-single=true]]:text-white [&_button[data-selected-single=true]]:hover:bg-rose-800/90 [&_button[data-selected-single=true]]:hover:text-white"
                    classNames={{
                      today:
                        "rounded-(--cell-radius) bg-transparent data-[selected=true]:rounded-none [&_button]:bg-zinc-700 [&_button]:text-white [&_button]:hover:bg-zinc-700/90 [&_button]:hover:text-white",
                    }}
                  />
                </CardContent>
                <CardFooter className="w-full flex-col items-stretch gap-3 border-t border-white/40 bg-transparent dark:border-white/15">
                  <p className="text-sm font-medium text-foreground">
                    {t.availableSlots}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {timeSlots.map((slot) => {
                      const slotTaken = isSlotTaken(
                        selectedDate,
                        slot,
                        bookedSlots,
                        sessions
                      );
                      const selected = isSlotSelected(slot);

                      return (
                      <Button
                        key={`${slot.startTime}-${slot.endTime}`}
                        type="button"
                        variant={selected ? "default" : "outline"}
                        size="lg"
                        aria-pressed={selected}
                        disabled={!selectedDate || slotTaken}
                        className={cn(
                          "h-8 w-full",
                          selected &&
                            "bg-rose-800 text-white hover:bg-rose-800/90 hover:text-white",
                          slotTaken && "opacity-50"
                        )}
                        onClick={() =>
                          setSelectedTimeSlot(selected ? null : slot)
                        }
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
                        {t.allSlotsBooked}
                      </p>
                    )}
                  {selectedTimeSlot && (
                    <div className="flex flex-col gap-1.5 pt-1">
                      <Label htmlFor="ready-by" className="text-sm font-medium">
                        {t.readyByLabel}
                      </Label>
                      <Input
                        id="ready-by"
                        type="time"
                        value={readyBy}
                        onChange={(event) => setReadyBy(event.target.value)}
                        className="bg-white/50 dark:bg-white/10"
                      />
                      <p className="text-xs text-muted-foreground">
                        {t.readyByHelper}
                      </p>
                    </div>
                  )}
                </CardFooter>
              </Card>
            )}

            {(!isSingleSessionEvent || allSessionsScheduled) && (
              <div className="w-full space-y-2">
                <p className="text-sm font-medium text-foreground">
                  {t.yourBookings}
                </p>
                <BookingSessionList
                  sessions={sessions}
                  onRemove={handleRemoveSession}
                  emptyMessage={t.noSessionsYet}
                  frosted
                />
              </div>
            )}

            <div className="flex w-full justify-end gap-2">
              {nextSessionToSchedule && (
                <Button
                  type="button"
                  variant={isSingleSessionEvent ? "default" : "outline"}
                  size="lg"
                  className={
                    isSingleSessionEvent
                      ? "bg-rose-800 text-white hover:bg-rose-800/90"
                      : undefined
                  }
                  disabled={!selectedTimeSlot || !readyBy || selectionTaken}
                  onClick={handleAddSession}
                >
                  {format(t.addSession, {
                    sessionName: nextSessionToSchedule.name,
                  })}
                </Button>
              )}
              {(!isSingleSessionEvent || allSessionsScheduled) && (
                <Button
                  size="lg"
                  className="bg-rose-800 text-white hover:bg-rose-800/90"
                  disabled={!allSessionsScheduled}
                  onClick={goToNextStep}
                >
                  {t.next}
                  <ChevronRightIcon />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
      {step === "location" && (
        <div className="flex w-full max-w-md flex-1 flex-col items-center justify-center">
          <h1 className="mb-4 max-w-md text-center text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {t.bookingLocation}
          </h1>

          <div className="flex w-full flex-col items-end gap-4">
            <SessionLocationPicker
              sessions={sessions}
              sameLocationForAll={sameLocationForAll}
              onSameLocationForAllChange={setSameLocationForAll}
              sharedLocation={sharedLocation}
              onSharedLocationChange={(location) => {
                setSharedLocation(location);
                // Apply immediately so Next enables without waiting on the sync effect.
                if (sameLocationForAll || sessions.length === 1) {
                  setSessions((current) =>
                    current.map((session) => ({ ...session, location }))
                  );
                }
              }}
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
              <p className="text-sm font-medium text-foreground">{t.summary}</p>
              <BookingSessionList sessions={sessions} showLocation frosted />
            </div>

            {regionMessage ? (
              <p
                className={cn(
                  "w-full text-sm",
                  regionMessage.isError
                    ? "text-destructive"
                    : "text-muted-foreground"
                )}
              >
                {regionMessage.text}
              </p>
            ) : null}

            <Button
              size="lg"
              className="bg-rose-800 text-white hover:bg-rose-800/90"
              disabled={
                !allLocationsSet ||
                !allDistancesReady ||
                !regionReady ||
                outOfStateCheck.status === "loading"
              }
              onClick={() => {
                if (
                  outOfStateCheck.status === "ready" &&
                  outOfStateCheck.outOfState
                ) {
                  setAccommodationDialogOpen(true);
                  return;
                }
                goToNextStep();
              }}
            >
              {t.next}
              <ChevronRightIcon />
            </Button>
          </div>

          <AlertDialog
            open={accommodationDialogOpen}
            onOpenChange={setAccommodationDialogOpen}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t.accommodationTitle}</AlertDialogTitle>
                <AlertDialogDescription>
                  {format(t.accommodationDescription, {
                    state: baseRegion ? getRegionLabel(baseRegion) : "",
                  })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t.accommodationCancel}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    setAccommodationDialogOpen(false);
                    goToNextStep();
                  }}
                >
                  {t.accommodationAgree}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
      {step === "style" && (
        <div className="flex w-full max-w-md flex-1 flex-col items-center justify-center">
          <h1 className="mb-4 max-w-md text-center text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {styleText.choose}
          </h1>
          <p className="mb-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
            {styleText.helper}
          </p>
          <div className="flex w-full flex-col items-end gap-4">
            <ul className="mx-auto flex w-full max-w-sm flex-col gap-6 px-2">
              {sessions.map((session) => (
                <li key={session.client_key} className="flex flex-col gap-3">
                  <p className="text-sm font-medium text-foreground">
                    {format(styleText.forSession, { sessionName: session.name })}
                  </p>
                  <BookingStylePicker
                    categories={styleCategories}
                    emptyMessage={styleText.noneAvailable}
                    selectedCategoryId={
                      styleCategoryBySessionKey[session.client_key] ?? null
                    }
                    selectedVariantId={
                      styleVariantBySessionKey[session.client_key] ?? null
                    }
                    onCategoryChange={(categoryId) =>
                      setStyleCategoryBySessionKey((current) => ({
                        ...current,
                        [session.client_key]: categoryId,
                      }))
                    }
                    onVariantChange={(variantId) =>
                      setStyleVariantBySessionKey((current) => ({
                        ...current,
                        [session.client_key]: variantId,
                      }))
                    }
                  />
                </li>
              ))}
            </ul>
            <div className="flex w-full justify-end">
              <Button
                size="lg"
                className="bg-rose-800 text-white hover:bg-rose-800/90"
                disabled={!allSessionsStyled}
                onClick={goToNextStep}
              >
                {t.next}
                <ChevronRightIcon />
              </Button>
            </div>
          </div>
        </div>
      )}
      {step === "addons" && (
        <div className="flex w-full max-w-md flex-1 flex-col items-center justify-center">
          <h1 className="mb-4 max-w-md text-center text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {t.addOnsTitle}
          </h1>
          <p className="mb-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
            {t.addOnsHelper}
          </p>
          <div className="flex w-full flex-col items-end gap-4">
            <div className="mx-auto w-full max-w-xs px-2">
              <BookingAddOnPicker
                addOns={addOnOptions}
                selectedAddOnIds={selectedAddOnIds}
                onSelectionChange={setSelectedAddOnIds}
              />
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Button
                size="lg"
                variant="outline"
                className="bg-white text-zinc-500 hover:bg-zinc-100 hover:text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
                onClick={goToNextStep}
              >
                {t.skip}
              </Button>
              <Button
                size="lg"
                className="bg-rose-800 text-white hover:bg-rose-800/90"
                onClick={goToNextStep}
              >
                {t.next}
                <ChevronRightIcon />
              </Button>
            </div>
          </div>
        </div>
      )}
      {step === "details" && (
        <div className="flex w-full max-w-md flex-1 flex-col items-center justify-center pb-24">
          <TextGenerateEffect
              key={locale}
              words={t.almostThere}
              className="mb-6 w-full max-w-md text-center text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50"
            />
          <div className="flex w-full flex-col items-end gap-4">
            <BookingContactForm value={contact} onChange={setContact} />
            <Button
              size="lg"
              className="mt-2 bg-rose-800 text-white hover:bg-rose-800/90"
              disabled={!contactDetailsValid}
              onClick={goToNextStep}
            >
              {t.next}
              <ChevronRightIcon />
            </Button>
          </div>
        </div>
      )}
      {step === "review" && (
        <div className="flex w-full max-w-md flex-1 flex-col items-center">
          <h1 className="mb-4 max-w-md text-center text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {t.reviewBookingTitle}
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
              className="bg-rose-800 text-white hover:bg-rose-800/90"
              onClick={goToNextStep}
            >
              {t.next}
              <ChevronRightIcon />
            </Button>
          </div>
        </div>
      )}
      {step === "t&c" && (
        <div className="flex w-full max-w-md flex-1 flex-col items-center">
          <h1 className="mb-4 max-w-md text-center text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {t.termsTitle}
          </h1>
          <div className="flex w-full flex-col items-end gap-4">
            <Card className="mx-auto w-full min-h-128 min-w-72 bg-white/30 shadow-sm ring-white/60 backdrop-blur-sm [--card-spacing:--spacing(6)] sm:min-w-80 dark:bg-white/10 dark:ring-white/15">
              <CardContent className="flex flex-col gap-4 pt-(--card-spacing)">
                <div className="max-h-96 overflow-y-auto rounded-md border border-white/40 bg-white/20 p-3 dark:border-white/15 dark:bg-white/5">
                  <p className="whitespace-pre-line text-xs text-muted-foreground">
                    {settings?.invoice.terms_and_conditions ??
                      t.noTermsAvailable}
                  </p>
                </div>
                <label className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(event) => setTermsAccepted(event.target.checked)}
                    className="mt-0.5 size-4 shrink-0 rounded border-border accent-rose-800"
                  />
                  <span>{t.agreeCheckbox}</span>
                </label>
              </CardContent>
            </Card>
            <Button
              size="lg"
              className="bg-rose-800 text-white hover:bg-rose-800/90"
              disabled={!termsAccepted}
              onClick={goToNextStep}
            >
              {t.agreeContinue}
              <ChevronRightIcon />
            </Button>
          </div>
    
        </div>
      )}
      {step === "payment" && (
        <div className="flex w-full max-w-md flex-1 flex-col items-center">
          <h1 className="mb-4 max-w-md text-center text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {effectivePaymentOption === "full" ? t.payInFull : t.choosePayment}
          </h1>
          <p className="mb-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
            {mustPayFull
              ? format(t.sessionWithinDays, { days: balanceDueBeforeDays })
              : (settings?.payment.method ?? "manual_transfer") ===
                  "manual_transfer"
                ? t.paymentManualSecure
                : t.paymentSecure}
          </p>
          <div className="flex w-full flex-col items-end gap-4">
            {!mustPayFull && quotation.depositRm > 0 && (
              <div
                className="flex w-full flex-col gap-2"
                role="radiogroup"
                aria-label={t.paymentOptionLabel}
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={effectivePaymentOption === "full"}
                  onClick={() => setPaymentOption("full")}
                  className={cn(
                    "flex w-full flex-col items-start gap-0.5 rounded-lg px-3 py-3 text-left text-sm transition-colors",
                    effectivePaymentOption === "full"
                      ? "bg-rose-800 text-white shadow-sm"
                      : "bg-white/30 shadow-sm ring-1 ring-white/60 backdrop-blur-sm hover:bg-white/40 dark:bg-white/10 dark:ring-white/15 dark:hover:bg-white/15"
                  )}
                >
                  <span className="font-medium">
                    {format(t.payFullOption, {
                      amount: formatRm(quotation.totalRm),
                    })}
                  </span>
                  <span
                    className={cn(
                      "text-xs",
                      effectivePaymentOption === "full"
                        ? "text-white/80"
                        : "text-muted-foreground"
                    )}
                  >
                    {t.noBalanceLater}
                  </span>
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={effectivePaymentOption === "deposit"}
                  onClick={() => setPaymentOption("deposit")}
                  className={cn(
                    "flex w-full flex-col items-start gap-0.5 rounded-lg px-3 py-3 text-left text-sm transition-colors",
                    effectivePaymentOption === "deposit"
                      ? "bg-rose-800 text-white shadow-sm"
                      : "bg-white/30 shadow-sm ring-1 ring-white/60 backdrop-blur-sm hover:bg-white/40 dark:bg-white/10 dark:ring-white/15 dark:hover:bg-white/15"
                  )}
                >
                  <span className="font-medium">
                    {format(t.payDepositOption, {
                      amount: formatRm(quotation.depositRm),
                    })}
                  </span>
                  <span
                    className={cn(
                      "text-xs",
                      effectivePaymentOption === "deposit"
                        ? "text-white/80"
                        : "text-muted-foreground"
                    )}
                  >
                    {format(t.balanceDue, {
                      amount: formatRm(quotation.balanceRm),
                      days: balanceDueBeforeDays,
                    })}
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
            {(settings?.payment.method ?? "manual_transfer") ===
            "manual_transfer" ? (
              manualTransfer ? (
                <ManualPaymentStep
                  amountLabel={format(t.transferAmountDue, {
                    amount: formatRm(
                      effectivePaymentOption === "full"
                        ? payableQuotation.totalRm
                        : payableQuotation.depositRm
                    ),
                  })}
                  submitLabel={t.submitReceipt}
                  submittingLabel={t.submittingReceipt}
                  isSubmitting={isPaying}
                  error={paymentError}
                  transfer={manualTransfer}
                  onSubmit={(file) => void handlePay(file)}
                />
              ) : (
                <p className="w-full text-sm text-destructive" role="alert">
                  This stylist has not set up payment details yet. Please
                  contact them to complete your booking.
                </p>
              )
            ) : (
              <>
                {paymentError && (
                  <p className="w-full text-sm text-destructive" role="alert">
                    {paymentError}
                  </p>
                )}
                <Button
                  size="lg"
                  className="h-11 w-full bg-rose-800 text-white hover:bg-rose-800/90"
                  disabled={isPaying || payableQuotation.depositRm <= 0}
                  onClick={() => void handlePay()}
                >
                  {isPaying
                    ? t.redirectingStripe
                    : effectivePaymentOption === "full"
                      ? format(t.payNow, {
                          amount: formatRm(
                            payableQuotation.depositRm + stripeProcessingFeeRm
                          ),
                        })
                      : format(t.payDepositNow, {
                          amount: formatRm(
                            payableQuotation.depositRm + stripeProcessingFeeRm
                          ),
                        })}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
      </div>
      {step !== "intro" && whatsappUrl ? (
        <DraggableWhatsAppButton href={whatsappUrl} />
      ) : null}
    </div>
  );
}