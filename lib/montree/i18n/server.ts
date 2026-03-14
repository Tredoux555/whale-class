// Server-side translator for API routes (no React dependency)
// Use this in API routes that generate reports, emails, PDFs etc.
// Client-side code should use useI18n() hook from context.tsx instead.

import { en, type TranslationKey } from './en';
import { zh } from './zh';

export type Locale = 'en' | 'zh';

/**
 * Create a translator function for server-side use.
 * Fallback chain: requested locale → English → key name
 */
export function getTranslator(locale: Locale) {
  const messages: Record<string, string> = locale === 'zh' ? zh : en;

  return (key: TranslationKey, fallback?: string): string => {
    const value = messages[key];
    if (value) return value;
    if (fallback) return fallback;
    // Fallback to English
    const enValue = (en as Record<string, string>)[key];
    return enValue || key;
  };
}

/**
 * Extract locale from URL search params. Defaults to 'en'.
 */
export function getLocaleFromRequest(url: URL | string): Locale {
  const u = typeof url === 'string' ? new URL(url) : url;
  const locale = u.searchParams.get('locale');
  if (locale === 'zh' || locale === 'en') return locale;
  return 'en';
}

/**
 * Get translated area name for a Montessori area key.
 */
export function getTranslatedAreaName(area: string, locale: Locale): string {
  const t = getTranslator(locale);
  const key = `area.${area}` as TranslationKey;
  const translated = t(key);
  // If translation key wasn't found, format the area name nicely
  if (translated === key) {
    return area.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
  return translated;
}

/**
 * Get translated status label.
 */
export function getTranslatedStatus(status: string, locale: Locale): string {
  const t = getTranslator(locale);
  switch (status) {
    case 'mastered': return t('progress.mastered' as TranslationKey, 'Mastered');
    case 'practicing': return t('progress.practicing' as TranslationKey, 'Practicing');
    case 'presented':
    case 'introduced': return t('progress.presented' as TranslationKey, 'Presented');
    case 'documented': return t('photoInsight.documented' as TranslationKey, 'Documented');
    case 'not_started': return t('progress.notStarted' as TranslationKey, 'Not Started');
    default: return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
}
