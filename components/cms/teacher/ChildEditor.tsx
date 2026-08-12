'use client';

// components/cms/teacher/ChildEditor.tsx
// ============================================================================
// The quick-edit form behind every roster row. Phase 4.
// ============================================================================
// It holds EXACTLY the fields the phase-5 documents feed on, and nothing else:
//
//   allergies  → the wall poster, the red chips on Today, the kitchen sheet
//   dietary    → the kitchen sheet
//   contacts   → the pickup sheet and the emergency-contacts file
//   staff note → the class list
//
// That is the whole selection rule. A field that no document and no roster chip
// consumes does not belong here — this form is meant to be finished in under a
// minute per child, on a Sunday night, by somebody who has twenty of them.
//
// 🚨 IT DOES NOT EDIT MEDICAL RECORDS OR THE FAMILY'S OWN WORDS. Conditions,
// the doctor and `cms_child_profiles` stay where phases 2 and 3 put them: the
// family writes them, staff read them. Allergies were always the safety
// exception, and are the one clinical thing a teacher genuinely has first-hand
// ("she carries a pen, it's in my bag").
//
// Reuse: RowCard / RowList / CheckField / FieldError / inputClass and TagInput
// are the phase-3 primitives, imported verbatim from the enrolment wizard. The
// two ends of the hourglass edit an allergy with the same control, because it
// is the same allergy.

import { useEffect, useRef, type KeyboardEvent } from 'react';
import { Field } from '@/components/cms/enroll/StepScaffold';
import {
  CheckField,
  FieldError,
  RowCard,
  RowList,
  inputClass,
} from '@/components/cms/enroll/RowCard';
import { TagInput } from '@/components/cms/enroll/TagInput';
import { useT } from '@/lib/cms/i18n/provider';
import type { TranslationKey } from '@/lib/cms/i18n/t';
import {
  ALLERGY_SEVERITIES,
  DIETARY_REASONS,
  EMPTY_ALLERGY_ROW,
  EMPTY_CONTACT_ROW,
  EMPTY_DIETARY_ROW,
  MAX_ROWS,
  RELATIONSHIPS,
  type AllergyRowValues,
  type ContactRowValues,
  type DietaryRowValues,
  type RosterChildValues,
} from '@/lib/cms/validation';

const SEVERITY_LABEL: Record<string, TranslationKey> = {
  mild: 'teacher.today.severity.mild',
  moderate: 'teacher.today.severity.moderate',
  severe: 'teacher.today.severity.severe',
};

const REASON_LABEL: Record<string, TranslationKey> = {
  allergy: 'dietary.reason.allergy',
  medical: 'dietary.reason.medical',
  religious: 'dietary.reason.religious',
  cultural: 'dietary.reason.cultural',
  preference: 'dietary.reason.preference',
};

const RELATIONSHIP_LABEL: Record<string, TranslationKey> = {
  mother: 'relationship.mother',
  father: 'relationship.father',
  aunt: 'relationship.aunt',
  uncle: 'relationship.uncle',
  grandparent: 'relationship.grandparent',
  guardian: 'relationship.guardian',
  other: 'relationship.other',
};

export interface ChildEditorProps {
  values: RosterChildValues;
  onChange: (next: RosterChildValues) => void;
  errors?: Record<string, TranslationKey>;
  onSave: () => void;
  onCancel: () => void;
  saving?: boolean;
  saveLabelKey?: TranslationKey;
  /** Focus the name field on mount — the "Add a child" case. */
  autoFocus?: boolean;
}

export function ChildEditor({
  values,
  onChange,
  errors = {},
  onSave,
  onCancel,
  saving = false,
  saveLabelKey = 'teacher.roster.save',
  autoFocus = false,
}: ChildEditorProps) {
  const t = useT();
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) nameRef.current?.focus();
  }, [autoFocus]);

  function set<K extends keyof RosterChildValues>(key: K, next: RosterChildValues[K]) {
    onChange({ ...values, [key]: next });
  }

  function setAllergy(index: number, patch: Partial<AllergyRowValues>) {
    set(
      'allergies',
      values.allergies.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  }
  function setDietary(index: number, patch: Partial<DietaryRowValues>) {
    set(
      'dietary',
      values.dietary.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  }
  function setContact(index: number, patch: Partial<ContactRowValues>) {
    set(
      'contacts',
      values.contacts.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  }

  /**
   * Keyboard-first, because this form is used twenty times in a row.
   * Ctrl/⌘+Enter saves from ANY field; Escape closes. A bare Enter deliberately
   * does nothing — the tag inputs already own it, and a teacher pressing Enter
   * after typing an allergen means "add that chip", never "save and close".
   */
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      onSave();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
    }
  }

  return (
    <div onKeyDown={onKeyDown}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('teacher.roster.field.preferredName')} required>
          <input
            ref={nameRef}
            className={inputClass(Boolean(errors.preferredName))}
            dir="auto"
            autoComplete="off"
            value={values.preferredName}
            aria-invalid={Boolean(errors.preferredName)}
            onChange={(e) => set('preferredName', e.target.value)}
          />
          <FieldError messageKey={errors.preferredName} />
        </Field>

        <Field
          label={t('teacher.roster.field.legalName')}
          help={t('teacher.roster.field.legalName.help')}
        >
          <input
            className="cms-input"
            dir="auto"
            autoComplete="off"
            value={values.legalName}
            onChange={(e) => set('legalName', e.target.value)}
          />
        </Field>

        <Field label={t('teacher.roster.field.dateOfBirth')}>
          <input
            className={inputClass(Boolean(errors.dateOfBirth))}
            type="date"
            dir="ltr"
            value={values.dateOfBirth}
            aria-invalid={Boolean(errors.dateOfBirth)}
            onChange={(e) => set('dateOfBirth', e.target.value)}
          />
          <FieldError messageKey={errors.dateOfBirth} />
        </Field>

        <Field label={t('teacher.roster.field.homeLanguage')}>
          <input
            className="cms-input"
            dir="auto"
            autoComplete="off"
            value={values.homeLanguage}
            onChange={(e) => set('homeLanguage', e.target.value)}
          />
        </Field>

        <div className="sm:col-span-2">
          <Field
            label={t('teacher.roster.field.staffNote')}
            help={t('teacher.roster.field.staffNote.help')}
          >
            <textarea
              className="cms-input"
              rows={2}
              dir="auto"
              value={values.staffNote}
              onChange={(e) => set('staffNote', e.target.value)}
            />
          </Field>
        </div>
      </div>

      {/* ── allergies ──────────────────────────────────────────────────── */}
      <div className="mt-6">
        <h4 className="font-head text-[15px] m-0 mb-3">{t('teacher.roster.allergies')}</h4>
        <RowList
          emptyKey="teacher.roster.allergies.none"
          addKey="teacher.roster.allergies.add"
          canAdd={values.allergies.length < MAX_ROWS}
          onAdd={() => set('allergies', [...values.allergies, { ...EMPTY_ALLERGY_ROW }])}
          rows={values.allergies.map((row, i) => (
            <RowCard
              key={i}
              titleKey="teacher.roster.allergyRow"
              index={i}
              onRemove={() =>
                set(
                  'allergies',
                  values.allergies.filter((_, j) => j !== i)
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
                  onChange={(e) => setAllergy(i, { allergen: e.target.value })}
                />
                <FieldError messageKey={errors[`allergies.${i}.allergen`]} />
              </Field>

              <Field label={t('enrol.medical.severity')} required>
                <select
                  className={inputClass(Boolean(errors[`allergies.${i}.severity`]))}
                  value={row.severity}
                  aria-invalid={Boolean(errors[`allergies.${i}.severity`])}
                  onChange={(e) => setAllergy(i, { severity: e.target.value })}
                >
                  <option value="">{t('enrol.medical.severity.placeholder')}</option>
                  {ALLERGY_SEVERITIES.map((s) => (
                    <option key={s} value={s}>
                      {t(SEVERITY_LABEL[s])}
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
                  value={row.reaction}
                  onChange={(e) => setAllergy(i, { reaction: e.target.value })}
                />
              </Field>

              <Field label={t('enrol.medical.responsePlan')}>
                <input
                  className="cms-input"
                  dir="auto"
                  autoComplete="off"
                  value={row.responsePlan}
                  onChange={(e) => setAllergy(i, { responsePlan: e.target.value })}
                />
              </Field>

              <div className="sm:col-span-2">
                <CheckField
                  label={t('teacher.roster.epipen')}
                  checked={row.carriesEpipen}
                  onChange={(next) => setAllergy(i, { carriesEpipen: next })}
                />
              </div>
            </RowCard>
          ))}
        />
      </div>

      {/* ── dietary ────────────────────────────────────────────────────── */}
      <div className="mt-6">
        <h4 className="font-head text-[15px] m-0 mb-3">{t('teacher.roster.dietary')}</h4>
        <RowList
          emptyKey="teacher.roster.dietary.none"
          addKey="teacher.roster.dietary.add"
          canAdd={values.dietary.length < MAX_ROWS}
          onAdd={() => set('dietary', [...values.dietary, { ...EMPTY_DIETARY_ROW }])}
          rows={values.dietary.map((row, i) => (
            <RowCard
              key={i}
              titleKey="teacher.roster.dietaryRow"
              index={i}
              onRemove={() =>
                set(
                  'dietary',
                  values.dietary.filter((_, j) => j !== i)
                )
              }
            >
              <Field label={t('enrol.dietary.label')} required>
                <input
                  className={inputClass(Boolean(errors[`dietary.${i}.label`]))}
                  dir="auto"
                  autoComplete="off"
                  placeholder={t('enrol.dietary.label.placeholder')}
                  value={row.label}
                  aria-invalid={Boolean(errors[`dietary.${i}.label`])}
                  onChange={(e) => setDietary(i, { label: e.target.value })}
                />
                <FieldError messageKey={errors[`dietary.${i}.label`]} />
              </Field>

              <Field label={t('enrol.dietary.reason')} required>
                <select
                  className={inputClass(Boolean(errors[`dietary.${i}.reason`]))}
                  value={row.reason}
                  aria-invalid={Boolean(errors[`dietary.${i}.reason`])}
                  onChange={(e) => setDietary(i, { reason: e.target.value })}
                >
                  <option value="">{t('enrol.dietary.reason.placeholder')}</option>
                  {DIETARY_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {t(REASON_LABEL[r])}
                    </option>
                  ))}
                </select>
                <FieldError messageKey={errors[`dietary.${i}.reason`]} />
              </Field>

              <div className="sm:col-span-2">
                <Field
                  label={t('enrol.dietary.excluded')}
                  help={t('enrol.dietary.excluded.help')}
                >
                  <TagInput
                    label={t('enrol.dietary.excluded')}
                    value={row.excludedFoods}
                    onChange={(next) => setDietary(i, { excludedFoods: next })}
                  />
                </Field>
              </div>

              <div className="sm:col-span-2">
                <Field label={t('enrol.dietary.notes')}>
                  <input
                    className="cms-input"
                    dir="auto"
                    autoComplete="off"
                    value={row.notes}
                    onChange={(e) => setDietary(i, { notes: e.target.value })}
                  />
                </Field>
              </div>
            </RowCard>
          ))}
        />
      </div>

      {/* ── contacts ───────────────────────────────────────────────────── */}
      <div className="mt-6">
        <h4 className="font-head text-[15px] m-0 mb-3">{t('teacher.roster.contacts')}</h4>
        <RowList
          emptyKey="teacher.roster.contacts.none"
          addKey="teacher.roster.contacts.add"
          canAdd={values.contacts.length < MAX_ROWS}
          onAdd={() => set('contacts', [...values.contacts, { ...EMPTY_CONTACT_ROW }])}
          rows={values.contacts.map((row, i) => (
            <RowCard
              key={i}
              titleKey="teacher.roster.contactRow"
              index={i}
              onRemove={() =>
                set(
                  'contacts',
                  values.contacts.filter((_, j) => j !== i)
                )
              }
            >
              <Field label={t('enrol.contacts.name')} required>
                <input
                  className={inputClass(Boolean(errors[`contacts.${i}.fullName`]))}
                  dir="auto"
                  autoComplete="off"
                  value={row.fullName}
                  aria-invalid={Boolean(errors[`contacts.${i}.fullName`])}
                  onChange={(e) => setContact(i, { fullName: e.target.value })}
                />
                <FieldError messageKey={errors[`contacts.${i}.fullName`]} />
              </Field>

              <Field label={t('enrol.contacts.relationship')} required>
                <select
                  className={inputClass(Boolean(errors[`contacts.${i}.relationship`]))}
                  value={row.relationship}
                  aria-invalid={Boolean(errors[`contacts.${i}.relationship`])}
                  onChange={(e) => setContact(i, { relationship: e.target.value })}
                >
                  <option value="">{t('enrol.contacts.relationship.placeholder')}</option>
                  {RELATIONSHIPS.map((r) => (
                    <option key={r} value={r}>
                      {t(RELATIONSHIP_LABEL[r])}
                    </option>
                  ))}
                </select>
                <FieldError messageKey={errors[`contacts.${i}.relationship`]} />
              </Field>

              <Field label={t('enrol.contacts.phone')} required>
                <input
                  className={inputClass(Boolean(errors[`contacts.${i}.phone`]))}
                  type="tel"
                  dir="ltr"
                  autoComplete="off"
                  value={row.phone}
                  aria-invalid={Boolean(errors[`contacts.${i}.phone`])}
                  onChange={(e) => setContact(i, { phone: e.target.value })}
                />
                <FieldError messageKey={errors[`contacts.${i}.phone`]} />
              </Field>

              <Field label={t('enrol.contacts.email')}>
                <input
                  className={inputClass(Boolean(errors[`contacts.${i}.email`]))}
                  type="email"
                  dir="ltr"
                  autoComplete="off"
                  value={row.email}
                  aria-invalid={Boolean(errors[`contacts.${i}.email`])}
                  onChange={(e) => setContact(i, { email: e.target.value })}
                />
                <FieldError messageKey={errors[`contacts.${i}.email`]} />
              </Field>

              <div className="sm:col-span-2">
                <CheckField
                  label={t('enrol.contacts.canCollect')}
                  help={t('enrol.contacts.canCollect.help')}
                  checked={row.canCollect}
                  onChange={(next) => setContact(i, { canCollect: next })}
                />
              </div>
            </RowCard>
          ))}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2.5 mt-6">
        <button
          type="button"
          className="cms-btn cms-btn-primary cms-btn-md"
          onClick={onSave}
          disabled={saving}
        >
          {saving ? t('teacher.roster.saving') : t(saveLabelKey)}
        </button>
        <button
          type="button"
          className="cms-btn cms-btn-ghost cms-btn-outline cms-btn-sm"
          onClick={onCancel}
          disabled={saving}
        >
          {t('teacher.roster.close')}
        </button>
        <span className="text-[11.5px] text-harbor-muted ms-auto">
          {t('teacher.roster.keyboardHint')}
        </span>
      </div>
    </div>
  );
}
