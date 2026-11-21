"use client"

import { WizardChoice } from "@/components/booking/wizardGlass"
import { useLocale } from "@/components/LocaleProvider"
import { formatRm } from "@/utils/booking/pricing"
import { cn } from "@/lib/utils"

export type AddOnOption = {
  id: string
  name: string
  description?: string
  price: number
}

type BookingAddOnPickerProps = {
  addOns: AddOnOption[]
  selectedAddOnIds: string[]
  onSelectionChange: (addOnIds: string[]) => void
  showPrices?: boolean
}

export function BookingAddOnPicker({
  addOns,
  selectedAddOnIds,
  onSelectionChange,
  showPrices = true,
}: BookingAddOnPickerProps) {
  const { t } = useLocale()

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
        {t.noAddOnsAvailable}
      </p>
    )
  }

  return (
    <div className="flex w-full flex-col gap-2">
      {addOns.map((addOn) => {
        const isSelected = selectedAddOnIds.includes(addOn.id)
        return (
          <WizardChoice
            key={addOn.id}
            selected={isSelected}
            className="h-auto min-h-10 w-full justify-between px-4 py-3 text-left whitespace-normal"
            onClick={() => toggleAddOn(addOn.id)}
          >
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="font-medium">{addOn.name}</span>
              {addOn.description ? (
                <span
                  className={cn(
                    "text-xs font-normal",
                    isSelected ? "text-white/80" : "text-muted-foreground"
                  )}
                >
                  {addOn.description}
                </span>
              ) : null}
            </span>
            {showPrices ? (
              <span className="shrink-0 pl-3 font-medium">
                {formatRm(addOn.price)}
              </span>
            ) : null}
          </WizardChoice>
        )
      })}
    </div>
  )
}
