"use client";

import { useEffect, useMemo, useState } from "react";
import { format, isSameDay, isToday } from "date-fns";

import { cn } from "@/lib/utils";

import type { CalendarEvent } from "./calendar-types";
import {
  formatHourLabel,
  getEventOffset,
  getHourLabels,
  getNowOffsetHours,
} from "./calendar-utils";

export function TimeGrid({
  days,
  events,
  onSelectDay,
  onSelectEvent,
}: {
  days: Date[];
  events: CalendarEvent[];
  onSelectDay?: (day: Date) => void;
  onSelectEvent?: (event: CalendarEvent) => void;
}) {
  const hours = getHourLabels();
  const isDayView = days.length === 1;
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const nowOffset = useMemo(() => getNowOffsetHours(now), [now]);

  return (
    <div className="min-w-0 overflow-x-hidden border-y border-border bg-background [--cal-hour-height:2.75rem] sm:mx-4 sm:rounded-xl sm:border sm:[--cal-hour-height:3.5rem]">
      <div
        className={cn("grid w-full min-w-0", isDayView && "pt-3")}
        style={{
          gridTemplateColumns: isDayView
            ? "2.5rem minmax(0, 1fr)"
            : "2.25rem repeat(7, minmax(0, 1fr))",
        }}
      >
        {isDayView ? null : (
          <>
            <div className="sticky top-0 z-20 border-b border-border bg-background" />
            {days.map((day) => {
              const today = isToday(day);

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={onSelectDay ? () => onSelectDay(day) : undefined}
                  className={cn(
                    "sticky top-0 z-20 min-w-0 border-b border-l border-border bg-background px-0.5 py-1.5 text-center sm:px-2 sm:py-3",
                    today && "bg-primary/5",
                    !onSelectDay && "pointer-events-none"
                  )}
                >
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
                    {format(day, "EEEEE")}
                  </p>
                  <p
                    className={cn(
                      "mx-auto mt-0.5 flex size-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums sm:mt-1 sm:size-8 sm:text-base",
                      today && "bg-primary text-primary-foreground"
                    )}
                  >
                    {format(day, "d")}
                  </p>
                </button>
              );
            })}
          </>
        )}

        <div className="bg-background">
          {hours.slice(0, -1).map((hour) => (
            <div
              key={hour}
              className="relative border-b border-border/70"
              style={{ height: "var(--cal-hour-height)" }}
            >
              <span className="absolute -top-2 right-0.5 text-[9px] leading-none whitespace-nowrap text-muted-foreground sm:right-1.5 sm:text-[11px]">
                {formatHourLabel(hour, true)}
              </span>
            </div>
          ))}
        </div>

        {days.map((day) => {
          const dayEvents = events.filter((event) => isSameDay(event.start, day));
          const showNow = isToday(day) && nowOffset != null;

          return (
            <div
              key={`${day.toISOString()}-grid`}
              className="relative min-w-0 border-l border-border"
              style={{
                height: `calc(${hours.length - 1} * var(--cal-hour-height))`,
              }}
            >
              {hours.slice(0, -1).map((hour) => (
                <div
                  key={hour}
                  className="border-b border-border/70"
                  style={{ height: "var(--cal-hour-height)" }}
                />
              ))}

              {showNow ? (
                <div
                  className="pointer-events-none absolute inset-x-0 z-20"
                  style={{
                    top: `calc(${nowOffset} * var(--cal-hour-height))`,
                  }}
                >
                  <div className="relative h-px bg-destructive">
                    <span className="absolute -top-1 -left-1 size-2 rounded-full bg-destructive" />
                  </div>
                </div>
              ) : null}

              {dayEvents.map((event) => {
                const { startHours, durationHours } = getEventOffset(event);

                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => onSelectEvent?.(event)}
                    className={cn(
                      "absolute z-10 overflow-hidden rounded-sm border border-primary/25 bg-primary/15 text-left text-foreground",
                      isDayView
                        ? "inset-x-1.5 rounded-md px-2 py-1 text-xs"
                        : "inset-x-px px-0.5 py-px text-[9px] leading-tight sm:inset-x-0.5 sm:px-1 sm:text-[11px]"
                    )}
                    style={{
                      top: `calc(${startHours} * var(--cal-hour-height))`,
                      height: `calc(${durationHours} * var(--cal-hour-height))`,
                      minHeight: isDayView ? "2rem" : "1.1rem",
                    }}
                    title={`${event.clientName} · ${event.title}`}
                  >
                    <span className="block truncate font-medium">
                      {event.clientName}
                    </span>
                    {isDayView ? (
                      <span className="block truncate text-muted-foreground">
                        {format(event.start, "h:mm a")} – {event.title}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
