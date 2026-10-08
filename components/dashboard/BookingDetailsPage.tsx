"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconAlertTriangle,
  IconCheck,
  IconCopy,
  IconPencil,
  IconTrash,
} from "@tabler/icons-react";

import {
  BookingDetailsSections,
  bookingBadgeVariant,
  bookingStatusText,
} from "@/components/booking/BookingDetailsContent";
import { BackButton } from "@/components/dashboard/BackButton";
import {
  BookingRequestButtons,
  formatBookedClashes,
  formatCompetingRequests,
  TRAVEL_CLASH_HINT,
  type BookedClash,
} from "@/components/dashboard/BookingRequestButtons";
import { glassCardClassName } from "@/components/dashboard/HomeBookingCard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SerializedBooking } from "@/utils/booking/serializeBooking";

function BookingIdRow({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);

  async function copyId() {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be unavailable (e.g. insecure context); the ID stays selectable.
    }
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span>Booking ID</span>
      <span className="font-mono text-foreground select-all">{id}</span>
      <button
        type="button"
        onClick={() => void copyId()}
        className="flex size-6 items-center justify-center rounded-md transition-colors hover:bg-white/40 hover:text-foreground dark:hover:bg-white/10"
        aria-label={copied ? "Booking ID copied" : "Copy booking ID"}
      >
        {copied ? (
          <IconCheck className="size-3.5 text-primary" aria-hidden />
        ) : (
          <IconCopy className="size-3.5" aria-hidden />
        )}
      </button>
    </div>
  );
}

function DeleteBookingButton({ booking }: { booking: SerializedBooking }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(event: React.MouseEvent) {
    event.preventDefault();
    if (deleting) return;

    setDeleting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/bookings/${encodeURIComponent(booking._id)}`,
        { method: "DELETE" }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : "Failed to delete booking."
        );
        return;
      }

      setOpen(false);
      router.replace("/dashboard/bookings", { scroll: false });
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (deleting) return;
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="lg"
          className="min-h-11 gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <IconTrash className="size-5" />
          Delete booking
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this booking?</AlertDialogTitle>
          <AlertDialogDescription>
            {booking.contact.name}&apos;s booking and its sessions will be
            permanently removed. Payments already received are not refunded.
            This can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function BookingRequestActions({
  booking,
  competingRequests,
  bookedClashes,
  onBookingUpdated,
  onBookingsDeclined,
}: {
  booking: SerializedBooking;
  competingRequests: SerializedBooking[];
  bookedClashes: BookedClash[];
  onBookingUpdated?: (booking: SerializedBooking) => void;
  onBookingsDeclined?: (ids: string[]) => void;
}) {
  const competingCount = competingRequests.length;

  return (
    <div className={cn(glassCardClassName, "flex flex-col gap-3 p-4 text-sm")}>
      <div>
        <p className="font-medium">Booking request</p>
        <p className="mt-0.5 text-muted-foreground">
          Approving emails {booking.contact.name} a link to pay and keeps the
          slot for them. Until you approve someone, other clients can request
          it too.
        </p>
        {competingCount > 0 ? (
          <p className="mt-2 text-muted-foreground">
            <span className="font-medium text-foreground">
              {formatCompetingRequests(competingCount)}
            </span>{" "}
            (
            {competingRequests
              .map((request) => request.contact.name)
              .join(", ")}
            ) for the same slot will be declined if you approve this one.
          </p>
        ) : null}
        {bookedClashes.length > 0 ? (
          <p className="mt-2 flex gap-1.5 text-amber-700 dark:text-amber-400">
            <IconAlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>
              Might clash with your schedule: {formatBookedClashes(bookedClashes)}.{" "}
              {TRAVEL_CLASH_HINT}
            </span>
          </p>
        ) : null}
      </div>
      <BookingRequestButtons
        booking={booking}
        competingCount={competingCount}
        bookedClashes={bookedClashes}
        onBookingUpdated={onBookingUpdated}
        onBookingsDeclined={onBookingsDeclined}
      />
    </div>
  );
}

export function BookingDetailsPage({
  booking,
  competingRequests = [],
  bookedClashes = [],
  onBookingUpdated,
  onBookingsDeclined,
}: {
  booking: SerializedBooking | null;
  /** Other open requests that clash with this booking (declined if it's approved). */
  competingRequests?: SerializedBooking[];
  /** Booked clients on this request's travel days (kept if it's approved). */
  bookedClashes?: BookedClash[];
  onBookingUpdated?: (booking: SerializedBooking) => void;
  onBookingsDeclined?: (ids: string[]) => void;
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
        <BookingIdRow id={booking._id} />
        {booking.source === "google_calendar" ? (
          <p className="text-xs text-muted-foreground">
            Imported from Google Calendar
          </p>
        ) : null}
      </section>

      {booking.status === "requested" ? (
        <BookingRequestActions
          booking={booking}
          competingRequests={competingRequests}
          bookedClashes={bookedClashes}
          onBookingUpdated={onBookingUpdated}
          onBookingsDeclined={onBookingsDeclined}
        />
      ) : null}

      <div className="flex flex-col gap-3 text-sm">
        <BookingDetailsSections
          booking={booking}
          sectionClassName={cn(glassCardClassName, "p-4")}
          sessionClassName="rounded-xl bg-white/40 p-3 dark:bg-white/5"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Button asChild variant="outline" size="lg" className="min-h-11 gap-2">
          <Link
            href={`/dashboard/bookings/${encodeURIComponent(booking._id)}/edit`}
            scroll={false}
          >
            <IconPencil className="size-5" />
            Edit booking
          </Link>
        </Button>
        <DeleteBookingButton booking={booking} />
      </div>
    </div>
  );
}
