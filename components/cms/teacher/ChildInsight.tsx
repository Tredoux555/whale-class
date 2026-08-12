// components/cms/teacher/ChildInsight.tsx
// The other end of the hourglass for phase 3: what a family wrote in the
// "About your child" step, shown to the person who meets the child on Monday.
//
// SERVER COMPONENT, ZERO JAVASCRIPT. It is a native `<details>` — the roster
// row is the `<summary>`, the panel is what unfolds. That is not a shortcut: it
// means the whole Today page stays a server component, the expansion works
// before hydration and without it, and the roster of 24 children costs 24
// `<details>` elements rather than 24 pieces of client state.
//
// 🚨 RLS DOES THE PERMISSION, NOT THIS COMPONENT. `cms_child_profiles` is
// readable by the family, the teacher of the child's OWN room, and the school
// office — never at the org layer (migration 330, asserted in
// scripts/cms/rls-test.mjs). This component is only ever handed profiles for
// children the caller already resolved from their own room.
//
// The tone is deliberate: no scores, no numbers, no trait names. Every phrase a
// teacher reads here is the family's own end of the line ("needs time",
// "seeks company"), because that is what was collected.

import type { TFunction, TranslationKey } from '@/lib/cms/i18n/t';
import type { ChildProfile } from '@/lib/cms/engine/types';
import { TEMPERAMENT_AXES } from '@/lib/cms/engine/types';

/** The subset a teacher needs. Structurally satisfied by both the demo seed's
 *  full `ChildProfile` and the DB layer's `ChildProfileSummary`. */
export type InsightProfile = Pick<
  ChildProfile,
  'likes' | 'dislikes' | 'interests' | 'temperament' | 'parentNotes'
>;

const AXIS_LABEL: Record<string, TranslationKey> = {
  settling: 'enrol.about.axis.settling',
  company: 'enrol.about.axis.company',
  adventure: 'enrol.about.axis.adventure',
  energy: 'enrol.about.axis.energy',
};

/** 1–2 reads as the left end, 4–5 as the right, 3 as "somewhere between". */
function endLabel(t: TFunction, axis: string, value: number): string {
  const left = t(`enrol.about.axis.${axis}.left` as TranslationKey);
  const right = t(`enrol.about.axis.${axis}.right` as TranslationKey);
  if (value <= 2) return left;
  if (value >= 4) return right;
  // A 3 is not "both ends" — joining them read as a contradiction on the card
  // ("Calm and steady · Big and busy"). It is one answer: in between.
  return t('enrol.about.axis.mid');
}

function TagRow({ label, values }: { label: string; values: string[] }) {
  if (values.length === 0) return null;
  return (
    <div>
      <span className="cms-label">{label}</span>
      <span className="flex flex-wrap gap-1.5 mt-1.5">
        {values.map((v) => (
          <span key={v} className="cms-chip cms-tone-quiet" dir="auto">
            {v}
          </span>
        ))}
      </span>
    </div>
  );
}

export function ChildInsightPanel({
  profile,
  name,
  t,
}: {
  profile: InsightProfile | undefined;
  name: string;
  t: TFunction;
}) {
  if (!profile) {
    return (
      <p className="text-[12.5px] text-harbor-muted m-0 leading-relaxed">
        {t('teacher.insight.empty')}
      </p>
    );
  }

  const picks = TEMPERAMENT_AXES.filter((axis) => typeof profile.temperament?.[axis] === 'number');

  return (
    <div className="grid gap-4">
      <h3 className="font-head text-[15px] m-0" dir="auto">
        {t('teacher.insight.title', { name })}
      </h3>

      {picks.length > 0 ? (
        <div>
          <span className="cms-label">{t('teacher.insight.temperament')}</span>
          <ul className="list-none m-0 mt-2 p-0 grid gap-1.5 sm:grid-cols-2">
            {picks.map((axis) => (
              <li key={axis} className="flex items-baseline gap-2 text-[12.5px]">
                <span className="text-harbor-muted min-w-[6.5rem]">{t(AXIS_LABEL[axis])}</span>
                <span className="font-medium text-harbor-text">
                  {endLabel(t, axis, profile.temperament[axis] as number)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <TagRow label={t('teacher.insight.likes')} values={profile.likes ?? []} />
        <TagRow label={t('teacher.insight.interests')} values={profile.interests ?? []} />
        <TagRow label={t('teacher.insight.dislikes')} values={profile.dislikes ?? []} />
      </div>

      {profile.parentNotes ? (
        <div>
          <span className="cms-label">{t('teacher.insight.notes')}</span>
          <p
            dir="auto"
            className="text-[13px] text-harbor-text mt-1.5 mb-0 leading-relaxed max-w-[70ch] border-s-[3px] border-s-harbor-accent/40 ps-3.5"
          >
            {profile.parentNotes}
          </p>
        </div>
      ) : null}

      <p className="text-[11.5px] text-harbor-muted m-0 leading-relaxed">
        {t('teacher.insight.privacy')}
      </p>
    </div>
  );
}
