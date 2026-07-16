// components/montree/funnel/GoldenThread.tsx
//
// The golden thread — six small lanterns on a hairline carrying the walker's
// position through the founding procession. Pure presentational.
//   done  = gold dot
//   now   = gold dot + glow
//   line  = lit hairline between done nodes
// ≤820px collapses to "Step N of 6 · Label" (CSS handles the swap; see
// FUNNEL_CSS .fn-thread-inner / .fn-thread-compact).
//
// Labels are i18n keys copilot.funnel.thread.1..6. Depends on the page having
// injected FUNNEL_CSS once.
'use client';

import { useI18n, type TranslationKey } from '@/lib/montree/i18n';

const STEP_KEYS: TranslationKey[] = [
  'copilot.funnel.thread.1',
  'copilot.funnel.thread.2',
  'copilot.funnel.thread.3',
  'copilot.funnel.thread.4',
  'copilot.funnel.thread.5',
  'copilot.funnel.thread.6',
];

export default function GoldenThread({ step }: { step: number }) {
  const { t } = useI18n();
  const current = Math.min(Math.max(step, 1), 6);
  const labels = STEP_KEYS.map((k) => t(k));

  return (
    <div className="fn-thread">
      <div className="fn-thread-inner" aria-hidden>
        {labels.map((label, i) => {
          const s = i + 1;
          const cls =
            s < current ? 'fn-tnode done' : s === current ? 'fn-tnode now' : 'fn-tnode';
          return (
            <div key={s} style={{ display: 'contents' }}>
              <div className={cls}>
                <div className="fn-tdot" />
                <div className="fn-tlabel">{label}</div>
              </div>
              {s < labels.length && (
                <div className={s < current ? 'fn-tline lit' : 'fn-tline'} />
              )}
            </div>
          );
        })}
      </div>
      <div className="fn-thread-compact">
        {t('copilot.funnel.thread.stepOf', {
          step: current,
          label: labels[current - 1],
        })}
      </div>
    </div>
  );
}
