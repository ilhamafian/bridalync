"use client";

import { format } from "date-fns";
import { IconMail, IconMapPin, IconPhone } from "@tabler/icons-react";
import Link from "next/link";

import { NavigateButton } from "@/components/dashboard/NavigateButton";
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
import { formatRm } from "@/utils/booking/pricing";
import { isNavigableLocation } from "@/utils/maps";
import { formatLocationAddress } from "@/utils/session";
import { formatWhatsAppDisplay } from "@/utils/socialLinks";

import type { CalendarEvent } from "./calendar-types";

function bookingStatusLabel(status: CalendarEvent["status"]) {
  switch (status) {
    case "confirmed":
      return "Confirmed";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    case "pending":
      return "Awaiting payment";
    case "enquiry":
      return "Enquiry";
    case "failed":
      return "Payment failed";
    default:
      return status;
  }
}

function bookingStatusVariant(
  status: CalendarEvent["status"]
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "confirmed":
      return "default";
    case "completed":
      return "secondary";
    case "cancelled":
    case "failed":
      return "destructive";
    default:
      return "outline";
  }
}

export function EventDetailSheet({
  event,
  onClose,
}: {
  event: CalendarEvent | null;
  onClose: () => void;
}) {
  const location = event?.location ?? null;
  const navigable = isNavigableLocation(location);
  const phone = event
    ? formatWhatsAppDisplay(event.contact.country_code, event.contact.mobile)
    : null;
  const hasPhone = Boolean(
    event?.contact.mobile?.trim() && event.contact.country_code?.trim()
  );

  return (
    <Sheet open={event != null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="bottom"
        contained
        className="max-h-[85dvh] overflow-y-auto rounded-t-2xl"
      >
        {event ? (
          <>
            <SheetHeader className="pr-10">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <SheetTitle className="text-base">
                    {event.clientName}
                  </SheetTitle>
                  <SheetDescription>
                    {event.title}
                    {event.styleName ? ` · ${event.styleName}` : null}
                  </SheetDescription>
                </div>
                <Badge variant={bookingStatusVariant(event.status)}>
                  {bookingStatusLabel(event.status)}
                </Badge>
              </div>
            </SheetHeader>

            <div className="flex flex-col gap-4 px-6 pb-2 text-sm">
              <div>
                <p className="font-medium">
                  {format(event.start, "EEEE, d MMMM yyyy")}
                </p>
                <p className="text-muted-foreground">
                  {format(event.start, "h:mm a")} – {format(event.end, "h:mm a")}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Package
                </p>
                <p className="mt-0.5">{event.packageName}</p>
              </div>

              {location ? (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Location
                  </p>
                  <p className="mt-0.5 flex items-start gap-1.5 text-muted-foreground">
                    <IconMapPin className="mt-0.5 size-4 shrink-0" />
                    <span>{formatLocationAddress(location)}</span>
                  </p>
                </div>
              ) : null}

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Contact
                </p>
                <div className="mt-1 flex flex-col gap-1 text-muted-foreground">
                  {hasPhone && phone && phone !== "Not set" ? (
                    <a
                      href={`tel:${event.contact.country_code}${event.contact.mobile}`}
                      className="inline-flex items-center gap-1.5 hover:text-foreground"
                    >
                      <IconPhone className="size-4 shrink-0" />
                      {phone}
                    </a>
                  ) : (
                    <span>No phone number</span>
                  )}
                  {event.contact.email ? (
                    <a
                      href={`mailto:${event.contact.email}`}
                      className="inline-flex items-center gap-1.5 hover:text-foreground"
                    >
                      <IconMail className="size-4 shrink-0" />
                      {event.contact.email}
                    </a>
                  ) : null}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Payment
                </p>
                <p className="mt-0.5">
                  {formatRm(event.invoice.totalRm)} total
                  {event.paymentOption === "deposit"
                    ? ` · ${formatRm(event.invoice.depositRm)} deposit`
                    : " · paid in full"}
                </p>
                {event.invoice.balanceRm > 0 &&
                event.paymentOption === "deposit" ? (
                  <p className="text-muted-foreground">
                    {formatRm(event.invoice.balanceRm)} remaining
                  </p>
                ) : null}
              </div>
            </div>

            <SheetFooter className="gap-2 sm:flex-row">
              <Button asChild variant="outline" size="lg" className="min-h-11 flex-1">
                <Link href="/dashboard/bookings" scroll={false}>
                  View booking
                </Link>
              </Button>
              <NavigateButton
                lat={location?.location.lat ?? 0}
                lng={location?.location.lng ?? 0}
                disabled={!navigable}
              />
            </SheetFooter>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
