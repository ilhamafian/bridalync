import { ms } from "./ms";
import { en } from "./en";

export const locales = {
  ms,
  en,
} as const;

export type LocaleKey = keyof typeof locales;

export { ms, en };
