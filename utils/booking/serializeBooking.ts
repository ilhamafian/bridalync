import { WithId } from "mongodb";

import type { Booking } from "@/schemas/bookingSchema";
import { toIdString } from "@/schemas/objectId";

export type SerializedBooking = {
  _id: string;
  freelancerUsername: string;
  freelancerUserId: string;
  contact: Booking["contact"];
  packageId: string;
  packageName: string;
  styleId: string | null;
  styleName: string | null;
  addOnIds: string[];
  sessions: Array<{
    status: Booking["sessions"][number]["status"];
    name: string;
    style?: string;
    style_variation?: string;
    order: number;
    date: string;
    time_slot: Booking["sessions"][number]["time_slot"];
    location: Booking["sessions"][number]["location"];
    client_key?: string;
  }>;
  invoice: Booking["invoice"];
  paymentOption: Booking["paymentOption"];
  status: Booking["status"];
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
  booking: WithId<Booking> | (Booking & { _id: unknown })
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
