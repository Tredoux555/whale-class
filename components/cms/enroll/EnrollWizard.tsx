'use client';

// components/cms/enroll/EnrollWizard.tsx
// The intake wizard SHELL. Step order is not a UI decision — it is
// `ENROLLMENT_STEPS` from lib/cms/engine/types, so the rail, the progress count
// and the `Enrollment.completedSteps` column can never disagree. The review
// screen is appended to that list as an eighth rail stop, not inserted into it:
// review is not a step of the intake, it is the door out of it.
//
// PHASE 3 FINISHED IT. Phase 2's comment said steps 2–6 "stay scaffolds but park
// their answers"; they are now real, each writing its own tables through
// /api/cms/enroll, and the wizard ends on a summary whose Submit moves the
// enrolment draft → submitted. After that the family reads and never writes —
// migration 329's update policy requires `status = 'draft'`, so the lock is in
// the database, not in this component.
//
// What the wizard does:
//   · resumes — the server hands it the family's open draft (typed columns for
//     step 1, `draft_data` for the rest), so a parent can close the laptop
//     mid-form and come back tomorrow,
//   · validates each step CLIENT-side for the message and lets the route
//     validate for real,
//   · refuses to advance on a failed save, so the rail can never claim a step
//     is done when no row exists,
//   · degrades to local state in demo mode: every screen walks, nothing is kept,
//     and the summary says so.

import { useCallback, useState } from 'react';
import { ENROLLMENT_STEPS, type EnrollmentStep } from '@/lib/cms/engine/types';
import { useT } from '@/lib/cms/i18n/provider';
import type { TranslationKey } from '@/lib/cms/i18n/t';
import {
  errorPath,
  validateAboutChildStep,
  validateChildStep,
  validateConsentsStep,
  validateContactsStep,
  validateDietaryStep,
  validateMedicalStep,
  validatePreviousSchoolStep,
  type ValidationResult,
} from '@/lib/cms/validation';
import { ArrowRightIcon, CheckIcon, IconBox } from '@/components/cms/icons';
import { StepChildInfo, type RoomOption } from './StepChildInfo';
import { StepAboutChild } from './StepAboutChild';
import { StepConsents } from './StepConsents';
import { StepContacts } from './StepContacts';
import { StepDietary } from './StepDietary';
import { StepMedical } from './StepMedical';
import { StepPreviousSchool } from './StepPreviousSchool';
import { StepReview } from './StepReview';
import { EMPTY_WIZARD, type WizardValues } from './values';

/** The rail's stops: the seven real steps, then the way out. */
const SCREENS = [...ENROLLMENT_STEPS, 'review'] as const;
type Screen = (typeof SCREENS)[number];

const STEP_LABEL: Record<Screen, TranslationKey> = {
  child: 'enrol.step.child',
  about_child: 'enrol.step.about',
  medical: 'enrol.step.medical',
  dietary: 'enrol.step.dietary',
  previous_school: 'enrol.step.school',
  contacts: 'enrol.step.contacts',
  consents: 'enrol.step.consents',
  review: 'enrol.step.review',
};

/**
 * Field name → the message key the parent reads. Row fields are keyed by their
 * INDEX-FREE path (`allergies.#.severity`, via `errorPath()`), so one entry
 * covers every row of that list — a form with nine allergy rows still needs one
 * line here, not nine.
 *
 * 🚨 The server's own English messages are NEVER rendered (I18N LAW). They exist
 * for logs and API consumers; the UI maps the FIELD to a key and translates.
 */
const FIELD_ERROR_KEY: Record<string, TranslationKey> = {
  // step 1
  legalName: 'enrol.error.legalName',
  dateOfBirth: 'enrol.error.dateOfBirth',
  homeLanguage: 'enrol.error.homeLanguage',
  classGroupId: 'enrol.error.classGroupId',
  requestedStartDate: 'enrol.error.requestedStartDate',
  // step 2
  'temperament.settling': 'enrol.error.temperament',
  'temperament.company': 'enrol.error.temperament',
  'temperament.adventure': 'enrol.error.temperament',
  'temperament.energy': 'enrol.error.temperament',
  // step 3
  allergies: 'enrol.error.tooMany',
  'allergies.#.allergen': 'enrol.error.allergies.allergen',
  'allergies.#.severity': 'enrol.error.allergies.severity',
  // step 4
  requirements: 'enrol.error.tooMany',
  'requirements.#.label': 'enrol.error.requirements.label',
  'requirements.#.reason': 'enrol.error.requirements.reason',
  // step 5
  schools: 'enrol.error.tooMany',
  'schools.#.name': 'enrol.error.schools.name',
  'schools.#.attendedFrom': 'enrol.error.schools.attendedFrom',
  'schools.#.attendedTo': 'enrol.error.schools.attendedTo',
  // step 6
  contacts: 'enrol.error.contacts',
  'contacts.#.fullName': 'enrol.error.contacts.fullName',
  'contacts.#.relationship': 'enrol.error.contacts.relationship',
  'contacts.#.phone': 'enrol.error.contacts.phone',
  'contacts.#.email': 'enrol.error.contacts.email',
  // step 7
  signedName: 'enrol.error.signedName',
};

/** Server/client field errors → the map each step reads, keyed by the RAW path
 *  (`allergies.0.severity`) so a row knows which of its own fields is wrong. */
function toFieldErrors(fields: { field: string }[]): Record<string, TranslationKey> {
  const mapped: Record<string, TranslationKey> = {};
  for (const f of fields) {
    const key = FIELD_ERROR_KEY[errorPath(f.field)];
    if (key) mapped[f.field] = key;
  }
  return mapped;
}

function validateStep(step: EnrollmentStep, values: WizardValues): ValidationResult {
  switch (step) {
    case 'child':
      return validateChildStep(values.child);
    case 'about_child':
      return validateAboutChildStep(values.about_child);
    case 'medical':
      return validateMedicalStep(values.medical);
    case 'dietary':
      return validateDietaryStep(values.dietary);
    case 'previous_school':
      return validatePreviousSchoolStep(values.previous_school);
    case 'contacts':
      return validateContactsStep(values.contacts);
    case 'consents':
      return validateConsentsStep(values.consents);
    default:
      return { ok: true, errors: [] };
  }
}

export interface EnrollWizardProps {
  /** True when a database is connected and the form actually saves. */
  live: boolean;
  rooms: RoomOption[];
  /** The family's open draft, if they have one. */
  initialValues?: WizardValues;
  initialCompletedSteps?: EnrollmentStep[];
  resumed?: boolean;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export function EnrollWizard({
  live,
  rooms,
  initialValues,
  initialCompletedSteps = [],
  resumed = false,
}: EnrollWizardProps) {
  const t = useT();
  const [index, setIndex] = useState(0);
  const [values, setValues] = useState<WizardValues>(initialValues ?? EMPTY_WIZARD);
  const [completed, setCompleted] = useState<Set<EnrollmentStep>>(
    new Set(initialCompletedSteps)
  );
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [errors, setErrors] = useState<Record<string, TranslationKey>>({});
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const screen = SCREENS[index];
  const isReview = screen === 'review';
  const isFirst = index === 0;

  function patch<K extends keyof WizardValues>(key: K, next: WizardValues[K]) {
    setValues((prev) => ({ ...prev, [key]: next }));
  }

  /**
   * Persist the current step. Returns whether it is safe to move on — a failed
   * save must never advance the rail, or the parent believes seven steps are
   * done when zero rows exist.
   */
  const save = useCallback(async (): Promise<boolean> => {
    if (isReview) return true;
    const step = screen as EnrollmentStep;

    // Client validation is for the MESSAGE. The route runs the same functions
    // and is the check that counts.
    const check = validateStep(step, values);
    if (!check.ok) {
      setErrors(toFieldErrors(check.errors));
      setErrorKey(null);
      setSaveState('error');
      return false;
    }
    setErrors({});
    setErrorKey(null);

    if (!live) {
      // Demo mode: nothing to save, and the rail still walks.
      setCompleted((prev) => new Set(prev).add(step));
      setSaveState('saved');
      return true;
    }

    setSaveState('saving');
    try {
      const response = await fetch('/api/cms/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step, values: values[step] }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        if (response.status === 401) {
          setErrorKey('enrol.error.session');
        } else if (body?.error === 'invalid' && Array.isArray(body.fields)) {
          const mapped = toFieldErrors(body.fields as { field: string }[]);
          setErrors(mapped);
          setErrorKey(Object.keys(mapped).length ? null : 'enrol.error.save');
        } else {
          setErrorKey('enrol.error.save');
        }
        setSaveState('error');
        return false;
      }

      setCompleted((prev) => new Set(prev).add(step));
      setSaveState('saved');
      return true;
    } catch {
      setErrorKey('enrol.error.save');
      setSaveState('error');
      return false;
    }
  }, [isReview, live, screen, values]);

  async function saveAndContinue() {
    if (await save()) {
      setIndex((i) => Math.min(SCREENS.length - 1, i + 1));
    }
  }

  /** The one-way door. Everything is already saved by the time this runs — this
   *  only moves the enrolment's status, which is what ends the family's write
   *  access at the row level. */
  async function submit() {
    if (!live) return;
    setSaveState('saving');
    setErrorKey(null);
    try {
      const response = await fetch('/api/cms/enroll/submit', { method: 'POST' });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        if (response.status === 401) setErrorKey('enrol.error.session');
        else if (body?.error === 'incomplete') setErrorKey('enrol.review.error.incomplete');
        else setErrorKey('enrol.error.submit');
        setSaveState('error');
        return;
      }
      setSubmitted(true);
      setSaveState('idle');
    } catch {
      setErrorKey('enrol.error.submit');
      setSaveState('error');
    }
  }

  // ── the finished state ─────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="cms-card p-8 text-center max-w-[640px] mx-auto">
        <span className="cms-avatar w-12 h-12 rounded-[14px] mx-auto mb-4 text-[20px]">
          <span className="block w-5 h-5">
            <CheckIcon />
          </span>
        </span>
        <h2 className="font-head text-[22px] m-0">{t('enrol.review.done.title')}</h2>
        <p className="text-[13.5px] text-harbor-muted mt-2.5 mb-6 leading-relaxed max-w-[52ch] mx-auto">
          {t('enrol.review.done.body')}
        </p>
        <a href="/cms/parent/dashboard" className="cms-btn cms-btn-primary cms-btn-md no-underline">
          {t('enrol.review.done.dashboard')}
        </a>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)] items-start">
      {/* ── the rail ─────────────────────────────────────────────────── */}
      <ol className="cms-card p-2.5 list-none m-0 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible lg:sticky lg:top-[84px]">
        {SCREENS.map((s, i) => {
          const state =
            s !== 'review' && completed.has(s as EnrollmentStep)
              ? 'done'
              : i === index
                ? 'current'
                : 'todo';
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

      {/* ── the active screen ────────────────────────────────────────── */}
      <div className="cms-card p-6">
        {/* Progress counts the STEPS (seven), not the rail stops (eight). The
            review screen is the way out of the wizard, not a step of the
            intake, so it carries no counter — its own title says where you
            are. The rail still lists it, numbered, because it IS a stop. */}
        {isReview ? null : (
          <span className="cms-label mb-4">
            {t('enrol.progress', { current: index + 1, total: ENROLLMENT_STEPS.length })}
          </span>
        )}

        {isReview ? null : !live ? (
          <p className="cms-card-sunk px-3.5 py-2.5 mt-0 mb-5 text-[12.5px] text-harbor-muted leading-relaxed">
            {t('enrol.demoNote')}
          </p>
        ) : resumed ? (
          <p className="cms-card-sunk px-3.5 py-2.5 mt-0 mb-5 text-[12.5px] text-harbor-muted leading-relaxed border-s-[3px] border-s-harbor-success">
            {t('enrol.draftResumed')}
          </p>
        ) : null}

        {screen === 'child' ? (
          <StepChildInfo
            value={values.child}
            onChange={(next) => patch('child', next)}
            rooms={rooms}
            errors={errors}
          />
        ) : screen === 'about_child' ? (
          <StepAboutChild
            value={values.about_child}
            onChange={(next) => patch('about_child', next)}
            errors={errors}
          />
        ) : screen === 'medical' ? (
          <StepMedical
            value={values.medical}
            onChange={(next) => patch('medical', next)}
            errors={errors}
          />
        ) : screen === 'dietary' ? (
          <StepDietary
            value={values.dietary}
            onChange={(next) => patch('dietary', next)}
            errors={errors}
          />
        ) : screen === 'previous_school' ? (
          <StepPreviousSchool
            value={values.previous_school}
            onChange={(next) => patch('previous_school', next)}
            errors={errors}
          />
        ) : screen === 'contacts' ? (
          <StepContacts
            value={values.contacts}
            onChange={(next) => patch('contacts', next)}
            errors={errors}
          />
        ) : screen === 'consents' ? (
          <StepConsents
            value={values.consents}
            onChange={(next) => patch('consents', next)}
            errors={errors}
          />
        ) : (
          <StepReview
            values={values}
            rooms={rooms}
            live={live}
            submitting={saveState === 'saving'}
            onEditStep={(step) => setIndex(SCREENS.indexOf(step))}
            onSubmit={() => void submit()}
          />
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
          {isReview ? null : (
            <>
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
                disabled={saveState === 'saving'}
                onClick={() => void saveAndContinue()}
              >
                {t('enrol.saveAndContinue')}
                <IconBox flip>
                  <ArrowRightIcon />
                </IconBox>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
