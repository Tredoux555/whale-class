'use client';

import { useI18n, type Locale } from '@/lib/montree/i18n';

const LABELS: Record<Locale, string> = {
  en: '中文',  // shows what you'll switch TO
  zh: 'EN',
};

/**
 * Compact language toggle button.
 * Shows the label of the OTHER language so the user
 * knows what they'll get when they tap.
 */
export default function LanguageToggle({ className = '' }: { className?: string }) {
  const { locale, setLocale } = useI18n();

  const toggle = () => setLocale(locale === 'en' ? 'zh' : 'en');

  return (
    <button
      onClick={toggle}
      aria-label={`Switch language to ${locale === 'en' ? 'Chinese' : 'English'}`}
      className={`
        px-2.5 py-1 rounded-full text-xs font-semibold
        bg-slate-700 text-slate-200 hover:bg-slate-600
        transition-colors select-none
        ${className}
      `}
    >
      {LABELS[locale]}
    </button>
  );
}
