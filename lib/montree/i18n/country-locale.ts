// lib/montree/i18n/country-locale.ts
//
// Maps an ISO 3166-1 alpha-2 country code (as provided by Cloudflare's
// `cf-ipcountry` request header) to one of Montree's SUPPORTED_LOCALES.
//
// Used by middleware.ts to pick a sensible default UI language for a brand-new
// visitor based on where they're connecting from. ANY country whose primary
// language Montree doesn't support — and any unknown/anonymising value Cloudflare
// sends (e.g. 'XX', 'T1' for Tor) — falls back to DEFAULT_LOCALE ('en').
//
// This only seeds a FIRST-visit default; the user's manual language choice
// (mt_locale cookie via the switcher) always takes precedence afterward.
//
// Multilingual countries are mapped to their plurality language (e.g. CH→de,
// BE→nl, CA→en); a visitor can always switch. To support a new language,
// add its locale to SUPPORTED_LOCALES (locales.ts) and add the relevant
// country codes here.

import { type Locale, DEFAULT_LOCALE, isValidLocale } from './locales';

// Country code (UPPERCASE) → locale. Only includes codes that map to a
// SUPPORTED locale; everything else resolves to DEFAULT_LOCALE.
const COUNTRY_TO_LOCALE: Record<string, Locale> = {
  // Chinese
  CN: 'zh', TW: 'zh', HK: 'zh', MO: 'zh',
  // Spanish
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', PE: 'es', VE: 'es', CL: 'es',
  EC: 'es', GT: 'es', CU: 'es', BO: 'es', DO: 'es', HN: 'es', PY: 'es',
  SV: 'es', NI: 'es', CR: 'es', PR: 'es', PA: 'es', UY: 'es', GQ: 'es',
  // German (CH/LI plurality German)
  DE: 'de', AT: 'de', CH: 'de', LI: 'de',
  // French (FR + Monaco + major francophone Africa)
  FR: 'fr', MC: 'fr', CI: 'fr', SN: 'fr', CM: 'fr', CD: 'fr', CG: 'fr',
  ML: 'fr', BF: 'fr', NE: 'fr', TG: 'fr', BJ: 'fr', GA: 'fr', GN: 'fr',
  TD: 'fr', MG: 'fr', RW: 'fr', DJ: 'fr',
  // Portuguese
  PT: 'pt', BR: 'pt', AO: 'pt', MZ: 'pt', CV: 'pt', GW: 'pt', ST: 'pt', TL: 'pt',
  // Dutch (BE plurality Dutch/Flemish; SR/AW/CW)
  NL: 'nl', BE: 'nl', SR: 'nl', AW: 'nl', CW: 'nl',
  // Italian
  IT: 'it', SM: 'it', VA: 'it',
  // Japanese
  JP: 'ja',
  // Korean
  KR: 'ko', KP: 'ko',
  // Ukrainian
  UA: 'uk',
  // Russian (lingua franca across BY/KZ/KG)
  RU: 'ru', BY: 'ru', KZ: 'ru', KG: 'ru',
};

/**
 * Resolve a Cloudflare country code to a supported locale.
 * Returns DEFAULT_LOCALE ('en') for unsupported, unknown, or missing codes.
 */
export function localeForCountry(countryCode: string | null | undefined): Locale {
  if (!countryCode) return DEFAULT_LOCALE;
  const mapped = COUNTRY_TO_LOCALE[countryCode.toUpperCase()];
  return isValidLocale(mapped) ? mapped : DEFAULT_LOCALE;
}
