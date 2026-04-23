'use client';

import { useI18n } from '@/lib/montree/i18n';
import { SUPPORTED_LOCALES, LOCALE_SHORT_LABELS, type Locale } from '@/lib/montree/i18n/locales';

/**
 * Compact language cycle button.
 * Tapping cycles through all supported locales: EN → 中文 → ES → EN → ...
 * Shows the CURRENT locale's short label so teachers know what language is active.
 */
export default function LanguageToggle({ className = '' }: { className?: string }) {
  const { locale, setLocale } = useI18n();

  const cycle = () => {
    const idx = SUPPORTED_LOCALES.indexOf(locale as Locale);
    const next = SUPPORTED_LOCALES[(idx + 1) % SUPPORTED_LOCALES.length];
    setLocale(next);
  };

  const label = LOCALE_SHORT_LABELS[locale as Locale] || locale.toUpperCase();

  return (
    <button
      onClick={cycle}
      aria-label={`Switch language (current: ${label})`}
      className={`
        px-2.5 py-1 rounded-full text-xs font-semibold
        bg-slate-700 text-slate-200 hover:bg-slate-600
        transition-colors select-none
        ${className}
      `}
    >
      {label}
    </button>
  );
}
