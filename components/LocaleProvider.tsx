"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { enGB } from "date-fns/locale/en-GB";
import { ms as msDateLocale } from "date-fns/locale/ms";

import {
  formatMessage,
  intlLocales,
  locales,
  type Locale,
  type LocaleKey,
} from "@/locales";

const STORAGE_KEY = "bridalync-locale";
const DEFAULT_LOCALE: LocaleKey = "ms";
const DATE_FNS_LOCALES = {
  ms: msDateLocale,
  en: enGB,
} as const;

type LocaleContextValue = {
  locale: LocaleKey;
  setLocale: (locale: LocaleKey) => void;
  t: Locale;
  intlLocale: string;
  dateFnsLocale: (typeof DATE_FNS_LOCALES)[LocaleKey];
  format: (
    template: string,
    values?: Record<string, string | number>
  ) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function isLocaleKey(value: unknown): value is LocaleKey {
  return typeof value === "string" && value in locales;
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleKey>(DEFAULT_LOCALE);

  // Read after mount so the server-rendered markup always matches the default.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (isLocaleKey(saved)) setLocaleState(saved);
    } catch {
      // Ignore storage failures (private mode, quota, etc).
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: LocaleKey) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore storage failures (private mode, quota, etc).
    }
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      t: locales[locale],
      intlLocale: intlLocales[locale],
      dateFnsLocale: DATE_FNS_LOCALES[locale],
      format: formatMessage,
    }),
    [locale, setLocale]
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used inside a LocaleProvider.");
  }
  return context;
}
