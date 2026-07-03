"use client"

import Image from "next/image"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatRm } from "@/utils/booking/pricing"
import { cn } from "@/lib/utils"

export type StyleOption = {
  id: string
  name: string
  price: number
  imageSrc?: string
}

type BookingStylePickerProps = {
  styles: StyleOption[]
  selectedStyleId: string | null
  onStyleChange: (styleId: string) => void
}

export function BookingStylePicker({
  styles,
  selectedStyleId,
  onStyleChange,
}: BookingStylePickerProps) {
  if (styles.length === 0) {
    return (
      <Card className="mx-auto w-full min-w-72 [--card-spacing:--spacing(6)] sm:min-w-80">
        <CardContent className="pt-(--card-spacing) text-center text-sm text-muted-foreground">
          No styles available.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mx-auto w-full min-w-72 [--card-spacing:--spacing(6)] sm:min-w-80">
      <CardContent className="flex flex-col gap-2 pt-(--card-spacing)">
        {styles.map((style) => (
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
              {style.imageSrc && (
                <span className="relative size-14 shrink-0 overflow-hidden rounded-md bg-muted">
                  <Image
                    src={style.imageSrc}
                    alt={style.name}
                    fill
                    className="object-cover"
                    sizes="56px"
                  />
                </span>
              )}
              <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                <span>{style.name}</span>
                <span className="shrink-0 font-medium">{formatRm(style.price)}</span>
              </span>
            </span>
          </Button>
        ))}
      </CardContent>
    </Card>
  )
}
