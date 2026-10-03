"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { DateRange } from "react-day-picker";

import { BackButton } from "@/components/dashboard/BackButton";
import { SummaryRow } from "@/components/dashboard/blocked/SummaryRow";
import {
  DashboardCalendar,
  blockedDayClassName,
  parseDateKey,
} from "@/components/dashboard/DashboardCalendar";
import { glassCardClassName } from "@/components/dashboard/HomeBookingCard";
import {
  SettingsFeedback,
  SettingsSection,
  settingsListClassName,
} from "@/components/dashboard/settings/SettingsUi";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  dateKeysFromRange,
  formatDateRangeLabel,
  MAX_DATE_RANGE_DAYS,
} from "@/utils/booking/dateRange";
import type { BlockedDateItem } from "@/utils/dashboardShell";

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export function BlockDatesPage({
  blockedDates,
  onBlockedDatesChange,
}: {
  blockedDates: BlockedDateItem[];
  onBlockedDatesChange: (dates: BlockedDateItem[]) => void;
}) {
  const router = useRouter();
  const [range, setRange] = useState<DateRange | undefined>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedKeys = useMemo(() => dateKeysFromRange(range), [range]);
  const blockedKeys = useMemo(
    () => new Set(blockedDates.map((item) => item.date)),
    [blockedDates]
  );
  const blockedDays = useMemo(
    () => [...blockedKeys].map(parseDateKey),
    [blockedKeys]
  );

  const count = selectedKeys.length;
  const alreadyBlocked = selectedKeys.filter((key) => blockedKeys.has(key)).length;
  const unblocking = count > 0 && alreadyBlocked === count;
  const tooMany = count > MAX_DATE_RANGE_DAYS;

  const statusText =
    count === 0
      ? "—"
      : unblocking
        ? "Already blocked"
        : alreadyBlocked > 0
          ? `${alreadyBlocked} of ${count} already blocked`
          : "Available for booking";

  const actionLabel = saving
    ? "Saving…"
    : count === 0
      ? "Block dates"
      : `${unblocking ? "Unblock" : "Block"} ${count === 1 ? "date" : `${count} dates`}`;

  async function handleSubmit() {
    if (count === 0) return;
    if (tooMany) {
      setError(`Choose up to ${MAX_DATE_RANGE_DAYS} days at a time.`);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/blocked-dates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dates: selectedKeys, blocked: !unblocking }),
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

      const selected = new Set(selectedKeys);
      const remaining = blockedDates.filter((item) => !selected.has(item.date));
      const now = new Date().toISOString();
      onBlockedDatesChange(
        unblocking
          ? remaining
          : [
              ...remaining,
              ...selectedKeys.map((date) => ({
                date,
                createdAt:
                  blockedDates.find((item) => item.date === date)?.createdAt ??
                  now,
              })),
            ]
      );
      setRange(undefined);
      router.replace("/dashboard/blocked", { scroll: false });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <BackButton fallbackHref="/dashboard/blocked" />

      <div>
        <h2 className="text-lg font-semibold">Block dates</h2>
        <p className="text-sm text-muted-foreground">
          Clients can&apos;t book on blocked days
        </p>
      </div>

      <SettingsSection title="Pick dates">
        <div className={cn(glassCardClassName, "overflow-hidden")}>
          <DashboardCalendar
            mode="range"
            selected={range}
            onSelect={(next) => {
              setRange(next);
              setError(null);
            }}
            disabled={{ before: startOfToday() }}
            modifiers={{ blocked: blockedDays }}
            modifiersClassNames={{ blocked: blockedDayClassName }}
          />
          <p className="flex items-center gap-2 border-t border-white/50 px-4 py-3 text-xs text-muted-foreground dark:border-white/10">
            <span className="size-2.5 rounded-full bg-destructive/40" />
            Already blocked · tap a start and end date
          </p>
        </div>
      </SettingsSection>

      <SettingsSection title="Summary">
        <div className={settingsListClassName}>
          <SummaryRow
            label="Dates"
            value={formatDateRangeLabel(range) ?? "None selected"}
          />
          <SummaryRow
            label="Days"
            value={count === 0 ? "—" : String(count)}
          />
          <SummaryRow label="Status" value={statusText} />
        </div>
      </SettingsSection>

      <SettingsFeedback
        error={
          error ??
          (tooMany ? `Choose up to ${MAX_DATE_RANGE_DAYS} days at a time.` : null)
        }
      />
      <Button
        type="button"
        size="lg"
        variant={unblocking ? "outline" : "default"}
        className="min-h-11"
        onClick={() => void handleSubmit()}
        disabled={saving || count === 0 || tooMany}
      >
        {actionLabel}
      </Button>
    </div>
  );
}
