'use client';

import { useI18n } from '@/lib/montree/i18n';
import { SUPPORTED_LOCALES, LOCALE_DISPLAY_NAMES, type Locale } from '@/lib/montree/i18n/locales';

/**
 * Language selector — clean visible dropdown, scales to any number of locales.
 */
export default function LanguageToggle({ className = '' }: { className?: string }) {
  const { locale, setLocale } = useI18n();

  return (
    <select
      value={locale}
      onChange={e => setLocale(e.target.value as Locale)}
      aria-label="Select language"
      className={`
        px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer
        bg-slate-700 text-slate-200 border-0
        focus:outline-none focus:ring-2 focus:ring-slate-500
        appearance-none
        ${className}
      `}
    >
      {SUPPORTED_LOCALES.map(loc => (
        <option key={loc} value={loc}>
          {LOCALE_DISPLAY_NAMES[loc]}
        </option>
      ))}
    </select>
  );
}
