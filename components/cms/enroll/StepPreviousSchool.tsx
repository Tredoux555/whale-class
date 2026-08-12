'use client';

// components/cms/enroll/StepPreviousSchool.tsx
// WIZARD STEP 5 — writes `cms_previous_schools` (migration 330), one row per
// setting. Phase 2 kept a single `previous_school` blob on the enrolment; a
// real family often has two or three settings behind them (a crèche, a move
// between countries), so phase 3 gives them rows.
//
// "This is their first setting" is a CHECKBOX, not an empty form. An empty
// answer and "there was nothing before" mean different things to an office
// chasing records, and only one of them needs a follow-up phone call.

import { useT } from '@/lib/cms/i18n/provider';
import type { TranslationKey } from '@/lib/cms/i18n/t';
import {
  EMPTY_PREVIOUS_SCHOOL_ROW,
  MAX_ROWS,
  type PreviousSchoolRowValues,
  type PreviousSchoolStepValues,
} from '@/lib/cms/validation';
import { Field, StepScaffold } from './StepScaffold';
import { CheckField, FieldError, RowCard, RowList, inputClass } from './RowCard';

export interface StepPreviousSchoolProps {
  value: PreviousSchoolStepValues;
  onChange: (next: PreviousSchoolStepValues) => void;
  errors?: Record<string, TranslationKey>;
}

export function StepPreviousSchool({ value, onChange, errors = {} }: StepPreviousSchoolProps) {
  const t = useT();

  function setRow(index: number, patch: Partial<PreviousSchoolRowValues>) {
    onChange({
      ...value,
      schools: value.schools.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    });
  }

  return (
    <StepScaffold titleKey="enrol.step.school" descKey="enrol.step.school.desc">
      <div className="cms-card-sunk px-4 py-3.5 mb-5">
        <CheckField
          label={t('enrol.school.none')}
          checked={value.noPreviousSchool}
          onChange={(next) => onChange({ ...value, noPreviousSchool: next })}
        />
      </div>

      {value.noPreviousSchool ? null : (
        <RowList
          emptyKey="enrol.school.empty"
          addKey="enrol.school.add"
          canAdd={value.schools.length < MAX_ROWS}
          onAdd={() =>
            onChange({ ...value, schools: [...value.schools, { ...EMPTY_PREVIOUS_SCHOOL_ROW }] })
          }
          rows={value.schools.map((row, i) => (
            <RowCard
              key={i}
              titleKey="enrol.school.row"
              index={i}
              onRemove={() =>
                onChange({ ...value, schools: value.schools.filter((_, j) => j !== i) })
              }
            >
              <div className="sm:col-span-2">
                <Field label={t('enrol.school.name')} required>
                  <input
                    className={inputClass(Boolean(errors[`schools.${i}.name`]))}
                    dir="auto"
                    autoComplete="off"
                    value={row.name}
                    aria-invalid={Boolean(errors[`schools.${i}.name`])}
                    onChange={(e) => setRow(i, { name: e.target.value })}
                  />
                  <FieldError messageKey={errors[`schools.${i}.name`]} />
                </Field>
              </div>

              <Field label={t('enrol.school.country')}>
                <input
                  className="cms-input"
                  dir="auto"
                  autoComplete="off"
                  value={row.countryCode}
                  onChange={(e) => setRow(i, { countryCode: e.target.value })}
                />
              </Field>

              <Field label={t('enrol.school.city')}>
                <input
                  className="cms-input"
                  dir="auto"
                  autoComplete="off"
                  value={row.city}
                  onChange={(e) => setRow(i, { city: e.target.value })}
                />
              </Field>

              <Field label={t('enrol.school.from')}>
                <input
                  type="date"
                  className={inputClass(Boolean(errors[`schools.${i}.attendedFrom`]))}
                  value={row.attendedFrom}
                  aria-invalid={Boolean(errors[`schools.${i}.attendedFrom`])}
                  onChange={(e) => setRow(i, { attendedFrom: e.target.value })}
                />
                <FieldError messageKey={errors[`schools.${i}.attendedFrom`]} />
              </Field>

              <Field label={t('enrol.school.to')}>
                <input
                  type="date"
                  className={inputClass(Boolean(errors[`schools.${i}.attendedTo`]))}
                  value={row.attendedTo}
                  aria-invalid={Boolean(errors[`schools.${i}.attendedTo`])}
                  onChange={(e) => setRow(i, { attendedTo: e.target.value })}
                />
                <FieldError messageKey={errors[`schools.${i}.attendedTo`]} />
              </Field>

              <div className="sm:col-span-2">
                <Field label={t('enrol.school.notes')} help={t('enrol.school.notes.help')}>
                  <textarea
                    className="cms-input"
                    rows={2}
                    dir="auto"
                    value={row.notes}
                    onChange={(e) => setRow(i, { notes: e.target.value })}
                  />
                </Field>
              </div>
            </RowCard>
          ))}
        />
      )}
    </StepScaffold>
  );
}
