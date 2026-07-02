"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatRm } from "@/utils/booking/pricing"
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
      <Card className="mx-auto w-full min-w-72 [--card-spacing:--spacing(6)] sm:min-w-80">
        <CardContent className="pt-(--card-spacing) text-center text-sm text-muted-foreground">
          No packages available.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mx-auto w-full min-w-72 [--card-spacing:--spacing(6)] sm:min-w-80">
      <CardContent className="flex flex-col gap-2 pt-(--card-spacing)">
        {packages.map((pkg) => (
          <Button
            key={pkg.id}
            type="button"
            variant={selectedPackageId === pkg.id ? "default" : "outline"}
            size="lg"
            className={cn(
              "h-auto min-h-10 w-full justify-between px-4 py-3 text-left whitespace-normal"
            )}
            onClick={() => onPackageChange(pkg.id)}
          >
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{pkg.name}</span>
              <span className="block text-xs opacity-80">
                {pkg.sessionCount} session{pkg.sessionCount === 1 ? "" : "s"}
              </span>
            </span>
            <span className="shrink-0 pl-3 font-medium">{formatRm(pkg.price)}</span>
          </Button>
        ))}
      </CardContent>
    </Card>
  )
}