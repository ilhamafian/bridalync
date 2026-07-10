import { PackageModel } from "@/models/Package";
import { SettingModel } from "@/models/Setting";
import { StyleModel } from "@/models/Style";
import type { CreateBookingRequest } from "@/schemas/bookingSchema";
import { toIdString } from "@/schemas/objectId";
import { toDbSession } from "@/schemas/sessionSchema";
import { getFreelancerByUsername } from "@/utils/users";
import {
  applyPaymentOption,
  calculateBookingQuotation,
  requiresFullPayment,
  type BookingQuotationSummary,
} from "@/utils/booking/pricing";

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

export async function resolveBookingQuotation(
  freelancerUserId: string,
  input: CreateBookingRequest,
  options?: { relaxPaymentDeadline?: boolean }
): Promise<{
  invoice: BookingQuotationSummary;
  packageName: string;
  styleId: string | null;
  styleName: string | null;
  paymentOption: "deposit" | "full";
}> {
  const packageModel = new PackageModel();
  const settingsModel = new SettingModel();
  const styleModel = new StyleModel();

  const [pkg, settings] = await Promise.all([
    packageModel.findById(input.packageId),
    settingsModel.findSettingsByUserId(freelancerUserId),
  ]);

  if (!pkg || toIdString(pkg.user_id as never) !== freelancerUserId) {
    throw new Error("Package not found");
  }

  if (!settings) {
    throw new Error("Freelancer settings not found");
  }

  const chargeBy = settings.charge_by ?? "package";

  if (chargeBy === "style" && !input.style) {
    throw new Error("Style is required");
  }

  let selectedStyle: {
    name: string;
    price: number;
    deposit: number;
  } | null = null;
  let styleId: string | null = null;
  let styleName: string | null = null;

  if (chargeBy === "style" && input.style) {
    const parsed = parseStyleVariantId(input.style.id);
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

    if (
      variant.price !== input.style.price ||
      variant.deposit !== (input.style.deposit ?? variant.deposit)
    ) {
      throw new Error("Style pricing mismatch");
    }

    selectedStyle = {
      name: variant.name,
      price: variant.price,
      deposit: variant.deposit,
    };
    styleId = input.style.id;
    styleName = `${styleDoc.name} — ${variant.name}`;
  }

  const quotation = calculateBookingQuotation({
    chargeBy,
    selectedPackage: {
      name: pkg.name,
      price: pkg.price ?? 0,
      deposit: chargeBy === "style" ? 0 : (pkg.deposit ?? 0),
    },
    selectedStyle,
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
    packageName: pkg.name,
    styleId,
    styleName,
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

export function mapSessionsForStorage(input: CreateBookingRequest) {
  return input.sessions.map((session) => ({
    ...toDbSession(session),
    client_key: session.client_key,
  }));
}
