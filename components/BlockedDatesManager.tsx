"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { toDateKey } from "@/utils/booking/availability";
import {
  buildBlockedDateSet,
  isDateBlocked,
} from "@/utils/booking/blockedDates";

type BlockedDateRow = {
  _id?: string;
  date: string;
};

export function BlockedDatesManager() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [blockedDates, setBlockedDates] = useState<BlockedDateRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedDateKey = selectedDate ? toDateKey(selectedDate) : null;
  const blockedKeys = useMemo(
    () => buildBlockedDateSet(blockedDates.map((item) => item.date)),
    [blockedDates]
  );
  const selectedIsBlocked = selectedDate
    ? isDateBlocked(selectedDate, blockedKeys)
    : false;

  const markedDates = useMemo(() => {
    return [...blockedKeys]
      .map((key) => {
        const [year, month, day] = key.split("-").map(Number);
        return new Date(year, month - 1, day, 12, 0, 0, 0);
      })
      .filter((date) => !Number.isNaN(date.getTime()));
  }, [blockedKeys]);

  useEffect(() => {
    let cancelled = false;

    async function loadBlockedDates() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/blocked-dates");
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          if (!cancelled) {
            setError(
              typeof data.error === "string"
                ? data.error
                : "Failed to load blocked dates."
            );
          }
          return;
        }
        if (!cancelled) {
          setBlockedDates((data.blocked_dates as BlockedDateRow[]) ?? []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadBlockedDates();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setSuccess(null);
    setError(null);
  }, [selectedDateKey]);

  async function handleToggle() {
    if (!selectedDateKey) return;

    const nextBlocked = !selectedIsBlocked;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/blocked-dates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDateKey,
          blocked: nextBlocked,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : "Failed to update blocked date."
        );
        return;
      }

      setBlockedDates((current) => {
        const withoutDate = current.filter(
          (item) => item.date !== selectedDateKey
        );
        if (!nextBlocked) return withoutDate;
        const saved = (data.blocked_dates as BlockedDateRow[] | undefined) ?? [
          { date: selectedDateKey },
        ];
        return [...withoutDate, ...saved];
      });
      setSuccess(
        nextBlocked
          ? "Date blocked. Clients cannot book this day."
          : "Date unblocked."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Blocked Dates</h2>
        <p className="text-sm text-muted-foreground">
          Mark days when you are unavailable. Clients cannot book on blocked
          dates.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
        <Card className="w-fit">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pick a date</CardTitle>
            <CardDescription>
              Blocked dates are highlighted.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              modifiers={{ blocked: markedDates }}
              modifiersClassNames={{
                blocked: "bg-destructive/15 text-destructive font-medium",
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {selectedDate
                ? format(selectedDate, "d MMM yyyy")
                : "Select a date"}
            </CardTitle>
            <CardDescription>
              Block a day to stop all bookings on that date.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}
            {success ? (
              <p className="text-sm text-emerald-700 dark:text-emerald-400">
                {success}
              </p>
            ) : null}
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : null}

            {!selectedDateKey ? (
              <p className="text-sm text-muted-foreground">
                Choose a date on the calendar to block or unblock it.
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  {selectedIsBlocked
                    ? "This date is currently blocked."
                    : "This date is currently available for booking."}
                </p>
                <div className="flex justify-end">
                  <Button
                    variant={selectedIsBlocked ? "outline" : "destructive"}
                    onClick={handleToggle}
                    disabled={saving}
                  >
                    {saving
                      ? "Saving…"
                      : selectedIsBlocked
                        ? "Unblock date"
                        : "Block date"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
