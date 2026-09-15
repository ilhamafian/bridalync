import { hotDateModel } from "@/models/HotDate";
import { PackageModel } from "@/models/Package";
import { SettingModel } from "@/models/Setting";
import { StyleModel } from "@/models/Style";
import type { CreateBookingRequest } from "@/schemas/bookingSchema";
import type { Package } from "@/schemas/packageSchema";
import { toIdString } from "@/schemas/objectId";
import { toDbSession } from "@/schemas/sessionSchema";
import { getFreelancerByUsername } from "@/utils/users";
import {
  applyPaymentOption,
  calculateBookingQuotation,
  requiresFullPayment,
  type BookingQuotationSummary,
} from "@/utils/booking/pricing";
import { normalizeSessionDate, toDateKey } from "@/utils/booking/availability";
import {
  buildHotDatePriceMap,
  getPackageHotDatePrice,
  getStyleHotDatePrice,
  resolveEffectivePrice,
  toHotDateLookup,
} from "@/utils/booking/hotDates";

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
  styleModel: StyleModel,
  freelancerUserId: string,
  sessionName: string,
  styleInput: NonNullable<CreateBookingRequest["sessions"][number]["style"]>,
  sessionDate: Date | string,
  hotDatePriceMap: Map<string, number>
): Promise<ResolvedSessionStyle> {
  const parsed = parseStyleVariantId(styleInput.id);
  if (!parsed) {
    throw new Error("Invalid style selection");
  }

  const styleDoc = await styleModel.findById(parsed.styleDocId);
  if (!styleDoc || toIdString(styleDoc.user_id as never) !== freelancerUserId) {
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

  if (
    effectivePrice !== styleInput.price ||
    variant.deposit !== (styleInput.deposit ?? variant.deposit)
  ) {
    throw new Error("Style pricing mismatch");
  }

  const styleName = `${styleDoc.name} — ${variant.name}`;

  return {
    styleId: styleInput.id,
    styleName,
    lineItemName: `${sessionName} — ${styleName}`,
    price: effectivePrice,
    deposit: variant.deposit,
  };
}

function validatePackageSelection(
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

export async function resolveBookingQuotation(
  freelancerUserId: string,
  input: CreateBookingRequest,
  options?: { relaxPaymentDeadline?: boolean }
): Promise<{
  invoice: BookingQuotationSummary;
  packageNames: string;
  resolvedSessionStyles: Map<string, ResolvedSessionStyle>;
  paymentOption: "deposit" | "full";
}> {
  const packageModel = new PackageModel();
  const settingsModel = new SettingModel();
  const styleModel = new StyleModel();

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

  validatePackageSelection(input, packagesById);

  const sessionDateKeys = input.sessions
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
  const sessionByPackageId = new Map(
    input.sessions.map((session) => [session.packageId, session] as const)
  );
  const selectedPackages = input.packageIds.map((packageId) => {
    const pkg = packagesById.get(packageId)!;
    const session = sessionByPackageId.get(packageId);
    const catalogPrice = pkg.price ?? 0;
    const overridePrice = session
      ? getPackageHotDatePrice(hotDatePriceMap, session.date, packageId)
      : undefined;

    return {
      name: pkg.name,
      price: resolveEffectivePrice(catalogPrice, overridePrice),
      deposit: chargeBy === "style" ? 0 : (pkg.deposit ?? 0),
    };
  });

  const resolvedSessionStyles = new Map<string, ResolvedSessionStyle>();
  let selectedSessionStyles:
    | Array<{ name: string; price: number; deposit: number }>
    | undefined;

  if (chargeBy === "style") {
    selectedSessionStyles = [];
    for (const session of input.sessions) {
      if (!session.style) {
        throw new Error("Style is required for each session");
      }
      const resolved = await resolveSessionStyle(
        styleModel,
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
      });
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
    travel: settings.travel.enabled
      ? {
          enabled: true,
          ratePerKm: settings.travel.rate_per_km,
          timeSlots: settings.time_slots,
          sessions: input.sessions,
          distanceKmBySessionKey: input.distanceKmBySessionKey ?? {},
        }
      : undefined,
  });

  const balanceDueBeforeDays = settings.payment?.balance_due_before ?? 3;
  const mustPayFull = requiresFullPayment(
    input.sessions,
    balanceDueBeforeDays
  );
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

  return {
    invoice: applyPaymentOption(quotation, paymentOption),
    packageNames: selectedPackages.map((pkg) => pkg.name).join(", "),
    resolvedSessionStyles,
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

export function mapSessionsForStorage(
  input: CreateBookingRequest,
  resolvedSessionStyles: Map<
    string,
    {
      styleId: string;
      styleName: string;
    }
  > = new Map()
) {
  return input.sessions.map((session) => {
    const resolvedStyle = resolvedSessionStyles.get(session.client_key);

    return {
      ...toDbSession({
        ...session,
        date: normalizeSessionDate(session.date),
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
