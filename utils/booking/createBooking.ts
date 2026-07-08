import { PackageModel } from "@/models/Package";
import { SettingModel } from "@/models/Setting";
import type { CreateBookingRequest } from "@/schemas/bookingRecord";
import { toIdString } from "@/schemas/objectId";
import { toDbSession } from "@/schemas/sessionSchema";
import { getFreelancerByUsername } from "@/utils/users";
import {
  applyPaymentOption,
  calculateBookingQuotation,
  requiresFullPayment,
  type BookingQuotationSummary,
} from "@/utils/booking/pricing";

export async function resolveBookingQuotation(
  freelancerUserId: string,
  input: CreateBookingRequest
): Promise<{
  invoice: BookingQuotationSummary;
  packageName: string;
  paymentOption: "deposit" | "full";
}> {
  const packageModel = new PackageModel();
  const settingsModel = new SettingModel();

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
  const selectedStyle =
    chargeBy === "style" && input.style
      ? { name: input.style.name, price: input.style.price }
      : null;

  const quotation = calculateBookingQuotation({
    chargeBy,
    selectedPackage: {
      name: pkg.name,
      price: pkg.price,
      deposit: pkg.deposit,
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

  if (input.paymentOption === "deposit" && mustPayFull) {
    throw new Error(
      `Full payment is required when booking within ${balanceDueBeforeDays} day${
        balanceDueBeforeDays === 1 ? "" : "s"
      } of your session.`
    );
  }

  return {
    invoice: applyPaymentOption(quotation, paymentOption),
    packageName: pkg.name,
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
