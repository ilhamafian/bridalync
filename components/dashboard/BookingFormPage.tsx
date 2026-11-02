"use client";
import { GlassCard } from "@/components/dashboard/GlassCard";

import { useRouter } from "next/navigation";

import {
  BookingForm,
  type BookingFormCatalog,
  type BookingFormOccupancy,
} from "@/components/booking/BookingForm";
import { BackButton } from "@/components/dashboard/BackButton";
import { cn } from "@/lib/utils";
import type { SerializedBooking } from "@/utils/booking/serializeBooking";

export function BookingFormPage({
  mode,
  booking,
  catalog,
  occupancy,
  onSaved,
}: {
  mode: "new" | "edit";
  booking: SerializedBooking | null;
  catalog: BookingFormCatalog;
  occupancy: BookingFormOccupancy;
  onSaved: (booking: SerializedBooking) => void;
}) {
  const router = useRouter();

  if (mode === "edit" && !booking) {
    return (
      <div className="flex flex-col gap-4 px-4 md:px-8">
        <BackButton />
        <GlassCard
          className={cn("px-4 py-8 text-center text-sm text-muted-foreground")}
        >
          Booking not found.
        </GlassCard>
      </div>
    );
  }

  const title =
    mode === "new"
      ? "New booking"
      : booking?.source === "google_calendar"
        ? "Edit imported booking"
        : "Edit booking";

  function handleSaved(saved: SerializedBooking) {
    onSaved(saved);
    router.replace(`/dashboard/bookings/${encodeURIComponent(saved._id)}`, {
      scroll: false,
    });
    router.refresh();
  }

  function handleCancel() {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 md:px-8">
      <BackButton />
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <GlassCard className="p-4 [--liquid-glass-fill:rgb(255_255_255/0.72)] dark:[--liquid-glass-fill:rgb(24_24_27/0.78)]">
        <BookingForm
          key={booking?._id ?? "new"}
          booking={booking}
          {...catalog}
          occupancy={occupancy}
          onSaved={handleSaved}
          onCancel={handleCancel}
        />
      </GlassCard>
    </div>
  );
}
