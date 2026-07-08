import { ObjectId } from "mongodb";

import { bookingModel } from "@/models/Booking";
import { UserModel } from "@/models/User";
import {
  bookingRecordSchema,
  type BookingRecord,
  type PersistedBookingRecord,
} from "@/schemas/bookingRecord";

export async function getBookingById(
  id: string
): Promise<PersistedBookingRecord | null> {
  if (!ObjectId.isValid(id)) return null;

  const doc = await bookingModel.findById(id);
  if (!doc) return null;

  return doc as PersistedBookingRecord;
}

const bookingStatusUpdateSchema = bookingRecordSchema.pick({ status: true });
const bookingPaymentUpdateSchema = bookingRecordSchema.pick({
  status: true,
  stripePaymentIntentId: true,
});

export async function updateBookingStatus(
  id: string,
  status: BookingRecord["status"]
) {
  if (!ObjectId.isValid(id)) return null;

  await bookingModel.update(id, { status }, bookingStatusUpdateSchema);
  return getBookingById(id);
}

export async function confirmBookingPayment(
  bookingId: string,
  paymentIntentId?: string | null
) {
  if (!ObjectId.isValid(bookingId)) return null;

  const existing = await getBookingById(bookingId);
  if (!existing) return null;
  if (existing.status === "confirmed") return existing;

  await bookingModel.update(
    bookingId,
    {
      status: "confirmed",
      ...(paymentIntentId ? { stripePaymentIntentId: paymentIntentId } : {}),
    },
    bookingPaymentUpdateSchema
  );

  const booking = await getBookingById(bookingId);
  if (booking?.freelancerUserId && booking.invoice.depositRm > 0) {
    await new UserModel().recordDeferredEarning(
      booking.freelancerUserId,
      booking.invoice.depositRm
    );
  }

  return booking;
}

export async function markBookingPaymentFailed(bookingId: string) {
  if (!ObjectId.isValid(bookingId)) return null;

  await bookingModel.update(
    bookingId,
    { status: "failed" },
    bookingStatusUpdateSchema
  );

  return getBookingById(bookingId);
}
