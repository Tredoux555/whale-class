// Database column helpers for locale-aware field resolution.
// Centralizes the pattern: locale === 'zh' && work.name_chinese ? work.name_chinese : work.name
// into reusable helpers that work for ANY supported locale.
//
// SHORT-TERM STRATEGY: Maps locale → column suffix (e.g., 'zh' → '_zh', 'es' → '_es').
// DB columns follow the pattern: name_zh, name_es, parent_description_zh, parent_description_es.
// When a new language is added, add the column + add the suffix mapping here. No code changes elsewhere.

import type { Locale } from './locales';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from './locales';

// ---------------------------------------------------------------------------
// Column suffix mapping
// ---------------------------------------------------------------------------

/**
 * Maps locale to the DB column suffix for translated fields.
 * English has no suffix — it's the base column.
 *
 * Convention: every non-English locale follows `${field}_${locale}`.
 * To add a new language, just add it to SUPPORTED_LOCALES in locales.ts and
 * the mapping is auto-derived below — no need to edit this map.
 */
export const LOCALE_COLUMN_SUFFIX: Partial<Record<Locale, string>> = (() => {
  const map: Partial<Record<Locale, string>> = {};
  for (const locale of SUPPORTED_LOCALES) {
    if (locale === DEFAULT_LOCALE) continue; // English has no suffix
    map[locale] = `_${locale}`;
  }
  return map;
})();

/**
 * The row shape that `buildLocalizedSelect(base)` actually selects, expressed
 * at the type level so callers can hand it to Supabase's `.select<Query, Row>()`
 * instead of losing the row type.
 *
 * WHY THIS EXISTS: `buildLocalizedSelect()` builds its column list at runtime,
 * so the select string reaching `.select()` is a plain `string`. supabase-js
 * types `.select()` by *parsing the string literal*, and a non-literal string
 * makes that parser bail out with `ParserError`, which collapses every field on
 * the result to `never`. Passing this type as the explicit row generic tells the
 * compiler what those columns really are — and it stays in lockstep with
 * SUPPORTED_LOCALES, so adding a locale still needs no edits here.
 *
 * Columns are `string | null` because a translation that has not been filled in
 * yet is NULL in Postgres.
 */
export type LocalizedColumns<Base extends string> =
  & { [K in Base]: string | null }
  & { [L in Exclude<Locale, typeof DEFAULT_LOCALE> as `${Base}_${L}`]: string | null };

/**
 * `buildLocalizedSelect('name')` additionally selects the legacy `name_chinese`
 * dual column, so the `name` case gets its own alias.
 */
export type LocalizedNameColumns = LocalizedColumns<'name'> & {
  name_chinese: string | null;
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
/**
 * Any row that MAY carry locale-suffixed columns.
 *
 * Deliberately not `Record<string, unknown>`: that demands an index signature,
 * which ordinary interfaces (Work, MergedWork, the curriculum row types…) do not
 * have — so every declared row type was rejected at the call site and each
 * caller had to cast. `object` accepts both, and the one cast lives here.
 */
export type LocalizedRow = object;

export function getLocalizedWorkName(
  workRow: LocalizedRow,
  locale: string,
): string {
  const work = workRow as Record<string, unknown>;
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
  objRow: LocalizedRow,
  field: string,
  locale: string,
): string {
  const obj = objRow as Record<string, unknown>;
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

// ---------------------------------------------------------------------------
// Guide field resolution (JSONB-backed)
// ---------------------------------------------------------------------------

/**
 * Get a guide field (quick_guide, materials, presentation_steps, direct_aims, etc.)
 * localized via the `guide_content_<locale>` JSONB column, with fallback to the
 * English top-level column.
 *
 * Schema reminder: only English has flat columns (`quick_guide`, `materials`).
 * Translated guide content lives inside `guide_content_<locale>` JSONB whose
 * keys are SUFFIX-FREE (e.g. `{ quick_guide: "...", materials: [...] }`).
 *
 * There is NO `quick_guide_<locale>` or `materials_<locale>` column — anything
 * that reads those is reading a phantom field. Use this helper instead.
 *
 * @example
 *   getLocalizedGuideField(work, 'quick_guide', 'zh')
 *   // → work.guide_content_zh.quick_guide ?? work.quick_guide
 *
 *   getLocalizedGuideField<string[]>(work, 'materials', 'es')
 *   // → work.guide_content_es.materials ?? work.materials
 */
export function getLocalizedGuideField<T = unknown>(
  workRow: LocalizedRow,
  field: string,
  locale: string,
): T | undefined {
  const work = workRow as Record<string, unknown>;
  if (locale === DEFAULT_LOCALE) return work[field] as T | undefined;

  const suffix = LOCALE_COLUMN_SUFFIX[locale as Locale];
  if (suffix) {
    const guideContent = work[`guide_content${suffix}`] as Record<string, unknown> | null | undefined;
    if (guideContent && typeof guideContent === 'object') {
      const val = guideContent[field];
      if (val !== undefined && val !== null && val !== '') return val as T;
    }
  }

  // Fall back to English column
  return work[field] as T | undefined;
}

// ---------------------------------------------------------------------------
// SELECT-list builders — auto-derive locale columns for Supabase queries
// ---------------------------------------------------------------------------

/**
 * Build the comma-separated list of localized column names for a given base
 * field, covering every non-English supported locale.
 *
 * Example:
 *   buildLocalizedColumnList('name')
 *   // → "name_zh, name_es, name_de, name_fr, name_pt, name_nl, name_it, name_ja, name_ko, name_uk, name_ru"
 *
 * Use this to keep API SELECT lists in sync with SUPPORTED_LOCALES — when a
 * new locale is added to locales.ts, every call site picks it up automatically.
 */
export function buildLocalizedColumnList(baseField: string): string {
  return SUPPORTED_LOCALES
    .filter((l) => l !== DEFAULT_LOCALE)
    .map((l) => `${baseField}${LOCALE_COLUMN_SUFFIX[l]}`)
    .join(', ');
}

/**
 * Build a SELECT fragment for a base field that includes the English column,
 * the legacy Chinese dual-column (`name_chinese`) when applicable, and every
 * locale-suffixed column.
 *
 * Example:
 *   buildLocalizedSelect('name')
 *   // → "name, name_chinese, name_zh, name_es, name_de, ..."
 *
 *   buildLocalizedSelect('parent_description')
 *   // → "parent_description, parent_description_zh, parent_description_es, ..."
 *
 * Drop directly into Supabase `.select()`:
 *   .select(`id, ${buildLocalizedSelect('name')}`)
 */
export function buildLocalizedSelect(baseField: string): string {
  const localized = buildLocalizedColumnList(baseField);
  // Legacy: 'name' has the dual-column name_chinese alongside name_zh
  if (baseField === 'name') {
    return `${baseField}, name_chinese, ${localized}`;
  }
  return `${baseField}, ${localized}`;
}
