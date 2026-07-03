"use client"

import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Client } from "@/schemas/clientSchema"
import { cn } from "@/lib/utils"

const DEFAULT_COUNTRY_CODE = "+60"

const SOUTHEAST_ASIA_COUNTRY_CODES = [
  { code: "+60", label: "Malaysia", flag: "🇲🇾" },
  { code: "+65", label: "Singapore", flag: "🇸🇬" },
  { code: "+62", label: "Indonesia", flag: "🇮🇩" },
  { code: "+66", label: "Thailand", flag: "🇹🇭" },
  { code: "+63", label: "Philippines", flag: "🇵🇭" },
  { code: "+84", label: "Vietnam", flag: "🇻🇳" },
  { code: "+673", label: "Brunei", flag: "🇧🇳" },
  { code: "+855", label: "Cambodia", flag: "🇰🇭" },
  { code: "+856", label: "Laos", flag: "🇱🇦" },
  { code: "+95", label: "Myanmar", flag: "🇲🇲" },
  { code: "+670", label: "Timor-Leste", flag: "🇹🇱" },
] as const

type BookingContactFormProps = {
  value: Client
  onChange: (contact: Client) => void
}

const inputClassName = cn(
  "h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground",
  "placeholder:text-muted-foreground",
  "outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
)

export function BookingContactForm({ value, onChange }: BookingContactFormProps) {
  const countryCode = value.country_code || DEFAULT_COUNTRY_CODE

  function updateField<K extends keyof Client>(
    field: K,
    fieldValue: Client[K]
  ) {
    onChange({ ...value, [field]: fieldValue })
  }

  return (
    <Card className="mx-auto w-full min-w-72 [--card-spacing:--spacing(6)] sm:min-w-80">
      <CardContent className="flex flex-col gap-4 pt-(--card-spacing)">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">
            Phone number
          </span>
          <div className="flex gap-2">
            <Select
              value={countryCode}
              onValueChange={(code) => updateField("country_code", code)}
            >
              <SelectTrigger
                className="h-10 w-30 shrink-0"
                aria-label="Country code"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOUTHEAST_ASIA_COUNTRY_CODES.map((country) => (
                  <SelectItem key={country.code} value={country.code}>
                    {country.flag} {country.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input
              type="tel"
              autoComplete="tel-national"
              placeholder="e.g. 123456789"
              value={value.mobile ?? ""}
              onChange={(event) => updateField("mobile", event.target.value)}
              className={inputClassName}
            />
          </div>
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
