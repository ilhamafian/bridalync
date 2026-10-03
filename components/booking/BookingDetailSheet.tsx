"use client";

import {
  BookingDetailsSections,
  bookingBadgeVariant,
  bookingStatusText,
} from "@/components/booking/BookingDetailsContent";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { SerializedBooking } from "@/utils/booking/serializeBooking";

export function BookingDetailSheet({
  booking,
  onClose,
  onEdit,
}: {
  booking: SerializedBooking | null;
  onClose: () => void;
  onEdit: (booking: SerializedBooking) => void;
}) {
  return (
    <Sheet open={booking != null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="bottom"
        contained
        className="max-h-[85dvh] overflow-y-auto rounded-t-2xl"
      >
        {booking ? (
          <>
            <SheetHeader className="pr-10">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <SheetTitle className="text-base">
                    {booking.contact.name}
                  </SheetTitle>
                  <SheetDescription>{booking.packageNames}</SheetDescription>
                </div>
                <Badge variant={bookingBadgeVariant(booking)}>
                  {bookingStatusText(booking)}
                </Badge>
              </div>
              {booking.source === "google_calendar" ? (
                <p className="text-xs text-muted-foreground">
                  Imported from Google Calendar
                </p>
              ) : null}
            </SheetHeader>

            <div className="flex flex-col gap-4 px-6 pb-2 text-sm">
              <BookingDetailsSections booking={booking} />
            </div>

            <SheetFooter>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="min-h-11"
                onClick={() => onEdit(booking)}
              >
                Edit booking
              </Button>
            </SheetFooter>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
