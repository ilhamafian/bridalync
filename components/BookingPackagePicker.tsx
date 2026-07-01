"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

import { cn } from "@/lib/utils"

type BookingPackagePickerProps = {
  selectedPackageId: string | null
  onPackageChange: (packageId: string) => void
}

export function BookingPackagePicker({
  selectedPackageId,
  onPackageChange,
}: BookingPackagePickerProps) {
  return (
    <Card className="mx-auto w-full min-w-72 [--card-spacing:--spacing(6)] sm:min-w-80">
      <CardContent className="flex flex-col gap-2 pt-(--card-spacing)">
        {[{ id: "1", label: "Package 1" }, { id: "2", label: "Package 2" }].map((pkg) => (
          <Button
            key={pkg.id}
            type="button"
            variant={selectedPackageId === pkg.id ? "default" : "outline"}
            size="lg"
            className={cn(
              "h-auto min-h-10 w-full justify-start px-4 py-3 text-left whitespace-normal"
            )}
            onClick={() => onPackageChange(pkg.id)}
          >
            {pkg.label}
          </Button>
        ))}
      </CardContent>
    </Card>
  )
}
