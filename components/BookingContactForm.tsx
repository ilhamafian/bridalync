"use client"

import type { ReactNode } from "react"

import { WizardGlass, wizardCardClassName } from "@/components/booking/wizardGlass"
import { CardContent } from "@/components/ui/card"
import { useLocale } from "@/components/LocaleProvider"
import { PhoneNumberInput } from "@/components/PhoneNumberInput"
import type { Client } from "@/schemas/clientSchema"
import { cn } from "@/lib/utils"

type BookingContactFormProps = {
  value: Client
  onChange: (contact: Client) => void
  /** Extra fields shown in the same card, after email. */
  children?: ReactNode
}

const inputClassName = cn(
  "h-10 w-full rounded-md border border-input bg-input/20 px-3 text-xs/relaxed text-foreground transition-colors",
  "placeholder:text-muted-foreground",
  "outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
  "dark:bg-input/30"
)

export function BookingContactForm({
  value,
  onChange,
  children,
}: BookingContactFormProps) {
  const { t } = useLocale()

  function updateField<K extends keyof Client>(
    field: K,
    fieldValue: Client[K]
  ) {
    onChange({ ...value, [field]: fieldValue })
  }

  return (
    <WizardGlass className={wizardCardClassName}>
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
        {children}
      </CardContent>
    </WizardGlass>
  )
}
