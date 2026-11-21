"use client"

import { WizardChoice } from "@/components/booking/wizardGlass"
import { useLocale } from "@/components/LocaleProvider"
import { cn } from "@/lib/utils"

export type PackageOption = {
  id: string
  name: string
  description?: string
}

type BookingPackagePickerProps = {
  packages: PackageOption[]
  selectedPackageId: string | null
  onPackageChange: (packageId: string) => void
}

export function BookingPackagePicker({
  packages,
  selectedPackageId,
  onPackageChange,
}: BookingPackagePickerProps) {
  const { t } = useLocale()

  if (packages.length === 0) {
    return (
      <p className="mx-auto w-full max-w-xs px-4 text-center text-sm text-muted-foreground">
        {t.noPackagesAvailable}
      </p>
    )
  }

  return (
    <div className="flex w-full flex-col gap-2" role="radiogroup">
      {packages.map((pkg) => {
        const isSelected = selectedPackageId === pkg.id
        return (
          <WizardChoice
            key={pkg.id}
            selected={isSelected}
            role="radio"
            aria-checked={isSelected}
            className="h-auto min-h-10 w-full justify-between px-4 py-3 text-left whitespace-normal"
            onClick={() => onPackageChange(pkg.id)}
          >
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border",
                  isSelected
                    ? "border-white bg-white"
                    : "border-border bg-background/80"
                )}
              >
                {isSelected ? (
                  <span className="size-2.5 rounded-full bg-rose-800" />
                ) : null}
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="block font-medium">{pkg.name}</span>
                {pkg.description ? (
                  <span
                    className={cn(
                      "block whitespace-pre-line text-xs font-normal",
                      isSelected ? "text-white/80" : "text-muted-foreground"
                    )}
                  >
                    {pkg.description}
                  </span>
                ) : null}
              </span>
            </span>
          </WizardChoice>
        )
      })}
    </div>
  )
}
