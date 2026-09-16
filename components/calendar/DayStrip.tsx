"use client";

import { format, isSameDay, isToday } from "date-fns";

import { cn } from "@/lib/utils";

import { BlockedMarker, HotMarker } from "./CalendarMarkers";
import { isMarkedDay } from "./calendar-utils";

export function DayStrip({
  days,
  selected,
  blockedKeys,
  hotKeys,
  onSelectDay,
}: {
  days: Date[];
  selected: Date;
  blockedKeys: Set<string>;
  hotKeys: Set<string>;
  onSelectDay: (day: Date) => void;
}) {
  return (
    <div className="grid grid-cols-7 gap-0.5">
      {days.map((day) => {
        const selectedDay = isSameDay(day, selected);
        const today = isToday(day);
        const blocked = isMarkedDay(day, blockedKeys);
        const hot = isMarkedDay(day, hotKeys);

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
                !selectedDay && !today && blocked && "text-destructive",
                !selectedDay && !today && !blocked && hot && "text-amber-700 dark:text-amber-400",
                !selectedDay && !today && !blocked && !hot && "text-foreground"
              )}
            >
              {format(day, "d")}
            </span>
            <span className="flex h-3.5 items-center justify-center gap-0.5">
              {blocked ? <BlockedMarker label={false} className="[&_svg]:size-3" /> : null}
              {hot ? <HotMarker label={false} className="[&_svg]:size-3" /> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
