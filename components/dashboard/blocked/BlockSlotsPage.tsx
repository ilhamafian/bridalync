"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { IconClock } from "@tabler/icons-react";

import { BackButton } from "@/components/dashboard/BackButton";
import { SummaryRow } from "@/components/dashboard/blocked/SummaryRow";
import {
  DashboardCalendar,
  blockedDayClassName,
  parseDateKey,
} from "@/components/dashboard/DashboardCalendar";
import { EmptyCard } from "@/components/dashboard/DashboardHome";
import { glassCardClassName } from "@/components/dashboard/HomeBookingCard";
import {
  IconBadge,
  RowText,
  SettingsFeedback,
  SettingsSection,
  settingsListClassName,
  settingsRowClassName,
} from "@/components/dashboard/settings/SettingsUi";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { TimeSlot } from "@/schemas/settingSchema";
import { timeRangesOverlap, toDateKey } from "@/utils/booking/availability";
import type { SerializedBooking } from "@/utils/booking/serializeBooking";
import type {
  BlockedDateItem,
  BlockedSlotItem,
} from "@/utils/dashboardShell";

const OCCUPYING_STATUSES = new Set(["pending", "confirmed", "completed"]);

type SlotState =
  | { kind: "available" }
  | { kind: "booked"; clientName: string }
  | { kind: "blocked" };

function slotKey(slot: TimeSlot) {
  return `${slot.startTime}-${slot.endTime}`;
}

function formatSlot(slot: TimeSlot) {
  return `${slot.startTime} – ${slot.endTime}`;
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export function BlockSlotsPage({
  timeSlots,
  bookings,
  blockedDates,
  blockedSlots,
  onBlockedSlotsChange,
}: {
  timeSlots: TimeSlot[];
  bookings: SerializedBooking[];
  blockedDates: BlockedDateItem[];
  blockedSlots: BlockedSlotItem[];
  onBlockedSlotsChange: (slots: BlockedSlotItem[]) => void;
}) {
  const router = useRouter();
  const [date, setDate] = useState<Date | undefined>();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dateKey = date ? format(date, "yyyy-MM-dd") : null;
  const blockedDays = useMemo(
    () => blockedDates.map((item) => parseDateKey(item.date)),
    [blockedDates]
  );

  const sortedSlots = useMemo(
    () => [...timeSlots].sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [timeSlots]
  );

  const slotStates = useMemo(() => {
    const states = new Map<string, SlotState>();
    if (!dateKey) return states;

    const daySessions = bookings
      .filter((booking) => OCCUPYING_STATUSES.has(booking.status))
      .flatMap((booking) =>
        booking.sessions
          .filter(
            (session) =>
              session.status !== "cancelled" &&
              toDateKey(session.date) === dateKey
          )
          .map((session) => ({ clientName: booking.contact.name, session }))
      );
    const dayBlocked = blockedSlots.filter((slot) => slot.date === dateKey);

    for (const slot of sortedSlots) {
      const booked = daySessions.find(({ session }) =>
        timeRangesOverlap(session.time_slot, slot)
      );
      if (booked) {
        states.set(slotKey(slot), {
          kind: "booked",
          clientName: booked.clientName,
        });
      } else if (dayBlocked.some((blocked) => timeRangesOverlap(blocked, slot))) {
        states.set(slotKey(slot), { kind: "blocked" });
      } else {
        states.set(slotKey(slot), { kind: "available" });
      }
    }
    return states;
  }, [dateKey, bookings, blockedSlots, sortedSlots]);

  const selectedSlots = sortedSlots.filter((slot) =>
    selected.has(slotKey(slot))
  );
  const count = selectedSlots.length;

  function toggleSlot(slot: TimeSlot, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(slotKey(slot));
      else next.delete(slotKey(slot));
      return next;
    });
    setError(null);
  }

  async function handleSubmit() {
    if (!dateKey || count === 0) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/blocked-slots", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: dateKey,
          slots: selectedSlots.map(({ startTime, endTime }) => ({
            startTime,
            endTime,
          })),
          blocked: true,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : "Failed to block slots."
        );
        return;
      }

      const saved = (data.blocked_slots as BlockedSlotItem[] | undefined) ?? [];
      onBlockedSlotsChange([
        ...blockedSlots.filter((slot) => slot.date !== dateKey),
        ...saved,
      ]);
      setDate(undefined);
      setSelected(new Set());
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
        <h2 className="text-lg font-semibold">Block slots</h2>
        <p className="text-sm text-muted-foreground">
          Close specific time slots on a day without blocking the whole day
        </p>
      </div>

      <SettingsSection title="Pick a date">
        <div className={cn(glassCardClassName, "overflow-hidden")}>
          <DashboardCalendar
            mode="single"
            selected={date}
            onSelect={(next) => {
              setDate(next);
              setSelected(new Set());
              setError(null);
            }}
            disabled={[{ before: startOfToday() }, ...blockedDays]}
            modifiers={{ blocked: blockedDays }}
            modifiersClassNames={{ blocked: blockedDayClassName }}
          />
          <p className="flex items-center gap-2 border-t border-white/50 px-4 py-3 text-xs text-muted-foreground dark:border-white/10">
            <span className="size-2.5 rounded-full bg-destructive/40" />
            Whole day already blocked
          </p>
        </div>
      </SettingsSection>

      <SettingsSection title="Slots">
        {sortedSlots.length === 0 ? (
          <EmptyCard>
            You have no time slots yet.{" "}
            <Link
              href="/dashboard/settings/time-slots"
              scroll={false}
              className="font-medium text-primary hover:underline"
            >
              Set them up in Settings
            </Link>
          </EmptyCard>
        ) : !dateKey ? (
          <EmptyCard>Pick a date to see its slots.</EmptyCard>
        ) : (
          <div className={settingsListClassName}>
            {sortedSlots.map((slot) => {
              const key = slotKey(slot);
              const state = slotStates.get(key) ?? { kind: "available" };
              const disabled = state.kind !== "available";
              const description =
                state.kind === "booked"
                  ? `Booked · ${state.clientName}`
                  : state.kind === "blocked"
                    ? "Already blocked"
                    : "Available";
              return (
                <label
                  key={key}
                  className={cn(
                    settingsRowClassName,
                    disabled
                      ? "cursor-not-allowed opacity-60 hover:bg-transparent dark:hover:bg-transparent"
                      : "cursor-pointer"
                  )}
                >
                  <IconBadge icon={IconClock} />
                  <RowText title={formatSlot(slot)} description={description} />
                  <Checkbox
                    checked={state.kind === "blocked" || selected.has(key)}
                    disabled={disabled}
                    onCheckedChange={(checked) =>
                      toggleSlot(slot, checked === true)
                    }
                    aria-label={`Block ${formatSlot(slot)}`}
                  />
                </label>
              );
            })}
          </div>
        )}
      </SettingsSection>

      <SettingsSection title="Summary">
        <div className={settingsListClassName}>
          <SummaryRow
            label="Date"
            value={date ? format(date, "EEE, d MMM yyyy") : "None selected"}
          />
          <SummaryRow
            label={count === 1 ? "Slot" : "Slots"}
            value={
              count === 0 ? (
                "None selected"
              ) : (
                <span className="flex flex-col items-end gap-0.5">
                  {selectedSlots.map((slot) => (
                    <span key={slotKey(slot)} className="tabular-nums">
                      {formatSlot(slot)}
                    </span>
                  ))}
                </span>
              )
            }
          />
        </div>
      </SettingsSection>

      <SettingsFeedback error={error} />
      <Button
        type="button"
        size="lg"
        className="min-h-11"
        onClick={() => void handleSubmit()}
        disabled={saving || !dateKey || count === 0}
      >
        {saving
          ? "Blocking…"
          : count > 1
            ? `Block ${count} slots`
            : "Block slots"}
      </Button>
    </div>
  );
}
