'use client';

// components/cms/enroll/StepAboutChild.tsx
// THE STEP TREDOUX LOCKED (CLAUDE.md, 2026-08-12) — and, deliberately, the
// SECOND step, before anything clinical. A family's first real answer about
// their child should be "what do they love?", not "what are they allergic to".
//
// It writes `cms_child_profiles` (migration 330), which is read by exactly two
// places: the teacher's insight panel on /cms/teacher/today, and — when the
// family leaves the last tick in place — `lib/cms/engine/guru-feed.ts`.
//
// 🚨 NO CLINICAL LANGUAGE ON THIS PAGE, EVER. No "assessment", no "score", no
// "profile" in the copy, no trait framed as a deficit. Every string here is a
// parent describing their child to the person who will meet them on Monday.

import { useT } from '@/lib/cms/i18n/provider';
import type { TranslationKey } from '@/lib/cms/i18n/t';
import { TEMPERAMENT_KEYS, type AboutChildStepValues } from '@/lib/cms/validation';
import { Field, StepScaffold } from './StepScaffold';
import { CheckField, FieldError } from './RowCard';
import { TagInput } from './TagInput';
import { TraitScale } from './TraitScale';

/** axis → its three strings. One entry per member of TEMPERAMENT_KEYS, so a new
 *  axis is a dictionary edit plus one line here, never a new component. */
const AXIS_COPY: Record<
  (typeof TEMPERAMENT_KEYS)[number],
  { label: TranslationKey; left: TranslationKey; right: TranslationKey }
> = {
  settling: {
    label: 'enrol.about.axis.settling',
    left: 'enrol.about.axis.settling.left',
    right: 'enrol.about.axis.settling.right',
  },
  company: {
    label: 'enrol.about.axis.company',
    left: 'enrol.about.axis.company.left',
    right: 'enrol.about.axis.company.right',
  },
  adventure: {
    label: 'enrol.about.axis.adventure',
    left: 'enrol.about.axis.adventure.left',
    right: 'enrol.about.axis.adventure.right',
  },
  energy: {
    label: 'enrol.about.axis.energy',
    left: 'enrol.about.axis.energy.left',
    right: 'enrol.about.axis.energy.right',
  },
};

export interface StepAboutChildProps {
  value: AboutChildStepValues;
  onChange: (next: AboutChildStepValues) => void;
  errors?: Record<string, TranslationKey>;
}

export function StepAboutChild({ value, onChange, errors = {} }: StepAboutChildProps) {
  const t = useT();

  function set<K extends keyof AboutChildStepValues>(key: K, next: AboutChildStepValues[K]) {
    onChange({ ...value, [key]: next });
  }

  function setAxis(axis: string, next: number | undefined) {
    const temperament = { ...value.temperament };
    if (next === undefined) delete temperament[axis];
    else temperament[axis] = next;
    onChange({ ...value, temperament });
  }

  return (
    <StepScaffold
      titleKey="enrol.step.about"
      descKey="enrol.step.about.desc"
      footNote={t('enrol.about.privacyNote')}
    >
      <div className="grid gap-4">
        <Field label={t('enrol.about.likes')} help={t('enrol.about.likes.help')}>
          <TagInput
            label={t('enrol.about.likes')}
            value={value.likes}
            onChange={(next) => set('likes', next)}
            placeholder={t('enrol.about.likes.placeholder')}
          />
        </Field>

        <Field label={t('enrol.about.dislikes')} help={t('enrol.about.dislikes.help')}>
          <TagInput
            label={t('enrol.about.dislikes')}
            value={value.dislikes}
            onChange={(next) => set('dislikes', next)}
            placeholder={t('enrol.about.likes.placeholder')}
          />
        </Field>

        <Field label={t('enrol.about.interests')} help={t('enrol.about.interests.help')}>
          <TagInput
            label={t('enrol.about.interests')}
            value={value.interests}
            onChange={(next) => set('interests', next)}
            placeholder={t('enrol.about.likes.placeholder')}
          />
        </Field>
      </div>

      {/* ── the temperament picks ───────────────────────────────────────── */}
      <div className="cms-card-sunk p-5 mt-6">
        <h3 className="font-head text-[16px] m-0">{t('enrol.about.temperament.title')}</h3>
        <p className="text-[12.5px] text-harbor-muted mt-1.5 mb-4 leading-relaxed max-w-[58ch]">
          {t('enrol.about.temperament.body')}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {TEMPERAMENT_KEYS.map((axis) => (
            <div key={axis}>
              <TraitScale
                labelKey={AXIS_COPY[axis].label}
                leftKey={AXIS_COPY[axis].left}
                rightKey={AXIS_COPY[axis].right}
                value={value.temperament?.[axis]}
                onChange={(next) => setAxis(axis, next)}
              />
              <FieldError messageKey={errors[`temperament.${axis}`]} />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-5">
        <Field label={t('enrol.about.notes')} help={t('enrol.about.notes.help')}>
          <textarea
            className="cms-input"
            rows={5}
            dir="auto"
            placeholder={t('enrol.about.notes.placeholder')}
            value={value.parentNotes}
            onChange={(e) => set('parentNotes', e.target.value)}
          />
        </Field>

        <CheckField
          label={t('enrol.about.guruSync')}
          help={t('enrol.about.guruSync.help')}
          checked={value.guruSync}
          onChange={(next) => set('guruSync', next)}
        />
      </div>
    </StepScaffold>
  );
}
