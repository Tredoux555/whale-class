'use client';

// THE SCREEN. Children down, the week's five works across.
//
// One tap on a cell climbs the ladder (rule 4, forward only, source 'tap').
// The small "−" beside it is the correction door: it opens the dialog, which
// demands a reason before anything moves down. A row goes gold when all five
// works of the week's letter are mastered — the same fact the ribbon shows,
// said again where the teacher's eye already is.
//
// Tablet-first: every target is ≥52px, nothing depends on hover (the labels are
// always visible, the titles are extra), and the grid scrolls sideways inside
// its own box rather than pushing the page around.

import Link from 'next/link';
import { TRACKER_LETTERS } from '@/lib/montree/dark-phonics/tracker-works';
import PronounToggle from './PronounToggle';
import Ribbon from './Ribbon';
import { STATUS_LABEL, type Pronoun } from './tracker-actions';
import { cardStyle, STATUS_STYLE, T, TAP } from './theme';
import type { ClassChild, Status } from './types';

// Widened when the He · She toggle joined the name cell: two 58px chips plus
// the "not set" marker need the room, and the roster column must not wrap a
// child's name to make space for it.
const NAME_COL = 250;
const WORK_COL = 128;

export function weekWorkKeys(letter: string): string[] {
  return [1, 2, 3, 4, 5].map((n) => `dp:${letter}:${n}`);
}

export function workHeadings(letter: string): { key: string; n: number; label: string }[] {
  const def = TRACKER_LETTERS.find((l) => l.letter === letter);
  return [1, 2, 3, 4, 5].map((n) => ({
    key: `dp:${letter}:${n}`,
    n,
    label: def?.works[n - 1]?.shortLabel ?? `Work ${n}`,
  }));
}

export default function WeekGrid({
  letter,
  roster,
  pending,
  onTap,
  onCorrect,
  onCopySummary,
  onSetPronoun,
  copiedChildId,
}: {
  letter: string;
  /** Named `roster`, not `children`: in a React component `children` means the
      JSX between the tags, and these are people. */
  roster: ClassChild[];
  pending: Set<string>;
  onTap: (child: ClassChild, workKey: string) => void;
  onCorrect: (child: ClassChild, workKey: string) => void;
  onCopySummary: (child: ClassChild) => void;
  onSetPronoun: (child: ClassChild, pronoun: Pronoun) => void;
  copiedChildId: string | null;
}) {
  const headings = workHeadings(letter);

  return (
    <div style={{ ...cardStyle, padding: 0, overflowX: 'auto' }}>
      <div style={{ minWidth: NAME_COL + WORK_COL * 5 + 460 }}>
        {/* header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `${NAME_COL}px repeat(5, ${WORK_COL}px) 300px 160px`,
            gap: 8,
            padding: '14px 16px 10px',
            borderBottom: T.borderSoft,
            position: 'sticky',
            top: 0,
            background: 'rgba(8,20,12,0.92)',
            zIndex: 2,
          }}
        >
          <div style={{ fontFamily: T.sans, fontSize: 12, color: T.faint, textTransform: 'uppercase', letterSpacing: 1 }}>
            Child
          </div>
          {headings.map((h) => (
            <div key={h.key} style={{ fontFamily: T.sans, fontSize: 12, color: T.muted, lineHeight: 1.35 }}>
              <span style={{ color: T.faint }}>Work {h.n} ·</span> {h.label}
            </div>
          ))}
          <div style={{ fontFamily: T.sans, fontSize: 12, color: T.faint, textTransform: 'uppercase', letterSpacing: 1 }}>
            This week, in words
          </div>
          <div style={{ fontFamily: T.sans, fontSize: 12, color: T.faint, textTransform: 'uppercase', letterSpacing: 1 }}>
            Weekly plan
          </div>
        </div>

        {roster.length === 0 && (
          <div style={{ padding: '18px 16px', fontFamily: T.sans, fontSize: 13, color: T.muted }}>
            No children in this classroom yet — add students and the week grid fills itself.
          </div>
        )}

        {roster.map((child) => {
          const keys = weekWorkKeys(letter);
          const rowMastered = keys.every((k) => (child.week[k] ?? child.current[k] ?? 'not_started') === 'mastered');
          return (
            <div
              key={child.id}
              style={{
                display: 'grid',
                gridTemplateColumns: `${NAME_COL}px repeat(5, ${WORK_COL}px) 300px 160px`,
                gap: 8,
                padding: '12px 16px',
                borderBottom: T.borderSoft,
                background: rowMastered ? 'rgba(232,201,106,0.07)' : 'transparent',
                borderLeft: rowMastered ? `3px solid ${T.gold}` : '3px solid transparent',
                alignItems: 'start',
              }}
            >
              {/* name + ribbon + flags */}
              <div style={{ minWidth: 0 }}>
                <Link
                  href={`/montree/dashboard/tracker/child/${child.id}`}
                  style={{
                    fontFamily: T.serif,
                    fontSize: 17,
                    color: rowMastered ? T.gold : T.text,
                    textDecoration: 'none',
                    display: 'block',
                    marginBottom: 6,
                    minHeight: 26,
                  }}
                >
                  {child.name}
                </Link>
                {/* He · She. A row still on the 'they' fallback wears the dashed
                    outline the toggle draws — the summary beside it is repeating
                    the child's name until someone taps. */}
                <div style={{ margin: '2px 0 8px' }}>
                  <PronounToggle
                    pronoun={child.pronoun}
                    pronounSet={child.pronoun_set}
                    busy={pending.has(`${child.id}:pronoun`)}
                    childName={child.name}
                    onPick={(p) => onSetPronoun(child, p)}
                  />
                </div>
                <Ribbon ribbon={child.ribbon} highlight={letter} />
                {child.flags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
                    {child.flags.map((f, i) => (
                      <span
                        key={`${f.code}-${i}`}
                        title={f.message}
                        style={{
                          fontFamily: T.sans,
                          fontSize: 11,
                          padding: '5px 9px',
                          borderRadius: 999,
                          background: f.code === 'gap' ? 'rgba(248,113,113,0.14)' : 'rgba(232,201,106,0.13)',
                          border:
                            f.code === 'gap'
                              ? '1px solid rgba(248,113,113,0.45)'
                              : '1px solid rgba(232,201,106,0.40)',
                          color: f.code === 'gap' ? T.danger : T.gold,
                        }}
                      >
                        {f.code === 'no-observation' ? 'no observation' : f.code}
                      </span>
                    ))}
                  </div>
                )}
                {child.flags.length > 0 && (
                  <ul style={{ margin: '6px 0 0', paddingLeft: 16, color: T.faint, fontFamily: T.sans, fontSize: 11.5 }}>
                    {child.flags.map((f, i) => (
                      <li key={`m-${f.code}-${i}`}>{f.message}</li>
                    ))}
                  </ul>
                )}
              </div>

              {/* the five works */}
              {keys.map((key, i) => {
                const status: Status = (child.week[key] ?? child.current[key] ?? 'not_started') as Status;
                const busy = pending.has(`${child.id}:${key}`);
                const canCorrect = status !== 'not_started';
                return (
                  <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <button
                      type="button"
                      onClick={() => onTap(child, key)}
                      disabled={busy}
                      aria-label={`${child.name}, work ${i + 1}, ${STATUS_LABEL[status]}`}
                      style={{
                        ...STATUS_STYLE[status],
                        minHeight: TAP,
                        borderRadius: 10,
                        fontFamily: T.sans,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: busy ? 'wait' : 'pointer',
                        opacity: busy ? 0.6 : 1,
                        padding: '8px 6px',
                      }}
                    >
                      {STATUS_LABEL[status]}
                    </button>
                    <button
                      type="button"
                      onClick={() => onCorrect(child, key)}
                      disabled={!canCorrect}
                      aria-label={`Correct ${child.name}, work ${i + 1}`}
                      style={{
                        minHeight: 32,
                        borderRadius: 8,
                        background: 'transparent',
                        border: '1px solid rgba(255,255,255,0.10)',
                        color: canCorrect ? T.muted : 'rgba(255,255,255,0.18)',
                        fontFamily: T.sans,
                        fontSize: 11,
                        cursor: canCorrect ? 'pointer' : 'not-allowed',
                      }}
                    >
                      Correct
                    </button>
                  </div>
                );
              })}

              {/* summary — read-only, computed, copyable */}
              <div>
                <p style={{ fontFamily: T.sans, fontSize: 13, color: T.text, lineHeight: 1.45, margin: 0 }}>
                  {child.summary?.text || <span style={{ color: T.faint }}>Nothing observed this week.</span>}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                  <button
                    type="button"
                    onClick={() => onCopySummary(child)}
                    style={{
                      minHeight: 34,
                      padding: '6px 12px',
                      borderRadius: 8,
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: T.text,
                      fontFamily: T.sans,
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    {copiedChildId === child.id ? 'Copied' : 'Copy'}
                  </button>
                  <span style={{ fontFamily: T.sans, fontSize: 11, color: T.faint }}>
                    {child.summary?.words ?? 0} words
                  </span>
                </div>
              </div>

              {/* the weekly-plan Language cell, as the plan will print it */}
              <div
                style={{
                  fontFamily: T.sans,
                  fontSize: 13,
                  color: child.plan_cell ? T.text : T.faint,
                  background: 'rgba(255,255,255,0.04)',
                  border: T.borderSoft,
                  borderRadius: 10,
                  padding: '10px 12px',
                  minHeight: TAP,
                }}
              >
                {child.plan_cell || '—'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
