"use client"

import { useLocale } from "@/components/LocaleProvider"
import { Button } from "@/components/ui/button"
import { formatRm } from "@/utils/booking/pricing"
import { cn } from "@/lib/utils"

export type PackageOption = {
  id: string
  name: string
  price: number
  description?: string
  sessionNames: string[]
}

type BookingPackagePickerProps = {
  packages: PackageOption[]
  selectedPackageId: string | null
  onPackageChange: (packageId: string) => void
  showPrice?: boolean
}

export function BookingPackagePicker({
  packages,
  selectedPackageId,
  onPackageChange,
  showPrice = true,
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
          <Button
            key={pkg.id}
            type="button"
            variant="ghost"
            size="lg"
            role="radio"
            aria-checked={isSelected}
            className={cn(
              "h-auto min-h-10 w-full justify-between px-4 py-3 text-left whitespace-normal",
              isSelected
                ? "rounded-lg bg-rose-800 text-white hover:bg-rose-800/90 hover:text-white"
                : "rounded-lg border-transparent bg-white/30 shadow-sm ring-1 ring-white/60 backdrop-blur-sm hover:bg-white/40 hover:text-foreground dark:bg-white/10 dark:ring-white/15 dark:hover:bg-white/15"
            )}
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
                      "block text-xs font-normal",
                      isSelected ? "text-white/80" : "text-muted-foreground"
                    )}
                  >
                    {pkg.description}
                  </span>
                ) : null}
                {pkg.sessionNames.length > 1 ? (
                  <span
                    className={cn(
                      "block text-xs font-normal",
                      isSelected ? "text-white/80" : "text-muted-foreground"
                    )}
                  >
                    {pkg.sessionNames.join(" · ")}
                  </span>
                ) : null}
              </span>
            </span>
            {showPrice && pkg.price > 0 ? (
              <span className="shrink-0 pl-3 font-medium">
                {formatRm(pkg.price)}
              </span>
            ) : null}
          </Button>
        )
      })}
    </div>
  )
}
