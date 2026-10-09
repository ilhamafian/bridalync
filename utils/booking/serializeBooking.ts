import { WithId } from "mongodb";

import type { Booking } from "@/schemas/bookingSchema";
import { toIdString } from "@/schemas/objectId";

export type SerializedBooking = {
  _id: string;
  freelancerUsername: string;
  freelancerUserId: string;
  contact: Booking["contact"];
  clientDetails?: Booking["clientDetails"];
  packageIds: string[];
  packageNames: string;
  dayMode?: Booking["dayMode"];
  addOnIds: string[];
  sessions: Array<{
    status: Booking["sessions"][number]["status"];
    name: string;
    packageId: string;
    styleId?: string;
    styleName?: string;
    order: number;
    date: string;
    time_slot: Booking["sessions"][number]["time_slot"];
    slot_count?: number;
    ready_by?: string;
    location?: Booking["sessions"][number]["location"];
    region?: Booking["sessions"][number]["region"];
    client_key?: string;
  }>;
  invoice: Booking["invoice"];
  paymentOption: Booking["paymentOption"];
  status: Booking["status"];
  source?: Booking["source"];
  googleEventId?: string;
  paymentChannel?: Booking["paymentChannel"];
  depositReceiptUrl?: string;
  depositVerificationStatus?: Booking["depositVerificationStatus"];
  balanceReceiptUrl?: string;
  balanceVerificationStatus?: Booking["balanceVerificationStatus"];
  depositPaidAt?: string;
  balancePaidAt?: string;
  balancePaidRm?: number;
  requestApprovedAt?: string;
  requestDeclinedAt?: string;
  requestPaymentOption?: Booking["requestPaymentOption"];
  paymentLinkAt?: string;
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
    ...(booking.clientDetails ? { clientDetails: booking.clientDetails } : {}),
    packageIds: booking.packageIds,
    packageNames: booking.packageNames,
    ...(booking.dayMode ? { dayMode: booking.dayMode } : {}),
    addOnIds: booking.addOnIds,
    sessions: booking.sessions.map((session) => ({
      ...session,
      date: toIsoDate(session.date as Date | string) ?? new Date().toISOString(),
    })),
    invoice: booking.invoice,
    paymentOption: booking.paymentOption,
    status: booking.status,
    source: booking.source ?? "bridalync",
    googleEventId: booking.googleEventId,
    paymentChannel: booking.paymentChannel,
    depositReceiptUrl: booking.depositReceiptUrl,
    depositVerificationStatus: booking.depositVerificationStatus,
    balanceReceiptUrl: booking.balanceReceiptUrl,
    balanceVerificationStatus: booking.balanceVerificationStatus,
    depositPaidAt: toIsoDate(booking.depositPaidAt as Date | string | undefined),
    balancePaidAt: toIsoDate(booking.balancePaidAt as Date | string | undefined),
    balancePaidRm: booking.balancePaidRm,
    requestApprovedAt: toIsoDate(
      booking.requestApprovedAt as Date | string | undefined
    ),
    requestDeclinedAt: toIsoDate(
      booking.requestDeclinedAt as Date | string | undefined
    ),
    requestPaymentOption: booking.requestPaymentOption,
    paymentLinkAt: toIsoDate(booking.paymentLinkAt as Date | string | undefined),
    created_at: toIsoDate(booking.created_at as Date | string | undefined),
    updated_at: toIsoDate(booking.updated_at as Date | string | undefined),
  };
}
