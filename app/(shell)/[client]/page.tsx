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
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
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
import type { PublicReview } from "@/schemas/reviewSchema";
import type { SessionForm } from "@/schemas/sessionSchema";
import type { PublicSetting, TimeSlot } from "@/schemas/settingSchema";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Image from "next/image";
import { useParams } from "next/navigation";
import {
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
  const { t, format, locale, dateFnsLocale } = useLocale();
  const client = params.client as string;
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<BookingStep>("intro");
  const [clientPackages, setClientPackages] = useState<ClientPackage[]>([]);
  const [styles, setStyles] = useState<ClientStyleCategory[]>([]);
  const [addOns, setAddOns] = useState<AddOn[]>([]);
  const [settings, setSettings] = useState<PublicSetting | null>(null);
  const [bookedSlots, setBookedSlots] = useState<PublicBookedSlot[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [user, setUser] = useState<PublicProfile | null>(null);
  const [reviews, setReviews] = useState<PublicReview[]>([]);
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
    "full"
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
                imageSrc: variant.image_url,
              })),
          };
        })
        .filter((style) => style.id.length > 0),
    [styles]
  );

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
      setUser(data.user as PublicProfile);
      setReviews((data.reviews as PublicReview[] | undefined) ?? []);
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
    setSameLocationForAll(true);
    setSelectedStyleCategoryId(null);
    setSelectedVariantId(null);
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

    // Single-session packages: add and continue — no separate Next click.
    if (sessionTemplates.length === 1) {
      goToNextStep();
    }
  }

  function handleRemoveSession(clientKey: string) {
    setSessions((current) => {
      const removed = current.find((session) => session.client_key === clientKey);
      if (!removed) return current;

      return current.filter((session) => session.order < removed.order);
    });
  }

  const isSingleSessionPackage = sessionTemplates.length === 1;

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
      <AnimatedFlow
        variant="blush"
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
            {settings?.invoice.company_logo ? (
              <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center px-20">
                <div className="relative aspect-video h-9">
                  <Image
                    src={settings.invoice.company_logo}
                    alt={settings.invoice.company_name || "Company logo"}
                    fill
                    className="object-contain"
                    sizes="144px"
                    priority
                  />
                </div>
              </div>
            ) : null}
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
                      {t[progressStep.titleKey]}
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
        <ClientProfile user={user} reviews={reviews} onBookNow={goToNextStep} />
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
              disabled={!selectedPackageId}
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
              isSingleSessionPackage ? "mb-6" : "mb-2"
            )}
          >
            {nextSessionTemplate
              ? format(t.bookSession, { sessionName: nextSessionTemplate.name })
              : t.allSessionsScheduled}
          </h1>
          {!isSingleSessionPackage && (
            <p className="mb-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
              {format(t.sessionsScheduledCount, {
                scheduled: sessions.length,
                total: sessionTemplates.length,
              })}
            </p>
          )}

          <div className="flex w-full flex-col items-end gap-4">
            {nextSessionTemplate && (
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
                    ]}
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
                          selectedTimeSlot?.startTime === slot.startTime &&
                            selectedTimeSlot?.endTime === slot.endTime &&
                            "bg-rose-800 text-white hover:bg-rose-800/90 hover:text-white",
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
                        {t.allSlotsBooked}
                      </p>
                    )}
                </CardFooter>
              </Card>
            )}

            {(!isSingleSessionPackage || allSessionsScheduled) && (
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
              {nextSessionTemplate && (
                <Button
                  type="button"
                  variant={isSingleSessionPackage ? "default" : "outline"}
                  size="lg"
                  className={
                    isSingleSessionPackage
                      ? "bg-rose-800 text-white hover:bg-rose-800/90"
                      : undefined
                  }
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
                  {format(t.addSession, {
                    sessionName: nextSessionTemplate.name,
                  })}
                </Button>
              )}
              {(!isSingleSessionPackage || allSessionsScheduled) && (
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

            <Button
              size="lg"
              className="bg-rose-800 text-white hover:bg-rose-800/90"
              disabled={!allLocationsSet}
              onClick={goToNextStep}
            >
              {t.next}
              <ChevronRightIcon />
            </Button>
          </div>
        </div>
      )}
      {step === "style" && (
        <div className="flex w-full max-w-md flex-1 flex-col items-center justify-center">
          <h1 className="mb-4 max-w-md text-center text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {t.chooseStyle}
          </h1>
          <p className="mb-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
            {t.chooseStyleHelper}
          </p>
          <div className="flex w-full flex-col items-end gap-4">
            <div className="mx-auto w-full max-w-sm px-2">
              <BookingStylePicker
                categories={styleCategories}
                selectedCategoryId={selectedStyleCategoryId}
                selectedVariantId={selectedVariantId}
                onCategoryChange={setSelectedStyleCategoryId}
                onVariantChange={setSelectedVariantId}
              />
            </div>
            <div className="flex w-full justify-end">
              <Button
                size="lg"
                className="bg-rose-800 text-white hover:bg-rose-800/90"
                disabled={!selectedVariantId}
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
                      amount: formatRm(payableQuotation.totalRm),
                    })
                  : format(t.payDepositNow, {
                      amount: formatRm(payableQuotation.depositRm),
                    })}
            </Button>
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