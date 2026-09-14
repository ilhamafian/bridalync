"use client"

import { IconCheck } from "@tabler/icons-react"

import { useLocale } from "@/components/LocaleProvider"
import { Button } from "@/components/ui/button"
import { formatRm } from "@/utils/booking/pricing"
import { cn } from "@/lib/utils"

export type PackageOption = {
  id: string
  name: string
  price: number
}

type BookingPackagePickerProps = {
  packages: PackageOption[]
  selectedPackageIds: string[]
  onPackageChange: (packageIds: string[]) => void
  showPrice?: boolean
}

export function BookingPackagePicker({
  packages,
  selectedPackageIds,
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

  function togglePackage(packageId: string) {
    if (selectedPackageIds.includes(packageId)) {
      onPackageChange(selectedPackageIds.filter((id) => id !== packageId))
      return
    }
    onPackageChange([...selectedPackageIds, packageId])
  }

  return (
    <div className="flex w-full flex-col gap-2">
      {packages.map((pkg) => {
        const isSelected = selectedPackageIds.includes(pkg.id)
        return (
          <Button
            key={pkg.id}
            type="button"
            variant="ghost"
            size="lg"
            className={cn(
              "h-auto min-h-10 w-full justify-between px-4 py-3 text-left whitespace-normal",
              isSelected
                ? "rounded-lg bg-rose-800 text-white hover:bg-rose-800/90 hover:text-white"
                : "rounded-lg border-transparent bg-white/30 shadow-sm ring-1 ring-white/60 backdrop-blur-sm hover:bg-white/40 hover:text-foreground dark:bg-white/10 dark:ring-white/15 dark:hover:bg-white/15"
            )}
            onClick={() => togglePackage(pkg.id)}
          >
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded border",
                  isSelected
                    ? "border-white bg-white text-rose-800"
                    : "border-border bg-background/80"
                )}
              >
                {isSelected ? <IconCheck className="size-3.5" strokeWidth={3} /> : null}
              </span>
              <span className="block font-medium">{pkg.name}</span>
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
