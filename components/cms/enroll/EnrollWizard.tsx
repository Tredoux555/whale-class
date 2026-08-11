'use client';

// components/cms/enroll/EnrollWizard.tsx
// The intake wizard SHELL. Step order is not a UI decision — it is
// `ENROLLMENT_STEPS` from lib/cms/engine/types, so the rail, the progress count and
// the eventual `Enrollment.completedSteps` column can never disagree.
//
// Phase 1 keeps the step in component state. When the API lands, this component
// swaps `useState` for a server action and nothing else moves.

import { useState } from 'react';
import { ENROLLMENT_STEPS, type EnrollmentStep } from '@/lib/cms/engine/types';
import { useT } from '@/lib/cms/i18n/provider';
import type { TranslationKey } from '@/lib/cms/i18n/t';
import { ArrowRightIcon, CheckIcon, IconBox } from '@/components/cms/icons';
import { StepChildInfo } from './StepChildInfo';
import { StepConsents } from './StepConsents';
import { StepContacts } from './StepContacts';
import { StepDietary } from './StepDietary';
import { StepMedical } from './StepMedical';
import { StepPreviousSchool } from './StepPreviousSchool';

const STEP_LABEL: Record<EnrollmentStep, TranslationKey> = {
  child: 'enrol.step.child',
  medical: 'enrol.step.medical',
  dietary: 'enrol.step.dietary',
  previous_school: 'enrol.step.school',
  contacts: 'enrol.step.contacts',
  consents: 'enrol.step.consents',
};

const STEP_COMPONENT: Record<EnrollmentStep, () => React.ReactElement> = {
  child: StepChildInfo,
  medical: StepMedical,
  dietary: StepDietary,
  previous_school: StepPreviousSchool,
  contacts: StepContacts,
  consents: StepConsents,
};

export function EnrollWizard() {
  const t = useT();
  const [index, setIndex] = useState(0);

  const step = ENROLLMENT_STEPS[index];
  const StepBody = STEP_COMPONENT[step];
  const isFirst = index === 0;
  const isLast = index === ENROLLMENT_STEPS.length - 1;

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)] items-start">
      {/* ── the rail ─────────────────────────────────────────────────── */}
      <ol className="cms-card p-2.5 list-none m-0 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible lg:sticky lg:top-[84px]">
        {ENROLLMENT_STEPS.map((s, i) => {
          const state = i < index ? 'done' : i === index ? 'current' : 'todo';
          return (
            <li key={s} className="shrink-0 lg:shrink">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-current={state === 'current' ? 'step' : undefined}
                className={`cms-btn cms-btn-sm cms-btn-full cms-btn-start gap-2.5 ${
                  state === 'current' ? 'cms-btn-primary cms-btn-soft' : 'cms-btn-ghost'
                }`}
              >
                <span
                  className={`grid place-items-center w-5 h-5 rounded-full text-[10px] font-bold shrink-0 ${
                    state === 'done'
                      ? 'cms-tone-success'
                      : state === 'current'
                        ? 'cms-tone-accent'
                        : 'cms-tone-quiet'
                  }`}
                >
                  {state === 'done' ? (
                    <span className="block w-3 h-3">
                      <CheckIcon />
                    </span>
                  ) : (
                    i + 1
                  )}
                </span>
                <span className="truncate">{t(STEP_LABEL[s])}</span>
              </button>
            </li>
          );
        })}
      </ol>

      {/* ── the active step ──────────────────────────────────────────── */}
      <div className="cms-card p-6">
        <span className="cms-label mb-4">
          {t('enrol.progress', { current: index + 1, total: ENROLLMENT_STEPS.length })}
        </span>

        <StepBody />

        <div className="flex flex-wrap items-center gap-2.5 mt-7 pt-5 border-t border-harbor-border">
          <button
            type="button"
            className="cms-btn cms-btn-ghost cms-btn-outline cms-btn-md"
            disabled={isFirst}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
          >
            {t('common.back')}
          </button>
          <button type="button" className="cms-btn cms-btn-secondary cms-btn-md">
            {t('common.saveDraft')}
          </button>
          <button
            type="button"
            className="cms-btn cms-btn-primary cms-btn-md ms-auto"
            disabled={isLast}
            onClick={() => setIndex((i) => Math.min(ENROLLMENT_STEPS.length - 1, i + 1))}
          >
            {t('enrol.saveAndContinue')}
            <IconBox flip>
              <ArrowRightIcon />
            </IconBox>
          </button>
        </div>
      </div>
    </div>
  );
}
