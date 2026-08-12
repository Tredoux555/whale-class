'use client';

// components/cms/enroll/TraitScale.tsx
// PHASE 3 PRIMITIVE — the temperament pick. Spec: CMS_DESIGN_SYSTEM.md §10.
//
// 🚨 THE COPY LAW FOR THIS CONTROL. Both ends of every line are ordinary, and
// the UI says so out loud (`enrol.about.temperament.body`). There is no score,
// no norm, no "high/low", no colour that means "worse". A parent is describing
// their four-year-old, not completing an assessment — the moment this control
// starts to feel clinical it stops collecting the truth.
//
// It is a RADIOGROUP wearing a slider's clothes. `<input type="range">` was the
// obvious choice and is the wrong one: a range carries a default value and an
// implied quantity, and this control must be able to say "the family did not
// answer" — which a range cannot express. Five real stops, none pre-selected,
// and a Clear that returns to unanswered.
//
// Keyboard: arrows move along the line, Home/End jump to the ends — the
// standard radiogroup contract, so it behaves the way a screen-reader user
// already expects. Arrow direction is not mirrored for RTL because the rail
// itself mirrors (flex), so "next visual stop" stays "next value".

import { useT } from '@/lib/cms/i18n/provider';
import type { TranslationKey } from '@/lib/cms/i18n/t';

export const SCALE_POINTS = [1, 2, 3, 4, 5] as const;

export interface TraitScaleProps {
  /** The axis's own label, e.g. "Settling in". */
  labelKey: TranslationKey;
  /** The two ends, in reading order. Neither is better. */
  leftKey: TranslationKey;
  rightKey: TranslationKey;
  /** 1–5, or undefined for "not answered". */
  value: number | undefined;
  onChange: (next: number | undefined) => void;
}

export function TraitScale({ labelKey, leftKey, rightKey, value, onChange }: TraitScaleProps) {
  const t = useT();
  const label = t(labelKey);

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const current = value ?? 3;
    let next: number | null = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = Math.min(5, current + 1);
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = Math.max(1, current - 1);
    if (event.key === 'Home') next = 1;
    if (event.key === 'End') next = 5;
    if (next === null) return;
    event.preventDefault();
    onChange(next);
  }

  return (
    <div className="py-1">
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-[13px] font-semibold text-harbor-text">{label}</span>
        {value ? (
          <button
            type="button"
            className="cms-btn cms-btn-ghost cms-btn-chip ms-auto"
            onClick={() => onChange(undefined)}
          >
            {t('enrol.about.axis.clear')}
          </button>
        ) : (
          <span className="text-[10.5px] text-harbor-muted ms-auto">
            {t('common.notAnswered')}
          </span>
        )}
      </div>

      <div
        role="radiogroup"
        aria-label={label}
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="cms-scale rounded-[10px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-harbor-accent/30"
      >
        {SCALE_POINTS.map((point) => (
          <button
            key={point}
            type="button"
            role="radio"
            tabIndex={-1}
            aria-checked={value === point}
            // Every stop is named for a screen reader: "Settling in, 2 of 5".
            aria-label={`${label} — ${point}/5`}
            className="cms-scale-stop"
            onClick={() => onChange(value === point ? undefined : point)}
          >
            <i />
          </button>
        ))}
      </div>

      <div className="flex items-start justify-between gap-3 text-[11.5px] text-harbor-muted leading-snug">
        <span className="max-w-[46%]">{t(leftKey)}</span>
        <span className="max-w-[46%] text-end">{t(rightKey)}</span>
      </div>
    </div>
  );
}
