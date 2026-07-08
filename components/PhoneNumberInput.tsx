"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const DEFAULT_COUNTRY_CODE = "+60";

export const SOUTHEAST_ASIA_COUNTRY_CODES = [
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
] as const;

const defaultInputClassName = cn(
  "h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground",
  "placeholder:text-muted-foreground",
  "outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
);

type PhoneNumberInputProps = {
  countryCode: string;
  mobile: string;
  onCountryCodeChange: (code: string) => void;
  onMobileChange: (mobile: string) => void;
  inputClassName?: string;
  mobileInputId?: string;
};

export function PhoneNumberInput({
  countryCode,
  mobile,
  onCountryCodeChange,
  onMobileChange,
  inputClassName = defaultInputClassName,
  mobileInputId,
}: PhoneNumberInputProps) {
  const resolvedCountryCode = countryCode || DEFAULT_COUNTRY_CODE;

  return (
    <div className="flex gap-2">
      <Select value={resolvedCountryCode} onValueChange={onCountryCodeChange}>
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
        id={mobileInputId}
        type="tel"
        autoComplete="tel-national"
        placeholder="e.g. 123456789"
        value={mobile}
        onChange={(event) => onMobileChange(event.target.value)}
        className={inputClassName}
        aria-label="Phone number"
      />
    </div>
  );
}

export function isValidPhoneNumber(mobile: string) {
  const digits = mobile.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
}
