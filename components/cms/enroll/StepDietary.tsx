'use client';

// components/cms/enroll/StepDietary.tsx
// WIZARD STEP 4 — writes `cms_dietary_requirements`, one row per requirement.
//
// The reason matters as much as the label: the kitchen treats "no dairy
// (allergy)" and "no dairy (preference)" as the same shopping list but not the
// same incident, and the engine's flag weighting reads `reason` to decide which
// requirements are safety-critical. So reason is required on any named row.
//
// Excluded foods are a tag list, not prose, because the kitchen sheet is a
// checklist — a sentence cannot be checked off.

import { useT } from '@/lib/cms/i18n/provider';
import type { TranslationKey } from '@/lib/cms/i18n/t';
import {
  DIETARY_REASONS,
  EMPTY_DIETARY_ROW,
  MAX_ROWS,
  type DietaryRowValues,
  type DietaryStepValues,
} from '@/lib/cms/validation';
import { Field, StepScaffold } from './StepScaffold';
import { FieldError, RowCard, RowList, inputClass } from './RowCard';
import { TagInput } from './TagInput';

const REASON_LABEL: Record<string, TranslationKey> = {
  allergy: 'dietary.reason.allergy',
  medical: 'dietary.reason.medical',
  religious: 'dietary.reason.religious',
  cultural: 'dietary.reason.cultural',
  preference: 'dietary.reason.preference',
};

export interface StepDietaryProps {
  value: DietaryStepValues;
  onChange: (next: DietaryStepValues) => void;
  errors?: Record<string, TranslationKey>;
}

export function StepDietary({ value, onChange, errors = {} }: StepDietaryProps) {
  const t = useT();

  function setRow(index: number, patch: Partial<DietaryRowValues>) {
    onChange({
      requirements: value.requirements.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    });
  }

  return (
    <StepScaffold
      titleKey="enrol.step.dietary"
      descKey="enrol.step.dietary.desc"
      footNote={t('enrol.privacyNote')}
    >
      <p className="text-[12.5px] text-harbor-muted mt-0 mb-4 leading-relaxed max-w-[58ch]">
        {t('enrol.dietary.body')}
      </p>

      <RowList
        emptyKey="enrol.dietary.none"
        addKey="enrol.dietary.add"
        canAdd={value.requirements.length < MAX_ROWS}
        onAdd={() => onChange({ requirements: [...value.requirements, { ...EMPTY_DIETARY_ROW }] })}
        rows={value.requirements.map((row, i) => (
          <RowCard
            key={i}
            titleKey="enrol.dietary.row"
            index={i}
            onRemove={() =>
              onChange({ requirements: value.requirements.filter((_, j) => j !== i) })
            }
          >
            <Field label={t('enrol.dietary.label')} required>
              <input
                className={inputClass(Boolean(errors[`requirements.${i}.label`]))}
                dir="auto"
                autoComplete="off"
                placeholder={t('enrol.dietary.label.placeholder')}
                value={row.label}
                aria-invalid={Boolean(errors[`requirements.${i}.label`])}
                onChange={(e) => setRow(i, { label: e.target.value })}
              />
              <FieldError messageKey={errors[`requirements.${i}.label`]} />
            </Field>

            <Field label={t('enrol.dietary.reason')} required>
              <select
                className={inputClass(Boolean(errors[`requirements.${i}.reason`]))}
                value={row.reason}
                aria-invalid={Boolean(errors[`requirements.${i}.reason`])}
                onChange={(e) => setRow(i, { reason: e.target.value })}
              >
                <option value="">{t('enrol.dietary.reason.placeholder')}</option>
                {DIETARY_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {t(REASON_LABEL[reason])}
                  </option>
                ))}
              </select>
              <FieldError messageKey={errors[`requirements.${i}.reason`]} />
            </Field>

            <div className="sm:col-span-2">
              <Field label={t('enrol.dietary.excluded')} help={t('enrol.dietary.excluded.help')}>
                <TagInput
                  label={t('enrol.dietary.excluded')}
                  value={row.excludedFoods}
                  onChange={(next) => setRow(i, { excludedFoods: next })}
                  placeholder={t('enrol.about.likes.placeholder')}
                />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field label={t('enrol.dietary.notes')}>
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
    </StepScaffold>
  );
}
