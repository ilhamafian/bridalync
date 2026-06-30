import { ObjectId } from "mongodb";
import { z } from "zod";

import { bookingModel } from "@/models/Booking";
import {
  bookingRecordSchema,
  type BookingRecord,
} from "@/schemas/booking-record";

export async function getBookingById(id: string): Promise<BookingRecord | null> {
  if (!ObjectId.isValid(id)) return null;

  const doc = await bookingModel.findById(id);
  if (!doc) return null;

  return doc as BookingRecord;
}

const bookingStatusUpdateSchema = bookingRecordSchema.pick({ status: true });

export async function updateBookingStatus(
  id: string,
  status: BookingRecord["status"]
) {
  if (!ObjectId.isValid(id)) return null;

  await bookingModel.update(id, { status }, bookingStatusUpdateSchema);
  return getBookingById(id);
}
