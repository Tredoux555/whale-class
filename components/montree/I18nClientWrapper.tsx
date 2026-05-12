'use client';

import { ReactNode } from 'react';
import { I18nProvider, type Locale } from '@/lib/montree/i18n';

/**
 * Client-side wrapper that provides the I18nProvider.
 * Used in the Montree server layout (which can't be 'use client'
 * because it exports metadata).
 *
 * Accepts an optional `initialLocale` prop forwarded from the server's
 * `mt_locale` cookie read in app/montree/layout.tsx — lets the provider
 * start with the right locale (no English flash) and pre-trigger the
 * lazy locale-file load on mount.
 */
export default function I18nClientWrapper({
  children,
  initialLocale,
  initialMessages,
}: {
  children: ReactNode;
  initialLocale?: Locale;
  initialMessages?: Record<string, string>;
}) {
  return (
    <I18nProvider initialLocale={initialLocale} initialMessages={initialMessages}>
      {children}
    </I18nProvider>
  );
}
