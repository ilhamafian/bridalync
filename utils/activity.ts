import type { Booking } from "@/schemas/bookingSchema";
import {
  needsPaymentVerification,
  pendingPaymentAmountRm,
} from "@/utils/booking/paymentVerification";
import type { SerializedBooking } from "@/utils/booking/serializeBooking";
import { getBookingPayments } from "@/utils/payments";

export type ActivityKind =
  | "request"
  | "verification"
  | "new"
  | "deposit"
  | "balance"
  | "full"
  | "completed"
  | "cancelled"
  | "rescheduled"
  | "details";

export type ActivityItem = {
  /** Stable per booking + event; used to track read state. */
  id: string;
  bookingId: string;
  kind: ActivityKind;
  label: string;
  clientName: string;
  packageName: string;
  /** Amount paid for payment events, booking total otherwise. */
  amountRm: number;
  balanceRm: number;
  bookingStatus: Booking["status"];
  at: string;
};

export type NotificationReadState = {
  /** Everything at or before this ISO time counts as read. */
  seenAt: string;
  /** Activity ids read individually after `seenAt`. */
  readIds: string[];
};

const ACTIVITY_LABELS: Record<ActivityKind, string> = {
  request: "Booking request",
  verification: "Payment pending",
  new: "New booking",
  deposit: "Deposit received",
  balance: "Balance payment received",
  full: "Full payment received",
  completed: "Booking completed",
  cancelled: "Booking cancelled",
  rescheduled: "Client changed the date",
  details: "Client updated their details",
};

function bookingUpdatedAt(booking: SerializedBooking) {
  return booking.updated_at ?? booking.created_at ?? new Date().toISOString();
}

function getBookingActivity(booking: SerializedBooking): ActivityItem[] {
  const base = {
    bookingId: booking._id,
    clientName: booking.contact.name,
    packageName: booking.packageNames,
    balanceRm: booking.invoice.balanceRm,
    bookingStatus: booking.status,
  };
  const event = (
    kind: ActivityKind,
    amountRm: number,
    at: string,
    label = ACTIVITY_LABELS[kind]
  ): ActivityItem => ({
    ...base,
    id: `${booking._id}-${kind}`,
    kind,
    label,
    amountRm,
    at,
  });

  const clientEdits: ActivityItem[] = [];
  if (booking.clientRescheduledAt) {
    clientEdits.push(
      event("rescheduled", booking.invoice.totalRm, booking.clientRescheduledAt)
    );
  }
  if (booking.clientDetailsUpdatedAt) {
    clientEdits.push(
      event("details", booking.invoice.totalRm, booking.clientDetailsUpdatedAt)
    );
  }

  if (booking.status === "failed") return clientEdits;
  if (booking.status === "requested") {
    return [
      event(
        "request",
        booking.invoice.totalRm,
        booking.created_at ?? bookingUpdatedAt(booking)
      ),
      ...clientEdits,
    ];
  }
  if (booking.status === "cancelled") {
    return [
      event(
        "cancelled",
        booking.invoice.totalRm,
        booking.clientCancelledAt ?? bookingUpdatedAt(booking),
        booking.clientCancelledAt
          ? "Booking cancelled by client"
          : ACTIVITY_LABELS.cancelled
      ),
      ...clientEdits,
    ];
  }

  if (needsPaymentVerification(booking)) {
    return [
      event(
        "verification",
        pendingPaymentAmountRm(booking) ?? booking.invoice.totalRm,
        bookingUpdatedAt(booking)
      ),
      ...clientEdits,
    ];
  }

  const items = getBookingPayments(booking).map((payment) =>
    event(payment.kind, payment.amountRm, payment.at)
  );

  if (booking.status === "completed") {
    items.push(
      event("completed", booking.invoice.totalRm, bookingUpdatedAt(booking))
    );
  }

  items.push(...clientEdits);

  if (items.length === 0) {
    items.push(
      event(
        "new",
        booking.invoice.totalRm,
        booking.created_at ?? bookingUpdatedAt(booking)
      )
    );
  }

  return items;
}

/** Booking and payment events, newest first. */
export function getRecentActivity(
  bookings: SerializedBooking[],
  limit?: number
): ActivityItem[] {
  return bookings
    .flatMap(getBookingActivity)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit);
}

export function isActivityUnread(
  item: ActivityItem,
  state: NotificationReadState
) {
  return (
    new Date(item.at).getTime() > new Date(state.seenAt).getTime() &&
    !state.readIds.includes(item.id)
  );
}
