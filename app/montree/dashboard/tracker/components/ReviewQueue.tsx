'use client';

// Section 3 — the review queue. Rule 5: UNKNOWN NAMES NEVER WRITE.
//
// Every entry here is an observation the system kept but refused to file: a
// typed name it could not key with confidence, a photo caption it could not
// match, an AI reading below the bar. The teacher does one of exactly two
// things — say which work it was (search the classroom's own works, tap one),
// or dismiss it. There is no "save as typed": that is how "Blue Series blends"
// became a permanent orphan in the first place.

import { useMemo, useState } from 'react';
import { searchWorks } from './tracker-actions';
import { cardStyle, ctaBtn, ghostBtn, T, TAP } from './theme';
import type { ClassChild, CurriculumWorkRow, QueueItem } from './types';

export default function ReviewQueue({
  queue,
  works,
  roster,
  busyId,
  onResolve,
  onDismiss,
}: {
  queue: QueueItem[];
  works: CurriculumWorkRow[];
  /** The class roster — see the note in WeekGrid on why it is not `children`. */
  roster: ClassChild[];
  busyId: string | null;
  onResolve: (id: string, workKey: string) => void;
  onDismiss: (id: string) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const nameById = useMemo(() => new Map(roster.map((c) => [c.id, c.name])), [roster]);
  const matches = useMemo(() => searchWorks(query, works), [query, works]);

  if (queue.length === 0) {
    return (
      <section style={cardStyle}>
        <h2 style={{ fontFamily: T.serif, fontSize: 19, color: T.text, margin: '0 0 6px' }}>Review queue</h2>
        <p style={{ fontFamily: T.sans, fontSize: 14, color: T.muted, margin: 0 }}>
          Nothing waiting. Every observation this week landed on a known work.
        </p>
      </section>
    );
  }

  return (
    <section style={cardStyle}>
      <h2 style={{ fontFamily: T.serif, fontSize: 19, color: T.text, margin: '0 0 4px' }}>
        Review queue <span style={{ color: T.gold }}>({queue.length})</span>
      </h2>
      <p style={{ fontFamily: T.sans, fontSize: 13, color: T.muted, margin: '0 0 14px' }}>
        Observations kept but not filed — the name did not match one work with confidence. Say which work it was, or dismiss it.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {queue.map((item) => {
          const open = openId === item.id;
          const busy = busyId === item.id;
          return (
            <div
              key={item.id}
              style={{
                border: T.borderSoft,
                borderRadius: 12,
                padding: 12,
                background: 'rgba(255,255,255,0.03)',
              }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                  <div style={{ fontFamily: T.serif, fontSize: 16, color: T.text }}>
                    {nameById.get(item.child_id) ?? 'Unknown child'}
                  </div>
                  <div style={{ fontFamily: T.sans, fontSize: 14, color: T.gold, marginTop: 2 }}>
                    &ldquo;{item.raw_work_name}&rdquo;
                  </div>
                  <div style={{ fontFamily: T.sans, fontSize: 11.5, color: T.faint, marginTop: 2 }}>
                    {item.source ?? 'unknown source'} · {item.created_at?.slice(0, 10)}
                    {item.requested_status ? ` · wanted: ${item.requested_status}` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setOpenId(open ? null : item.id);
                    setQuery('');
                  }}
                  style={{ ...ctaBtn, minHeight: TAP }}
                >
                  {open ? 'Close' : 'Match to a work'}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onDismiss(item.id)}
                  style={{ ...ghostBtn, minHeight: TAP, opacity: busy ? 0.5 : 1 }}
                >
                  Dismiss
                </button>
              </div>

              {open && (
                <div style={{ marginTop: 12 }}>
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search this classroom's works"
                    aria-label="Search classroom works"
                    style={{
                      width: '100%',
                      minHeight: TAP,
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.14)',
                      borderRadius: 10,
                      color: T.text,
                      fontFamily: T.sans,
                      fontSize: 15,
                      padding: '10px 12px',
                    }}
                  />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                    {matches.map((w) => (
                      <button
                        key={w.work_key}
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          onResolve(item.id, w.work_key);
                          setOpenId(null);
                        }}
                        style={{
                          ...ghostBtn,
                          minHeight: TAP,
                          textAlign: 'left',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          gap: 2,
                        }}
                      >
                        <span style={{ fontSize: 14 }}>{w.name}</span>
                        <span style={{ fontSize: 11, color: T.faint }}>{w.work_key}</span>
                      </button>
                    ))}
                    {matches.length === 0 && (
                      <span style={{ fontFamily: T.sans, fontSize: 13, color: T.faint }}>
                        No work in this classroom matches that. Dismiss it, or add the work to the curriculum first.
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
