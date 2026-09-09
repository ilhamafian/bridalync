"use client"

import { Card, CardContent } from "@/components/ui/card"
import { useLocale } from "@/components/LocaleProvider"
import { PhoneNumberInput } from "@/components/PhoneNumberInput"
import type { Client } from "@/schemas/clientSchema"
import { cn } from "@/lib/utils"

type BookingContactFormProps = {
  value: Client
  onChange: (contact: Client) => void
}

const inputClassName = cn(
  "h-10 w-full rounded-md border border-input bg-input/20 px-3 text-xs/relaxed text-foreground transition-colors",
  "placeholder:text-muted-foreground",
  "outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
  "dark:bg-input/30"
)

export function BookingContactForm({ value, onChange }: BookingContactFormProps) {
  const { t } = useLocale()

  function updateField<K extends keyof Client>(
    field: K,
    fieldValue: Client[K]
  ) {
    onChange({ ...value, [field]: fieldValue })
  }

  return (
    <Card className="mx-auto w-full min-w-72 bg-white/30 shadow-sm ring-white/60 backdrop-blur-sm [--card-spacing:--spacing(6)] sm:min-w-80 dark:bg-white/10 dark:ring-white/15">
      <CardContent className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">
            {t.phoneNumber}
          </span>
          <PhoneNumberInput
            countryCode={value.country_code ?? ""}
            mobile={value.mobile ?? ""}
            onCountryCodeChange={(code) => updateField("country_code", code)}
            onMobileChange={(mobile) => updateField("mobile", mobile)}
            inputClassName={inputClassName}
            placeholder={t.phonePlaceholder}
            countryCodeAriaLabel={t.countryCode}
            mobileAriaLabel={t.phoneNumber}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">{t.email}</span>
          <input
            type="email"
            autoComplete="email"
            placeholder={t.emailPlaceholder}
            value={value.email}
            onChange={(event) => updateField("email", event.target.value)}
            className={inputClassName}
          />
        </label>
      </CardContent>
    </Card>
  )
}
