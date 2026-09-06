'use client';

// Section 2 — the Writing Shelf, trays 1 to 8.
//
// The shelf is taught in three states, and those are the words on the buttons:
// PRESENTED (shown to the child), PRACTISING (the child is working at it),
// INDEPENDENT (the child takes it out and does it alone). They are the SAME
// ladder as everywhere else — presented / practicing / mastered — because rule 1
// allows exactly one vocabulary underneath. Only the label changes, never the
// key and never the rung.
//
// Tray names come from the classroom curriculum rows the API sends; a missing
// name falls back to "Tray N" rather than inventing one.

import { SHELF_LABEL } from './tracker-actions';
import { cardStyle, STATUS_STYLE, T, TAP } from './theme';
import type { ClassChild, CurriculumWorkRow, Status } from './types';

export const SHELF_TRAYS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
export const shelfKey = (n: number) => `ws:${n}`;

export function trayName(works: readonly CurriculumWorkRow[], n: number): string {
  const row = works.find((w) => w.work_key === shelfKey(n));
  if (!row) return `Tray ${n}`;
  // Real rows (migration 346) carry the material in `description` and keep the
  // name canonical ("Writing Shelf tray 3"). Older rows packed both into the
  // name ("Writing Shelf tray 3 — Metal insets"), so the split is the fallback.
  const description = (row.description ?? '').trim();
  if (description) return description;
  const dash = row.name.split(/\s+[—-]\s+/);
  return dash.length > 1 ? dash.slice(1).join(' — ') : row.name;
}

export default function ShelfSection({
  roster,
  works,
  pending,
  onTap,
  onCorrect,
}: {
  /** The class roster — see the note in WeekGrid on why it is not `children`. */
  roster: ClassChild[];
  works: CurriculumWorkRow[];
  pending: Set<string>;
  onTap: (child: ClassChild, workKey: string) => void;
  onCorrect: (child: ClassChild, workKey: string) => void;
}) {
  return (
    <section style={{ ...cardStyle, padding: 0, overflowX: 'auto' }}>
      <div style={{ minWidth: 200 + 8 * 116 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `200px repeat(8, 116px)`,
            gap: 8,
            padding: '14px 16px 10px',
            borderBottom: T.borderSoft,
          }}
        >
          <div style={{ fontFamily: T.sans, fontSize: 12, color: T.faint, textTransform: 'uppercase', letterSpacing: 1 }}>
            Child
          </div>
          {SHELF_TRAYS.map((n) => (
            <div key={n} style={{ fontFamily: T.sans, fontSize: 12, color: T.muted, lineHeight: 1.35 }}>
              <span style={{ color: T.faint }}>Tray {n} ·</span> {trayName(works, n)}
            </div>
          ))}
        </div>

        {roster.map((child) => (
          <div
            key={child.id}
            style={{
              display: 'grid',
              gridTemplateColumns: `200px repeat(8, 116px)`,
              gap: 8,
              padding: '10px 16px',
              borderBottom: T.borderSoft,
              alignItems: 'start',
            }}
          >
            <div style={{ fontFamily: T.serif, fontSize: 16, color: T.text, paddingTop: 8 }}>{child.name}</div>
            {SHELF_TRAYS.map((n) => {
              const key = shelfKey(n);
              const status: Status = (child.current[key] ?? 'not_started') as Status;
              const busy = pending.has(`${child.id}:${key}`);
              return (
                <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <button
                    type="button"
                    onClick={() => onTap(child, key)}
                    disabled={busy}
                    aria-label={`${child.name}, writing shelf tray ${n}, ${SHELF_LABEL[status]}`}
                    style={{
                      ...STATUS_STYLE[status],
                      minHeight: TAP,
                      borderRadius: 10,
                      fontFamily: T.sans,
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: busy ? 'wait' : 'pointer',
                      opacity: busy ? 0.6 : 1,
                      padding: '8px 6px',
                    }}
                  >
                    {SHELF_LABEL[status]}
                  </button>
                  <button
                    type="button"
                    onClick={() => onCorrect(child, key)}
                    disabled={status === 'not_started'}
                    style={{
                      minHeight: 30,
                      borderRadius: 8,
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.10)',
                      color: status === 'not_started' ? 'rgba(255,255,255,0.18)' : T.muted,
                      fontFamily: T.sans,
                      fontSize: 11,
                      cursor: status === 'not_started' ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Correct
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
