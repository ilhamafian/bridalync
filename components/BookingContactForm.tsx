"use client"

import { Card, CardContent } from "@/components/ui/card"
import type { BookingContact } from "@/lib/schemas/booking"
import { cn } from "@/lib/utils"

type BookingContactFormProps = {
  value: BookingContact
  onChange: (contact: BookingContact) => void
}

const inputClassName = cn(
  "h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground",
  "placeholder:text-muted-foreground",
  "outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
)

export function BookingContactForm({ value, onChange }: BookingContactFormProps) {
  function updateField<K extends keyof BookingContact>(
    field: K,
    fieldValue: BookingContact[K]
  ) {
    onChange({ ...value, [field]: fieldValue })
  }

  return (
    <Card className="mx-auto w-full min-w-72 [--card-spacing:--spacing(6)] sm:min-w-80">
      <CardContent className="flex flex-col gap-4 pt-(--card-spacing)">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">Name</span>
          <input
            type="text"
            autoComplete="name"
            placeholder="Your full name"
            value={value.name}
            onChange={(event) => updateField("name", event.target.value)}
            className={inputClassName}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">
            Phone number
          </span>
          <input
            type="tel"
            autoComplete="tel"
            placeholder="e.g. 012-345 6789"
            value={value.phone}
            onChange={(event) => updateField("phone", event.target.value)}
            className={inputClassName}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">Email</span>
          <input
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={value.email}
            onChange={(event) => updateField("email", event.target.value)}
            className={inputClassName}
          />
        </label>
      </CardContent>
    </Card>
  )
}
