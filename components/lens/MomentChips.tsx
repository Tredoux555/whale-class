// components/lens/MomentChips.tsx
// The tag rails that turn a silent-classroom tap into structured evidence.
//
// 🚨 EVERY RAIL IS STICKY, AND THAT IS THE DESIGN.
// The chips do NOT reset after a save. An observer working the Sensorial shelf
// tags six moments in a row as environment/sensorial; making her re-pick both
// each time would mean twelve extra taps she has to look down to make. The
// selection persists until she changes it, and the capture screen shows what is
// currently armed at all times so a stale tag is visible rather than silent.
//
// 🚨 A RAIL SCROLLS, IT DOES NOT WRAP. A wrapping rail changes height as she
// taps, which moves every control below it — including the shutter — under a
// thumb that is already moving. See .ln-rail in lib/lens/ui.ts.

'use client';

import {
  AREA_LABELS,
  MOMENT_AREAS,
  MOMENT_SUBJECTS,
  RATING_LABELS,
  RATING_LEVELS,
  SUBJECT_LABELS,
  type LensStaff,
  type MomentArea,
  type MomentSubject,
} from '@/lib/lens/types';

export interface MomentTags {
  subject: MomentSubject | null;
  area: MomentArea | null;
  staffId: string | null;
  rating: number | null;
  childAlias: string | null;
}

export const EMPTY_TAGS: MomentTags = {
  subject: null,
  area: null,
  staffId: null,
  rating: null,
  childAlias: null,
};

export function MomentChipRails({
  tags,
  onChange,
  staff,
}: {
  tags: MomentTags;
  onChange: (next: MomentTags) => void;
  staff: LensStaff[];
}) {
  const set = (patch: Partial<MomentTags>) => onChange({ ...tags, ...patch });
  /** Tapping the armed chip disarms it — there is no separate "clear" control. */
  const toggle = <K extends keyof MomentTags>(key: K, value: MomentTags[K]) =>
    set({ [key]: tags[key] === value ? null : value } as Partial<MomentTags>);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="ln-rail" role="group" aria-label="Subject">
        {MOMENT_SUBJECTS.map((s) => (
          <button
            key={s}
            type="button"
            className="ln-chip"
            data-on={tags.subject === s ? '1' : '0'}
            aria-pressed={tags.subject === s}
            onClick={() => toggle('subject', s)}
          >
            {SUBJECT_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="ln-rail" role="group" aria-label="Area">
        {MOMENT_AREAS.map((a) => (
          <button
            key={a}
            type="button"
            className="ln-chip"
            data-on={tags.area === a ? '1' : '0'}
            aria-pressed={tags.area === a}
            onClick={() => toggle('area', a)}
          >
            {AREA_LABELS[a]}
          </button>
        ))}
      </div>

      {staff.length > 0 && (
        <div className="ln-rail" role="group" aria-label="Staff">
          {staff.map((s) => (
            <button
              key={s.id}
              type="button"
              className="ln-chip"
              data-on={tags.staffId === s.id ? '1' : '0'}
              aria-pressed={tags.staffId === s.id}
              onClick={() => toggle('staffId', s.id)}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      <div className="ln-rail" role="group" aria-label="Rating">
        {RATING_LEVELS.map((level, index) => {
          const pip = index + 1;
          return (
            <button
              key={level}
              type="button"
              className="ln-chip"
              data-on={tags.rating === pip ? '1' : '0'}
              aria-pressed={tags.rating === pip}
              onClick={() => toggle('rating', pip)}
            >
              {RATING_LABELS[level]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** A one-line summary of what is currently armed, for the capture screen. */
export function tagSummary(tags: MomentTags, staff: LensStaff[]): string {
  const bits: string[] = [];
  if (tags.subject) bits.push(SUBJECT_LABELS[tags.subject]);
  if (tags.area) bits.push(AREA_LABELS[tags.area]);
  if (tags.staffId) {
    const person = staff.find((s) => s.id === tags.staffId);
    if (person) bits.push(person.name);
  }
  if (tags.rating) {
    const level = RATING_LEVELS[tags.rating - 1];
    if (level) bits.push(RATING_LABELS[level]);
  }
  if (tags.childAlias) bits.push(tags.childAlias);
  return bits.length ? bits.join(' · ') : 'No tags';
}
