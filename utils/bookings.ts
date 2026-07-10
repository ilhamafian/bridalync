import { ObjectId } from "mongodb";

import { bookingModel } from "@/models/Booking";
import { UserModel } from "@/models/User";
import {
  bookingSchema,
  type Booking,
  type PersistedBooking,
} from "@/schemas/bookingSchema";
import { notifyBookingConfirmed } from "@/utils/push/bookingNotifications";

export async function getBookingById(
  id: string
): Promise<PersistedBooking | null> {
  if (!ObjectId.isValid(id)) return null;

  const doc = await bookingModel.findById(id);
  if (!doc) return null;

  return doc as PersistedBooking;
}

const bookingStatusUpdateSchema = bookingSchema.pick({ status: true });
const bookingPaymentUpdateSchema = bookingSchema.pick({
  status: true,
  stripePaymentIntentId: true,
});

export async function updateBookingStatus(
  id: string,
  status: Booking["status"]
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

  if (booking) {
    try {
      await notifyBookingConfirmed(booking);
    } catch (error) {
      console.error("Failed to send booking confirmed push:", error);
    }
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

const bookingDashboardFieldsSchema = bookingSchema.pick({
  contact: true,
  packageId: true,
  packageName: true,
  styleId: true,
  styleName: true,
  addOnIds: true,
  sessions: true,
  invoice: true,
  paymentOption: true,
  status: true,
});

export async function updateDashboardBooking(
  id: string,
  data: Partial<Booking>
) {
  if (!ObjectId.isValid(id)) return null;

  await bookingModel.update(id, data, bookingDashboardFieldsSchema.partial());
  return getBookingById(id);
}

export async function deleteBooking(id: string) {
  if (!ObjectId.isValid(id)) return false;
  await bookingModel.delete(id);
  return true;
}
