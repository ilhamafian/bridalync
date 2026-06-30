"use client"

import Image from "next/image"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { BOOKING_STYLES, type BookingStyleId } from "@/utils/booking/constants"
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
              "h-auto min-h-14 w-full justify-start px-3 py-2 text-left whitespace-normal"
            )}
            onClick={() => onStyleChange(style.id)}
          >
            <span className="flex w-full items-center gap-3">
              <span className="relative size-14 shrink-0 overflow-hidden rounded-md bg-muted">
                <Image
                  src={style.imageSrc}
                  alt={style.label}
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              </span>
              <span className="min-w-0 flex-1">{style.label}</span>
            </span>
          </Button>
        ))}
      </CardContent>
    </Card>
  )
}
