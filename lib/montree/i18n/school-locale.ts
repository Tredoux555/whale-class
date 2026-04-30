// School-level locale resolver.
// Reads primary_locale + secondary_locales from montree_schools and returns
// the canonical "what languages does this school care about?" answer.
//
// Use cases (current and future):
//   - UI default locale at first login
//   - Report generation language preference (e.g., parent narratives)
//   - Any future per-school AI content language routing
//
// NOT used for custom-work translation. Custom works fan out to all
// ENABLED_LOCALES via translateAllLocales() — at Haiku pricing, the
// per-school routing optimization isn't worth the complexity.

import { getSupabase } from '@/lib/supabase-client';
import type { Locale } from './locales';
import { isValidLocale, DEFAULT_LOCALE } from './locales';

export interface SchoolLocales {
  /** The school's primary operating language. UI default at first login. */
  primary: Locale;
  /** Additional languages this school operates in. Empty for monolingual schools. */
  secondary: Locale[];
  /** Primary + secondary + 'en' (deduplicated). The full set this school cares about. */
  allTargetLocales: Locale[];
}

/**
 * Resolve the locale set for a school. Falls back gracefully:
 *   - missing/invalid primary_locale → 'en'
 *   - missing secondary_locales → []
 *   - school not found → { primary: 'en', secondary: [], allTargetLocales: ['en'] }
 *
 * Always includes 'en' in allTargetLocales (English is the canonical / system reference).
 */
export async function getSchoolLocales(schoolId: string): Promise<SchoolLocales> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('montree_schools')
    .select('primary_locale, secondary_locales')
    .eq('id', schoolId)
    .maybeSingle();

  const primary: Locale = (data?.primary_locale && isValidLocale(data.primary_locale))
    ? (data.primary_locale as Locale)
    : DEFAULT_LOCALE;

  const secondaryRaw: unknown = data?.secondary_locales;
  const secondary: Locale[] = Array.isArray(secondaryRaw)
    ? (secondaryRaw.filter(isValidLocale) as Locale[])
    : [];

  const set = new Set<Locale>([primary, ...secondary, DEFAULT_LOCALE]);
  return {
    primary,
    secondary,
    allTargetLocales: Array.from(set),
  };
}
