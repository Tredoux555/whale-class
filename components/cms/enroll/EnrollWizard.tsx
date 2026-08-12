'use client';

// components/cms/enroll/EnrollWizard.tsx
// The intake wizard SHELL. Step order is not a UI decision — it is
// `ENROLLMENT_STEPS` from lib/cms/engine/types, so the rail, the progress count
// and the `Enrollment.completedSteps` column can never disagree.
//
// PHASE 2 made the wizard REAL. Phase 1's comment said "when the API lands, this
// component swaps useState for a server action and nothing else moves" — that
// is what happened, with one correction: the write goes through
// POST /api/cms/enroll (a route handler, matching every other write in this
// repo) rather than a server action.
//
// What the wizard now does:
//   · resumes — the server hands it the family's open draft, so a parent can
//     close the laptop mid-form and come back tomorrow,
//   · saves step 1 for real (child + guardian link + draft enrolment),
//   · parks steps 2–6 in the draft so the scaffolds are not a dead end,
//   · degrades to phase-1 behaviour in demo mode: local state, no network, an
//     honest note saying nothing is being kept.

import { useCallback, useState } from 'react';
import { ENROLLMENT_STEPS, type EnrollmentStep } from '@/lib/cms/engine/types';
import { useT } from '@/lib/cms/i18n/provider';
import type { TranslationKey } from '@/lib/cms/i18n/t';
import { ArrowRightIcon, CheckIcon, IconBox } from '@/components/cms/icons';
import {
  EMPTY_CHILD_STEP,
  StepChildInfo,
  type ChildStepValue,
  type RoomOption,
} from './StepChildInfo';
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

const SCAFFOLD_COMPONENT: Record<
  Exclude<EnrollmentStep, 'child'>,
  () => React.ReactElement
> = {
  medical: StepMedical,
  dietary: StepDietary,
  previous_school: StepPreviousSchool,
  contacts: StepContacts,
  consents: StepConsents,
};

/** Field name → the message key the parent reads. The server returns English
 *  messages for its own logs; the UI never renders those (I18N LAW). */
const FIELD_ERROR_KEY: Record<string, TranslationKey> = {
  legalName: 'enrol.error.legalName',
  dateOfBirth: 'enrol.error.dateOfBirth',
  homeLanguage: 'enrol.error.homeLanguage',
  classGroupId: 'enrol.error.classGroupId',
  requestedStartDate: 'enrol.error.requestedStartDate',
};

export interface EnrollWizardProps {
  /** True when a database is connected and the form actually saves. */
  live: boolean;
  rooms: RoomOption[];
  /** The family's open draft, if they have one. */
  initialValue?: ChildStepValue;
  initialCompletedSteps?: EnrollmentStep[];
  resumed?: boolean;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export function EnrollWizard({
  live,
  rooms,
  initialValue,
  initialCompletedSteps = [],
  resumed = false,
}: EnrollWizardProps) {
  const t = useT();
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState<ChildStepValue>(initialValue ?? EMPTY_CHILD_STEP);
  const [completed, setCompleted] = useState<Set<EnrollmentStep>>(
    new Set(initialCompletedSteps)
  );
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [errors, setErrors] = useState<Record<string, TranslationKey>>({});
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);

  const step = ENROLLMENT_STEPS[index];
  const isFirst = index === 0;
  const isLast = index === ENROLLMENT_STEPS.length - 1;

  /**
   * Persist the current step. Returns whether it is safe to move on — a failed
   * save must never advance the rail, or the parent believes six steps are done
   * when zero rows exist.
   */
  const save = useCallback(async (): Promise<boolean> => {
    if (!live) {
      // Demo mode: nothing to save, and the rail still walks.
      setCompleted((prev) => new Set(prev).add(step));
      return true;
    }
    setSaveState('saving');
    setErrors({});
    setErrorKey(null);
    try {
      const response = await fetch('/api/cms/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          step === 'child' ? { step, values: value } : { step, values: {} }
        ),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        if (response.status === 401) {
          setErrorKey('enrol.error.session');
        } else if (body?.error === 'invalid' && Array.isArray(body.fields)) {
          const mapped: Record<string, TranslationKey> = {};
          for (const f of body.fields as { field: string }[]) {
            const key = FIELD_ERROR_KEY[f.field];
            if (key) mapped[f.field] = key;
          }
          setErrors(mapped);
          setErrorKey(Object.keys(mapped).length ? null : 'enrol.error.save');
        } else {
          setErrorKey('enrol.error.save');
        }
        setSaveState('error');
        return false;
      }

      // Only step 1 is genuinely finished — the scaffolds parked their (empty)
      // payload but are not built, and the server refuses to mark them done.
      if (step === 'child') setCompleted((prev) => new Set(prev).add(step));
      setSaveState('saved');
      return true;
    } catch {
      setErrorKey('enrol.error.save');
      setSaveState('error');
      return false;
    }
  }, [live, step, value]);

  async function saveAndContinue() {
    if (await save()) {
      setIndex((i) => Math.min(ENROLLMENT_STEPS.length - 1, i + 1));
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)] items-start">
      {/* ── the rail ─────────────────────────────────────────────────── */}
      <ol className="cms-card p-2.5 list-none m-0 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible lg:sticky lg:top-[84px]">
        {ENROLLMENT_STEPS.map((s, i) => {
          const state = completed.has(s) ? 'done' : i === index ? 'current' : 'todo';
          return (
            <li key={s} className="shrink-0 lg:shrink">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-current={i === index ? 'step' : undefined}
                className={`cms-btn cms-btn-sm cms-btn-full cms-btn-start gap-2.5 ${
                  i === index ? 'cms-btn-primary cms-btn-soft' : 'cms-btn-ghost'
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

        {!live ? (
          <p className="cms-card-sunk px-3.5 py-2.5 mt-0 mb-5 text-[12.5px] text-harbor-muted leading-relaxed">
            {t('enrol.demoNote')}
          </p>
        ) : resumed ? (
          <p className="cms-card-sunk px-3.5 py-2.5 mt-0 mb-5 text-[12.5px] text-harbor-muted leading-relaxed border-s-[3px] border-s-harbor-success">
            {t('enrol.draftResumed')}
          </p>
        ) : null}

        {step === 'child' ? (
          <StepChildInfo value={value} onChange={setValue} rooms={rooms} errors={errors} />
        ) : (
          (() => {
            const Scaffold = SCAFFOLD_COMPONENT[step];
            return <Scaffold />;
          })()
        )}

        {errorKey ? (
          <p
            role="alert"
            className="cms-card-sunk mt-5 mb-0 px-3.5 py-3 text-[13px] leading-relaxed text-harbor-danger-deep border-s-[3px] border-s-harbor-danger"
          >
            {t(errorKey)}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2.5 mt-7 pt-5 border-t border-harbor-border">
          <button
            type="button"
            className="cms-btn cms-btn-ghost cms-btn-outline cms-btn-md"
            disabled={isFirst || saveState === 'saving'}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
          >
            {t('common.back')}
          </button>
          <button
            type="button"
            className="cms-btn cms-btn-secondary cms-btn-md"
            disabled={saveState === 'saving'}
            onClick={() => void save()}
          >
            {saveState === 'saving'
              ? t('enrol.saving')
              : saveState === 'saved'
                ? t('enrol.saved')
                : t('common.saveDraft')}
          </button>
          <button
            type="button"
            className="cms-btn cms-btn-primary cms-btn-md ms-auto"
            disabled={isLast || saveState === 'saving'}
            onClick={() => void saveAndContinue()}
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
