"use client";

import { format } from "date-fns";
import { IconMail, IconMapPin, IconPhone } from "@tabler/icons-react";

import { InvoiceDownloadButton } from "@/components/dashboard/InvoiceDownloadButton";
import { NavigateButton } from "@/components/dashboard/NavigateButton";
import { cn } from "@/lib/utils";
import { formatRm } from "@/utils/booking/pricing";
import type { SerializedBooking } from "@/utils/booking/serializeBooking";
import { GOOGLE_IMPORT_CONTACT_EMAIL } from "@/utils/google/calendar";
import { isNavigableLocation } from "@/utils/maps";
import { formatLocationAddress } from "@/utils/session";
import {
  buildWhatsAppProfileUrl,
  formatWhatsAppDisplay,
} from "@/utils/socialLinks";

type BadgeVariant = "default" | "success" | "destructive" | "outline";

export function bookingStatusText(booking: SerializedBooking) {
  if (
    booking.depositVerificationStatus === "pending" &&
    booking.status === "pending"
  ) {
    return "Review deposit";
  }
  if (booking.depositVerificationStatus === "rejected") {
    return "Receipt rejected";
  }
  if (booking.balanceVerificationStatus === "pending") {
    return "Review balance";
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

function statusBadgeVariant(status: SerializedBooking["status"]): BadgeVariant {
  switch (status) {
    case "confirmed":
      return "default";
    case "completed":
      return "success";
    case "cancelled":
    case "failed":
      return "destructive";
    default:
      return "outline";
  }
}

export function bookingBadgeVariant(booking: SerializedBooking): BadgeVariant {
  if (
    (booking.depositVerificationStatus === "pending" &&
      booking.status === "pending") ||
    booking.balanceVerificationStatus === "pending" ||
    booking.depositVerificationStatus === "rejected"
  ) {
    return "destructive";
  }
  return statusBadgeVariant(booking.status);
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </p>
  );
}

export function BookingDetailsSections({
  booking,
  sectionClassName,
  sessionClassName = "rounded-lg border border-border/60 p-3",
}: {
  booking: SerializedBooking;
  sectionClassName?: string;
  sessionClassName?: string;
}) {
  const phone = formatWhatsAppDisplay(
    booking.contact.country_code,
    booking.contact.mobile
  );
  const whatsappUrl = buildWhatsAppProfileUrl(
    booking.contact.country_code,
    booking.contact.mobile
  );

  return (
    <>
      <div className={sectionClassName}>
        <SectionLabel>Contact</SectionLabel>
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

      <div className={sectionClassName}>
        <SectionLabel>Sessions</SectionLabel>
        {booking.sessions.length === 0 ? (
          <p className="mt-0.5 text-muted-foreground">No sessions</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-3">
            {booking.sessions.map((session, index) => (
              <li
                key={session.client_key ?? `${session.packageId}-${index}`}
                className={sessionClassName}
              >
                <p className="font-medium">
                  {session.name || `Session ${index + 1}`}
                </p>
                {session.styleName ? (
                  <p className="text-muted-foreground">{session.styleName}</p>
                ) : null}
                <p className="mt-1">{formatSessionDate(session.date)}</p>
                <p className="text-muted-foreground">
                  {formatTimeLabel(session.time_slot.startTime)} –{" "}
                  {formatTimeLabel(session.time_slot.endTime)}
                  {(session.slot_count ?? 1) > 1
                    ? ` · ${session.slot_count} slots`
                    : null}
                </p>
                {session.ready_by ? (
                  <p className="text-muted-foreground">
                    Ready by{" "}
                    <span className="font-medium text-foreground">
                      {formatTimeLabel(session.ready_by)}
                    </span>
                  </p>
                ) : null}
                {session.location ? (
                  <p className="mt-1.5 flex items-start gap-1.5 text-muted-foreground">
                    <IconMapPin className="mt-0.5 size-4 shrink-0" />
                    <span>{formatLocationAddress(session.location)}</span>
                  </p>
                ) : (
                  <p className="mt-1.5 text-muted-foreground">
                    No location yet
                  </p>
                )}
                <NavigateButton
                  lat={session.location?.location.lat ?? 0}
                  lng={session.location?.location.lng ?? 0}
                  disabled={!isNavigableLocation(session.location ?? null)}
                  className="mt-3 ml-auto flex w-1/3 min-w-fit"
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={sectionClassName}>
        <div className="flex items-center justify-between gap-3">
          <SectionLabel>Payment</SectionLabel>
          {booking.source !== "google_calendar" &&
          (booking.status === "confirmed" || booking.status === "completed") ? (
            <InvoiceDownloadButton
              bookingId={booking._id}
              label="Invoice"
              className="-my-1"
            />
          ) : null}
        </div>
        {booking.source === "google_calendar" ? (
          <p className="mt-0.5 text-muted-foreground">
            Imported bookings have no Bridalync invoice.
          </p>
        ) : (
          <PriceBreakdown booking={booking} />
        )}
      </div>
    </>
  );
}

function PriceRow({
  label,
  detail,
  amountRm,
  emphasis = false,
}: {
  label: string;
  detail?: string;
  amountRm: number;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className={emphasis ? "font-semibold" : undefined}>{label}</p>
        {detail ? (
          <p className="text-xs text-muted-foreground">{detail}</p>
        ) : null}
      </div>
      <p
        className={cn(
          "shrink-0 tabular-nums",
          emphasis && "font-semibold"
        )}
      >
        {formatRm(amountRm)}
      </p>
    </div>
  );
}

function PriceBreakdown({ booking }: { booking: SerializedBooking }) {
  const { invoice } = booking;
  const breakdown = invoice.breakdown;
  const isDeposit =
    booking.paymentOption === "deposit" && invoice.balanceRm > 0;

  return (
    <div className="mt-2 flex flex-col gap-3">
      {breakdown ? (
        <div className="flex flex-col gap-2">
          {breakdown.sessions
            .filter((item) => item.sessionKey == null)
            .map((item, index) => (
              <PriceRow
                key={`${item.label}-${index}`}
                label={item.label}
                detail="Event"
                amountRm={item.amountRm}
              />
            ))}
          {booking.sessions.map((session, index) => {
            const price = breakdown.sessions.find(
              (item) =>
                item.sessionKey != null &&
                item.sessionKey === session.client_key
            );
            if (!price) return null;
            const name = session.name || `Session ${index + 1}`;
            return (
              <PriceRow
                key={session.client_key ?? `${session.packageId}-${index}`}
                label={name}
                detail={price.label !== name ? price.label : undefined}
                amountRm={price.amountRm}
              />
            );
          })}
          {breakdown.addOns.map((addOn, index) => (
            <PriceRow
              key={`${addOn.label}-${index}`}
              label={addOn.label}
              detail="Add-on"
              amountRm={addOn.amountRm}
            />
          ))}
          <PriceRow label="Travel fee" amountRm={breakdown.travelFeeRm} />
          {breakdown.discountRm ? (
            <PriceRow label="Discount" amountRm={-breakdown.discountRm} />
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {invoice.lineItems.map((item, index) => (
            <PriceRow
              key={`${item.label}-${index}`}
              label={item.label}
              amountRm={item.amountRm}
            />
          ))}
          <p className="text-xs text-muted-foreground">
            Saved before itemised pricing. Any travel fee is included in the
            first item.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2 border-t border-border/60 pt-3">
        <PriceRow label="Total" amountRm={invoice.totalRm} emphasis />
        {isDeposit ? (
          <>
            <PriceRow label="Deposit" amountRm={invoice.depositRm} />
            <PriceRow label="Balance remaining" amountRm={invoice.balanceRm} />
          </>
        ) : (
          <p className="text-muted-foreground">Full payment</p>
        )}
        {booking.paymentChannel === "manual_transfer" ? (
          <p className="text-muted-foreground">Manual transfer</p>
        ) : null}
      </div>
    </div>
  );
}
