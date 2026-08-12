'use client';

// components/cms/enroll/StepContacts.tsx
// WIZARD STEP 6 — writes `cms_guardians` (the people) plus, for anyone the
// family ticks as a collector, `cms_pickup_authorizations` (the permission).
//
// 🚨 THOSE TWO ARE NOT THE SAME THING, and migration 329 keeps them apart on
// purpose: a guardian link is a RELATIONSHIP, an authorisation is a PERMISSION,
// and they change on different clocks — a grandparent authorised for one week
// is still the grandparent in December. So "may collect" is its own tick, and
// leaving it unticked means the person is called, not handed a child.
//
// Call order is the order the family listed them in — no priority field to
// argue with, and no tie to break.

import { useT } from '@/lib/cms/i18n/provider';
import type { TranslationKey } from '@/lib/cms/i18n/t';
import {
  EMPTY_CONTACT_ROW,
  MAX_ROWS,
  RELATIONSHIPS,
  type ContactRowValues,
  type ContactsStepValues,
} from '@/lib/cms/validation';
import { Field, StepScaffold } from './StepScaffold';
import { CheckField, FieldError, RowCard, RowList, inputClass } from './RowCard';

const RELATIONSHIP_LABEL: Record<string, TranslationKey> = {
  mother: 'relationship.mother',
  father: 'relationship.father',
  aunt: 'relationship.aunt',
  uncle: 'relationship.uncle',
  grandparent: 'relationship.grandparent',
  guardian: 'relationship.guardian',
  other: 'relationship.other',
};

export interface StepContactsProps {
  value: ContactsStepValues;
  onChange: (next: ContactsStepValues) => void;
  errors?: Record<string, TranslationKey>;
}

export function StepContacts({ value, onChange, errors = {} }: StepContactsProps) {
  const t = useT();

  function setRow(index: number, patch: Partial<ContactRowValues>) {
    onChange({
      contacts: value.contacts.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    });
  }

  return (
    <StepScaffold titleKey="enrol.step.contacts" descKey="enrol.step.contacts.desc">
      <p className="text-[12.5px] text-harbor-muted mt-0 mb-4 leading-relaxed max-w-[58ch]">
        {t('enrol.contacts.body')}
      </p>

      {errors.contacts ? (
        <p
          role="alert"
          className="cms-card-sunk mt-0 mb-4 px-3.5 py-3 text-[13px] leading-relaxed text-harbor-danger-deep border-s-[3px] border-s-harbor-danger"
        >
          {t(errors.contacts)}
        </p>
      ) : null}

      <RowList
        emptyKey="enrol.contacts.empty"
        addKey="enrol.contacts.add"
        canAdd={value.contacts.length < MAX_ROWS}
        onAdd={() => onChange({ contacts: [...value.contacts, { ...EMPTY_CONTACT_ROW }] })}
        rows={value.contacts.map((row, i) => (
          <RowCard
            key={i}
            titleKey="enrol.contacts.row"
            index={i}
            onRemove={() => onChange({ contacts: value.contacts.filter((_, j) => j !== i) })}
          >
            <Field label={t('enrol.contacts.name')} required>
              <input
                className={inputClass(Boolean(errors[`contacts.${i}.fullName`]))}
                dir="auto"
                autoComplete="off"
                value={row.fullName}
                aria-invalid={Boolean(errors[`contacts.${i}.fullName`])}
                onChange={(e) => setRow(i, { fullName: e.target.value })}
              />
              <FieldError messageKey={errors[`contacts.${i}.fullName`]} />
            </Field>

            <Field label={t('enrol.contacts.relationship')} required>
              <select
                className={inputClass(Boolean(errors[`contacts.${i}.relationship`]))}
                value={row.relationship}
                aria-invalid={Boolean(errors[`contacts.${i}.relationship`])}
                onChange={(e) => setRow(i, { relationship: e.target.value })}
              >
                <option value="">{t('enrol.contacts.relationship.placeholder')}</option>
                {RELATIONSHIPS.map((rel) => (
                  <option key={rel} value={rel}>
                    {t(RELATIONSHIP_LABEL[rel])}
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
                onChange={(e) => setRow(i, { phone: e.target.value })}
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
                onChange={(e) => setRow(i, { email: e.target.value })}
              />
              <FieldError messageKey={errors[`contacts.${i}.email`]} />
            </Field>

            <div className="sm:col-span-2">
              <CheckField
                label={t('enrol.contacts.canCollect')}
                help={t('enrol.contacts.canCollect.help')}
                checked={row.canCollect}
                onChange={(next) => setRow(i, { canCollect: next })}
              />
            </div>

            <div className="sm:col-span-2">
              <Field label={t('enrol.contacts.note')}>
                <input
                  className="cms-input"
                  dir="auto"
                  autoComplete="off"
                  placeholder={t('enrol.contacts.note.placeholder')}
                  value={row.note}
                  onChange={(e) => setRow(i, { note: e.target.value })}
                />
              </Field>
            </div>
          </RowCard>
        ))}
      />
    </StepScaffold>
  );
}
