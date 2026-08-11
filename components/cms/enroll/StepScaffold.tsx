'use client';

// components/cms/enroll/StepScaffold.tsx
// The chrome every wizard step wears — built once so the five stubbed steps are
// visually indistinguishable from the working one until the day they are built.
// That is deliberate: the founder can walk a school through the whole intake
// flow now, and only the fields inside the panel are missing.

import type { ReactNode } from 'react';
import { useT } from '@/lib/cms/i18n/provider';
import type { TranslationKey } from '@/lib/cms/i18n/t';

export function StepScaffold({
  titleKey,
  descKey,
  children,
  footNote,
}: {
  titleKey: TranslationKey;
  descKey: TranslationKey;
  children: ReactNode;
  footNote?: string;
}) {
  const t = useT();
  return (
    <div>
      <h2 className="font-head text-[22px] m-0">{t(titleKey)}</h2>
      <p className="text-[13.5px] text-harbor-muted mt-1.5 mb-6 leading-relaxed max-w-[60ch]">
        {t(descKey)}
      </p>
      {children}
      {footNote ? (
        <p className="text-[12px] text-harbor-muted mt-6 mb-0 leading-relaxed">{footNote}</p>
      ) : null}
    </div>
  );
}

/** The "not built yet" body used by every step except `child`. */
export function StepPlaceholder({ phase }: { phase: number }) {
  const t = useT();
  return (
    <div className="cms-card-sunk p-7 text-center">
      <p className="font-head text-[16px] m-0">{t('stub.title')}</p>
      <p className="text-[13px] text-harbor-muted mt-2 mb-3.5 leading-relaxed max-w-[52ch] mx-auto">
        {t('stub.body')}
      </p>
      <span className="cms-tag cms-tone-accent">{t('stub.phase', { phase })}</span>
    </div>
  );
}

/** One labelled control. Every field in CMS is built from this, never ad hoc. */
export function Field({
  label,
  help,
  required,
  children,
}: {
  label: string;
  help?: string;
  required?: boolean;
  children: ReactNode;
}) {
  const t = useT();
  return (
    <label className="block">
      <span className="flex items-baseline gap-2 mb-1.5">
        <span className="text-[13px] font-semibold text-harbor-text">{label}</span>
        <span className="text-[10.5px] text-harbor-muted">
          {required ? t('common.required') : t('common.optional')}
        </span>
      </span>
      {children}
      {help ? (
        <span className="block text-[11.5px] text-harbor-muted mt-1.5 leading-snug">{help}</span>
      ) : null}
    </label>
  );
}
