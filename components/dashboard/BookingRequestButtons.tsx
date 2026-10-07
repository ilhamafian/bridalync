"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconCheck, IconX } from "@tabler/icons-react";

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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SerializedBooking } from "@/utils/booking/serializeBooking";

export function formatCompetingRequests(count: number) {
  return `${count} other request${count === 1 ? "" : "s"}`;
}

/** Decline (confirmed) / Approve (confirmed when it auto-declines other requests) for a booking request. */
export function BookingRequestButtons({
  booking,
  competingCount,
  onBookingUpdated,
  onBookingsDeclined,
  className,
}: {
  booking: SerializedBooking;
  competingCount: number;
  onBookingUpdated?: (booking: SerializedBooking) => void;
  onBookingsDeclined?: (ids: string[]) => void;
  className?: string;
}) {
  const router = useRouter();
  const [working, setWorking] = useState<"approve" | "decline" | null>(null);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const competingLabel = formatCompetingRequests(competingCount);

  async function respond(action: "approve" | "decline") {
    if (working) return;
    setWorking(action);
    setError(null);
    try {
      const response = await fetch(
        `/api/bookings/${encodeURIComponent(booking._id)}/request`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(
          typeof data.error === "string" ? data.error : "Could not update the request."
        );
        return;
      }
      if (data.booking) onBookingUpdated?.(data.booking as SerializedBooking);
      if (Array.isArray(data.declinedIds) && data.declinedIds.length > 0) {
        onBookingsDeclined?.(data.declinedIds as string[]);
      }
      setDeclineOpen(false);
      setApproveOpen(false);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setWorking(null);
    }
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <div className="grid grid-cols-2 gap-2">
        <AlertDialog
          open={declineOpen}
          onOpenChange={(next) => {
            if (working) return;
            setDeclineOpen(next);
          }}
        >
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="min-h-11 gap-2"
              disabled={working !== null}
            >
              <IconX className="size-5" />
              Decline
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Decline this request?</AlertDialogTitle>
              <AlertDialogDescription>
                {booking.contact.name} will get an email saying you can&apos;t take
                this booking.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={working !== null}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={working !== null}
                onClick={(event) => {
                  event.preventDefault();
                  void respond("decline");
                }}
              >
                {working === "decline" ? "Declining…" : "Decline"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button
          type="button"
          size="lg"
          className="min-h-11 gap-2"
          disabled={working !== null}
          onClick={() => {
            if (competingCount > 0) {
              setApproveOpen(true);
            } else {
              void respond("approve");
            }
          }}
        >
          <IconCheck className="size-5" />
          {working === "approve" ? "Approving…" : "Approve"}
        </Button>
        <AlertDialog
          open={approveOpen}
          onOpenChange={(next) => {
            if (working) return;
            setApproveOpen(next);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Approve {booking.contact.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                {competingLabel} for this slot will be declined automatically,
                and those clients will get an email saying you can&apos;t take
                their booking.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={working !== null}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={working !== null}
                onClick={(event) => {
                  event.preventDefault();
                  void respond("approve");
                }}
              >
                {working === "approve" ? "Approving…" : "Approve"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
