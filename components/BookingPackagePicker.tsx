"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type PackageOption = {
  id: string
  name: string
  price: number
  sessionCount: number
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
  if (packages.length === 0) {
    return (
      <p className="mx-auto w-full max-w-xs px-4 text-center text-sm text-muted-foreground">
        No packages available.
      </p>
    )
  }

  return (
    <div className="flex w-full flex-col gap-2">
      {packages.map((pkg) => {
        const isSelected = selectedPackageId === pkg.id
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
            onClick={() => onPackageChange(pkg.id)}
          >
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{pkg.name}</span>
            </span>
            <span className="shrink-0 pl-3 font-medium">
              {pkg.sessionCount} session{pkg.sessionCount === 1 ? "" : "s"}
            </span>
          </Button>
        )
      })}
    </div>
  )
}