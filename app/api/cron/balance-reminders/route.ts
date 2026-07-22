import { NextRequest } from "next/server";
import { z } from "zod";

import { bookingModel } from "@/models/Booking";
import { SettingModel } from "@/models/Setting";
import { UserModel } from "@/models/User";
import type { PersistedBooking } from "@/schemas/bookingSchema";
import { createResponse, handleError } from "@/utils/apiHelper";
import {
  daysUntilSessionDate,
  getEarliestSessionDate,
} from "@/utils/booking/pricing";
import { sendBalanceDueReminderEmail } from "@/utils/email/balance-due-reminder";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = req.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;

  const cronHeader = req.headers.get("x-cron-secret");
  return cronHeader === secret;
}

function bookingIdString(booking: PersistedBooking) {
  return typeof booking._id === "string"
    ? booking._id
    : (booking._id as { toString(): string }).toString();
}

export async function GET(req: NextRequest) {
  return runBalanceReminders(req);
}

export async function POST(req: NextRequest) {
  return runBalanceReminders(req);
}

async function runBalanceReminders(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const bookings = (await bookingModel.find({
      status: "confirmed",
      paymentOption: "deposit",
      "invoice.balanceRm": { $gt: 0 },
      balanceReminderSentAt: { $exists: false },
    } as never)) as PersistedBooking[];

    const settingsModel = new SettingModel();
    const userModel = new UserModel();

    let emailed = 0;
    let skipped = 0;

    for (const booking of bookings) {
      const earliest = getEarliestSessionDate(booking.sessions);
      if (!earliest) {
        skipped += 1;
        continue;
      }

      const settings = booking.freelancerUserId
        ? await settingsModel.findSettingsByUserId(booking.freelancerUserId)
        : null;
      const balanceDueBeforeDays = settings?.payment?.balance_due_before ?? 3;
      const daysUntil = daysUntilSessionDate(earliest);

      // Exact day, plus catch-up if cron missed the exact day.
      const shouldRemind =
        daysUntil === balanceDueBeforeDays ||
        (daysUntil >= 0 && daysUntil < balanceDueBeforeDays);

      if (!shouldRemind) {
        skipped += 1;
        continue;
      }

      try {
        const freelancer = booking.freelancerUserId
          ? await userModel.findById(booking.freelancerUserId)
          : null;

        await sendBalanceDueReminderEmail({
          booking,
          freelancerName: freelancer?.name ?? null,
          daysUntilSession: daysUntil,
          balanceDueBeforeDays,
        });

        await bookingModel.update(
          bookingIdString(booking),
          { balanceReminderSentAt: new Date() },
          z.object({ balanceReminderSentAt: z.coerce.date() })
        );

        emailed += 1;
      } catch (error) {
        console.error(
          `[balance-reminders] Failed for booking ${bookingIdString(booking)}:`,
          error
        );
        skipped += 1;
      }
    }

    return createResponse({
      success: true,
      checked: bookings.length,
      emailed,
      skipped,
    });
  } catch (error) {
    return handleError(error);
  }
}
