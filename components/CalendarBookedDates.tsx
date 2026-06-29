"use client"

import * as React from "react"

import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { TIME_SLOTS, type TimeSlotId } from "@/lib/booking/constants"
import {
  getEventTypeLabel,
  getSessionDates,
  isSlotTaken,
  parseDateKey,
  toDateKey,
} from "@/lib/booking/utils"
import type { BookingSession } from "@/lib/schemas/booking"
import type { EventTypeId } from "@/lib/booking/constants"
import { cn } from "@/lib/utils"

export type { TimeSlotId } from "@/lib/booking/constants"

type CalendarBookedDatesProps = {
  currentEventType: EventTypeId | null
  date: Date | undefined
  onDateChange: (date: Date | undefined) => void
  selectedSlot: TimeSlotId | null
  onSlotChange: (slot: TimeSlotId | null) => void
  sessions: BookingSession[]
}

function getCalendarBounds() {
  const now = new Date()
  const year = now.getFullYear()

  return {
    startMonth: new Date(year, now.getMonth(), 1),
    endMonth: new Date(year + 1, 11, 1),
    today: new Date(year, now.getMonth(), now.getDate()),
  }
}

export function CalendarBookedDates({
  currentEventType,
  date,
  onDateChange,
  selectedSlot,
  onSlotChange,
  sessions,
}: CalendarBookedDatesProps) {
  const { startMonth, endMonth, today } = React.useMemo(getCalendarBounds, [])
  const [month, setMonth] = React.useState(startMonth)
  const bookedDates = Array.from(
    { length: 15 },
    (_, i) => new Date(new Date().getFullYear(), 1, 12 + i)
  )
  const sessionDates = React.useMemo(
    () => Array.from(getSessionDates(sessions), parseDateKey),
    [sessions]
  )

  const isOutsideDisplayedMonth = React.useCallback(
    (day: Date, viewMonth = month) =>
      day.getMonth() !== viewMonth.getMonth() ||
      day.getFullYear() !== viewMonth.getFullYear(),
    [month]
  )

  function handleDateSelect(nextDate: Date | undefined) {
    if (nextDate && isOutsideDisplayedMonth(nextDate)) return
    onDateChange(nextDate)
    onSlotChange(null)
  }

  function handleMonthChange(nextMonth: Date) {
    setMonth(nextMonth)
    if (date && isOutsideDisplayedMonth(date, nextMonth)) {
      onDateChange(undefined)
    }
    onSlotChange(null)
  }

  const currentDateKey = date ? toDateKey(date) : null

  return (
    <Card className="mx-auto w-fit [--card-spacing:--spacing(6)]">
      <CardContent className="flex flex-col gap-4">
        {currentEventType && (
          <p className="text-sm text-muted-foreground">
            Scheduling:{" "}
            <span className="font-medium text-foreground">
              {getEventTypeLabel(currentEventType)}
            </span>
          </p>
        )}

        <Calendar
          mode="single"
          month={month}
          onMonthChange={handleMonthChange}
          selected={date}
          onSelect={handleDateSelect}
          captionLayout="dropdown"
          fixedWeeks
          startMonth={startMonth}
          endMonth={endMonth}
          className="p-0 [--cell-size:--spacing(10)] md:[--cell-size:--spacing(12)] [&_.rdp-day]:aspect-auto! [&_.rdp-day]:h-8 [&_.rdp-dropdowns]:h-8! [&_.rdp-month]:gap-2! [&_.rdp-month_caption]:h-8! [&_.rdp-week]:mt-1! [&_button[data-day]]:aspect-auto! [&_button[data-day]]:h-8!"
          disabled={[
            { before: today },
            ...bookedDates,
            (day) => isOutsideDisplayedMonth(day),
          ]}
          formatters={{
            formatMonthDropdown: (date) => {
              return date.toLocaleString("default", { month: "long" })
            },
          }}
          modifiers={{
            booked: bookedDates,
            hasSession: sessionDates,
          }}
          modifiersClassNames={{
            booked: "[&>button]:line-through opacity-100",
            hasSession:
              "[&>button]:font-semibold [&>button]:underline [&>button]:decoration-chart-4 [&>button]:underline-offset-4",
          }}
        />
      </CardContent>
      <CardFooter className="w-full min-w-72 flex-col items-stretch gap-3 border-t bg-card sm:min-w-80">
        <p className="text-sm font-medium text-foreground">Available slots</p>
        <div className="grid grid-cols-2 gap-3">
          {TIME_SLOTS.map((slot) => {
            const isTaken =
              currentDateKey !== null &&
              isSlotTaken(currentDateKey, slot.id, sessions)

            return (
              <Button
                key={slot.id}
                type="button"
                variant={selectedSlot === slot.id ? "default" : "outline"}
                size="lg"
                disabled={!date || !currentEventType || isTaken}
                className={cn(
                  "h-8 w-full",
                  (!date || !currentEventType || isTaken) && "opacity-50"
                )}
                onClick={() => onSlotChange(slot.id)}
              >
                {slot.label}
              </Button>
            )
          })}
        </div>
      </CardFooter>
    </Card>
  )
}
