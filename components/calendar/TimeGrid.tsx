"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { format, isSameDay, isToday } from "date-fns";

import { cn } from "@/lib/utils";

import { BlockedMarker, HotMarker } from "./CalendarMarkers";
import {
  CALENDAR_DAY_END_HOUR,
  CALENDAR_DAY_START_HOUR,
  type CalendarEvent,
} from "./calendar-types";
import {
  addMinutesToDate,
  formatHourLabel,
  getEventDurationMinutes,
  getEventOffset,
  getHourLabels,
  getNowOffsetHours,
  isMarkedDay,
  pointerToGridStart,
} from "./calendar-utils";

const DRAG_THRESHOLD_PX = 5;

type DragState = {
  event: CalendarEvent;
  durationMinutes: number;
  previewStart: Date;
  previewEnd: Date;
  previewDayIndex: number;
  pointerId: number;
  originX: number;
  originY: number;
  grabOffsetY: number;
  moved: boolean;
};

export function TimeGrid({
  days,
  events,
  blockedKeys,
  hotKeys,
  onSelectDay,
  onSelectEvent,
  onReschedule,
}: {
  days: Date[];
  events: CalendarEvent[];
  blockedKeys: Set<string>;
  hotKeys: Set<string>;
  onSelectDay?: (day: Date) => void;
  onSelectEvent?: (event: CalendarEvent) => void;
  onReschedule?: (
    event: CalendarEvent,
    next: { start: Date; end: Date }
  ) => void;
}) {
  const hours = getHourLabels();
  const isDayView = days.length === 1;
  const [now, setNow] = useState(() => new Date());
  const [drag, setDrag] = useState<DragState | null>(null);
  const columnRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dragRef = useRef<DragState | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    dragRef.current = drag;
  }, [drag]);

  const nowOffset = useMemo(() => getNowOffsetHours(now), [now]);
  const dayViewBlocked =
    isDayView && days[0] != null && isMarkedDay(days[0], blockedKeys);
  const dayViewHot =
    isDayView && days[0] != null && isMarkedDay(days[0], hotKeys);

  function resolveDayIndex(clientX: number): number {
    for (let i = 0; i < columnRefs.current.length; i++) {
      const el = columnRefs.current[i];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (clientX >= rect.left && clientX <= rect.right) return i;
    }
    // Fallback: clamp to nearest column by distance
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < columnRefs.current.length; i++) {
      const el = columnRefs.current[i];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      const mid = (rect.left + rect.right) / 2;
      const dist = Math.abs(clientX - mid);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    return best;
  }

  function resolvePreview(
    clientX: number,
    clientY: number,
    durationMinutes: number,
    grabOffsetY: number
  ): { start: Date; end: Date; dayIndex: number } | null {
    const dayIndex = resolveDayIndex(clientX);
    const day = days[dayIndex];
    const column = columnRefs.current[dayIndex];
    if (!day || !column) return null;

    const rect = column.getBoundingClientRect();
    const hourCount = CALENDAR_DAY_END_HOUR - CALENDAR_DAY_START_HOUR;
    const hourHeightPx = rect.height / hourCount;
    if (hourHeightPx <= 0) return null;

    const offsetY = clientY - rect.top - grabOffsetY;
    const start = pointerToGridStart(day, offsetY, hourHeightPx, durationMinutes);
    const end = addMinutesToDate(start, durationMinutes);
    return { start, end, dayIndex };
  }

  function handlePointerDown(
    event: CalendarEvent,
    dayIndex: number,
    e: ReactPointerEvent<HTMLButtonElement>
  ) {
    if (e.button !== 0) return;
    e.preventDefault();

    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);

    const column = columnRefs.current[dayIndex];
    const columnRect = column?.getBoundingClientRect();
    const eventRect = target.getBoundingClientRect();
    const grabOffsetY = columnRect
      ? e.clientY - eventRect.top
      : 0;

    const durationMinutes = getEventDurationMinutes(event);
    const next: DragState = {
      event,
      durationMinutes,
      previewStart: event.start,
      previewEnd: event.end,
      previewDayIndex: dayIndex,
      pointerId: e.pointerId,
      originX: e.clientX,
      originY: e.clientY,
      grabOffsetY,
      moved: false,
    };
    dragRef.current = next;
    setDrag(next);
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLButtonElement>) {
    const current = dragRef.current;
    if (!current || e.pointerId !== current.pointerId) return;

    const dx = e.clientX - current.originX;
    const dy = e.clientY - current.originY;
    const moved =
      current.moved || Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX;

    const preview = resolvePreview(
      e.clientX,
      e.clientY,
      current.durationMinutes,
      current.grabOffsetY
    );
    if (!preview) return;

    const next: DragState = {
      ...current,
      moved,
      previewStart: preview.start,
      previewEnd: preview.end,
      previewDayIndex: preview.dayIndex,
    };
    dragRef.current = next;
    setDrag(next);
  }

  function handlePointerUp(e: ReactPointerEvent<HTMLButtonElement>) {
    const current = dragRef.current;
    if (!current || e.pointerId !== current.pointerId) return;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Already released
    }

    dragRef.current = null;
    setDrag(null);

    if (!current.moved) {
      onSelectEvent?.(current.event);
      return;
    }

    const changed =
      current.previewStart.getTime() !== current.event.start.getTime() ||
      current.previewEnd.getTime() !== current.event.end.getTime();

    if (changed) {
      onReschedule?.(current.event, {
        start: current.previewStart,
        end: current.previewEnd,
      });
    }
  }

  function handlePointerCancel(e: ReactPointerEvent<HTMLButtonElement>) {
    const current = dragRef.current;
    if (!current || e.pointerId !== current.pointerId) return;
    dragRef.current = null;
    setDrag(null);
  }

  const draggingId = drag?.event.id ?? null;
  const ghost =
    drag?.moved
      ? {
          start: drag.previewStart,
          end: drag.previewEnd,
          dayIndex: drag.previewDayIndex,
          event: drag.event,
        }
      : null;

  return (
    <div className="min-w-0 overflow-x-hidden border-y border-border bg-background [--cal-hour-height:2.75rem] sm:mx-4 sm:rounded-xl sm:border sm:[--cal-hour-height:3.5rem]">
      {isDayView && (dayViewBlocked || dayViewHot) ? (
        <div className="flex flex-wrap gap-2 border-b border-border px-3 py-2">
          {dayViewBlocked ? (
            <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-medium">
              <BlockedMarker />
            </span>
          ) : null}
          {dayViewHot ? (
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium">
              <HotMarker />
            </span>
          ) : null}
        </div>
      ) : null}
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
              const blocked = isMarkedDay(day, blockedKeys);
              const hot = isMarkedDay(day, hotKeys);

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={onSelectDay ? () => onSelectDay(day) : undefined}
                  className={cn(
                    "sticky top-0 z-20 min-w-0 border-b border-l border-border bg-background px-0.5 py-1.5 text-center sm:px-2 sm:py-3",
                    today && "bg-primary/5",
                    blocked && "bg-destructive/10",
                    !blocked && hot && "bg-amber-500/10",
                    !onSelectDay && "pointer-events-none"
                  )}
                >
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
                    {format(day, "EEEEE")}
                  </p>
                  <p
                    className={cn(
                      "mx-auto mt-0.5 flex size-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums sm:mt-1 sm:size-8 sm:text-base",
                      today && "bg-primary text-primary-foreground",
                      !today && blocked && "text-destructive",
                      !today && !blocked && hot && "text-amber-700 dark:text-amber-400"
                    )}
                  >
                    {format(day, "d")}
                  </p>
                  {blocked || hot ? (
                    <span className="mt-0.5 flex h-[13px] items-center justify-center gap-0.5 sm:h-[15px]">
                      {blocked ? (
                        <BlockedMarker label={false} className="[&_svg]:size-3" />
                      ) : null}
                      {hot ? (
                        <HotMarker label={false} className="[&_svg]:size-3" />
                      ) : null}
                    </span>
                  ) : (
                    <span className="mt-0.5 h-[13px] sm:h-[15px]" />
                  )}
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

        {days.map((day, dayIndex) => {
          const dayEvents = events.filter((event) => isSameDay(event.start, day));
          const showNow = isToday(day) && nowOffset != null;
          const blocked = isMarkedDay(day, blockedKeys);
          const hot = isMarkedDay(day, hotKeys);
          const showGhost =
            ghost != null && ghost.dayIndex === dayIndex;
          const ghostOffset = showGhost && ghost
            ? getEventOffset({ start: ghost.start, end: ghost.end })
            : null;

          return (
            <div
              key={`${day.toISOString()}-grid`}
              ref={(el) => {
                columnRefs.current[dayIndex] = el;
              }}
              data-cal-day-index={dayIndex}
              className={cn(
                "relative min-w-0 border-l border-border",
                blocked && "bg-destructive/8",
                !blocked && hot && "bg-amber-500/8"
              )}
              style={{
                height: `calc(${hours.length - 1} * var(--cal-hour-height))`,
              }}
            >
              {blocked ? (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(-45deg,transparent,transparent_6px,rgb(239_68_68/0.08)_6px,rgb(239_68_68/0.08)_12px)]"
                />
              ) : null}

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
                const isDragging = draggingId === event.id;

                return (
                  <button
                    key={event.id}
                    type="button"
                    data-no-pull-refresh=""
                    onPointerDown={(e) => handlePointerDown(event, dayIndex, e)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerCancel}
                    className={cn(
                      "absolute z-10 touch-none overflow-hidden rounded-sm border border-primary/25 bg-primary/15 text-left text-foreground",
                      isDayView
                        ? "inset-x-1.5 rounded-md px-2 py-1 text-xs"
                        : "inset-x-px px-0.5 py-px text-[9px] leading-tight sm:inset-x-0.5 sm:px-1 sm:text-[11px]",
                      isDragging && drag?.moved
                        ? "cursor-grabbing opacity-40"
                        : "cursor-grab",
                      isDragging && "z-30"
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

              {showGhost && ghost && ghostOffset ? (
                <div
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute z-40 overflow-hidden rounded-sm border-2 border-primary bg-primary/25 text-left text-foreground shadow-sm",
                    isDayView
                      ? "inset-x-1.5 rounded-md px-2 py-1 text-xs"
                      : "inset-x-px px-0.5 py-px text-[9px] leading-tight sm:inset-x-0.5 sm:px-1 sm:text-[11px]"
                  )}
                  style={{
                    top: `calc(${ghostOffset.startHours} * var(--cal-hour-height))`,
                    height: `calc(${ghostOffset.durationHours} * var(--cal-hour-height))`,
                    minHeight: isDayView ? "2rem" : "1.1rem",
                  }}
                >
                  <span className="block truncate font-medium">
                    {ghost.event.clientName}
                  </span>
                  {isDayView ? (
                    <span className="block truncate text-muted-foreground">
                      {format(ghost.start, "h:mm a")} – {ghost.event.title}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
