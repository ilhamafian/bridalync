import { NextRequest } from "next/server";
import { z } from "zod";

import { bookingModel } from "@/models/Booking";
import type { PersistedBooking } from "@/schemas/bookingSchema";
import { createResponse, handleError } from "@/utils/apiHelper";
import {
  getSessionStartDate,
  notifyUpcomingSession,
  sessionReminderKey,
} from "@/utils/push/bookingNotifications";

const REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = req.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;

  const cronHeader = req.headers.get("x-cron-secret");
  return cronHeader === secret;
}

export async function GET(req: NextRequest) {
  return runReminders(req);
}

export async function POST(req: NextRequest) {
  return runReminders(req);
}

async function runReminders(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const now = new Date();
    const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_MS);

    const bookings = (await bookingModel.find({
      status: "confirmed",
      "sessions.date": {
        $gte: new Date(now.getTime() - 12 * 60 * 60 * 1000),
        $lte: windowEnd,
      },
    } as never)) as PersistedBooking[];

    let notified = 0;
    let skipped = 0;

    for (const booking of bookings) {
      const sent = new Set(booking.sessionRemindersSent ?? []);
      const newlySent: string[] = [];

      for (const session of booking.sessions) {
        if (session.status !== "scheduled") {
          skipped += 1;
          continue;
        }

        const start = getSessionStartDate(session);
        if (start < now || start > windowEnd) {
          skipped += 1;
          continue;
        }

        const key = sessionReminderKey(session);
        if (sent.has(key)) {
          skipped += 1;
          continue;
        }

        const startLabel = start.toLocaleString("en-MY", {
          weekday: "short",
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });

        await notifyUpcomingSession(booking, session.name, startLabel);
        newlySent.push(key);
        notified += 1;
      }

      if (newlySent.length > 0) {
        const bookingId =
          typeof booking._id === "string"
            ? booking._id
            : (booking._id as { toString(): string }).toString();

        const nextSent = [...sent, ...newlySent];
        await bookingModel.update(
          bookingId,
          { sessionRemindersSent: nextSent },
          z.object({ sessionRemindersSent: z.array(z.string()) })
        );
      }
    }

    return createResponse({
      success: true,
      checked: bookings.length,
      notified,
      skipped,
    });
  } catch (error) {
    return handleError(error);
  }
}
