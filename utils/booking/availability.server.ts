import { blockedDateModel } from "@/models/BlockedDate";
import { bookingModel } from "@/models/Booking";
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

type SessionSlotInput = {
  date: Date | string;
  time_slot: TimeSlot;
};

const BLOCKING_BOOKING_STATUSES: Booking["status"][] = [
  "pending",
  "confirmed",
  "completed",
];

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
  const [occupied, blockedDocs] = await Promise.all([
    getOccupiedSlotsForFreelancer(freelancerUserId),
    blockedDateModel.findByUserIdAndDates(freelancerUserId, sessionDateKeys),
  ]);
  const blockedKeys = buildBlockedDateSet(
    blockedDocs.map((doc) => doc.date)
  );

  for (const session of sessions) {
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
