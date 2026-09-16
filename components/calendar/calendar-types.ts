import type { SerializedBooking } from "@/utils/booking/serializeBooking";

export type CalendarView = "day" | "week" | "month";

export type CalendarEvent = {
  id: string;
  bookingId: string;
  title: string;
  clientName: string;
  packageName: string;
  styleName?: string;
  start: Date;
  end: Date;
  status: SerializedBooking["status"];
  sessionStatus: SerializedBooking["sessions"][number]["status"];
  contact: SerializedBooking["contact"];
  location: SerializedBooking["sessions"][number]["location"] | null;
  invoice: SerializedBooking["invoice"];
  paymentOption: SerializedBooking["paymentOption"];
};

export const CALENDAR_DAY_START_HOUR = 6;
export const CALENDAR_DAY_END_HOUR = 22;
export const CALENDAR_HOUR_HEIGHT = 56;
