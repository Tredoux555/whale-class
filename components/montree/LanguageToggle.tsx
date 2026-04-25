'use client';

import { useI18n } from '@/lib/montree/i18n';
import { SUPPORTED_LOCALES, LOCALE_SHORT_LABELS, LOCALE_DISPLAY_NAMES, type Locale } from '@/lib/montree/i18n/locales';

/**
 * Language selector dropdown.
 * Shows current locale's short label; opens a native <select> with full
 * display names so teachers can pick any supported locale directly.
 */
export default function LanguageToggle({ className = '' }: { className?: string }) {
  const { locale, setLocale } = useI18n();

  const label = LOCALE_SHORT_LABELS[locale as Locale] || locale.toUpperCase();

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      {/* Visible pill label (pointer-events-none so the hidden select receives the click) */}
      <span
        aria-hidden="true"
        className="
          pointer-events-none absolute inset-0 flex items-center justify-center
          px-2.5 py-1 rounded-full text-xs font-semibold
          bg-slate-700 text-slate-200 select-none
        "
      >
        {label}
      </span>

      {/* Native select — invisible but covers the full pill area */}
      <select
        value={locale}
        onChange={e => setLocale(e.target.value as Locale)}
        aria-label="Select language"
        className="
          opacity-0 absolute inset-0 w-full h-full cursor-pointer
        "
      >
        {SUPPORTED_LOCALES.map(loc => (
          <option key={loc} value={loc}>
            {LOCALE_DISPLAY_NAMES[loc]}
          </option>
        ))}
      </select>
    </div>
  );
}
