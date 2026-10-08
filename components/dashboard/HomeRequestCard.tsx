"use client";

import Link from "next/link";
import {
  IconAlertTriangle,
  IconBrandInstagram,
  IconExternalLink,
  IconMapPin,
} from "@tabler/icons-react";

import {
  BookingRequestButtons,
  formatBookedClashes,
  formatCompetingRequests,
  type BookedClash,
} from "@/components/dashboard/BookingRequestButtons";
import {
  formatScheduleDate,
  glassCardClassName,
} from "@/components/dashboard/HomeBookingCard";
import { cn } from "@/lib/utils";
import { buildInstagramProfileUrl } from "@/utils/booking/clientInfo";
import { formatRm } from "@/utils/booking/pricing";
import type { SerializedBooking } from "@/utils/booking/serializeBooking";
import { formatLocationAddress } from "@/utils/session";

export type HomeRequestItem = {
  booking: SerializedBooking;
  /** Other open requests that clash; approving this one declines them. */
  competingCount: number;
  /** Booked clients on this request's travel days; approving keeps them. */
  bookedClashes: BookedClash[];
};

export function HomeRequestCard({
  item,
  className,
  onBookingUpdated,
  onBookingsDeclined,
}: {
  item: HomeRequestItem;
  className?: string;
  onBookingUpdated?: (booking: SerializedBooking) => void;
  onBookingsDeclined?: (ids: string[]) => void;
}) {
  const { booking, competingCount, bookedClashes } = item;
  const sessions = booking.sessions.filter(
    (session) => session.status !== "cancelled"
  );
  const location = sessions.find((session) => session.location)?.location;
  const instagram = booking.clientDetails?.instagram;

  return (
    <div
      className={cn(
        glassCardClassName,
        "relative flex flex-col gap-3 p-4 transition-colors hover:bg-white/40 dark:hover:bg-white/15",
        className
      )}
    >
      <Link
        href={`/dashboard/bookings/${encodeURIComponent(booking._id)}`}
        scroll={false}
        className="absolute inset-0 rounded-2xl"
        aria-label={`View booking request from ${booking.contact.name}`}
      />
      <div className="pointer-events-none relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold">{booking.contact.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {booking.packageNames}
          </p>
        </div>
        <p className="shrink-0 text-sm font-semibold tabular-nums">
          {formatRm(booking.invoice.totalRm)}
        </p>
      </div>

      <ul className="pointer-events-none relative flex flex-col gap-0.5 text-sm">
        {sessions.map((session, index) => (
          <li key={index} className="truncate">
            <span className="font-medium">
              {formatScheduleDate(session.date)} · {session.time_slot.startTime} –{" "}
              {session.time_slot.endTime}
            </span>
            {sessions.length > 1 && session.name ? (
              <span className="text-muted-foreground"> · {session.name}</span>
            ) : null}
          </li>
        ))}
      </ul>

      {location ? (
        <p className="pointer-events-none relative flex min-w-0 items-start gap-1.5 text-sm text-muted-foreground">
          <IconMapPin className="mt-0.5 size-4 shrink-0" />
          <span className="line-clamp-1">{formatLocationAddress(location)}</span>
        </p>
      ) : null}

      {instagram || competingCount > 0 ? (
        <div className="relative flex flex-wrap items-center gap-2">
          {instagram ? (
            <a
              href={buildInstagramProfileUrl(instagram)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-full border border-zinc-900/10 bg-white/40 px-3 text-sm font-medium backdrop-blur-sm transition-colors hover:bg-white/60 dark:border-white/20 dark:bg-white/10 dark:hover:bg-white/15"
              aria-label={`Open @${instagram} on Instagram`}
            >
              <IconBrandInstagram className="size-4 shrink-0 text-rose-900 dark:text-rose-400" />
              <span className="truncate">@{instagram}</span>
              <IconExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
            </a>
          ) : null}
          {competingCount > 0 ? (
            <span className="pointer-events-none inline-flex items-center gap-1 text-xs text-muted-foreground">
              <IconAlertTriangle className="size-3.5 shrink-0 text-amber-600" />
              {formatCompetingRequests(competingCount)} for the same slot
            </span>
          ) : null}
        </div>
      ) : null}

      {bookedClashes.length > 0 ? (
        <p className="pointer-events-none relative flex gap-1.5 text-xs text-amber-700 dark:text-amber-400">
          <IconAlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <span>
            Might clash (travel day): {formatBookedClashes(bookedClashes)}
          </span>
        </p>
      ) : null}

      <BookingRequestButtons
        className="relative mt-auto"
        booking={booking}
        competingCount={competingCount}
        bookedClashes={bookedClashes}
        onBookingUpdated={onBookingUpdated}
        onBookingsDeclined={onBookingsDeclined}
      />
    </div>
  );
}
