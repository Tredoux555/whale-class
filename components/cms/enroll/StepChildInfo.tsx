'use client';

// components/cms/enroll/StepChildInfo.tsx
// THE ONE WORKING STEP (phase 1). It writes into a partial `Child` /
// `Enrollment` shape from lib/cms/engine/types — not into an ad-hoc form object —
// so when the submit endpoint lands there is nothing to re-map.

import { useState } from 'react';
import { useT } from '@/lib/cms/i18n/provider';
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

/** Rooms come from the school's ClassGroup rows; seeded here for the demo. */
const ROOMS = [
  { id: 'class-sunrise', name: 'Sunrise Room' },
  { id: 'class-meadow', name: 'Meadow Room' },
  { id: 'class-harbour', name: 'Harbour Room' },
];

export function StepChildInfo() {
  const t = useT();
  const [value, setValue] = useState<ChildStepValue>(EMPTY_CHILD_STEP);

  function set<K extends keyof ChildStepValue>(key: K, next: ChildStepValue[K]) {
    setValue((v) => ({ ...v, [key]: next }));
  }

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
              className="cms-input"
              value={value.legalName}
              onChange={(e) => set('legalName', e.target.value)}
              autoComplete="off"
            />
          </Field>
        </div>

        <Field label={t('enrol.child.preferredName')} help={t('enrol.child.preferredName.help')}>
          <input
            className="cms-input"
            value={value.preferredName}
            onChange={(e) => set('preferredName', e.target.value)}
            autoComplete="off"
          />
        </Field>

        <Field label={t('enrol.child.dateOfBirth')} required>
          <input
            type="date"
            className="cms-input"
            value={value.dateOfBirth}
            onChange={(e) => set('dateOfBirth', e.target.value)}
          />
        </Field>

        <Field label={t('enrol.child.homeLanguage')} help={t('enrol.child.homeLanguage.help')} required>
          <input
            className="cms-input"
            value={value.homeLanguage}
            onChange={(e) => set('homeLanguage', e.target.value)}
            autoComplete="off"
          />
        </Field>

        <Field label={t('enrol.child.startDate')} required>
          <input
            type="date"
            className="cms-input"
            value={value.requestedStartDate}
            onChange={(e) => set('requestedStartDate', e.target.value)}
          />
        </Field>

        <div className="sm:col-span-2">
          <Field label={t('enrol.child.classGroup')} required>
            <select
              className="cms-input"
              value={value.classGroupId}
              onChange={(e) => set('classGroupId', e.target.value)}
            >
              <option value="">{t('enrol.child.classGroup.placeholder')}</option>
              {ROOMS.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
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
            />
          </Field>
        </div>
      </div>
    </StepScaffold>
  );
}
