'use client';

import { ReactNode } from 'react';
import { I18nProvider } from '@/lib/montree/i18n';

/**
 * Client-side wrapper that provides the I18nProvider.
 * Used in the Montree server layout (which can't be 'use client'
 * because it exports metadata).
 */
export default function I18nClientWrapper({ children }: { children: ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}
