import type { Address } from "@/schemas/addressSchema";
import type { Booking } from "@/schemas/bookingSchema";
import type { SerializedBooking } from "@/utils/booking/serializeBooking";
import { isNavigableLocation } from "@/utils/maps";

export type ScheduleStatus = "upcoming" | "in_progress" | "completed";

export type ScheduleLocation = {
  formattedAddress: string;
  lat: number;
  lng: number;
  placeId: string;
  navigable: boolean;
};

export type ScheduleItem = {
  bookingId: string;
  clientName: string;
  packageName: string;
  sessionName: string;
  date: string;
  startTime: string;
  endTime: string;
  scheduleStatus: ScheduleStatus;
  bookingStatus: Booking["status"];
  location: ScheduleLocation | null;
  startsAtMs: number;
  endsAtMs: number;
};

export type ActivityItem = {
  id: string;
  label: string;
  detail: string;
  at: string;
};

export type ChecklistItem = {
  id: string;
  label: string;
  done: boolean;
  href: string;
};

export type DashboardStats = {
  today: number;
  thisWeek: number;
  thisMonth: number;
};

export type OutstandingPayments = {
  totalRm: number;
  clientCount: number;
};

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function parseHhMm(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return { hours: 0, minutes: 0 };
  }
  return { hours, minutes };
}

function combineDateAndTime(dateValue: string | Date, time: string) {
  const base =
    dateValue instanceof Date ? new Date(dateValue) : new Date(dateValue);
  const { hours, minutes } = parseHhMm(time);
  base.setHours(hours, minutes, 0, 0);
  return base;
}

function isSameLocalDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function getGreeting(now = new Date()) {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function getFirstName(name: string | undefined | null) {
  const trimmed = name?.trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/)[0] ?? "there";
}

export function getWeekRange(now = new Date()) {
  const start = startOfDay(now);
  const day = start.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + mondayOffset);
  const end = endOfDay(new Date(start));
  end.setDate(start.getDate() + 6);
  return { start, end };
}

export function getMonthRange(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function toScheduleLocation(
  location: Address | undefined | null
): ScheduleLocation | null {
  if (!location) return null;
  return {
    formattedAddress: location.formattedAddress,
    lat: location.location.lat,
    lng: location.location.lng,
    placeId: location.placeId,
    navigable: isNavigableLocation(location),
  };
}

export function getScheduleStatus(input: {
  now: Date;
  startsAt: Date;
  endsAt: Date;
  bookingStatus: Booking["status"];
  sessionStatus: Booking["sessions"][number]["status"];
}): ScheduleStatus {
  if (
    input.bookingStatus === "completed" ||
    input.sessionStatus === "completed"
  ) {
    return "completed";
  }
  if (input.now.getTime() < input.startsAt.getTime()) return "upcoming";
  if (input.now.getTime() <= input.endsAt.getTime()) return "in_progress";
  return "completed";
}

export function flattenScheduleItems(
  bookings: SerializedBooking[],
  now = new Date()
): ScheduleItem[] {
  const items: ScheduleItem[] = [];

  for (const booking of bookings) {
    if (
      booking.status === "cancelled" ||
      booking.status === "failed" ||
      booking.status === "enquiry"
    ) {
      continue;
    }

    for (const session of booking.sessions) {
      if (session.status === "cancelled") continue;

      const startsAt = combineDateAndTime(session.date, session.time_slot.startTime);
      const endsAt = combineDateAndTime(session.date, session.time_slot.endTime);

      items.push({
        bookingId: booking._id,
        clientName: booking.contact.name,
        packageName: booking.packageName,
        sessionName: session.name,
        date: session.date,
        startTime: session.time_slot.startTime,
        endTime: session.time_slot.endTime,
        scheduleStatus: getScheduleStatus({
          now,
          startsAt,
          endsAt,
          bookingStatus: booking.status,
          sessionStatus: session.status,
        }),
        bookingStatus: booking.status,
        location: toScheduleLocation(session.location),
        startsAtMs: startsAt.getTime(),
        endsAtMs: endsAt.getTime(),
      });
    }
  }

  return items.sort((a, b) => a.startsAtMs - b.startsAtMs);
}

export function getTodaysSchedule(items: ScheduleItem[], now = new Date()) {
  return items.filter((item) => isSameLocalDay(new Date(item.date), now));
}

export function getNextUpcomingBooking(
  items: ScheduleItem[],
  now = new Date()
) {
  const endToday = endOfDay(now).getTime();
  return (
    items.find(
      (item) =>
        item.startsAtMs > endToday &&
        item.scheduleStatus !== "completed" &&
        item.bookingStatus !== "cancelled"
    ) ??
    items.find(
      (item) =>
        item.startsAtMs > now.getTime() &&
        item.scheduleStatus === "upcoming"
    ) ??
    null
  );
}

export function countUpcomingThisWeek(items: ScheduleItem[], now = new Date()) {
  const { start, end } = getWeekRange(now);
  const bookingIds = new Set<string>();
  for (const item of items) {
    if (item.bookingStatus === "cancelled" || item.bookingStatus === "failed") {
      continue;
    }
    if (item.startsAtMs < now.getTime()) continue;
    if (item.startsAtMs < start.getTime() || item.startsAtMs > end.getTime()) {
      continue;
    }
    bookingIds.add(item.bookingId);
  }
  return bookingIds.size;
}

export function getBookingSummary(
  items: ScheduleItem[],
  now = new Date()
): DashboardStats {
  const todayStart = startOfDay(now).getTime();
  const todayEnd = endOfDay(now).getTime();
  const week = getWeekRange(now);
  const month = getMonthRange(now);

  const todayIds = new Set<string>();
  const weekIds = new Set<string>();
  const monthIds = new Set<string>();

  for (const item of items) {
    if (item.bookingStatus === "cancelled" || item.bookingStatus === "failed") {
      continue;
    }
    if (item.startsAtMs >= todayStart && item.startsAtMs <= todayEnd) {
      todayIds.add(item.bookingId);
    }
    if (
      item.startsAtMs >= week.start.getTime() &&
      item.startsAtMs <= week.end.getTime()
    ) {
      weekIds.add(item.bookingId);
    }
    if (
      item.startsAtMs >= month.start.getTime() &&
      item.startsAtMs <= month.end.getTime()
    ) {
      monthIds.add(item.bookingId);
    }
  }

  return {
    today: todayIds.size,
    thisWeek: weekIds.size,
    thisMonth: monthIds.size,
  };
}

export function getOutstandingPayments(
  bookings: SerializedBooking[]
): OutstandingPayments {
  let totalRm = 0;
  let clientCount = 0;

  for (const booking of bookings) {
    if (
      booking.status !== "confirmed" &&
      booking.status !== "completed" &&
      booking.status !== "pending"
    ) {
      continue;
    }
    if (booking.invoice.balanceRm <= 0) continue;
    totalRm += booking.invoice.balanceRm;
    clientCount += 1;
  }

  return { totalRm, clientCount };
}

export function getRecentActivity(
  bookings: SerializedBooking[],
  limit = 5
): ActivityItem[] {
  const sorted = [...bookings].sort((a, b) => {
    const aTime = new Date(a.updated_at ?? a.created_at ?? 0).getTime();
    const bTime = new Date(b.updated_at ?? b.created_at ?? 0).getTime();
    return bTime - aTime;
  });

  return sorted.slice(0, limit).map((booking) => {
    const at = booking.updated_at ?? booking.created_at ?? new Date().toISOString();
    const detail = `${booking.contact.name} · ${booking.packageName}`;

    if (booking.status === "cancelled") {
      return {
        id: `${booking._id}-cancelled`,
        label: "Booking cancelled",
        detail,
        at,
      };
    }
    if (booking.status === "completed") {
      return {
        id: `${booking._id}-completed`,
        label: "Booking completed",
        detail,
        at,
      };
    }
    if (booking.status === "confirmed" && booking.paymentOption === "full") {
      return {
        id: `${booking._id}-paid`,
        label: "Payment received",
        detail,
        at,
      };
    }
    if (booking.status === "confirmed" && booking.paymentOption === "deposit") {
      return {
        id: `${booking._id}-deposit`,
        label: "Deposit received",
        detail,
        at,
      };
    }
    return {
      id: `${booking._id}-new`,
      label: "New booking",
      detail,
      at,
    };
  });
}

export function getSetupChecklist(input: {
  packageCount: number;
  timeSlotCount: number;
  isStripeConnected: boolean;
  hasUsername: boolean;
}): ChecklistItem[] {
  return [
    {
      id: "package",
      label: "Add package",
      done: input.packageCount > 0,
      href: "/dashboard/packages",
    },
    {
      id: "availability",
      label: "Set availability",
      done: input.timeSlotCount > 0,
      href: "/dashboard/settings",
    },
    {
      id: "stripe",
      label: "Connect Stripe",
      done: input.isStripeConnected,
      href: "/dashboard/settings",
    },
    {
      id: "publish",
      label: "Publish booking page",
      done: input.hasUsername,
      href: "/dashboard/profile",
    },
  ];
}

export function scheduleStatusLabel(status: ScheduleStatus) {
  switch (status) {
    case "upcoming":
      return "Upcoming";
    case "in_progress":
      return "In Progress";
    case "completed":
      return "Completed";
  }
}
