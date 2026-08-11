'use client';

// components/cms/LanguageSwitcher.tsx
// Lives in the shared header on every layer. Writes the `cms_locale` cookie and
// refreshes — the server re-renders with the new dictionary and, for Arabic,
// the new `dir`. No client-side string swapping, so there is exactly one code
// path for translation and it is the server one.

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  LOCALES,
  LOCALE_COOKIE,
  LOCALE_META,
  type Locale,
} from '@/lib/cms/i18n/config';
import { useI18n } from '@/lib/cms/i18n/provider';
import { GlobeIcon } from './icons';

export function LanguageSwitcher() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  function choose(next: Locale) {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    setOpen(false);
    startTransition(() => router.refresh());
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('lang.change')}
        className="cms-btn cms-btn-secondary cms-btn-sm"
      >
        <GlobeIcon />
        <span>{LOCALE_META[locale].nativeName}</span>
      </button>

      {open ? (
        <>
          {/* Click-away layer — cheaper and more reliable than a document listener. */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          <ul
            role="listbox"
            aria-label={t('lang.label')}
            className="cms-card absolute z-20 mt-2 end-0 min-w-[190px] p-1.5"
          >
            {LOCALES.map((code) => {
              const meta = LOCALE_META[code];
              const active = code === locale;
              return (
                <li key={code}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => choose(code)}
                    className={`cms-btn cms-btn-sm cms-btn-full cms-btn-between ${
                      active ? 'cms-btn-primary cms-btn-soft' : 'cms-btn-ghost'
                    }`}
                  >
                    <span>{meta.nativeName}</span>
                    {meta.status === 'stub' ? (
                      <span className="text-[10px] opacity-70">{t('lang.incomplete')}</span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </div>
  );
}
