"use client";

import type { ComponentProps } from "react";

import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

/** Calendar with the dashboard's rose range styling; fills its container width. */
export function DashboardCalendar({
  className,
  classNames,
  ...props
}: ComponentProps<typeof Calendar>) {
  return (
    <Calendar
      className={cn(
        "w-full bg-transparent p-3 [--cell-radius:var(--radius-lg)] [--cell-size:--spacing(9)]",
        "[&_[data-range-middle=true]]:bg-primary/10! [&_[data-range-middle=true]]:text-primary!",
        className
      )}
      classNames={{
        root: "w-full",
        range_start:
          "relative isolate z-0 rounded-l-(--cell-radius) bg-primary/10 after:absolute after:inset-y-0 after:right-0 after:w-4 after:bg-primary/10",
        range_end:
          "relative isolate z-0 rounded-r-(--cell-radius) bg-primary/10 after:absolute after:inset-y-0 after:left-0 after:w-4 after:bg-primary/10",
        today:
          "rounded-(--cell-radius) font-semibold text-primary data-[selected=true]:rounded-none",
        ...classNames,
      }}
      {...props}
    />
  );
}

/** `modifiersClassNames.blocked` for days that are fully blocked. */
export const blockedDayClassName =
  "rounded-(--cell-radius) bg-destructive/10 font-medium text-destructive";

/** `modifiersClassNames.hot` for days with hot date prices. */
export const hotDayClassName =
  "rounded-(--cell-radius) bg-amber-500/15 font-medium text-amber-700 dark:text-amber-400";

export function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}
