'use client';

// He · She — the smallest control on the tracker, and the one that decides
// whether the week's document is usable.
//
// THE BUG IT EXISTS FOR: every Whale-class row carried no gender, so the engine
// fell back to 'they' nineteen times and every summary read "They are starting
// to…". The teacher had nowhere to say otherwise without opening the roster
// editor, one child at a time.
//
// TWO CHIPS, NOT THREE. 'they' is shown only when it is the CURRENT state, and
// then as a dimmed, unclickable marker reading "not set" — because in a
// Montessori 3–6 room it is never the answer a teacher is reaching for, it is
// what the database says when nobody has answered at all. Offering it as a
// third target would make silence look like a choice. A wrong tap is still
// undoable: the other chip is right there, and the route accepts 'they' if a
// future surface ever needs to clear the field.
//
// A row whose pronoun is unset wears a dashed gold outline — the same gold the
// grid uses for a stated fact, never a red error. Nothing is wrong with the
// child; something is missing from the record.

import type { Pronoun } from './tracker-actions';
import { T } from './theme';

/** Tablet tap target for the chips. Full-height rows would push the grid apart. */
const CHIP_H = 44;
const CHIP_W = 58;

export default function PronounToggle({
  pronoun,
  pronounSet,
  busy,
  childName,
  onPick,
}: {
  pronoun: Pronoun | undefined;
  /** False (or undefined, on a route that has not sent it) = nobody has said. */
  pronounSet: boolean | undefined;
  busy?: boolean;
  childName: string;
  onPick: (pronoun: Pronoun) => void;
}) {
  const set = pronounSet === true;
  const current = set ? pronoun : undefined;

  return (
    <div
      role="group"
      aria-label={`Pronoun for ${childName}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
        padding: set ? 0 : 4,
        borderRadius: 12,
        border: set ? '1px solid transparent' : `1px dashed ${T.gold}`,
        background: set ? 'transparent' : 'rgba(232,201,106,0.07)',
      }}
    >
      {(['he', 'she'] as const).map((p) => {
        const on = current === p;
        return (
          <button
            key={p}
            type="button"
            disabled={busy}
            aria-pressed={on}
            onClick={() => onPick(p)}
            title={`${childName} — ${p === 'he' ? 'he/him' : 'she/her'}`}
            style={{
              minHeight: CHIP_H,
              minWidth: CHIP_W,
              borderRadius: 10,
              padding: '8px 12px',
              fontFamily: T.sans,
              fontSize: 13,
              fontWeight: on ? 700 : 500,
              cursor: busy ? 'wait' : 'pointer',
              opacity: busy ? 0.6 : 1,
              background: on ? 'rgba(52,211,153,0.75)' : 'rgba(255,255,255,0.06)',
              border: on ? '1px solid rgba(52,211,153,0.85)' : '1px solid rgba(255,255,255,0.12)',
              color: on ? T.onEmerald : T.text,
            }}
          >
            {p === 'he' ? 'He' : 'She'}
          </button>
        );
      })}

      {/* The fallback, stated plainly — a label, not a third option. */}
      {!set && (
        <span
          style={{
            fontFamily: T.sans,
            fontSize: 11,
            lineHeight: 1.25,
            color: T.gold,
            maxWidth: 76,
          }}
        >
          They · not set
        </span>
      )}
    </div>
  );
}
