"use client";

import { format, isSameDay, isToday } from "date-fns";

import { cn } from "@/lib/utils";

export function DayStrip({
  days,
  selected,
  onSelectDay,
}: {
  days: Date[];
  selected: Date;
  onSelectDay: (day: Date) => void;
}) {
  return (
    <div className="grid grid-cols-7 gap-0.5">
      {days.map((day) => {
        const selectedDay = isSameDay(day, selected);
        const today = isToday(day);

        return (
          <button
            key={day.toISOString()}
            type="button"
            onClick={() => onSelectDay(day)}
            className="flex flex-col items-center gap-1 rounded-lg py-1"
          >
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {format(day, "EEEEE")}
            </span>
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-full text-sm font-semibold tabular-nums",
                selectedDay && "bg-primary text-primary-foreground",
                !selectedDay && today && "text-primary",
                !selectedDay && !today && "text-foreground"
              )}
            >
              {format(day, "d")}
            </span>
          </button>
        );
      })}
    </div>
  );
}
