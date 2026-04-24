// Database column helpers for locale-aware field resolution.
// Centralizes the pattern: locale === 'zh' && work.name_chinese ? work.name_chinese : work.name
// into reusable helpers that work for ANY supported locale.
//
// SHORT-TERM STRATEGY: Maps locale → column suffix (e.g., 'zh' → '_zh', 'es' → '_es').
// DB columns follow the pattern: name_zh, name_es, parent_description_zh, parent_description_es.
// When a new language is added, add the column + add the suffix mapping here. No code changes elsewhere.

import type { Locale } from './locales';
import { DEFAULT_LOCALE } from './locales';

// ---------------------------------------------------------------------------
// Column suffix mapping
// ---------------------------------------------------------------------------

/**
 * Maps locale to the DB column suffix for translated fields.
 * English has no suffix — it's the base column.
 * New languages: add column to DB + add suffix here.
 */
const LOCALE_COLUMN_SUFFIX: Partial<Record<Locale, string>> = {
  zh: '_zh',
  es: '_es',
};

// ---------------------------------------------------------------------------
// Work name resolution
// ---------------------------------------------------------------------------

/**
 * Get the localized work name from a work object.
 * Checks locale-specific columns, falls back to English `name`.
 *
 * Handles the dual-column legacy (name_chinese + name_zh) for Chinese.
 *
 * @param work - Object with at minimum { name: string } and optional locale columns
 * @param locale - Target locale
 * @returns The best available name for the locale
 */
export function getLocalizedWorkName(
  work: Record<string, unknown>,
  locale: string,
): string {
  if (locale === DEFAULT_LOCALE) return (work.name as string) || '';

  // Chinese has the legacy dual-column: name_chinese (UI reads) + name_zh (translate writes)
  if (locale === 'zh') {
    const zh = (work.name_chinese as string) || (work.name_zh as string);
    if (zh) return zh;
    return (work.name as string) || '';
  }

  // General pattern: name_{locale}
  const suffix = LOCALE_COLUMN_SUFFIX[locale as Locale];
  if (suffix) {
    const val = work[`name${suffix}`] as string | undefined;
    if (val) return val;
  }

  return (work.name as string) || '';
}

// ---------------------------------------------------------------------------
// Generic field resolution
// ---------------------------------------------------------------------------

/**
 * Get a localized field value from any object.
 * Pattern: field → field_{suffix} for non-English locales.
 *
 * @param obj - Any DB row or object
 * @param field - Base field name (e.g., 'parent_description')
 * @param locale - Target locale
 * @returns The localized value or the English fallback
 */
export function getLocalizedField(
  obj: Record<string, unknown>,
  field: string,
  locale: string,
): string {
  if (locale === DEFAULT_LOCALE) return (obj[field] as string) || '';

  const suffix = LOCALE_COLUMN_SUFFIX[locale as Locale];
  if (suffix) {
    const localizedKey = `${field}${suffix}`;
    const val = obj[localizedKey] as string | undefined;
    if (val) return val;
  }

  // Fallback to English
  return (obj[field] as string) || '';
}

/**
 * Get the DB column name for a translated field.
 * Returns the base field name for English, appends suffix for other locales.
 * Useful for building Supabase queries: `.select('name, ' + getLocalizedColumn('name', locale))`
 *
 * @param field - Base field name (e.g., 'name', 'parent_description')
 * @param locale - Target locale
 * @returns Column name (e.g., 'name_zh', 'parent_description_es', or just 'name' for English)
 */
export function getLocalizedColumn(field: string, locale: string): string {
  if (locale === DEFAULT_LOCALE) return field;

  // Chinese name has legacy dual-column — UI reads name_chinese
  if (locale === 'zh' && field === 'name') return 'name_chinese';

  const suffix = LOCALE_COLUMN_SUFFIX[locale as Locale];
  if (suffix) return `${field}${suffix}`;

  return field;
}
