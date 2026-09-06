'use client';

/**
 * /montree/dashboard/tracker/child/[childId] — one child, in full.
 *
 * The big ribbon (every letter, its state), the five works of every letter the
 * child has touched, the Writing Shelf trays, and the JOURNAL: the last 200
 * events with their source, actor and — for a correction — the reason it came
 * down. Rule 3 says the journal is the truth; this page is the only screen that
 * shows it raw, because a teacher asking "why does it say that?" deserves the
 * actual row rather than a summary of it.
 *
 * Read-only by design. Ticking happens on the class screen, where the teacher
 * is looking at the whole room; this page is for reading one child's history.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { getSession, isHomeschoolParent } from '@/lib/montree/auth';
import { TRACKER_LETTERS } from '@/lib/montree/dark-phonics/tracker-works';

import Ribbon from '../../components/Ribbon';
import { SHELF_TRAYS, shelfKey } from '../../components/ShelfSection';
import { CHILD_URL, SHELF_LABEL, STATUS_LABEL } from '../../components/tracker-actions';
import { cardStyle, ghostBtn, STATUS_STYLE, T, TAP } from '../../components/theme';
import type { ChildResponse, Status } from '../../components/types';

export default function TrackerChildPage() {
  const router = useRouter();
  const params = useParams<{ childId: string }>();
  const childId = params?.childId;
  const [data, setData] = useState<ChildResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sess = getSession();
    if (!sess) { router.push('/montree/login'); return; }
    if (isHomeschoolParent(sess)) { router.push('/montree/dashboard'); }
  }, [router]);

  const load = useCallback(async () => {
    if (!childId) return;
    setLoading(true);
    try {
      const res = await fetch(`${CHILD_URL}?child_id=${encodeURIComponent(childId)}`, { credentials: 'include' });
      if (!res.ok) throw new Error(`child ${res.status}`);
      setData((await res.json()) as ChildResponse);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load this child');
    } finally {
      setLoading(false);
    }
  }, [childId]);

  useEffect(() => { void load(); }, [load]);

  const current = data?.current ?? {};
  const touched = TRACKER_LETTERS.filter((l) => {
    const state = data?.ribbon?.[l.letter];
    return state === 'mastered' || state === 'in-progress' || l.status === 'live';
  });

  return (
    <main style={{ minHeight: '100dvh', background: T.bg, backgroundImage: T.glow, padding: '16px 16px 64px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link href="/montree/dashboard/tracker" style={{ ...ghostBtn, minHeight: TAP, textDecoration: 'none' }}>
            <ArrowLeft size={16} /> Tracker
          </Link>
          <h1 style={{ fontFamily: T.serif, fontSize: 26, color: T.text, margin: 0 }}>
            {data?.child?.name || 'Child'}
          </h1>
        </div>

        {error && (
          <div style={{ ...cardStyle, border: `1px solid ${T.danger}`, color: T.danger, fontFamily: T.sans }}>{error}</div>
        )}
        {loading && !data && <div style={{ ...cardStyle, fontFamily: T.sans, color: T.muted }}>Reading the journal…</div>}

        {data && (
          <>
            <section style={cardStyle}>
              <h2 style={{ fontFamily: T.serif, fontSize: 19, color: T.text, margin: '0 0 12px' }}>The ribbon</h2>
              <Ribbon ribbon={data.ribbon ?? {}} size="big" />
              <p style={{ fontFamily: T.sans, fontSize: 12, color: T.faint, marginTop: 10 }}>
                Gold: all five works of that letter are mastered. Emerald: started. Dashed: the book is not published yet.
              </p>
            </section>

            {data.summary?.text && (
              <section style={cardStyle}>
                <h2 style={{ fontFamily: T.serif, fontSize: 19, color: T.text, margin: '0 0 8px' }}>This week, in words</h2>
                <p style={{ fontFamily: T.sans, fontSize: 15, color: T.text, margin: 0, lineHeight: 1.5 }}>
                  {data.summary.text}
                </p>
              </section>
            )}

            {data.flags?.length > 0 && (
              <section style={cardStyle}>
                <h2 style={{ fontFamily: T.serif, fontSize: 19, color: T.text, margin: '0 0 8px' }}>Flags</h2>
                <ul style={{ margin: 0, paddingLeft: 18, color: T.gold, fontFamily: T.sans, fontSize: 14 }}>
                  {data.flags.map((f, i) => (
                    <li key={`${f.code}-${i}`} style={{ marginBottom: 4 }}>{f.message}</li>
                  ))}
                </ul>
              </section>
            )}

            <section style={cardStyle}>
              <h2 style={{ fontFamily: T.serif, fontSize: 19, color: T.text, margin: '0 0 12px' }}>Every letter, work by work</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {touched.map((l) => (
                  <div key={l.letter} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                    <div style={{ width: 150, fontFamily: T.serif, fontSize: 16, color: T.text }}>
                      <span style={{ color: T.gold }}>{l.letter}</span>{' '}
                      <span style={{ fontFamily: T.sans, fontSize: 12, color: T.faint }}>{l.bookTitle}</span>
                    </div>
                    {l.works.map((w) => {
                      const status = (current[w.id] ?? 'not_started') as Status;
                      return (
                        <div
                          key={w.id}
                          title={`${w.name} · ${STATUS_LABEL[status]}`}
                          style={{
                            ...STATUS_STYLE[status],
                            minWidth: 116,
                            minHeight: 44,
                            borderRadius: 10,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            padding: '6px 10px',
                            fontFamily: T.sans,
                            fontSize: 12,
                          }}
                        >
                          <span style={{ opacity: 0.75 }}>Work {w.n} · {w.shortLabel}</span>
                          <strong style={{ fontSize: 12.5 }}>{STATUS_LABEL[status]}</strong>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </section>

            <section style={cardStyle}>
              <h2 style={{ fontFamily: T.serif, fontSize: 19, color: T.text, margin: '0 0 12px' }}>Writing Shelf</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {SHELF_TRAYS.map((n) => {
                  const status = ((data.shelf?.[shelfKey(n)] ?? current[shelfKey(n)] ?? 'not_started') as Status);
                  return (
                    <div
                      key={n}
                      style={{
                        ...STATUS_STYLE[status],
                        minWidth: 120,
                        minHeight: 52,
                        borderRadius: 10,
                        padding: '8px 10px',
                        fontFamily: T.sans,
                        fontSize: 12.5,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                      }}
                    >
                      <span style={{ opacity: 0.75 }}>Tray {n}</span>
                      <strong>{SHELF_LABEL[status]}</strong>
                    </div>
                  );
                })}
              </div>
            </section>

            <section style={{ ...cardStyle, padding: 0 }}>
              <h2 style={{ fontFamily: T.serif, fontSize: 19, color: T.text, margin: 0, padding: '16px 16px 10px' }}>
                The journal <span style={{ fontFamily: T.sans, fontSize: 13, color: T.faint }}>(last {data.events?.length ?? 0})</span>
              </h2>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 720 }}>
                  <thead>
                    <tr>
                      {['When', 'Work', 'Change', 'Source', 'Who', 'Reason'].map((h) => (
                        <th
                          key={h}
                          style={{
                            textAlign: 'left',
                            fontFamily: T.sans,
                            fontSize: 11,
                            color: T.faint,
                            textTransform: 'uppercase',
                            letterSpacing: 1,
                            padding: '8px 16px',
                            borderBottom: T.borderSoft,
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(data.events ?? []).map((e, i) => (
                      <tr key={`${e.created_at}-${i}`} style={{ borderBottom: T.borderSoft }}>
                        <td style={cell}>{e.created_at?.slice(0, 10)}</td>
                        <td style={cell}>{e.work_key ?? <span style={{ color: T.danger }}>no key</span>} <span style={{ color: T.faint }}>{e.work_name}</span></td>
                        <td style={cell}>
                          {e.advanced === false ? (
                            <span style={{ color: T.muted }}>seen again at {STATUS_LABEL[e.new_status].toLowerCase()}</span>
                          ) : (
                            <>
                              {(e.old_status ? STATUS_LABEL[e.old_status] : '—')} →{' '}
                              <strong style={{ color: e.source === 'correction' ? T.danger : T.emerald }}>
                                {STATUS_LABEL[e.new_status]}
                              </strong>
                            </>
                          )}
                        </td>
                        <td style={cell}>{e.source}</td>
                        <td style={cell}>{e.actor ?? '—'}</td>
                        <td style={cell}>{e.reason ?? '—'}</td>
                      </tr>
                    ))}
                    {(data.events ?? []).length === 0 && (
                      <tr>
                        <td style={{ ...cell, color: T.faint }} colSpan={6}>Nothing recorded yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

const cell = {
  fontFamily: T.sans,
  fontSize: 13,
  color: T.text,
  padding: '9px 16px',
  verticalAlign: 'top' as const,
};
