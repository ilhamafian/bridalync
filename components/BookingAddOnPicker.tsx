"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatRm } from "@/utils/booking/pricing"
import { cn } from "@/lib/utils"

export type AddOnOption = {
  id: string
  name: string
  price: number
}

type BookingAddOnPickerProps = {
  addOns: AddOnOption[]
  selectedAddOnIds: string[]
  onSelectionChange: (addOnIds: string[]) => void
}

export function BookingAddOnPicker({
  addOns,
  selectedAddOnIds,
  onSelectionChange,
}: BookingAddOnPickerProps) {
  function toggleAddOn(addOnId: string) {
    if (selectedAddOnIds.includes(addOnId)) {
      onSelectionChange(selectedAddOnIds.filter((id) => id !== addOnId))
      return
    }
    onSelectionChange([...selectedAddOnIds, addOnId])
  }

  if (addOns.length === 0) {
    return (
      <Card className="mx-auto w-full min-w-72 [--card-spacing:--spacing(6)] sm:min-w-80">
        <CardContent className="pt-(--card-spacing) text-center text-sm text-muted-foreground">
          No add-ons available.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mx-auto w-full min-w-72 [--card-spacing:--spacing(6)] sm:min-w-80">
      <CardContent className="flex flex-col gap-2 pt-(--card-spacing)">
        {addOns.map((addOn) => (
          <Button
            key={addOn.id}
            type="button"
            variant={
              selectedAddOnIds.includes(addOn.id) ? "default" : "outline"
            }
            size="lg"
            className={cn(
              "h-auto min-h-10 w-full justify-between px-4 py-3 text-left whitespace-normal"
            )}
            onClick={() => toggleAddOn(addOn.id)}
          >
            <span>{addOn.name}</span>
            <span className="shrink-0 pl-3 font-medium">
              {formatRm(addOn.price)}
            </span>
          </Button>
        ))}
      </CardContent>
    </Card>
  )
}
