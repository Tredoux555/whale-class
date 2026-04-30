// lib/montree/locales-config.ts
// Single source of truth for which non-English locales are production-active.
//
// ENABLED_LOCALES is now AUTO-DERIVED from SUPPORTED_LOCALES — adding a locale to
// SUPPORTED_LOCALES in lib/montree/i18n/locales.ts is the only code change needed
// to enable it in every INSERT path, background translate flow, and custom-work
// fan-out.
//
// To add a new language:
//   1. Add the locale to SUPPORTED_LOCALES in lib/montree/i18n/locales.ts
//   2. Run: node scripts/add-language.mjs <locale>
//      (prints ALTER TABLE SQL + batch-translate instructions)
//   3. Add a matching UPDATE block to apply_global_translations() in
//      migrations/182_apply_global_translations_function.sql (the file is
//      grep-friendly — every locale is a near-identical block).
//   4. Translate Whale Class into the new language, then re-run
//      scripts/seed-global-translations.mjs and
//      scripts/backfill-all-classroom-translations.mjs to fan it out.

import type { Locale } from '@/lib/montree/i18n/locales';
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from '@/lib/montree/i18n/locales';

/**
 * Non-English locales active in production.
 * Auto-derived from SUPPORTED_LOCALES — never hand-edited.
 *
 * Used by every INSERT path, batchTranslateAllLocales, translateAllLocales,
 * and the custom-work fan-out. Expanding SUPPORTED_LOCALES in locales.ts
 * automatically expands this list with no further code change.
 */
export const ENABLED_LOCALES: Locale[] = SUPPORTED_LOCALES.filter(
  (l): l is Exclude<Locale, typeof DEFAULT_LOCALE> => l !== DEFAULT_LOCALE
);

/**
 * Build locale-specific INSERT fields for montree_classroom_curriculum_works.
 *
 * Chinese (zh) is a special case: it has a dual-column legacy where both
 * name_zh AND name_chinese must be kept in sync. It may also be pre-seeded
 * from the static curriculum JSON (chineseName). All other locales use a
 * single name_{locale} column, seeded as null and filled by batch translate.
 *
 * @param chineseName  Value from the static curriculum JSON (may be undefined/null)
 * @returns  Object with all locale column fields, ready to spread into INSERT
 */
export function buildLocaleInsertFields(
  chineseName?: string | null
): Record<string, string | null> {
  const fields: Record<string, string | null> = {};
  for (const locale of ENABLED_LOCALES) {
    if (locale === 'zh') {
      // Dual-column legacy: always keep name_zh + name_chinese in sync
      fields.name_chinese = chineseName || null;
      fields.name_zh = chineseName || null;
    } else {
      // Single _{locale} column — filled by background batch translate
      fields[`name_${locale}`] = null;
    }
  }
  return fields;
}

/**
 * Returns the primary DB column used to check whether a work has been
 * translated to a given locale (used for IS NULL filtering in batch translate).
 *
 * Chinese → name_zh  (the "primary" translate column; name_chinese is the mirror)
 * Others  → name_{locale}
 */
export function getNameColumn(locale: Locale): string {
  return locale === 'zh' ? 'name_zh' : `name_${locale}`;
}
