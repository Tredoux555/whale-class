// lib/cms/i18n/server.ts
// Server-side locale resolution. SERVER COMPONENTS ONLY (imports next/headers).
//
// Resolution order, highest priority first:
//   1. the `x-cms-locale` header  — set by middleware.ts from ?locale=xx
//   2. the `cms_locale` cookie    — set by the LanguageSwitcher
//   3. Accept-Language            — first supported match
//   4. DEFAULT_LOCALE
//
// The header rung is what makes `?locale=ar` work on a server-rendered layout:
// a layout cannot read searchParams, but it can read a request header.

import { cookies, headers } from 'next/headers';
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_HEADER,
  isLocale,
  localeFromAcceptLanguage,
  type Locale,
} from './config';
import { getT, type TFunction } from './t';

export async function getLocale(): Promise<Locale> {
  const h = await headers();

  const fromHeader = h.get(LOCALE_HEADER);
  if (isLocale(fromHeader)) return fromHeader;

  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;

  return localeFromAcceptLanguage(h.get('accept-language')) ?? DEFAULT_LOCALE;
}

/** Convenience: resolve the locale and return a translator bound to it. */
export async function getServerT(): Promise<{ locale: Locale; t: TFunction }> {
  const locale = await getLocale();
  return { locale, t: getT(locale) };
}
