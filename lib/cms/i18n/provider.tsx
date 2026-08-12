'use client';

// lib/cms/i18n/provider.tsx
// Client-side half of the i18n system. The root layout resolves the locale on
// the server and hands it down; this provider makes `t()` available to any
// client component (forms, the wizard, the switcher) without prop-drilling.

import { createContext, useContext, useMemo } from 'react';
import { DEFAULT_LOCALE, dirFor, type Locale } from './config';
import { getT, type TFunction } from './t';

interface I18nValue {
  locale: Locale;
  dir: 'ltr' | 'rtl';
  t: TFunction;
}

const I18nContext = createContext<I18nValue>({
  locale: DEFAULT_LOCALE,
  dir: 'ltr',
  t: getT(DEFAULT_LOCALE),
});

export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const value = useMemo<I18nValue>(
    () => ({ locale, dir: dirFor(locale), t: getT(locale) }),
    [locale]
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  return useContext(I18nContext);
}

/** Shorthand for the common case: `const t = useT()`. */
export function useT(): TFunction {
  return useContext(I18nContext).t;
}
