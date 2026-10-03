"use client";

import Link from "next/link";
import { IconPencil } from "@tabler/icons-react";

import {
  BookingDetailsSections,
  bookingBadgeVariant,
  bookingStatusText,
} from "@/components/booking/BookingDetailsContent";
import { BackButton } from "@/components/dashboard/BackButton";
import { glassCardClassName } from "@/components/dashboard/HomeBookingCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SerializedBooking } from "@/utils/booking/serializeBooking";

export function BookingDetailsPage({
  booking,
}: {
  booking: SerializedBooking | null;
}) {
  if (!booking) {
    return (
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <BackButton />
        <div
          className={cn(
            glassCardClassName,
            "px-4 py-8 text-center text-sm text-muted-foreground"
          )}
        >
          Booking not found.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <BackButton />

      <section className="flex flex-col gap-1">
        <div className="flex items-start justify-between gap-3">
          <h2 className="min-w-0 text-xl font-semibold tracking-tight">
            {booking.contact.name}
          </h2>
          <Badge variant={bookingBadgeVariant(booking)} className="mt-1">
            {bookingStatusText(booking)}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{booking.packageNames}</p>
        {booking.source === "google_calendar" ? (
          <p className="text-xs text-muted-foreground">
            Imported from Google Calendar
          </p>
        ) : null}
      </section>

      <div className="flex flex-col gap-3 text-sm">
        <BookingDetailsSections
          booking={booking}
          sectionClassName={cn(glassCardClassName, "p-4")}
          sessionClassName="rounded-xl bg-white/40 p-3 dark:bg-white/5"
        />
      </div>

      <Button asChild variant="outline" size="lg" className="min-h-11 gap-2">
        <Link
          href={`/dashboard/bookings/${encodeURIComponent(booking._id)}/edit`}
          scroll={false}
        >
          <IconPencil className="size-5" />
          Edit booking
        </Link>
      </Button>
    </div>
  );
}
