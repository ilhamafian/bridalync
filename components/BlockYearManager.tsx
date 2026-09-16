"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  getCurrentBookingYear,
  getDefaultMaxBookingYear,
  getEffectiveMaxBookingYear,
} from "@/utils/booking/bookingWindow";

export function BlockYearManager({
  initialMaxBookingYear,
  hideHeader = false,
  onSaved,
}: {
  initialMaxBookingYear?: number;
  hideHeader?: boolean;
  onSaved?: () => void;
}) {
  const currentYear = useMemo(() => getCurrentBookingYear(), []);
  const nextYear = currentYear + 1;
  const defaultMax = useMemo(() => getDefaultMaxBookingYear(), []);

  const [maxBookingYear, setMaxBookingYear] = useState(
    getEffectiveMaxBookingYear(initialMaxBookingYear)
  );
  const [draftYear, setDraftYear] = useState(String(maxBookingYear));
  const [loading, setLoading] = useState(initialMaxBookingYear === undefined);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (initialMaxBookingYear !== undefined) return;

    let cancelled = false;
    async function loadSettings() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/settings");
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          if (!cancelled) {
            setError(
              typeof data.error === "string"
                ? data.error
                : "Failed to load booking year setting."
            );
          }
          return;
        }
        const stored = data.setting?.max_booking_year as number | undefined;
        const effective = getEffectiveMaxBookingYear(stored);
        if (!cancelled) {
          setMaxBookingYear(effective);
          setDraftYear(String(effective));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadSettings();
    return () => {
      cancelled = true;
    };
  }, [initialMaxBookingYear]);

  async function handleSave() {
    const nextValue = Number.parseInt(draftYear, 10);
    if (nextValue !== currentYear && nextValue !== nextYear) {
      setError("Choose this year or next year.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ max_booking_year: nextValue }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : "Failed to save booking year."
        );
        return;
      }

      const saved = getEffectiveMaxBookingYear(
        data.setting?.max_booking_year as number | undefined
      );
      setMaxBookingYear(saved);
      setDraftYear(String(saved));
      setSuccess(
        saved === currentYear
          ? `Bookings closed for ${nextYear}. Clients can book through ${currentYear}.`
          : `Bookings open through ${nextYear}.`
      );
      onSaved?.();
    } finally {
      setSaving(false);
    }
  }

  const isDirty = Number.parseInt(draftYear, 10) !== maxBookingYear;

  return (
    <div className="flex flex-col gap-4">
      {hideHeader ? null : (
        <div>
          <h2 className="text-lg font-semibold">Booking Year</h2>
          <p className="text-sm text-muted-foreground">
            Close next year until you are ready to take bookings.
          </p>
        </div>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Accept bookings through</CardTitle>
          <CardDescription>
            Default is open through {defaultMax}. Choose this year to keep{" "}
            {nextYear} closed.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}
          {success ? (
            <p className="text-sm text-rose-700 dark:text-rose-400">
              {success}
            </p>
          ) : null}
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <>
              <RadioGroup
                value={draftYear}
                onValueChange={(value) => {
                  setDraftYear(value);
                  setSuccess(null);
                  setError(null);
                }}
                className="gap-3"
                disabled={saving}
              >
                <div className="flex items-center gap-3">
                  <RadioGroupItem
                    value={String(currentYear)}
                    id="max-year-current"
                  />
                  <Label htmlFor="max-year-current" className="font-normal">
                    This year ({currentYear}) — {nextYear} stays closed
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <RadioGroupItem
                    value={String(nextYear)}
                    id="max-year-next"
                  />
                  <Label htmlFor="max-year-next" className="font-normal">
                    Next year ({nextYear})
                  </Label>
                </div>
              </RadioGroup>

              <div className="flex justify-end">
                <Button
                  onClick={handleSave}
                  disabled={saving || !isDirty}
                >
                  {saving ? "Saving…" : "Save"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
