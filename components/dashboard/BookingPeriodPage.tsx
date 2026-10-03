"use client";

import { useState } from "react";
import { differenceInCalendarDays, format } from "date-fns";

import { BackButton } from "@/components/dashboard/BackButton";
import {
  DashboardCalendar,
  parseDateKey,
} from "@/components/dashboard/DashboardCalendar";
import { glassCardClassName } from "@/components/dashboard/HomeBookingCard";
import {
  SettingsFeedback,
  SettingsSection,
} from "@/components/dashboard/settings/SettingsUi";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toDateKey } from "@/utils/booking/availability";

const closedDayClassName = "text-muted-foreground/50 line-through";

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function formatCountdown(date: Date) {
  const days = differenceInCalendarDays(date, startOfToday());
  if (days === 0) return "Today is the last bookable day";
  if (days === 1) return "1 day from today";
  return `${days.toLocaleString()} days from today`;
}

export function BookingPeriodPage({
  bookingUntil,
  onBookingUntilChange,
}: {
  bookingUntil: string;
  onBookingUntilChange: (bookingUntil: string) => void;
}) {
  const [selected, setSelected] = useState(() => parseDateKey(bookingUntil));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedKey = toDateKey(selected);
  const dirty = selectedKey !== bookingUntil;
  const today = startOfToday();

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_until: selectedKey }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : "Failed to save booking period."
        );
        return;
      }

      onBookingUntilChange(selectedKey);
      setSuccess("Booking period saved.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <BackButton />

      <div>
        <h2 className="text-lg font-semibold">Booking period</h2>
        <p className="text-sm text-muted-foreground">
          Clients can&apos;t book past this date
        </p>
      </div>

      <div
        className={cn(
          glassCardClassName,
          "flex flex-col items-center gap-1 px-4 py-6 text-center"
        )}
      >
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Bookings open until
        </span>
        <span className="text-4xl font-semibold tracking-tight text-primary tabular-nums">
          {format(selected, "d MMM yyyy")}
        </span>
        <span className="text-sm text-muted-foreground">
          {format(selected, "EEEE")} · {formatCountdown(selected)}
        </span>
        {dirty ? (
          <span className="mt-1 text-xs text-muted-foreground">
            Currently {format(parseDateKey(bookingUntil), "d MMM yyyy")} · not
            saved yet
          </span>
        ) : null}
      </div>

      <SettingsSection title="Pick the last bookable date">
        <div className={cn(glassCardClassName, "overflow-hidden")}>
          <DashboardCalendar
            mode="single"
            required
            selected={selected}
            onSelect={(next) => {
              setSelected(next);
              setError(null);
              setSuccess(null);
            }}
            defaultMonth={selected}
            captionLayout="dropdown"
            startMonth={today}
            endMonth={new Date(today.getFullYear() + 5, 11, 1)}
            disabled={{ before: today }}
            modifiers={{ closed: { after: selected } }}
            modifiersClassNames={{ closed: closedDayClassName }}
          />
          <p className="flex items-center gap-2 border-t border-white/50 px-4 py-3 text-xs text-muted-foreground dark:border-white/10">
            <span className="text-muted-foreground/50 line-through">12</span>
            Closed to clients · existing bookings aren&apos;t affected
          </p>
        </div>
      </SettingsSection>

      <SettingsFeedback error={error} success={success} />
      <Button
        type="button"
        size="lg"
        className="min-h-11"
        onClick={() => void handleSave()}
        disabled={saving || !dirty}
      >
        {saving ? "Saving…" : "Save booking period"}
      </Button>
    </div>
  );
}
