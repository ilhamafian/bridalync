import {
  BOOKING_TIMEZONE,
  normalizeSessionDate,
} from "@/utils/booking/availability";

export const GOOGLE_IMPORT_PACKAGE_ID = "google-import";
export const GOOGLE_IMPORT_CONTACT_EMAIL = "imported@bridalync.app";

export type GoogleCalendarListEntry = {
  id?: string;
  summary?: string;
  primary?: boolean;
  accessRole?: string;
};

export type GoogleCalendarEvent = {
  id?: string;
  status?: string;
  summary?: string;
  description?: string;
  recurrence?: string[];
  recurringEventId?: string;
  eventType?: string;
  transparency?: string;
  organizer?: { email?: string; displayName?: string };
  start?: { date?: string; dateTime?: string; timeZone?: string };
  end?: { date?: string; dateTime?: string; timeZone?: string };
};

export type GoogleCalendarPreviewEvent = {
  id: string;
  calendarId: string;
  googleEventId: string;
  title: string;
  start: string;
  end: string;
  dateLabel: string;
  timeLabel: string;
  alreadyImported: boolean;
  conflict: boolean;
};

export type GoogleCalendarSkipCounts = {
  holidays: number;
  repeating: number;
  allDay: number;
  cancelled: number;
  other: number;
};

const HOLIDAY_CALENDAR_ID = /holiday@group\.v\.calendar\.google\.com/i;
const HOLIDAY_SUMMARY = /holidays in |^holidays?\b/i;
const SKIPPED_EVENT_TYPES = new Set([
  "outOfOffice",
  "focusTime",
  "workingLocation",
  "birthday",
  "fromGmail",
]);

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function partsInTimeZone(iso: string, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(new Date(iso));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
  };
}

export function googleDateTimeToSlot(iso: string) {
  const parts = partsInTimeZone(iso, BOOKING_TIMEZONE);
  return {
    dateKey: `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`,
    hhmm: `${pad2(parts.hour)}:${pad2(parts.minute)}`,
  };
}

export function isHolidayCalendar(calendar: GoogleCalendarListEntry) {
  const id = calendar.id ?? "";
  const summary = calendar.summary ?? "";
  return HOLIDAY_CALENDAR_ID.test(id) || HOLIDAY_SUMMARY.test(summary);
}

export function isHolidayOrganizer(email: string | undefined) {
  return Boolean(email && HOLIDAY_CALENDAR_ID.test(email));
}

export function googleEventImportKey(calendarId: string, eventId: string) {
  return `${calendarId}:${eventId}`;
}

function eventTitle(event: GoogleCalendarEvent) {
  const title = event.summary?.trim();
  return title || "Imported event";
}

export function classifyGoogleEvent(event: GoogleCalendarEvent): {
  skip: keyof GoogleCalendarSkipCounts | null;
} {
  if (event.status === "cancelled") return { skip: "cancelled" };
  if (event.recurrence?.length || event.recurringEventId) {
    return { skip: "repeating" };
  }
  if (event.eventType && SKIPPED_EVENT_TYPES.has(event.eventType)) {
    return { skip: "other" };
  }
  if (isHolidayOrganizer(event.organizer?.email)) {
    return { skip: "holidays" };
  }
  if (!event.start?.dateTime || !event.end?.dateTime) {
    return { skip: "allDay" };
  }
  return { skip: null };
}

export function toPreviewEvent(input: {
  calendarId: string;
  event: GoogleCalendarEvent;
  alreadyImported: boolean;
  conflict: boolean;
}): GoogleCalendarPreviewEvent | null {
  const eventId = input.event.id;
  const startIso = input.event.start?.dateTime;
  const endIso = input.event.end?.dateTime;
  if (!eventId || !startIso || !endIso) return null;

  const start = googleDateTimeToSlot(startIso);
  let end = googleDateTimeToSlot(endIso);
  if (end.dateKey !== start.dateKey || end.hhmm <= start.hhmm) {
    end = { dateKey: start.dateKey, hhmm: "23:59" };
  }

  const startDate = new Date(startIso);
  const endDate = new Date(endIso);
  const dateLabel = new Intl.DateTimeFormat("en-GB", {
    timeZone: BOOKING_TIMEZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(startDate);
  const timeLabel = `${start.hhmm} – ${end.hhmm}`;

  return {
    id: googleEventImportKey(input.calendarId, eventId),
    calendarId: input.calendarId,
    googleEventId: eventId,
    title: eventTitle(input.event),
    start: startDate.toISOString(),
    end: endDate.toISOString(),
    dateLabel,
    timeLabel,
    alreadyImported: input.alreadyImported,
    conflict: input.conflict,
  };
}

export function slotFromPreview(event: GoogleCalendarPreviewEvent) {
  const start = googleDateTimeToSlot(event.start);
  let end = googleDateTimeToSlot(event.end);
  if (end.dateKey !== start.dateKey || end.hhmm <= start.hhmm) {
    end = { dateKey: start.dateKey, hhmm: "23:59" };
  }

  return {
    date: normalizeSessionDate(event.start),
    dateKey: start.dateKey,
    time_slot: {
      startTime: start.hhmm,
      endTime: end.hhmm,
    },
  };
}

async function googleCalendarGet<T>(
  accessToken: string,
  path: string,
  params?: Record<string, string>
): Promise<T> {
  const url = new URL(`https://www.googleapis.com/calendar/v3${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (response.status === 401) {
    throw new Error("GOOGLE_CALENDAR_UNAUTHORIZED");
  }

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Google Calendar API error:", errorBody);
    throw new Error("Could not read Google Calendar.");
  }

  return (await response.json()) as T;
}

export async function listGoogleCalendars(accessToken: string) {
  const data = await googleCalendarGet<{ items?: GoogleCalendarListEntry[] }>(
    accessToken,
    "/users/me/calendarList"
  );
  return data.items ?? [];
}

export async function listGoogleCalendarEvents(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string
) {
  const events: GoogleCalendarEvent[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < 20; page += 1) {
    const data = await googleCalendarGet<{
      items?: GoogleCalendarEvent[];
      nextPageToken?: string;
    }>(accessToken, `/calendars/${encodeURIComponent(calendarId)}/events`, {
      singleEvents: "true",
      orderBy: "startTime",
      timeMin,
      timeMax,
      maxResults: "250",
      ...(pageToken ? { pageToken } : {}),
    });

    events.push(...(data.items ?? []));
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }

  return events;
}

export function emptySkipCounts(): GoogleCalendarSkipCounts {
  return {
    holidays: 0,
    repeating: 0,
    allDay: 0,
    cancelled: 0,
    other: 0,
  };
}
