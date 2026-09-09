import { ms, type Locale } from "./ms";
import { en } from "./en";

export const locales = {
  ms,
  en,
} as const;

export type LocaleKey = keyof typeof locales;
export type { Locale };

export const intlLocales: Record<LocaleKey, string> = {
  ms: "ms-MY",
  en: "en-GB",
};

/**
 * Fills `{placeholder}` slots, plus `{count, singular, plural}` slots that pick
 * a word based on the numeric value — Malay has no plural form, so its strings
 * simply omit the second variant.
 */
export function formatMessage(
  template: string,
  values: Record<string, string | number> = {}
): string {
  return template.replace(
    /\{(\w+)(?:,\s*([^,{}]*),\s*([^{}]*))?\}/g,
    (match, key: string, singular?: string, plural?: string) => {
      const value = values[key];
      if (value === undefined) return match;
      if (singular === undefined || plural === undefined) return String(value);
      return Number(value) === 1 ? singular.trim() : plural.trim();
    }
  );
}

export { ms, en };
