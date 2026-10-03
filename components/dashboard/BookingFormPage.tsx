"use client";

import { useRouter } from "next/navigation";

import {
  BookingForm,
  type BookingFormCatalog,
} from "@/components/booking/BookingForm";
import { BackButton } from "@/components/dashboard/BackButton";
import { glassCardClassName } from "@/components/dashboard/HomeBookingCard";
import { cn } from "@/lib/utils";
import type { SerializedBooking } from "@/utils/booking/serializeBooking";

export function BookingFormPage({
  mode,
  booking,
  catalog,
  onSaved,
}: {
  mode: "new" | "edit";
  booking: SerializedBooking | null;
  catalog: BookingFormCatalog;
  onSaved: (booking: SerializedBooking) => void;
}) {
  const router = useRouter();

  if (mode === "edit" && !booking) {
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
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <BackButton />
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <BookingForm
        key={booking?._id ?? "new"}
        booking={booking}
        {...catalog}
        onSaved={handleSaved}
        onCancel={handleCancel}
        className={cn(
          glassCardClassName,
          "bg-white/70 p-4 backdrop-blur-md dark:bg-zinc-900/70"
        )}
      />
    </div>
  );
}
