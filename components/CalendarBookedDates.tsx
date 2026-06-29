"use client"

import * as React from "react"

import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const TIME_SLOTS = [
  { id: "6-8", label: "6am - 8am" },
  { id: "10-12", label: "10am - 12pm" },
  { id: "14-16", label: "2pm - 4pm" },
  { id: "18-20", label: "6pm - 8pm" },
] as const

export type TimeSlotId = (typeof TIME_SLOTS)[number]["id"]

type CalendarBookedDatesProps = {
  date: Date | undefined
  onDateChange: (date: Date | undefined) => void
  selectedSlot: TimeSlotId | null
  onSlotChange: (slot: TimeSlotId | null) => void
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
  date,
  onDateChange,
  selectedSlot,
  onSlotChange,
}: CalendarBookedDatesProps) {
  const { startMonth, endMonth, today } = React.useMemo(getCalendarBounds, [])
  const [month, setMonth] = React.useState(startMonth)
  const bookedDates = Array.from(
    { length: 15 },
    (_, i) => new Date(new Date().getFullYear(), 1, 12 + i)
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

  return (
    <Card className="mx-auto w-fit [--card-spacing:--spacing(6)]">
      <CardContent>
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
          }}
          modifiersClassNames={{
            booked: "[&>button]:line-through opacity-100",
          }}
        />
      </CardContent>
      <CardFooter className="w-full min-w-72 flex-col items-stretch gap-3 border-t bg-card sm:min-w-80">
        <p className="text-sm font-medium text-foreground">Available slots</p>
        <div className="grid grid-cols-2 gap-3">
          {TIME_SLOTS.map((slot) => (
            <Button
              key={slot.id}
              type="button"
              variant={selectedSlot === slot.id ? "default" : "outline"}
              size="lg"
              disabled={!date}
              className={cn("h-8 w-full", !date && "opacity-50")}
              onClick={() => onSlotChange(slot.id)}
            >
              {slot.label}
            </Button>
          ))}
        </div>
      </CardFooter>
    </Card>
  )
}
