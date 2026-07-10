import { WithId } from "mongodb";

import type { BookingRecord } from "@/schemas/bookingRecord";
import { toIdString } from "@/schemas/objectId";

export type SerializedBooking = {
  _id: string;
  freelancerUsername: string;
  freelancerUserId: string;
  contact: BookingRecord["contact"];
  packageId: string;
  packageName: string;
  styleId: string | null;
  styleName: string | null;
  addOnIds: string[];
  sessions: Array<{
    status: BookingRecord["sessions"][number]["status"];
    name: string;
    style?: string;
    style_variation?: string;
    order: number;
    date: string;
    time_slot: BookingRecord["sessions"][number]["time_slot"];
    location: BookingRecord["sessions"][number]["location"];
    client_key?: string;
  }>;
  invoice: BookingRecord["invoice"];
  paymentOption: BookingRecord["paymentOption"];
  status: BookingRecord["status"];
  created_at?: string;
  updated_at?: string;
};

function toIsoDate(value: Date | string | undefined) {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

export function serializeBooking(
  booking: WithId<BookingRecord> | (BookingRecord & { _id: unknown })
): SerializedBooking {
  return {
    _id: toIdString(booking._id as never),
    freelancerUsername: booking.freelancerUsername,
    freelancerUserId: booking.freelancerUserId,
    contact: booking.contact,
    packageId: booking.packageId,
    packageName: booking.packageName,
    styleId: booking.styleId ?? null,
    styleName: booking.styleName ?? null,
    addOnIds: booking.addOnIds,
    sessions: booking.sessions.map((session) => ({
      ...session,
      date: toIsoDate(session.date as Date | string) ?? new Date().toISOString(),
    })),
    invoice: booking.invoice,
    paymentOption: booking.paymentOption,
    status: booking.status,
    created_at: toIsoDate(booking.created_at as Date | string | undefined),
    updated_at: toIsoDate(booking.updated_at as Date | string | undefined),
  };
}
