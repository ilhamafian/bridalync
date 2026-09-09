"use client"

import { Button } from "@/components/ui/button"
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
      <p className="mx-auto w-full max-w-xs px-4 text-center text-sm text-muted-foreground">
        No add-ons available.
      </p>
    )
  }

  return (
    <div className="flex w-full flex-col gap-2">
      {addOns.map((addOn) => {
        const isSelected = selectedAddOnIds.includes(addOn.id)
        return (
          <Button
            key={addOn.id}
            type="button"
            variant="ghost"
            size="lg"
            className={cn(
              "h-auto min-h-10 w-full justify-between px-4 py-3 text-left whitespace-normal",
              isSelected
                ? "rounded-lg bg-rose-800 text-white hover:bg-rose-800/90 hover:text-white"
                : "rounded-lg border-transparent bg-white/30 shadow-sm ring-1 ring-white/60 backdrop-blur-sm hover:bg-white/40 hover:text-foreground dark:bg-white/10 dark:ring-white/15 dark:hover:bg-white/15"
            )}
            onClick={() => toggleAddOn(addOn.id)}
          >
            <span className="min-w-0 flex-1 font-medium">{addOn.name}</span>
            <span className="shrink-0 pl-3 font-medium">
              {formatRm(addOn.price)}
            </span>
          </Button>
        )
      })}
    </div>
  )
}
