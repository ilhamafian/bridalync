import { hotDateModel } from "@/models/HotDate";
import { PackageModel } from "@/models/Package";
import { SettingModel } from "@/models/Setting";
import type { CreateBookingRequest } from "@/schemas/bookingSchema";
import type { Package, PackageDayMode } from "@/schemas/packageSchema";
import { toIdString } from "@/schemas/objectId";
import { toDbSession } from "@/schemas/sessionSchema";
import type { RegionId, TimeSlot } from "@/schemas/settingSchema";
import { getFreelancerByUsername } from "@/utils/users";
import {
  applyDiscountedTotal,
  applyPaymentOption,
  calculateBookingQuotation,
  requiresFullPayment,
  resolveDepositRm,
  type BookingQuotationSummary,
  type TravelQuotationInput,
} from "@/utils/booking/pricing";
import { resolveSessionRegions } from "@/utils/booking/region.server";
import {
  getBookingRegionPrice,
  getRegionEventPrice,
  getTravelPricing,
} from "@/utils/booking/regions";
import { normalizeSessionDate, toDateKey } from "@/utils/booking/availability";
import {
  getDayModeError,
  getEventDayMode,
  getEventSessions,
  hasOverlappingSessions,
} from "@/utils/booking/events";
import { resolveSessionDistancesKm } from "@/utils/booking/roadDistance.server";
import { countSessionSlots } from "@/utils/booking/slots";
import { findCatalogStyle } from "@/utils/booking/styleCatalog.server";
import {
  buildHotDatePriceMap,
  getEventHotDatePrice,
  getPackageHotDatePrice,
  getStyleHotDatePrice,
  resolveEffectivePrice,
  toHotDateLookup,
} from "@/utils/booking/hotDates";

type BookingSessionInput = CreateBookingRequest["sessions"][number];

function parseStyleVariantId(id: string): {
  styleDocId: string;
  variantOrder: number;
} | null {
  const separatorIndex = id.lastIndexOf(":");
  if (separatorIndex === -1) return null;

  const styleDocId = id.slice(0, separatorIndex);
  const variantOrder = Number.parseInt(id.slice(separatorIndex + 1), 10);
  if (!styleDocId || Number.isNaN(variantOrder)) return null;

  return { styleDocId, variantOrder };
}

type ResolvedSessionStyle = {
  styleId: string;
  styleName: string;
  lineItemName: string;
  price: number;
  deposit: number;
};

async function resolveSessionStyle(
  freelancerUserId: string,
  sessionName: string,
  styleInput: NonNullable<BookingSessionInput["style"]>,
  sessionDate: Date | string,
  hotDatePriceMap: Map<string, number>
): Promise<ResolvedSessionStyle> {
  const parsed = parseStyleVariantId(styleInput.id);
  if (!parsed) {
    throw new Error("Invalid style selection");
  }

  const styleDoc = await findCatalogStyle(parsed.styleDocId);
  if (!styleDoc || styleDoc.user_id !== freelancerUserId) {
    throw new Error("Style not found");
  }

  const variant = styleDoc.variants.find(
    (item) => item.order === parsed.variantOrder
  );
  if (!variant) {
    throw new Error("Style variant not found");
  }

  const effectivePrice = resolveEffectivePrice(
    variant.price,
    getStyleHotDatePrice(
      hotDatePriceMap,
      sessionDate,
      parsed.styleDocId,
      parsed.variantOrder
    )
  );

  if (effectivePrice !== styleInput.price) {
    throw new Error("Style pricing mismatch");
  }

  const styleName = `${styleDoc.name} — ${variant.name}`;

  return {
    styleId: styleInput.id,
    styleName,
    lineItemName: `${sessionName} — ${styleName}`,
    price: effectivePrice,
    deposit: resolveDepositRm(
      variant.deposit,
      variant.deposit_type,
      effectivePrice
    ),
  };
}

/** A look picked while charging by event: stored on the session, not priced. */
async function resolveUnpricedSessionStyle(
  freelancerUserId: string,
  styleInput: NonNullable<BookingSessionInput["style"]>
): Promise<Pick<ResolvedSessionStyle, "styleId" | "styleName">> {
  const parsed = parseStyleVariantId(styleInput.id);
  if (!parsed) {
    throw new Error("Invalid style selection");
  }

  const styleDoc = await findCatalogStyle(parsed.styleDocId);
  if (!styleDoc || styleDoc.user_id !== freelancerUserId) {
    throw new Error("Style not found");
  }

  const variant = styleDoc.variants.find(
    (item) => item.order === parsed.variantOrder
  );
  if (!variant) {
    throw new Error("Style variant not found");
  }

  return {
    styleId: styleInput.id,
    styleName: `${styleDoc.name} — ${variant.name}`,
  };
}

/** Bookings made before multi-session events: several events, one session each. */
function validateLegacyPackageSelection(
  input: CreateBookingRequest,
  packagesById: Map<string, Package>
) {
  if (input.packageIds.length === 0) {
    throw new Error("At least one package is required");
  }

  const uniquePackageIds = new Set(input.packageIds);
  if (uniquePackageIds.size !== input.packageIds.length) {
    throw new Error("Duplicate package selection");
  }

  for (const packageId of input.packageIds) {
    const pkg = packagesById.get(packageId);
    if (!pkg) {
      throw new Error("Package not found");
    }
  }

  if (input.sessions.length !== input.packageIds.length) {
    throw new Error("Each selected package needs one scheduled session");
  }

  const packageIdSet = new Set(input.packageIds);
  const scheduledPackageIds = new Set<string>();

  for (const session of input.sessions) {
    if (!packageIdSet.has(session.packageId)) {
      throw new Error("Session package mismatch");
    }
    if (scheduledPackageIds.has(session.packageId)) {
      throw new Error("Each selected package can only have one session");
    }
    scheduledPackageIds.add(session.packageId);
  }
}

/**
 * One event per booking: every session of the event scheduled once, one time slot each,
 * dates following the event's day rule. Returns the sessions in event order, named by the event.
 */
function validateEventSessions(
  input: CreateBookingRequest,
  packageId: string,
  pkg: Package,
  timeSlots: TimeSlot[]
): BookingSessionInput[] {
  const eventSessions = getEventSessions(pkg);
  if (input.sessions.length !== eventSessions.length) {
    throw new Error("Schedule every session of this event.");
  }

  const ordered = [...input.sessions].sort((a, b) => a.order - b.order);
  for (const session of ordered) {
    if (session.packageId !== packageId) {
      throw new Error("Session event mismatch");
    }
    if (countSessionSlots(session.time_slot, timeSlots) > 1) {
      throw new Error("Each session can only use one time slot.");
    }
  }

  const dayModeError = getDayModeError(
    getEventDayMode(pkg),
    ordered.map((session) => session.date)
  );
  if (dayModeError) {
    throw new Error(dayModeError);
  }
  if (hasOverlappingSessions(ordered)) {
    throw new Error("Sessions in the same booking can't overlap.");
  }

  return ordered.map((session, index) => ({
    ...session,
    name: eventSessions[index].name,
    order: index,
  }));
}

function mapSessionsForStorage(
  sessions: BookingSessionInput[],
  resolvedSessionStyles: Map<string, Pick<ResolvedSessionStyle, "styleId" | "styleName">>,
  slotCountBySessionKey: Map<string, number>
) {
  return sessions.map((session) => {
    const resolvedStyle = resolvedSessionStyles.get(session.client_key);
    const slotCount = slotCountBySessionKey.get(session.client_key) ?? 1;

    return {
      ...toDbSession({
        ...session,
        date: normalizeSessionDate(session.date),
        ...(slotCount > 1 ? { slot_count: slotCount } : {}),
        ...(resolvedStyle
          ? {
              styleId: resolvedStyle.styleId,
              styleName: resolvedStyle.styleName,
            }
          : {}),
      }),
      client_key: session.client_key,
    };
  });
}

export async function resolveBookingQuotation(
  freelancerUserId: string,
  input: CreateBookingRequest,
  options?: {
    relaxPaymentDeadline?: boolean;
    discountedTotalRm?: number;
    /** Editing a booking made before multi-session events: keep its old rules and pricing. */
    legacy?: boolean;
  }
): Promise<{
  invoice: BookingQuotationSummary;
  packageNames: string;
  /** Ready to store on the booking. */
  sessions: ReturnType<typeof mapSessionsForStorage>;
  /** Missing for legacy bookings. */
  dayMode?: PackageDayMode;
  paymentOption: "deposit" | "full";
}> {
  const legacy = options?.legacy === true;
  if (!legacy && input.packageIds.length !== 1) {
    throw new Error("Choose one event per booking.");
  }

  const packageModel = new PackageModel();
  const settingsModel = new SettingModel();

  const [loadedPackages, settings] = await Promise.all([
    Promise.all(input.packageIds.map((id) => packageModel.findById(id))),
    settingsModel.findSettingsByUserId(freelancerUserId),
  ]);

  if (!settings) {
    throw new Error("Freelancer settings not found");
  }

  const packagesById = new Map<string, Package>();
  for (const pkg of loadedPackages) {
    if (!pkg || toIdString(pkg.user_id as never) !== freelancerUserId) {
      throw new Error("Package not found");
    }
    const id = toIdString(pkg._id as never);
    if (!id) {
      throw new Error("Package not found");
    }
    packagesById.set(id, pkg);
  }

  const eventId = input.packageIds[0];
  const event = packagesById.get(eventId);
  let sessions: BookingSessionInput[];
  if (legacy) {
    validateLegacyPackageSelection(input, packagesById);
    sessions = input.sessions;
  } else {
    if (!event) {
      throw new Error("Package not found");
    }
    sessions = validateEventSessions(input, eventId, event, settings.time_slots);
  }

  const sessionDateKeys = sessions
    .map((session) => toDateKey(session.date))
    .filter(Boolean);
  const hotDateDocs = await hotDateModel.findByUserIdAndDates(
    freelancerUserId,
    sessionDateKeys
  );
  const hotDatePriceMap = buildHotDatePriceMap(
    hotDateDocs.map((doc) => toHotDateLookup(doc))
  );

  const chargeBy = settings.charge_by ?? "package";
  const slotCountBySessionKey = new Map(
    sessions.map(
      (session) =>
        [
          session.client_key,
          countSessionSlots(session.time_slot, settings.time_slots),
        ] as const
    )
  );

  let selectedPackages: Array<{
    name: string;
    price: number;
    deposit: number;
    sessionKey?: string;
    slotCount?: number;
  }>;
  if (legacy) {
    const sessionByPackageId = new Map(
      sessions.map((session) => [session.packageId, session] as const)
    );
    selectedPackages = input.packageIds.map((packageId) => {
      const pkg = packagesById.get(packageId)!;
      const session = sessionByPackageId.get(packageId);
      const overridePrice = session
        ? getPackageHotDatePrice(hotDatePriceMap, session.date, packageId)
        : undefined;

      const price = resolveEffectivePrice(pkg.price ?? 0, overridePrice);
      return {
        name: pkg.name,
        price,
        deposit:
          chargeBy === "style"
            ? 0
            : resolveDepositRm(pkg.deposit, pkg.deposit_type, price),
        sessionKey: session?.client_key,
        slotCount: session ? slotCountBySessionKey.get(session.client_key) : 1,
      };
    });
  } else {
    selectedPackages = [
      {
        name: event!.name,
        price: resolveEffectivePrice(
          event!.price ?? 0,
          getEventHotDatePrice(
            hotDatePriceMap,
            sessions.map((session) => session.date),
            eventId
          )
        ),
        deposit: chargeBy === "style" ? 0 : (event!.deposit ?? 0),
      },
    ];
  }

  const resolvedSessionStyles = new Map<
    string,
    Pick<ResolvedSessionStyle, "styleId" | "styleName">
  >();
  let selectedSessionStyles:
    | Array<{
        name: string;
        price: number;
        deposit: number;
        sessionKey: string;
        slotCount?: number;
      }>
    | undefined;

  if (chargeBy === "style") {
    selectedSessionStyles = [];
    for (const session of sessions) {
      if (!session.style) {
        throw new Error("Style is required for each session");
      }
      const resolved = await resolveSessionStyle(
        freelancerUserId,
        session.name,
        session.style,
        session.date,
        hotDatePriceMap
      );
      resolvedSessionStyles.set(session.client_key, resolved);
      selectedSessionStyles.push({
        name: resolved.lineItemName,
        price: resolved.price,
        deposit: resolved.deposit,
        sessionKey: session.client_key,
        slotCount: slotCountBySessionKey.get(session.client_key),
      });
    }
  } else {
    for (const session of sessions) {
      if (!session.style) continue;
      resolvedSessionStyles.set(
        session.client_key,
        await resolveUnpricedSessionStyle(freelancerUserId, session.style)
      );
    }
  }

  const travelPricing = getTravelPricing(settings.travel, chargeBy);
  let regionTravel: TravelQuotationInput | undefined;
  if (
    travelPricing.kind === "region_fixed" ||
    travelPricing.kind === "region_per_event"
  ) {
    let regionsBySessionKey: Record<string, RegionId | null>;
    try {
      regionsBySessionKey = await resolveSessionRegions(sessions);
    } catch (error) {
      console.error("Venue region lookup failed:", error);
      throw new Error(
        "We couldn't check the venue's state right now. Please try again."
      );
    }
    const regions = sessions
      .filter((session) => session.location)
      .map((session) => regionsBySessionKey[session.client_key] ?? null);

    if (travelPricing.kind === "region_fixed") {
      const result = getBookingRegionPrice(regions, travelPricing.prices);
      if (result && !result.ok) throw new Error(result.error);
      if (result?.ok) {
        regionTravel = { kind: "region", feeRm: result.priceRm };
      }
    } else if (!legacy && event) {
      const result = getBookingRegionPrice(regions, event.region_prices);
      if (result && !result.ok) throw new Error(result.error);
      if (result?.ok) {
        selectedPackages[0].price = getRegionEventPrice(
          result.priceRm,
          getEventHotDatePrice(
            hotDatePriceMap,
            sessions.map((session) => session.date),
            eventId
          )
        );
      }
    }
  }

  if (!legacy && event && chargeBy !== "style") {
    selectedPackages[0].deposit = resolveDepositRm(
      event.deposit,
      event.deposit_type,
      selectedPackages[0].price
    );
  }

  let distanceKmBySessionKey: Record<string, number> = {};
  if (travelPricing.kind === "distance") {
    try {
      distanceKmBySessionKey = await resolveSessionDistancesKm(
        settings.travel.location.location,
        sessions
      );
    } catch (error) {
      console.error("Travel distance lookup failed:", error);
      throw new Error(
        "We couldn't calculate the travel fee right now. Please try again."
      );
    }
  }

  const quotation = calculateBookingQuotation({
    chargeBy,
    selectedPackages,
    selectedSessionStyles,
    selectedAddOns: input.addOns.map((addOn) => ({
      name: addOn.name,
      price: addOn.price,
    })),
    travel:
      travelPricing.kind === "distance"
        ? {
            enabled: true,
            ratePerKm: settings.travel.rate_per_km,
            longDistanceRatePerKm: settings.travel.long_distance_rate_per_km,
            timeSlots: settings.time_slots,
            sessions,
            distanceKmBySessionKey,
          }
        : regionTravel,
  });

  const balanceDueBeforeDays = settings.payment?.balance_due_before ?? 3;
  const mustPayFull = requiresFullPayment(sessions, balanceDueBeforeDays);
  const paymentOption: "deposit" | "full" =
    mustPayFull || input.paymentOption === "full" ? "full" : "deposit";

  if (
    input.paymentOption === "deposit" &&
    mustPayFull &&
    !options?.relaxPaymentDeadline
  ) {
    throw new Error(
      `Full payment is required when booking within ${balanceDueBeforeDays} day${
        balanceDueBeforeDays === 1 ? "" : "s"
      } of your session.`
    );
  }

  const discounted =
    options?.discountedTotalRm !== undefined
      ? applyDiscountedTotal(quotation, options.discountedTotalRm)
      : quotation;

  return {
    invoice: applyPaymentOption(discounted, paymentOption),
    packageNames: selectedPackages.map((pkg) => pkg.name).join(", "),
    sessions: mapSessionsForStorage(
      sessions,
      resolvedSessionStyles,
      slotCountBySessionKey
    ),
    ...(legacy || !event ? {} : { dayMode: getEventDayMode(event) }),
    paymentOption,
  };
}

export async function resolveFreelancerForBooking(username: string) {
  const user = await getFreelancerByUsername(username);
  if (!user?._id) {
    return null;
  }

  const userId = toIdString(user._id);
  if (!userId) {
    return null;
  }

  return { user, userId };
}
