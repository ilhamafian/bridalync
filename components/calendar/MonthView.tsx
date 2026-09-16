"use client";

import { format, isSameMonth, isToday } from "date-fns";

import { cn } from "@/lib/utils";

import { BlockedMarker, HotMarker } from "./CalendarMarkers";
import type { CalendarEvent } from "./calendar-types";
import { eventsForDay, isMarkedDay } from "./calendar-utils";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function MonthView({
  cursor,
  days,
  events,
  blockedKeys,
  hotKeys,
  onSelectDay,
  onSelectEvent,
}: {
  cursor: Date;
  days: Date[];
  events: CalendarEvent[];
  blockedKeys: Set<string>;
  hotKeys: Set<string>;
  onSelectDay: (day: Date) => void;
  onSelectEvent?: (event: CalendarEvent) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background">
      <div className="grid grid-cols-7 border-b border-border bg-muted/40">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="px-2 py-2 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 auto-rows-[minmax(6.5rem,1fr)]">
        {days.map((day) => {
          const dayEvents = eventsForDay(events, day);
          const inMonth = isSameMonth(day, cursor);
          const today = isToday(day);
          const blocked = isMarkedDay(day, blockedKeys);
          const hot = isMarkedDay(day, hotKeys);
          const visibleEvents = dayEvents.slice(0, 3);

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "flex min-h-26 flex-col gap-1 border-b border-r border-border p-2 text-left",
                !inMonth && "bg-muted/20 text-muted-foreground",
                blocked && "bg-destructive/8",
                !blocked && hot && "bg-amber-500/10"
              )}
            >
              <div className="flex items-center justify-between gap-1">
                <button
                  type="button"
                  onClick={() => onSelectDay(day)}
                  className={cn(
                    "inline-flex size-7 items-center justify-center rounded-full text-sm tabular-nums hover:bg-muted",
                    today &&
                      "bg-primary font-semibold text-primary-foreground hover:bg-primary"
                  )}
                >
                  {format(day, "d")}
                </button>
                <span className="flex items-center gap-0.5">
                  {blocked ? <BlockedMarker label={false} /> : null}
                  {hot ? <HotMarker label={false} /> : null}
                </span>
              </div>

              <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden">
                {visibleEvents.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => onSelectEvent?.(event)}
                    className="truncate rounded-sm bg-primary/15 px-1.5 py-0.5 text-left text-[11px] text-foreground hover:bg-primary/25"
                    title={`${event.clientName} · ${event.title}`}
                  >
                    <span className="font-medium">
                      {format(event.start, "h:mma").toLowerCase()}
                    </span>{" "}
                    {event.clientName}
                  </button>
                ))}
                {dayEvents.length > visibleEvents.length ? (
                  <button
                    type="button"
                    onClick={() => onSelectDay(day)}
                    className="px-1 text-left text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    +{dayEvents.length - visibleEvents.length} more
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
