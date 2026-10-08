import { blockedDateModel } from "@/models/BlockedDate";
import { blockedSlotModel } from "@/models/BlockedSlot";
import { bookingModel } from "@/models/Booking";
import { SettingModel } from "@/models/Setting";
import type { BlockedSlot } from "@/schemas/blockedSlotSchema";
import type { Booking } from "@/schemas/bookingSchema";
import type { TimeSlot } from "@/schemas/settingSchema";
import { getTravelBufferDateKeys } from "@/utils/booking/travelBuffer";
import { formatDate } from "@/utils/utils";
import {
  getOccupiedSlotsFromBookings,
  isSessionSlotTaken,
  SLOT_HOLDING_STATUSES,
  toDateKey,
  type PublicBookedSlot,
} from "@/utils/booking/availability";
import {
  buildBlockedDateSet,
  isDateBlocked,
} from "@/utils/booking/blockedDates";
import {
  getEffectiveBookingUntil,
  isPastBookingWindow,
} from "@/utils/booking/bookingWindow";
import { getSlotIndexRange } from "@/utils/booking/slots";

type SessionSlotInput = {
  date: Date | string;
  time_slot: TimeSlot;
};

const BLOCKING_BOOKING_STATUSES: Booking["status"][] = SLOT_HOLDING_STATUSES;

export function toPublicBlockedSlot(
  slot: Pick<BlockedSlot, "date" | "startTime" | "endTime">
): PublicBookedSlot {
  return { date: slot.date, startTime: slot.startTime, endTime: slot.endTime };
}

async function findSlotHoldingBookings(freelancerUserId: string) {
  return bookingModel.find({
    freelancerUserId,
    status: { $in: BLOCKING_BOOKING_STATUSES },
  });
}

export async function getOccupiedSlotsForFreelancer(
  freelancerUserId: string
): Promise<PublicBookedSlot[]> {
  return getOccupiedSlotsFromBookings(
    await findSlotHoldingBookings(freelancerUserId)
  );
}

export async function assertSessionsAvailable(
  freelancerUserId: string,
  sessions: SessionSlotInput[],
  options?: {
    requireListedSlots?: boolean;
    /** Client bookings: also reject the travel buffer days around out-of-state bookings. */
    applyTravelBuffers?: boolean;
  }
): Promise<void> {
  const sessionDateKeys = sessions
    .map((session) => toDateKey(session.date))
    .filter(Boolean);
  const [holdingBookings, blockedDocs, blockedSlotDocs, settings] =
    await Promise.all([
      findSlotHoldingBookings(freelancerUserId),
      blockedDateModel.findByUserIdAndDates(freelancerUserId, sessionDateKeys),
      blockedSlotModel.findByUserIdAndDates(freelancerUserId, sessionDateKeys),
      new SettingModel().findSettingsByUserId(freelancerUserId),
    ]);
  const occupied = [
    ...getOccupiedSlotsFromBookings(holdingBookings),
    ...blockedSlotDocs.map(toPublicBlockedSlot),
  ];
  const blockedKeys = buildBlockedDateSet(
    blockedDocs.map((doc) => doc.date)
  );
  const bufferKeys = options?.applyTravelBuffers
    ? getTravelBufferDateKeys(
        holdingBookings,
        settings?.travel.travel_buffer_regions
      )
    : new Set<string>();
  const bookingUntil = getEffectiveBookingUntil(settings);

  for (const session of sessions) {
    if (
      options?.requireListedSlots &&
      !getSlotIndexRange(session.time_slot, settings?.time_slots ?? [])
    ) {
      throw new Error(
        `${session.time_slot.startTime} – ${session.time_slot.endTime} isn't an available time slot.`
      );
    }

    if (isPastBookingWindow(session.date, bookingUntil)) {
      throw new Error(
        `${formatDate(session.date)} is outside the open booking period.`
      );
    }

    if (
      isDateBlocked(session.date, blockedKeys) ||
      bufferKeys.has(toDateKey(session.date))
    ) {
      throw new Error(
        `${formatDate(session.date)} is blocked and unavailable for booking.`
      );
    }

    if (isSessionSlotTaken(session, occupied)) {
      throw new Error(
        `The ${session.time_slot.startTime} – ${session.time_slot.endTime} slot on ${formatDate(session.date)} is no longer available.`
      );
    }
  }
}
