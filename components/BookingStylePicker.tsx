"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { BOOKING_STYLES, type BookingStyleId } from "@/lib/booking/constants"
import { cn } from "@/lib/utils"

type BookingStylePickerProps = {
  selectedStyleId: BookingStyleId | null
  onStyleChange: (styleId: BookingStyleId) => void
}

export function BookingStylePicker({
  selectedStyleId,
  onStyleChange,
}: BookingStylePickerProps) {
  return (
    <Card className="mx-auto w-full min-w-72 [--card-spacing:--spacing(6)] sm:min-w-80">
      <CardContent className="flex flex-col gap-2 pt-(--card-spacing)">
        {BOOKING_STYLES.map((style) => (
          <Button
            key={style.id}
            type="button"
            variant={selectedStyleId === style.id ? "default" : "outline"}
            size="lg"
            className={cn(
              "h-auto min-h-10 w-full justify-start px-4 py-3 text-left whitespace-normal"
            )}
            onClick={() => onStyleChange(style.id)}
          >
            {style.label}
          </Button>
        ))}
      </CardContent>
    </Card>
  )
}
