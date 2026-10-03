import { blockedDateModel } from "@/models/BlockedDate";
import { blockedSlotModel } from "@/models/BlockedSlot";
import { bookingModel } from "@/models/Booking";
import { SettingModel } from "@/models/Setting";
import type { BlockedSlot } from "@/schemas/blockedSlotSchema";
import type { Booking } from "@/schemas/bookingSchema";
import type { TimeSlot } from "@/schemas/settingSchema";
import { formatDate } from "@/utils/utils";
import {
  getOccupiedSlotsFromBookings,
  isSessionSlotTaken,
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

type SessionSlotInput = {
  date: Date | string;
  time_slot: TimeSlot;
};

const BLOCKING_BOOKING_STATUSES: Booking["status"][] = [
  "pending",
  "confirmed",
  "completed",
];

export function toPublicBlockedSlot(
  slot: Pick<BlockedSlot, "date" | "startTime" | "endTime">
): PublicBookedSlot {
  return { date: slot.date, startTime: slot.startTime, endTime: slot.endTime };
}

export async function getOccupiedSlotsForFreelancer(
  freelancerUserId: string
): Promise<PublicBookedSlot[]> {
  const bookings = await bookingModel.find({
    freelancerUserId,
    status: { $in: BLOCKING_BOOKING_STATUSES },
  });

  return getOccupiedSlotsFromBookings(bookings);
}

export async function assertSessionsAvailable(
  freelancerUserId: string,
  sessions: SessionSlotInput[]
): Promise<void> {
  const sessionDateKeys = sessions
    .map((session) => toDateKey(session.date))
    .filter(Boolean);
  const [bookedSlots, blockedDocs, blockedSlotDocs, settings] =
    await Promise.all([
      getOccupiedSlotsForFreelancer(freelancerUserId),
      blockedDateModel.findByUserIdAndDates(freelancerUserId, sessionDateKeys),
      blockedSlotModel.findByUserIdAndDates(freelancerUserId, sessionDateKeys),
      new SettingModel().findSettingsByUserId(freelancerUserId),
    ]);
  const occupied = [...bookedSlots, ...blockedSlotDocs.map(toPublicBlockedSlot)];
  const blockedKeys = buildBlockedDateSet(
    blockedDocs.map((doc) => doc.date)
  );
  const bookingUntil = getEffectiveBookingUntil(settings);

  for (const session of sessions) {
    if (isPastBookingWindow(session.date, bookingUntil)) {
      throw new Error(
        `${formatDate(session.date)} is outside the open booking period.`
      );
    }

    if (isDateBlocked(session.date, blockedKeys)) {
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
