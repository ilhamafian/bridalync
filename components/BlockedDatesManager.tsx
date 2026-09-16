"use client";

import { useEffect, useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  dateKeysFromRange,
  formatDateRangeLabel,
  MAX_DATE_RANGE_DAYS,
} from "@/utils/booking/dateRange";

type BlockedDateRow = {
  _id?: string;
  date: string;
};

export function BlockedDatesManager({
  hideHeader = false,
  onSaved,
}: {
  hideHeader?: boolean;
  onSaved?: () => void;
}) {
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>();
  const [blockedDates, setBlockedDates] = useState<BlockedDateRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedDateKeys = useMemo(
    () => dateKeysFromRange(selectedRange),
    [selectedRange]
  );
  const selectedKey = selectedDateKeys.join(",");
  const blockedKeys = useMemo(
    () => new Set(blockedDates.map((item) => item.date)),
    [blockedDates]
  );
  const selectedBlockedCount = selectedDateKeys.filter((key) =>
    blockedKeys.has(key)
  ).length;
  const allSelectedBlocked =
    selectedDateKeys.length > 0 &&
    selectedBlockedCount === selectedDateKeys.length;

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
  }, [selectedKey]);

  async function handleToggle() {
    if (selectedDateKeys.length === 0) return;
    if (selectedDateKeys.length > MAX_DATE_RANGE_DAYS) {
      setError(`Choose up to ${MAX_DATE_RANGE_DAYS} days at a time.`);
      return;
    }

    const nextBlocked = !allSelectedBlocked;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/blocked-dates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dates: selectedDateKeys,
          blocked: nextBlocked,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : "Failed to update blocked dates."
        );
        return;
      }

      setBlockedDates((current) => {
        const selected = new Set(selectedDateKeys);
        const withoutRange = current.filter((item) => !selected.has(item.date));
        if (!nextBlocked) return withoutRange;
        const saved = (data.blocked_dates as BlockedDateRow[] | undefined) ??
          selectedDateKeys.map((date) => ({ date }));
        return [...withoutRange, ...saved];
      });

      const count = selectedDateKeys.length;
      setSuccess(
        nextBlocked
          ? count === 1
            ? "Date blocked. Clients cannot book this day."
            : `${count} dates blocked. Clients cannot book these days.`
          : count === 1
            ? "Date unblocked."
            : `${count} dates unblocked.`
      );
      onSaved?.();
    } finally {
      setSaving(false);
    }
  }

  const rangeLabel = formatDateRangeLabel(selectedRange);
  const count = selectedDateKeys.length;

  return (
    <div className="flex flex-col gap-4">
      {hideHeader ? null : (
        <div>
          <h2 className="text-lg font-semibold">Blocked Dates</h2>
          <p className="text-sm text-muted-foreground">
            Mark days when you are unavailable. Clients cannot book on blocked
            dates.
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
        <Card className="w-fit">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pick dates</CardTitle>
            <CardDescription>
              Tap a start and end date. Blocked dates are highlighted.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="range"
              selected={selectedRange}
              onSelect={setSelectedRange}
              numberOfMonths={1}
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
              {rangeLabel ?? "Select dates"}
            </CardTitle>
            <CardDescription>
              Block consecutive days to stop all bookings in that range.
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

            {count === 0 ? (
              <p className="text-sm text-muted-foreground">
                Choose a date, then tap another date to select the range.
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  {allSelectedBlocked
                    ? count === 1
                      ? "This date is currently blocked."
                      : `All ${count} selected dates are currently blocked.`
                    : selectedBlockedCount > 0
                      ? `${selectedBlockedCount} of ${count} selected dates are already blocked.`
                      : count === 1
                        ? "This date is currently available for booking."
                        : `${count} selected dates are currently available for booking.`}
                </p>
                <div className="flex justify-end">
                  <Button
                    variant={allSelectedBlocked ? "outline" : "destructive"}
                    onClick={handleToggle}
                    disabled={saving}
                  >
                    {saving
                      ? "Saving…"
                      : allSelectedBlocked
                        ? count === 1
                          ? "Unblock date"
                          : `Unblock ${count} dates`
                        : count === 1
                          ? "Block date"
                          : `Block ${count} dates`}
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
