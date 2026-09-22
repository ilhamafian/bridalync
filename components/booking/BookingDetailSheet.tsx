"use client";

import { format } from "date-fns";
import { IconMail, IconMapPin, IconPhone } from "@tabler/icons-react";

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
import type { SerializedBooking } from "@/utils/booking/serializeBooking";
import { GOOGLE_IMPORT_CONTACT_EMAIL } from "@/utils/google/calendar";
import { isNavigableLocation } from "@/utils/maps";
import { formatLocationAddress } from "@/utils/session";
import {
  buildWhatsAppProfileUrl,
  formatWhatsAppDisplay,
} from "@/utils/socialLinks";

function statusLabel(booking: SerializedBooking) {
  if (
    booking.paymentChannel === "manual_transfer" &&
    booking.depositVerificationStatus === "pending" &&
    booking.status === "pending"
  ) {
    return "Awaiting payment verification";
  }
  if (booking.depositVerificationStatus === "rejected") {
    return "Receipt rejected";
  }
  if (booking.balanceVerificationStatus === "pending") {
    return "Balance receipt pending";
  }

  switch (booking.status) {
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
      return booking.status;
  }
}

function statusBadgeVariant(
  status: SerializedBooking["status"]
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

function formatTimeLabel(hhmm: string): string {
  const [hourRaw, minuteRaw] = hhmm.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return hhmm;

  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${period}`;
}

function formatSessionDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No date";
  return format(date, "EEEE, d MMMM yyyy");
}

export function BookingDetailSheet({
  booking,
  onClose,
  onEdit,
}: {
  booking: SerializedBooking | null;
  onClose: () => void;
  onEdit: (booking: SerializedBooking) => void;
}) {
  const firstNavigable = booking?.sessions.find((session) =>
    isNavigableLocation(session.location ?? null)
  );
  const location = firstNavigable?.location ?? null;
  const navigable = isNavigableLocation(location);
  const phone = booking
    ? formatWhatsAppDisplay(booking.contact.country_code, booking.contact.mobile)
    : null;
  const whatsappUrl = booking
    ? buildWhatsAppProfileUrl(
        booking.contact.country_code,
        booking.contact.mobile
      )
    : null;

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
                <Badge variant={statusBadgeVariant(booking.status)}>
                  {statusLabel(booking)}
                </Badge>
              </div>
              {booking.source === "google_calendar" ? (
                <p className="text-xs text-muted-foreground">
                  Imported from Google Calendar
                </p>
              ) : null}
            </SheetHeader>

            <div className="flex flex-col gap-4 px-6 pb-2 text-sm">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Contact
                </p>
                <div className="mt-1 flex flex-col gap-1 text-muted-foreground">
                  {whatsappUrl && phone && phone !== "Not set" ? (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 hover:text-foreground"
                    >
                      <IconPhone className="size-4 shrink-0" />
                      {phone}
                    </a>
                  ) : (
                    <span>No phone number</span>
                  )}
                  {booking.contact.email &&
                  booking.contact.email !== GOOGLE_IMPORT_CONTACT_EMAIL ? (
                    <a
                      href={`mailto:${booking.contact.email}`}
                      className="inline-flex items-center gap-1.5 hover:text-foreground"
                    >
                      <IconMail className="size-4 shrink-0" />
                      {booking.contact.email}
                    </a>
                  ) : null}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Sessions
                </p>
                {booking.sessions.length === 0 ? (
                  <p className="mt-0.5 text-muted-foreground">No sessions</p>
                ) : (
                  <ul className="mt-2 flex flex-col gap-3">
                    {booking.sessions.map((session, index) => (
                      <li
                        key={session.client_key ?? `${session.packageId}-${index}`}
                        className="rounded-lg border border-border/60 p-3"
                      >
                        <p className="font-medium">
                          {session.name || `Session ${index + 1}`}
                        </p>
                        {session.styleName ? (
                          <p className="text-muted-foreground">
                            {session.styleName}
                          </p>
                        ) : null}
                        <p className="mt-1">{formatSessionDate(session.date)}</p>
                        <p className="text-muted-foreground">
                          {formatTimeLabel(session.time_slot.startTime)} –{" "}
                          {formatTimeLabel(session.time_slot.endTime)}
                        </p>
                        {session.location ? (
                          <p className="mt-1.5 flex items-start gap-1.5 text-muted-foreground">
                            <IconMapPin className="mt-0.5 size-4 shrink-0" />
                            <span>
                              {formatLocationAddress(session.location)}
                            </span>
                          </p>
                        ) : (
                          <p className="mt-1.5 text-muted-foreground">
                            No location yet
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {booking.source === "google_calendar" ? (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Payment
                  </p>
                  <p className="mt-0.5 text-muted-foreground">
                    Imported bookings have no Bridalync invoice.
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Payment
                  </p>
                  <p className="mt-0.5">
                    {formatRm(booking.invoice.totalRm)} total
                    {booking.paymentOption === "deposit"
                      ? ` · ${formatRm(booking.invoice.depositRm)} deposit`
                      : " · paid in full"}
                  </p>
                  {booking.invoice.balanceRm > 0 &&
                  booking.paymentOption === "deposit" ? (
                    <p className="text-muted-foreground">
                      {formatRm(booking.invoice.balanceRm)} remaining
                    </p>
                  ) : null}
                  {booking.paymentChannel === "manual_transfer" ? (
                    <p className="mt-0.5 text-muted-foreground">
                      Manual transfer
                    </p>
                  ) : null}
                </div>
              )}
            </div>

            <SheetFooter className="gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="min-h-11 flex-1"
                onClick={() => onEdit(booking)}
              >
                Edit booking
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
