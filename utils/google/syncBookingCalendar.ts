import { createHash } from "crypto";
import { after } from "next/server";

import { bookingModel } from "@/models/Booking";
import type { PersistedBooking } from "@/schemas/bookingSchema";
import type { Session } from "@/schemas/sessionSchema";
import { getAppUrl } from "@/utils/appUrl";
import { BOOKING_TIMEZONE, toDateKey } from "@/utils/booking/availability";
import { formatRm } from "@/utils/booking/pricing";
import {
  BRIDALYNC_BOOKING_PROPERTY,
  GOOGLE_IMPORT_CONTACT_EMAIL,
} from "@/utils/google/calendar";
import {
  getGoogleCalendarAccessToken,
  invalidateGoogleAccessToken,
} from "@/utils/google/calendarConnection";
import { GOOGLE_CALENDAR_EVENTS_SCOPE } from "@/utils/google/oauth";
import { formatLocationAddress } from "@/utils/session";

const CALENDAR_ID = "primary";
const CALENDAR_API = `https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events`;

const SYNCED_STATUSES = new Set<PersistedBooking["status"]>([
  "confirmed",
  "completed",
]);

class GoogleUnauthorizedError extends Error {}

/** Google event ids must be base32hex (`a-v`, `0-9`); Mongo ids are hex, so this is stable. */
function eventIdFor(bookingId: string, sessionIndex: number) {
  const base = /^[0-9a-f]+$/.test(bookingId)
    ? bookingId
    : createHash("sha1").update(bookingId).digest("hex");
  return `bl${base}s${sessionIndex}`;
}

async function googleRequest(
  accessToken: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  body?: unknown
) {
  const response = await fetch(`${CALENDAR_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (response.status === 401) throw new GoogleUnauthorizedError();
  return response;
}

async function ensureOk(response: Response, action: string) {
  if (response.ok) return;
  throw new Error(
    `Google Calendar ${action} failed (${response.status}): ${await response.text()}`
  );
}

/** Runs `task` with a valid token, refreshing once if Google rejects the cached one. */
async function withAccessToken(
  userId: string,
  task: (accessToken: string) => Promise<void>
) {
  const accessToken = await getGoogleCalendarAccessToken(
    userId,
    GOOGLE_CALENDAR_EVENTS_SCOPE
  );
  if (!accessToken) return;

  try {
    await task(accessToken);
  } catch (error) {
    if (!(error instanceof GoogleUnauthorizedError)) throw error;
    await invalidateGoogleAccessToken(userId);
    const retryToken = await getGoogleCalendarAccessToken(
      userId,
      GOOGLE_CALENDAR_EVENTS_SCOPE
    );
    if (retryToken) await task(retryToken);
  }
}

function buildEventBody(
  booking: PersistedBooking,
  bookingId: string,
  session: Session,
  sessionIndex: number
) {
  const dateKey = toDateKey(session.date);
  let dashboardUrl: string | null = null;
  try {
    dashboardUrl = `${getAppUrl()}/dashboard/bookings/${bookingId}`;
  } catch {
    dashboardUrl = null;
  }

  const phone = booking.contact.mobile
    ? `${booking.contact.country_code ?? ""} ${booking.contact.mobile}`.trim()
    : null;
  const email =
    booking.contact.email && booking.contact.email !== GOOGLE_IMPORT_CONTACT_EMAIL
      ? booking.contact.email
      : null;
  const description = [
    `Client: ${booking.contact.name}`,
    phone ? `Phone: ${phone}` : null,
    email ? `Email: ${email}` : null,
    `Package: ${booking.packageNames}`,
    session.styleName ? `Style: ${session.styleName}` : null,
    session.ready_by ? `Ready by: ${session.ready_by}` : null,
    (session.slot_count ?? 1) > 1 ? `${session.slot_count} slots` : null,
    `Total: ${formatRm(booking.invoice.totalRm)}${
      booking.invoice.balanceRm > 0
        ? ` (balance ${formatRm(booking.invoice.balanceRm)})`
        : ""
    }`,
    dashboardUrl ? `\n${dashboardUrl}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    id: eventIdFor(bookingId, sessionIndex),
    status: "confirmed",
    summary: `${session.name} · ${booking.contact.name}`,
    description,
    ...(session.location
      ? { location: formatLocationAddress(session.location) }
      : {}),
    start: {
      dateTime: `${dateKey}T${session.time_slot.startTime}:00`,
      timeZone: BOOKING_TIMEZONE,
    },
    end: {
      dateTime: `${dateKey}T${session.time_slot.endTime}:00`,
      timeZone: BOOKING_TIMEZONE,
    },
    extendedProperties: {
      private: {
        [BRIDALYNC_BOOKING_PROPERTY]: bookingId,
        bridalyncSessionIndex: String(sessionIndex),
      },
    },
    ...(dashboardUrl
      ? { source: { title: "Bridalync booking", url: dashboardUrl } }
      : {}),
  };
}

async function listBookingEventIds(accessToken: string, bookingId: string) {
  const params = new URLSearchParams({
    privateExtendedProperty: `${BRIDALYNC_BOOKING_PROPERTY}=${bookingId}`,
    showDeleted: "false",
    maxResults: "100",
  });
  const response = await googleRequest(accessToken, "GET", `?${params}`);
  await ensureOk(response, "list");
  const data = (await response.json()) as { items?: Array<{ id?: string }> };
  return (data.items ?? [])
    .map((item) => item.id)
    .filter((id): id is string => Boolean(id));
}

async function upsertEvent(
  accessToken: string,
  body: ReturnType<typeof buildEventBody>
) {
  const path = `/${encodeURIComponent(body.id)}`;
  const updated = await googleRequest(accessToken, "PUT", path, body);
  if (updated.status !== 404) {
    await ensureOk(updated, "update");
    return;
  }

  const created = await googleRequest(accessToken, "POST", "", body);
  if (created.status === 409) {
    // Created concurrently by another sync; overwrite with the latest state.
    await ensureOk(
      await googleRequest(accessToken, "PUT", path, body),
      "update"
    );
    return;
  }
  await ensureOk(created, "insert");
}

async function deleteEvent(accessToken: string, eventId: string) {
  const response = await googleRequest(
    accessToken,
    "DELETE",
    `/${encodeURIComponent(eventId)}`
  );
  if (response.status === 404 || response.status === 410) return;
  await ensureOk(response, "delete");
}

/**
 * Mirrors a booking into the stylist's Google Calendar: one event per session while
 * the booking is confirmed/completed, none otherwise. Safe to call repeatedly.
 */
export async function syncBookingToGoogleCalendar(bookingId: string) {
  const booking = (await bookingModel.findById(bookingId)) as
    | PersistedBooking
    | null;
  if (!booking?.freelancerUserId) return;
  if (booking.source === "google_calendar") return;

  const id = String(booking._id);
  const wanted = SYNCED_STATUSES.has(booking.status)
    ? booking.sessions
        .map((session, index) => ({ session, index }))
        .filter(({ session }) => session.status !== "cancelled")
        .map(({ session, index }) => buildEventBody(booking, id, session, index))
    : [];

  await withAccessToken(booking.freelancerUserId, async (accessToken) => {
    const existingIds = await listBookingEventIds(accessToken, id);
    const wantedIds = new Set(wanted.map((event) => event.id));

    for (const event of wanted) {
      await upsertEvent(accessToken, event);
    }
    for (const eventId of existingIds) {
      if (!wantedIds.has(eventId)) await deleteEvent(accessToken, eventId);
    }
  });
}

export async function removeBookingFromGoogleCalendar(
  freelancerUserId: string,
  bookingId: string
) {
  await withAccessToken(freelancerUserId, async (accessToken) => {
    for (const eventId of await listBookingEventIds(accessToken, bookingId)) {
      await deleteEvent(accessToken, eventId);
    }
  });
}

/** Backfill after connecting: every confirmed/completed booking with a session from today on. */
export async function syncUpcomingBookingsToGoogleCalendar(
  freelancerUserId: string
) {
  const today = new Date(`${toDateKey(new Date())}T00:00:00+08:00`);
  const bookings = await bookingModel.find({
    freelancerUserId,
    status: { $in: [...SYNCED_STATUSES] },
    source: { $ne: "google_calendar" },
    "sessions.date": { $gte: today },
  });
  for (const booking of bookings) {
    try {
      await syncBookingToGoogleCalendar(String(booking._id));
    } catch (error) {
      console.error(
        `[google-calendar-sync] backfill ${String(booking._id)} failed:`,
        error
      );
    }
  }
}

/** Runs after the response is sent; Google errors never fail the booking request. */
function runInBackground(label: string, task: () => Promise<void>) {
  const run = () =>
    task().catch((error) => {
      console.error(`[google-calendar-sync] ${label} failed:`, error);
    });
  try {
    after(run);
  } catch {
    void run();
  }
}

export function scheduleBookingCalendarSync(bookingId: string) {
  runInBackground(`sync ${bookingId}`, () =>
    syncBookingToGoogleCalendar(bookingId)
  );
}

export function scheduleUpcomingBookingsCalendarSync(freelancerUserId: string) {
  runInBackground(`backfill ${freelancerUserId}`, () =>
    syncUpcomingBookingsToGoogleCalendar(freelancerUserId)
  );
}

export function scheduleBookingCalendarRemoval(
  freelancerUserId: string,
  bookingId: string
) {
  runInBackground(`remove ${bookingId}`, () =>
    removeBookingFromGoogleCalendar(freelancerUserId, bookingId)
  );
}
