// lib/montree/locales-config.ts
// Single source of truth for which non-English locales are production-active.
//
// To add a new language:
//   1. Add the locale to ENABLED_LOCALES below
//   2. Run: node scripts/add-language.mjs <locale>
//      (prints ALTER TABLE SQL + batch-translate instructions)
//   3. That's it — all write paths and background-translate flows pick it up automatically.

import type { Locale } from '@/lib/montree/i18n/locales';

/**
 * Non-English locales active in production.
 * These locales have DB columns (name_zh, name_es, …) and get
 * background translation whenever curriculum is seeded.
 *
 * Adding a locale here is the ONLY code change needed to enable it
 * in all INSERT paths and background-translate flows.
 */
export const ENABLED_LOCALES: Locale[] = ['zh', 'es'];

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
