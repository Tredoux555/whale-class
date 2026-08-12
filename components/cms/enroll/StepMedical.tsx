'use client';

// components/cms/enroll/StepMedical.tsx
// WIZARD STEP 3 — the dangerous one. It writes `cms_medical_records` (one row
// per child) and `cms_allergies` (one row per allergen), and everything the
// teacher end computes about safety comes from here: the roster's red flags,
// the wall poster, the kitchen's exclusion list.
//
// 🚨 SEVERITY IS REQUIRED ON ANY NAMED ALLERGEN. `lib/cms/validation.ts` says so
// and the route enforces it, because "unknown severity" reads as mild
// everywhere downstream, and a mild peanut allergy on a poster is a lie.
// `requiresPoster` is DERIVED (severe, or carries a pen) — the family is never
// asked whether their child's allergy is worth putting on the wall.

import { useT } from '@/lib/cms/i18n/provider';
import type { TranslationKey } from '@/lib/cms/i18n/t';
import {
  ALLERGY_SEVERITIES,
  EMPTY_ALLERGY_ROW,
  MAX_ROWS,
  type AllergyRowValues,
  type MedicalStepValues,
} from '@/lib/cms/validation';
import { Field, StepScaffold } from './StepScaffold';
import { CheckField, FieldError, RowCard, RowList, inputClass } from './RowCard';
import { TagInput } from './TagInput';

const SEVERITY_LABEL: Record<string, TranslationKey> = {
  mild: 'teacher.today.severity.mild',
  moderate: 'teacher.today.severity.moderate',
  severe: 'teacher.today.severity.severe',
};

export interface StepMedicalProps {
  value: MedicalStepValues;
  onChange: (next: MedicalStepValues) => void;
  errors?: Record<string, TranslationKey>;
}

export function StepMedical({ value, onChange, errors = {} }: StepMedicalProps) {
  const t = useT();

  function set<K extends keyof MedicalStepValues>(key: K, next: MedicalStepValues[K]) {
    onChange({ ...value, [key]: next });
  }

  function setRow(index: number, patch: Partial<AllergyRowValues>) {
    const allergies = value.allergies.map((row, i) => (i === index ? { ...row, ...patch } : row));
    onChange({ ...value, allergies });
  }

  return (
    <StepScaffold
      titleKey="enrol.step.medical"
      descKey="enrol.step.medical.desc"
      footNote={t('enrol.privacyNote')}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label={t('enrol.medical.conditions')} help={t('enrol.medical.conditions.help')}>
            <TagInput
              label={t('enrol.medical.conditions')}
              value={value.conditions}
              onChange={(next) => set('conditions', next)}
              placeholder={t('enrol.about.likes.placeholder')}
            />
          </Field>
        </div>

        <Field label={t('enrol.medical.doctorName')}>
          <input
            className="cms-input"
            dir="auto"
            autoComplete="off"
            value={value.doctorName}
            onChange={(e) => set('doctorName', e.target.value)}
          />
        </Field>

        <Field label={t('enrol.medical.doctorPhone')}>
          <input
            className="cms-input"
            type="tel"
            dir="ltr"
            autoComplete="off"
            value={value.doctorPhone}
            onChange={(e) => set('doctorPhone', e.target.value)}
          />
        </Field>

        <div className="sm:col-span-2">
          <Field
            label={t('enrol.medical.emergencyNote')}
            help={t('enrol.medical.emergencyNote.help')}
          >
            <textarea
              className="cms-input"
              rows={3}
              dir="auto"
              value={value.emergencyNote}
              onChange={(e) => set('emergencyNote', e.target.value)}
            />
          </Field>
        </div>
      </div>

      {/* ── allergies ───────────────────────────────────────────────────── */}
      <div className="mt-7">
        <h3 className="font-head text-[16px] m-0">{t('enrol.medical.allergies.title')}</h3>
        <p className="text-[12.5px] text-harbor-muted mt-1.5 mb-4 leading-relaxed max-w-[58ch]">
          {t('enrol.medical.allergies.body')}
        </p>

        <RowList
          emptyKey="enrol.medical.allergies.none"
          addKey="enrol.medical.allergies.add"
          canAdd={value.allergies.length < MAX_ROWS}
          onAdd={() => set('allergies', [...value.allergies, { ...EMPTY_ALLERGY_ROW }])}
          rows={value.allergies.map((row, i) => (
            <RowCard
              key={i}
              titleKey="enrol.medical.allergyRow"
              index={i}
              onRemove={() =>
                set(
                  'allergies',
                  value.allergies.filter((_, j) => j !== i)
                )
              }
            >
              <Field label={t('enrol.medical.allergen')} required>
                <input
                  className={inputClass(Boolean(errors[`allergies.${i}.allergen`]))}
                  dir="auto"
                  autoComplete="off"
                  placeholder={t('enrol.medical.allergen.placeholder')}
                  value={row.allergen}
                  aria-invalid={Boolean(errors[`allergies.${i}.allergen`])}
                  onChange={(e) => setRow(i, { allergen: e.target.value })}
                />
                <FieldError messageKey={errors[`allergies.${i}.allergen`]} />
              </Field>

              <Field label={t('enrol.medical.severity')} required>
                <select
                  className={inputClass(Boolean(errors[`allergies.${i}.severity`]))}
                  value={row.severity}
                  aria-invalid={Boolean(errors[`allergies.${i}.severity`])}
                  onChange={(e) => setRow(i, { severity: e.target.value })}
                >
                  <option value="">{t('enrol.medical.severity.placeholder')}</option>
                  {ALLERGY_SEVERITIES.map((severity) => (
                    <option key={severity} value={severity}>
                      {t(SEVERITY_LABEL[severity])}
                    </option>
                  ))}
                </select>
                <FieldError messageKey={errors[`allergies.${i}.severity`]} />
              </Field>

              <Field label={t('enrol.medical.reaction')}>
                <input
                  className="cms-input"
                  dir="auto"
                  autoComplete="off"
                  placeholder={t('enrol.medical.reaction.placeholder')}
                  value={row.reaction}
                  onChange={(e) => setRow(i, { reaction: e.target.value })}
                />
              </Field>

              <Field label={t('enrol.medical.responsePlan')}>
                <input
                  className="cms-input"
                  dir="auto"
                  autoComplete="off"
                  placeholder={t('enrol.medical.responsePlan.placeholder')}
                  value={row.responsePlan}
                  onChange={(e) => setRow(i, { responsePlan: e.target.value })}
                />
              </Field>

              <div className="sm:col-span-2">
                <CheckField
                  label={t('enrol.medical.epipen')}
                  checked={row.carriesEpipen}
                  onChange={(next) => setRow(i, { carriesEpipen: next })}
                />
              </div>
            </RowCard>
          ))}
        />
      </div>
    </StepScaffold>
  );
}
