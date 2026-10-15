import Link from "next/link";

import {
  formatScheduleDate,
  glassCardClassName,
} from "@/components/dashboard/HomeBookingCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatRm } from "@/utils/booking/pricing";
import {
  pendingPaymentAmountRm,
  pendingPaymentKind,
  pendingPaymentLabel,
  pendingPaymentStatusLabel,
  type PendingPaymentKind,
} from "@/utils/booking/paymentVerification";
import type { SerializedBooking } from "@/utils/booking/serializeBooking";

export type PendingPaymentItem = {
  booking: SerializedBooking;
  kind: PendingPaymentKind;
  amountRm: number;
};

export function toPendingPaymentItem(
  booking: SerializedBooking
): PendingPaymentItem | null {
  const kind = pendingPaymentKind(booking);
  const amountRm = pendingPaymentAmountRm(booking);
  if (!kind || amountRm == null) return null;
  return { booking, kind, amountRm };
}

function firstSession(booking: SerializedBooking) {
  return booking.sessions.find((session) => session.status !== "cancelled");
}

export function HomePendingPaymentCard({
  item,
  className,
}: {
  item: PendingPaymentItem;
  className?: string;
}) {
  const { booking, kind, amountRm } = item;
  const session = firstSession(booking);
  const href = `/dashboard/bookings/${encodeURIComponent(booking._id)}`;

  return (
    <div
      className={cn(
        glassCardClassName,
        "relative flex flex-col gap-4 p-4 transition-colors hover:bg-white/40 dark:hover:bg-white/15",
        className
      )}
    >
      <Link
        href={href}
        scroll={false}
        className="absolute inset-0 rounded-2xl"
        aria-label={`Review payment from ${booking.contact.name}`}
      />
      <div className="pointer-events-none relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">
            {session
              ? `${formatScheduleDate(session.date)} · ${session.time_slot.startTime} – ${session.time_slot.endTime}`
              : "Date TBD"}
          </p>
          <p className="truncate text-base font-semibold">
            {booking.contact.name}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {booking.packageNames}
            {session?.name ? ` · ${session.name}` : ""}
          </p>
        </div>
        <Badge variant="destructive">{pendingPaymentStatusLabel(kind)}</Badge>
      </div>
      <div className="relative mt-auto flex items-end justify-between gap-3">
        <p className="pointer-events-none text-sm font-semibold tabular-nums">
          {pendingPaymentLabel(kind)} · {formatRm(amountRm)}
        </p>
        <Button
          size="lg"
          tabIndex={-1}
          className="pointer-events-none min-h-11 flex-none px-4"
        >
          Review
        </Button>
      </div>
    </div>
  );
}
