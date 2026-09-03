"use client";

import { Globe } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { LocaleKey } from "@/locales";

type LanguageSelectorProps = {
  value: LocaleKey;
  onChange: (locale: LocaleKey) => void;
  className?: string;
};

const languages: Record<LocaleKey, { label: string; flag: string }> = {
  ms: { label: "Bahasa Melayu", flag: "🇲🇾" },
  en: { label: "English", flag: "🇬🇧" },
};

export function LanguageSelector({
  value,
  onChange,
  className,
}: LanguageSelectorProps) {
  const currentLanguage = languages[value];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Select language"
          className={cn(
            "h-9 gap-1.5 border-white/60 bg-white/30 px-2.5 shadow-sm backdrop-blur-sm hover:bg-white/40 dark:border-white/15 dark:bg-white/10 dark:hover:bg-white/15",
            className
          )}
        >
          <Globe className="size-4 shrink-0" />
          <span className="text-base leading-none">{currentLanguage.flag}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-100 min-w-40">
        {(Object.entries(languages) as [LocaleKey, (typeof languages)[LocaleKey]][]).map(
          ([key, { label, flag }]) => (
            <DropdownMenuItem
              key={key}
              onSelect={() => onChange(key)}
              className={cn(value === key && "bg-accent")}
            >
              <span>{flag}</span>
              <span>{label}</span>
            </DropdownMenuItem>
          )
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
