// Canonical locale definitions — single source of truth.
// Import Locale, SUPPORTED_LOCALES, isValidLocale, etc. from here.
// NEVER define Locale elsewhere in the codebase.

// ---------------------------------------------------------------------------
// Supported locales
// ---------------------------------------------------------------------------

/** All languages Montree currently supports. Add new languages here ONLY. */
export const SUPPORTED_LOCALES = ['en', 'zh', 'es', 'de'] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

/** Type guard — validates a string is a supported locale. */
export function isValidLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// Locale → Intl locale mapping (for date/number formatting)
// ---------------------------------------------------------------------------

/** Maps our locale codes to BCP 47 / Intl locale strings. */
export const LOCALE_TO_INTL: Record<Locale, string> = {
  en: 'en-US',
  zh: 'zh-CN',
  es: 'es-ES',
  de: 'de-DE',
};

/** Get the Intl locale string for date/number formatting. Falls back to en-US. */
export function getIntlLocale(locale: string): string {
  return LOCALE_TO_INTL[locale as Locale] || LOCALE_TO_INTL[DEFAULT_LOCALE];
}

// ---------------------------------------------------------------------------
// Display names (for language picker UI)
// ---------------------------------------------------------------------------

/** Native language names shown in the language selector. */
export const LOCALE_DISPLAY_NAMES: Record<Locale, string> = {
  en: 'English',
  zh: '中文',
  es: 'Español',
  de: 'Deutsch',
};

/** Short labels for compact toggle (2-3 chars). */
export const LOCALE_SHORT_LABELS: Record<Locale, string> = {
  en: 'EN',
  zh: '中文',
  es: 'ES',
  de: 'DE',
};
