// lib/cms/i18n/t.ts
// The typed translator. Deliberately tiny — Montree's package.json carries no
// i18n framework, so CMS does not add one. A dictionary lookup plus {named}
// interpolation is the whole feature.
//
// USAGE (server):  const t = getT(locale); t('parent.dashboard.title')
// USAGE (client):  const { t } = useI18n();

import { DEFAULT_LOCALE, type Locale } from './config';
import { DICTIONARIES, type Dictionary, type TranslationKey } from './dictionaries';

export type { TranslationKey, Dictionary };

/** Values substituted into `{placeholders}` in a string. */
export type TVars = Record<string, string | number>;

/** The translator function signature. Keys are checked at compile time. */
export type TFunction = (key: TranslationKey, vars?: TVars) => string;

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
}

/**
 * Interpolate `{name}` placeholders. An unmatched placeholder is left intact
 * rather than blanked — a visible `{name}` in QA beats a silent hole in prod.
 */
export function interpolate(template: string, vars?: TVars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match
  );
}

/** Build a translator bound to one locale. */
export function getT(locale: Locale): TFunction {
  const dict = getDictionary(locale);
  const fallback = DICTIONARIES[DEFAULT_LOCALE];
  return (key, vars) => interpolate(dict[key] ?? fallback[key] ?? key, vars);
}
