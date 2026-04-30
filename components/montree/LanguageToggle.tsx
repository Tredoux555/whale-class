'use client';

import { useI18n } from '@/lib/montree/i18n';
import {
  SUPPORTED_LOCALES,
  LOCALE_DISPLAY_NAMES,
  LOCALE_SHORT_LABELS,
  type Locale,
} from '@/lib/montree/i18n/locales';

/**
 * Compact language selector. Visible pill shows the short label (EN / ZH /
 * УКР etc.) so it stays narrow on mobile; tapping reveals a native dropdown
 * with the full localized display name (English / 中文 / Українська).
 *
 * Implementation: a non-interactive span renders the short label, and an
 * invisible <select> overlays it to capture the tap and show the OS picker.
 */
export default function LanguageToggle({ className = '' }: { className?: string }) {
  const { locale, setLocale } = useI18n();

  return (
    <div className={`relative inline-flex ${className}`} style={{ minWidth: 44 }}>
      <span
        aria-hidden
        className="pointer-events-none px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-700 text-slate-200 select-none"
      >
        {LOCALE_SHORT_LABELS[locale]}
      </span>
      <select
        value={locale}
        onChange={e => setLocale(e.target.value as Locale)}
        aria-label="Select language"
        className="absolute inset-0 opacity-0 cursor-pointer"
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
