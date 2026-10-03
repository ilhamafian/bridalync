"use client";

import { format } from "date-fns";
import { IconCalendarEvent, IconX } from "@tabler/icons-react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatDateRangeLabel } from "@/utils/booking/dateRange";

export type { DateRange };

/** Whether a YYYY-MM-DD key falls inside the range (inclusive); no range matches everything. */
export function isDateKeyInRange(dateKey: string, range: DateRange | undefined) {
  if (!range?.from) return true;
  const from = format(range.from, "yyyy-MM-dd");
  const to = format(range.to ?? range.from, "yyyy-MM-dd");
  return dateKey >= from && dateKey <= to;
}

export function DateRangeFilter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: DateRange | undefined;
  onChange: (value: DateRange | undefined) => void;
}) {
  const active = Boolean(value?.from);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={label}
          className={cn(
            "relative size-10 shrink-0 rounded-lg border border-zinc-900/10 bg-white/40 shadow-sm backdrop-blur-sm hover:bg-white/50 dark:border-white/20 dark:bg-white/10 dark:hover:bg-white/15",
            active && "text-primary"
          )}
        >
          <IconCalendarEvent className="size-5" />
          {active ? (
            <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary" />
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="z-100 w-76 gap-0 overflow-hidden rounded-2xl bg-white/80 p-0 shadow-lg ring-1 ring-white/60 backdrop-blur-xl dark:bg-zinc-950/75 dark:ring-white/15"
      >
        <Calendar
          mode="range"
          selected={value}
          onSelect={onChange}
          numberOfMonths={1}
          defaultMonth={value?.from}
          className={cn(
            "w-full p-3 [--cell-radius:var(--radius-lg)] [--cell-size:--spacing(9)]",
            "[&_[data-range-middle=true]]:bg-primary/10! [&_[data-range-middle=true]]:text-primary!"
          )}
          classNames={{
            root: "w-full",
            range_start:
              "relative isolate z-0 rounded-l-(--cell-radius) bg-primary/10 after:absolute after:inset-y-0 after:right-0 after:w-4 after:bg-primary/10",
            range_end:
              "relative isolate z-0 rounded-r-(--cell-radius) bg-primary/10 after:absolute after:inset-y-0 after:left-0 after:w-4 after:bg-primary/10",
            today:
              "rounded-(--cell-radius) font-semibold text-primary data-[selected=true]:rounded-none",
          }}
        />
        <div className="flex items-center justify-between gap-3 border-t border-white/60 px-4 py-3 dark:border-white/10">
          <span
            className={cn(
              "min-w-0 truncate text-sm",
              active ? "font-medium" : "text-muted-foreground"
            )}
          >
            {formatDateRangeLabel(value) ?? "Pick a start and end date"}
          </span>
          <button
            type="button"
            disabled={!active}
            onClick={() => onChange(undefined)}
            className="shrink-0 text-sm font-medium text-primary hover:underline disabled:pointer-events-none disabled:opacity-40"
          >
            Clear
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Removable pill showing the active range, rendered under the tabs. */
export function DateRangeChip({
  value,
  onClear,
}: {
  value: DateRange | undefined;
  onClear: () => void;
}) {
  const label = formatDateRangeLabel(value);
  if (!label) return null;

  return (
    <button
      type="button"
      onClick={onClear}
      className="flex items-center gap-1.5 self-start rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      aria-label={`Clear date range ${label}`}
    >
      {label}
      <IconX className="size-3.5" aria-hidden />
    </button>
  );
}
