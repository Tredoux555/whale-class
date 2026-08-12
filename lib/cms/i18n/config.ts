// lib/cms/i18n/config.ts
// CMS locale registry. i18n is baked in from file one — see CLAUDE.md, §I18N LAW.
//
// Adding a locale is a three-step move and nothing else:
//   1. add the code to LOCALES below (+ its LOCALE_META entry),
//   2. add lib/cms/i18n/dictionaries/<code>.ts (start by re-exporting `en`),
//   3. register it in lib/cms/i18n/dictionaries/index.ts.

export const LOCALES = ['en', 'fr', 'es', 'ru', 'ar', 'sw', 'zh'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

/** Right-to-left locales. The root layout sets `dir` from this. */
export const RTL_LOCALES: readonly Locale[] = ['ar'] as const;

export function isRtl(locale: Locale): boolean {
  return RTL_LOCALES.includes(locale);
}

export function dirFor(locale: Locale): 'ltr' | 'rtl' {
  return isRtl(locale) ? 'rtl' : 'ltr';
}

export interface LocaleMeta {
  /** Name in the language itself — a switcher that says "Russian" is useless to a Russian. */
  nativeName: string;
  /** English name, for admin/debug surfaces. */
  englishName: string;
  /** Translation completeness. `stub` = re-exports English with TODO markers. */
  status: 'complete' | 'stub';
}

export const LOCALE_META: Record<Locale, LocaleMeta> = {
  en: { nativeName: 'English', englishName: 'English', status: 'complete' },
  fr: { nativeName: 'Français', englishName: 'French', status: 'stub' },
  es: { nativeName: 'Español', englishName: 'Spanish', status: 'stub' },
  ru: { nativeName: 'Русский', englishName: 'Russian', status: 'complete' },
  ar: { nativeName: 'العربية', englishName: 'Arabic', status: 'complete' },
  sw: { nativeName: 'Kiswahili', englishName: 'Swahili', status: 'stub' },
  zh: { nativeName: '中文', englishName: 'Chinese', status: 'stub' },
};

/** Cookie the LanguageSwitcher writes and middleware/layout read. */
export const LOCALE_COOKIE = 'cms_locale';

/** Header middleware sets so a server component can read the locale for THIS request. */
export const LOCALE_HEADER = 'x-cms-locale';

/** Query param that overrides everything (used by screenshot/QA tooling). */
export const LOCALE_QUERY = 'locale';

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

/** Best-effort match of an Accept-Language header against LOCALES. */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale | null {
  if (!header) return null;
  const candidates = header
    .split(',')
    .map((part) => {
      const [tag, q] = part.trim().split(';q=');
      return { tag: tag.trim().toLowerCase(), q: q ? parseFloat(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);

  for (const { tag } of candidates) {
    const base = tag.split('-')[0];
    if (isLocale(base)) return base;
  }
  return null;
}
