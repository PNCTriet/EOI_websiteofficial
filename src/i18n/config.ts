export const LOCALES = ["vi", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "vi";
export const LOCALE_COOKIE = "eoi_locale";

export function isLocale(value: string | undefined): value is Locale {
  return value === "vi" || value === "en";
}
