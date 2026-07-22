import { bookingModel } from "@/models/Booking";
import type { Booking } from "@/schemas/bookingSchema";
import type { TimeSlot } from "@/schemas/settingSchema";
import { formatDate } from "@/utils/utils";
import {
  getOccupiedSlotsFromBookings,
  isSessionSlotTaken,
  type PublicBookedSlot,
} from "@/utils/booking/availability";

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
  const occupied = await getOccupiedSlotsForFreelancer(freelancerUserId);

  for (const session of sessions) {
    if (isSessionSlotTaken(session, occupied)) {
      throw new Error(
        `The ${session.time_slot.startTime} – ${session.time_slot.endTime} slot on ${formatDate(session.date)} is no longer available.`
      );
    }
  }
}
