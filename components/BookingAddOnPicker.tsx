"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const ADD_ONS = [
  { id: "hair-styling", label: "Hair styling" },
  { id: "lashes", label: "Lash application" },
  { id: "trial-run", label: "Trial run before the wedding" },
  { id: "early-start", label: "Early morning start (before 7am)" },
  { id: "touch-ups", label: "Touch-ups throughout the day" },
  { id: "not-sure-yet", label: "Not sure yet" },
] as const

type BookingAddOnPickerProps = {
  selectedAddOnIds: string[]
  onSelectionChange: (addOnIds: string[]) => void
}

export function BookingAddOnPicker({
  selectedAddOnIds,
  onSelectionChange,
}: BookingAddOnPickerProps) {
  function toggleAddOn(addOnId: string) {
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
        {ADD_ONS.map((addOn) => (
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
