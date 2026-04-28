// Canonical locale definitions — single source of truth.
// Import Locale, SUPPORTED_LOCALES, isValidLocale, etc. from here.
// NEVER define Locale elsewhere in the codebase.

// ---------------------------------------------------------------------------
// Supported locales
// ---------------------------------------------------------------------------

/** All languages Montree currently supports. Add new languages here ONLY. */
export const SUPPORTED_LOCALES = ['en', 'zh', 'es', 'de', 'fr', 'pt', 'nl', 'it', 'ja', 'ko', 'uk', 'ru'] as const;

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
  fr: 'fr-FR',
  pt: 'pt-BR',
  nl: 'nl-NL',
  it: 'it-IT',
  ja: 'ja-JP',
  ko: 'ko-KR',
  uk: 'uk-UA',
  ru: 'ru-RU',
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
  fr: 'Français',
  pt: 'Português',
  nl: 'Nederlands',
  it: 'Italiano',
  ja: '日本語',
  ko: '한국어',
  uk: 'Українська',
  ru: 'Русский',
};

/** Short labels for compact toggle (2-3 chars). */
export const LOCALE_SHORT_LABELS: Record<Locale, string> = {
  en: 'EN',
  zh: '中文',
  es: 'ES',
  de: 'DE',
  fr: 'FR',
  pt: 'PT',
  nl: 'NL',
  it: 'IT',
  ja: '日本語',
  ko: '한국어',
  uk: 'УКР',
  ru: 'РУС',
};
