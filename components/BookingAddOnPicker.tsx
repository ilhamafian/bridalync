"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { BOOKING_ADD_ONS, type BookingAddOnId } from "@/utils/booking/constants"
import { cn } from "@/lib/utils"

type BookingAddOnPickerProps = {
  selectedAddOnIds: BookingAddOnId[]
  onSelectionChange: (addOnIds: BookingAddOnId[]) => void
}

export function BookingAddOnPicker({
  selectedAddOnIds,
  onSelectionChange,
}: BookingAddOnPickerProps) {
  function toggleAddOn(addOnId: BookingAddOnId) {
    if (addOnId === "not-sure-yet") {
      onSelectionChange(
        selectedAddOnIds.includes("not-sure-yet") ? [] : ["not-sure-yet"]
      )
      return
    }

    const withoutNotSure = selectedAddOnIds.filter((id) => id !== "not-sure-yet")

    if (withoutNotSure.includes(addOnId)) {
      onSelectionChange(withoutNotSure.filter((id) => id !== addOnId))
      return
    }

    onSelectionChange([...withoutNotSure, addOnId])
  }

  return (
    <Card className="mx-auto w-full min-w-72 [--card-spacing:--spacing(6)] sm:min-w-80">
      <CardContent className="flex flex-col gap-2 pt-(--card-spacing)">
        {BOOKING_ADD_ONS.map((addOn) => (
          <Button
            key={addOn.id}
            type="button"
            variant={
              selectedAddOnIds.includes(addOn.id) ? "default" : "outline"
            }
            size="lg"
            className={cn(
              "h-auto min-h-10 w-full justify-start px-4 py-3 text-left whitespace-normal"
            )}
            onClick={() => toggleAddOn(addOn.id)}
          >
            {addOn.label}
          </Button>
        ))}
      </CardContent>
    </Card>
  )
}
