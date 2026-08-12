'use client';

// components/cms/enroll/StepChildInfo.tsx
// THE ONE WORKING STEP — and, since phase 2, the one that WRITES.
//
// It still writes into a partial `Child` / `Enrollment` shape from
// lib/cms/engine/types rather than an ad-hoc form object, which is exactly why
// wiring the endpoint took no re-mapping: the values this step holds are the
// values the row needs.
//
// Phase 2 made it CONTROLLED. The parent component owns the value (because the
// parent is what talks to /api/cms/enroll and what resumes a saved draft), and
// the rooms come from the school's real cms_class_groups rows instead of a
// hardcoded list.

import { useT } from '@/lib/cms/i18n/provider';
import type { TranslationKey } from '@/lib/cms/i18n/t';
import { Field, StepScaffold } from './StepScaffold';

/** The subset of the engine's records this step is responsible for. */
export interface ChildStepValue {
  legalName: string;
  preferredName: string;
  dateOfBirth: string;
  homeLanguage: string;
  requestedStartDate: string;
  classGroupId: string;
  settlingNotes: string;
}

export const EMPTY_CHILD_STEP: ChildStepValue = {
  legalName: '',
  preferredName: '',
  dateOfBirth: '',
  homeLanguage: '',
  requestedStartDate: '',
  classGroupId: '',
  settlingNotes: '',
};

/** One room a family may apply to. Shaped from the engine's ClassGroup. */
export interface RoomOption {
  id: string;
  name: string;
}

/**
 * Rooms shown when no school is connected. In live mode this list is never
 * used — the real cms_class_groups rows arrive as a prop.
 */
export const DEMO_ROOMS: RoomOption[] = [
  { id: 'class-sunrise', name: 'Sunrise Room' },
  { id: 'class-meadow', name: 'Meadow Room' },
  { id: 'class-harbour', name: 'Harbour Room' },
];

export interface StepChildInfoProps {
  value: ChildStepValue;
  onChange: (next: ChildStepValue) => void;
  rooms: RoomOption[];
  /** field name → translation key, from lib/cms/validation. */
  errors?: Record<string, TranslationKey>;
}

/** A field's error line, if it has one. */
function FieldError({ messageKey }: { messageKey?: TranslationKey }) {
  const t = useT();
  if (!messageKey) return null;
  return (
    <span className="block text-[11.5px] text-harbor-danger-deep mt-1.5 leading-snug">
      {t(messageKey)}
    </span>
  );
}

export function StepChildInfo({ value, onChange, rooms, errors = {} }: StepChildInfoProps) {
  const t = useT();

  function set<K extends keyof ChildStepValue>(key: K, next: ChildStepValue[K]) {
    onChange({ ...value, [key]: next });
  }

  const invalid = (field: string) =>
    errors[field] ? 'cms-input !border-harbor-danger' : 'cms-input';

  return (
    <StepScaffold
      titleKey="enrol.step.child"
      descKey="enrol.step.child.desc"
      footNote={t('enrol.privacyNote')}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label={t('enrol.child.legalName')} help={t('enrol.child.legalName.help')} required>
            <input
              className={invalid('legalName')}
              value={value.legalName}
              onChange={(e) => set('legalName', e.target.value)}
              autoComplete="off"
              dir="auto"
              aria-invalid={Boolean(errors.legalName)}
            />
            <FieldError messageKey={errors.legalName} />
          </Field>
        </div>

        <Field label={t('enrol.child.preferredName')} help={t('enrol.child.preferredName.help')}>
          <input
            className="cms-input"
            value={value.preferredName}
            onChange={(e) => set('preferredName', e.target.value)}
            autoComplete="off"
            dir="auto"
          />
        </Field>

        <Field label={t('enrol.child.dateOfBirth')} required>
          <input
            type="date"
            className={invalid('dateOfBirth')}
            value={value.dateOfBirth}
            onChange={(e) => set('dateOfBirth', e.target.value)}
            aria-invalid={Boolean(errors.dateOfBirth)}
          />
          <FieldError messageKey={errors.dateOfBirth} />
        </Field>

        <Field label={t('enrol.child.homeLanguage')} help={t('enrol.child.homeLanguage.help')} required>
          <input
            className={invalid('homeLanguage')}
            value={value.homeLanguage}
            onChange={(e) => set('homeLanguage', e.target.value)}
            autoComplete="off"
            dir="auto"
            aria-invalid={Boolean(errors.homeLanguage)}
          />
          <FieldError messageKey={errors.homeLanguage} />
        </Field>

        <Field label={t('enrol.child.startDate')} required>
          <input
            type="date"
            className={invalid('requestedStartDate')}
            value={value.requestedStartDate}
            onChange={(e) => set('requestedStartDate', e.target.value)}
            aria-invalid={Boolean(errors.requestedStartDate)}
          />
          <FieldError messageKey={errors.requestedStartDate} />
        </Field>

        <div className="sm:col-span-2">
          <Field label={t('enrol.child.classGroup')} required>
            <select
              className={invalid('classGroupId')}
              value={value.classGroupId}
              onChange={(e) => set('classGroupId', e.target.value)}
              aria-invalid={Boolean(errors.classGroupId)}
            >
              <option value="">{t('enrol.child.classGroup.placeholder')}</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
            <FieldError messageKey={errors.classGroupId} />
          </Field>
        </div>

        <div className="sm:col-span-2">
          <Field label={t('enrol.child.notes')}>
            <textarea
              className="cms-input"
              rows={3}
              placeholder={t('enrol.child.notes.placeholder')}
              value={value.settlingNotes}
              onChange={(e) => set('settlingNotes', e.target.value)}
              dir="auto"
            />
          </Field>
        </div>
      </div>
    </StepScaffold>
  );
}
