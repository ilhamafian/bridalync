import { ObjectId } from "mongodb";

import { bookingModel } from "@/models/Booking";
import { SettingModel } from "@/models/Setting";
import { UserModel } from "@/models/User";
import {
  bookingSchema,
  type Booking,
  type PersistedBooking,
} from "@/schemas/bookingSchema";
import { sendBalancePaymentReceivedEmail } from "@/utils/email/balance-payment-received";
import { sendBookingPaymentConfirmationEmail } from "@/utils/email/booking-confirmation";
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
  depositVerificationStatus: true,
});

const bookingBalanceUpdateSchema = bookingSchema.pick({
  paymentOption: true,
  invoice: true,
  stripePaymentIntentId: true,
  balanceVerificationStatus: true,
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
      ...(existing.paymentChannel === "manual_transfer"
        ? { depositVerificationStatus: "approved" as const }
        : {}),
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

    try {
      const freelancer = booking.freelancerUserId
        ? await new UserModel().findById(booking.freelancerUserId)
        : null;
      const settings = booking.freelancerUserId
        ? await new SettingModel().findSettingsByUserId(
            booking.freelancerUserId
          )
        : null;

      await sendBookingPaymentConfirmationEmail(booking, {
        freelancerName: freelancer?.name ?? null,
        freelancer: {
          username:
            freelancer?.username?.trim() || booking.freelancerUsername,
          email: freelancer?.email ?? null,
          mobile: freelancer?.mobile ?? null,
          country_code: freelancer?.country_code ?? null,
        },
        invoiceSettings: settings?.invoice ?? null,
        paymentSettings: settings?.payment ?? null,
      });
    } catch (error) {
      console.error("Failed to send booking confirmation email:", error);
    }
  }

  return booking;
}

export async function confirmBookingBalancePayment(
  bookingId: string,
  paymentIntentId?: string | null
) {
  if (!ObjectId.isValid(bookingId)) return null;

  const existing = await getBookingById(bookingId);
  if (!existing) return null;

  if (
    existing.paymentOption === "full" ||
    existing.invoice.balanceRm <= 0
  ) {
    return existing;
  }

  const settledInvoice = {
    ...existing.invoice,
    depositRm: existing.invoice.totalRm,
    balanceRm: 0,
  };

  await bookingModel.update(
    bookingId,
    {
      paymentOption: "full",
      invoice: settledInvoice,
      ...(existing.balanceVerificationStatus === "pending"
        ? { balanceVerificationStatus: "approved" as const }
        : {}),
      ...(paymentIntentId ? { stripePaymentIntentId: paymentIntentId } : {}),
    },
    bookingBalanceUpdateSchema
  );

  const booking = await getBookingById(bookingId);
  if (booking?.freelancerUserId && existing.invoice.balanceRm > 0) {
    await new UserModel().recordDeferredEarning(
      booking.freelancerUserId,
      existing.invoice.balanceRm
    );
  }

  if (booking) {
    try {
      const freelancer = booking.freelancerUserId
        ? await new UserModel().findById(booking.freelancerUserId)
        : null;
      await sendBalancePaymentReceivedEmail(booking, freelancer?.name ?? null);
    } catch (error) {
      console.error("Failed to send balance received email:", error);
    }
  }

  return booking;
}

export async function rejectManualDepositPayment(bookingId: string) {
  if (!ObjectId.isValid(bookingId)) return null;

  await bookingModel.update(
    bookingId,
    {
      status: "failed",
      depositVerificationStatus: "rejected",
    },
    bookingSchema.pick({
      status: true,
      depositVerificationStatus: true,
    })
  );

  return getBookingById(bookingId);
}

export async function rejectManualBalancePayment(bookingId: string) {
  if (!ObjectId.isValid(bookingId)) return null;

  await bookingModel.update(
    bookingId,
    {
      balanceVerificationStatus: "rejected",
    },
    bookingSchema.pick({
      balanceVerificationStatus: true,
    })
  );

  return getBookingById(bookingId);
}

export async function attachManualBalanceReceipt(
  bookingId: string,
  receiptUrl: string
) {
  if (!ObjectId.isValid(bookingId)) return null;

  await bookingModel.update(
    bookingId,
    {
      balanceReceiptUrl: receiptUrl,
      balanceVerificationStatus: "pending",
    },
    bookingSchema.pick({
      balanceReceiptUrl: true,
      balanceVerificationStatus: true,
    })
  );

  return getBookingById(bookingId);
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
  packageIds: true,
  packageNames: true,
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
