import type { Booking, CreateBookingRequest, PersistedBooking } from "@/schemas/bookingSchema";
import type { TimeSlot } from "@/schemas/settingSchema";
import { assertSessionsAvailable } from "@/utils/booking/availability.server";
import {
  applyCollectedToInvoice,
  getCollectedRm,
  getPlatformFeeCollectedRm,
  retainedRm,
} from "@/utils/booking/clientEdits";
import { getBookingPax } from "@/utils/booking/clientInfo";
import { resolveBookingQuotation } from "@/utils/booking/createBooking";
import { roundSen, type BookingQuotationSummary } from "@/utils/booking/pricing";

export type ScheduleSessionChange = {
  client_key: string;
  date: Date;
  time_slot: TimeSlot;
  ready_by?: string;
};

export type ScheduleQuote = {
  invoice: BookingQuotationSummary;
  paymentOption: "deposit" | "full";
  sessions: Awaited<ReturnType<typeof resolveBookingQuotation>>["sessions"];
  packageNames: string;
  dayMode?: Booking["dayMode"];
  collectedRm: number;
  totalRm: number;
  previousTotalRm: number;
  dueRm: number;
  retainedRm: number;
  /** Set on save when the client has already paid, so the next edit keeps this figure. */
  storeCollected: boolean;
  platformFeeCollectedRm: number;
};

function sessionKey(session: { client_key?: string }, index: number) {
  return session.client_key ?? String(index);
}

export async function quoteClientSchedule(
  booking: PersistedBooking,
  changes: ScheduleSessionChange[]
): Promise<ScheduleQuote> {
  if (changes.length !== booking.sessions.length) {
    throw new Error("Schedule every session of this booking.");
  }

  const used = new Set<string>();
  const sessions: CreateBookingRequest["sessions"] = booking.sessions.map(
    (session, index) => {
      const key = sessionKey(session, index);
      const change = changes.find((item) => item.client_key === key);
      if (!change || used.has(key)) {
        throw new Error("Schedule every session of this booking.");
      }
      used.add(key);
      if (!session.location) {
        throw new Error(
          "This booking can't be rescheduled from the link. Contact the stylist."
        );
      }
      if (!booking.customEvent && !change.ready_by) {
        throw new Error("Every session needs a ready-by time.");
      }
      return {
        client_key: key,
        status: "scheduled" as const,
        name: session.name,
        packageId: session.packageId,
        order: session.order,
        date: change.date,
        time_slot: change.time_slot,
        ...(change.ready_by ? { ready_by: change.ready_by } : {}),
        location: session.location,
        ...(session.styleId
          ? {
              style: {
                id: session.styleId,
                name: session.styleName ?? "Style",
                price: 0,
                deposit: 0,
              },
            }
          : {}),
      };
    }
  );

  await assertSessionsAvailable(booking.freelancerUserId, sessions, {
    requireListedSlots: !booking.customEvent,
    applyTravelBuffers: true,
    excludeBookingId: String(booking._id),
  });

  const paymentOption = booking.paymentOption ?? "deposit";
  const input: CreateBookingRequest = {
    freelancerUsername: booking.freelancerUsername,
    intent: "booking",
    contact: booking.contact,
    pax: getBookingPax(booking),
    packageIds: booking.packageIds,
    addOns: (booking.addOnIds ?? []).map((id) => ({
      id,
      name: "",
      price: 0,
    })),
    sessions,
    paymentOption,
  };
  const feeOptions = {
    relaxPaymentDeadline: true,
    legacy: !booking.dayMode && !booking.customEvent,
    processingFee: Boolean(booking.invoice.breakdown?.processingFeeRm),
    platformFee: Boolean(booking.invoice.breakdown?.platformFeeRm),
    acceptCatalogPrice: true,
    customEvent: booking.customEvent ?? null,
    customAddOns: booking.customAddOns,
  };

  const discountRm = booking.invoice.breakdown?.discountRm ?? 0;
  let quoted: Awaited<ReturnType<typeof resolveBookingQuotation>>;
  if (discountRm > 0) {
    // Discount is applied to the pre-payment-option total, which the deposit quote is.
    const gross = await resolveBookingQuotation(
      booking.freelancerUserId,
      { ...input, paymentOption: "deposit" },
      feeOptions
    );
    const target = Math.max(0, roundSen(gross.invoice.totalRm - discountRm));
    quoted = await resolveBookingQuotation(booking.freelancerUserId, input, {
      ...feeOptions,
      discountedTotalRm: target,
    });
  } else {
    quoted = await resolveBookingQuotation(
      booking.freelancerUserId,
      input,
      feeOptions
    );
  }

  const collected = getCollectedRm(booking);
  const platformFeeCollected = getPlatformFeeCollectedRm(booking);
  // Confirmed bookings keep the amount already paid, even when that amount is zero,
  // so a higher new total is charged as a balance instead of looking already settled.
  const alreadyPaid =
    booking.status === "confirmed" || booking.status === "completed";
  const priced = alreadyPaid
    ? applyCollectedToInvoice(quoted.invoice, collected, platformFeeCollected)
    : { invoice: quoted.invoice, paymentOption: quoted.paymentOption };

  return {
    invoice: priced.invoice,
    paymentOption: priced.paymentOption,
    sessions: quoted.sessions,
    packageNames: quoted.packageNames,
    dayMode: quoted.dayMode,
    collectedRm: collected,
    totalRm: priced.invoice.totalRm,
    previousTotalRm: booking.invoice.totalRm,
    dueRm: alreadyPaid ? priced.invoice.balanceRm : 0,
    retainedRm: alreadyPaid ? retainedRm(collected, priced.invoice.totalRm) : 0,
    storeCollected: alreadyPaid,
    platformFeeCollectedRm: platformFeeCollected,
  };
}
