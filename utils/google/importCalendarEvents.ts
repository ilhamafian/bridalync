import { createBooking, bookingModel } from "@/models/Booking";
import type { Booking } from "@/schemas/bookingSchema";
import {
  getOccupiedSlotsFromBookings,
  isSessionSlotTaken,
  toDateKey,
} from "@/utils/booking/availability";
import { serializeBooking } from "@/utils/booking/serializeBooking";
import {
  classifyGoogleEvent,
  emptySkipCounts,
  googleEventImportKey,
  isHolidayCalendar,
  listGoogleCalendarEvents,
  listGoogleCalendars,
  slotFromPreview,
  toPreviewEvent,
  GOOGLE_IMPORT_CONTACT_EMAIL,
  GOOGLE_IMPORT_PACKAGE_ID,
  type GoogleCalendarPreviewEvent,
} from "@/utils/google/calendar";

const EMPTY_INVOICE = {
  lineItems: [{ label: "Imported from Google Calendar", amountRm: 0 }],
  totalRm: 0,
  depositRm: 0,
  balanceRm: 0,
} as const;

function importWindow() {
  const todayKey = toDateKey(new Date());
  const [year] = todayKey.split("-").map(Number);
  const timeMin = new Date(`${todayKey}T00:00:00+08:00`).toISOString();
  const timeMax = new Date(year + 2, 0, 1).toISOString();
  return { timeMin, timeMax };
}

export async function previewGoogleCalendarEvents(input: {
  accessToken: string;
  freelancerUserId: string;
}) {
  const skipCounts = emptySkipCounts();
  const calendars = await listGoogleCalendars(input.accessToken);
  const { timeMin, timeMax } = importWindow();

  const existing = await bookingModel.find({
    freelancerUserId: input.freelancerUserId,
  });
  const importedKeys = new Set(
    existing
      .map((booking) => booking.googleEventId)
      .filter((value): value is string => Boolean(value))
  );
  const occupied = getOccupiedSlotsFromBookings(existing);

  const events: GoogleCalendarPreviewEvent[] = [];

  for (const calendar of calendars) {
    const calendarId = calendar.id;
    if (!calendarId) continue;

    if (isHolidayCalendar(calendar)) {
      skipCounts.holidays += 1;
      continue;
    }

    const calendarEvents = await listGoogleCalendarEvents(
      input.accessToken,
      calendarId,
      timeMin,
      timeMax
    );

    for (const event of calendarEvents) {
      const { skip } = classifyGoogleEvent(event);
      if (skip) {
        skipCounts[skip] += 1;
        continue;
      }

      const preview = toPreviewEvent({
        calendarId,
        event,
        alreadyImported: false,
        conflict: false,
      });
      if (!preview) {
        skipCounts.other += 1;
        continue;
      }

      const slot = slotFromPreview(preview);
      preview.alreadyImported = importedKeys.has(preview.id);
      preview.conflict = isSessionSlotTaken(slot, occupied);
      events.push(preview);
    }
  }

  events.sort(
    (left, right) =>
      new Date(left.start).getTime() - new Date(right.start).getTime()
  );

  return { events, skipCounts };
}

export async function importGoogleCalendarEvents(input: {
  freelancerUserId: string;
  freelancerUsername: string;
  events: GoogleCalendarPreviewEvent[];
}) {
  const existing = await bookingModel.find({
    freelancerUserId: input.freelancerUserId,
  });
  const importedKeys = new Set(
    existing
      .map((booking) => booking.googleEventId)
      .filter((value): value is string => Boolean(value))
  );
  let occupied = getOccupiedSlotsFromBookings(existing);

  const imported = [];
  let skippedExisting = 0;
  let skippedConflict = 0;

  for (const event of input.events) {
    const key = googleEventImportKey(event.calendarId, event.googleEventId);
    if (importedKeys.has(key) || importedKeys.has(event.id)) {
      skippedExisting += 1;
      continue;
    }

    const slot = slotFromPreview(event);
    if (isSessionSlotTaken(slot, occupied)) {
      skippedConflict += 1;
      continue;
    }

    const booking = await createBooking({
      freelancerUsername: input.freelancerUsername,
      freelancerUserId: input.freelancerUserId,
      contact: {
        name: event.title,
        email: GOOGLE_IMPORT_CONTACT_EMAIL,
      },
      packageIds: [],
      packageNames: event.title,
      addOnIds: [],
      sessions: [
        {
          status: "scheduled",
          name: event.title,
          packageId: GOOGLE_IMPORT_PACKAGE_ID,
          order: 0,
          date: slot.date,
          time_slot: slot.time_slot,
        },
      ],
      invoice: { ...EMPTY_INVOICE, lineItems: [...EMPTY_INVOICE.lineItems] },
      paymentOption: "full",
      status: "confirmed",
      source: "google_calendar",
      googleEventId: event.id,
    } satisfies Omit<Booking, "_id">);

    imported.push(serializeBooking(booking));
    importedKeys.add(event.id);
    occupied = [
      ...occupied,
      {
        date: slot.dateKey,
        startTime: slot.time_slot.startTime,
        endTime: slot.time_slot.endTime,
      },
    ];
  }

  return {
    imported,
    skippedExisting,
    skippedConflict,
  };
}
