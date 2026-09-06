'use client';

/**
 * /montree/dashboard/tracker/health — rule 10, on a screen.
 *
 * The same invariants the nightly workflow runs, on demand, for this teacher's
 * school. Either it says "all consistent" or it lists the exact rows and what
 * to do about each.
 *
 * A "Fix" button appears ONLY where a real, safe action exists:
 *   cache-journal-drift   → POST /api/montree/tracking/rebuild for that child.
 *   status-without-event  → run migrations/347_progress_journal_backfill.sql first;
 *                           a rebuild would erase a status the journal cannot prove.
 *                           The journal is the truth; rebuilding the cache from
 *                           it is the whole remedy.
 *   no-observation-10d    → open the child (the fix is a teacher noticing them,
 *                           not a button).
 * Everything else prints the engine's own `fix` sentence. No button invents a
 * key, deletes a row or guesses what a name meant — that is exactly the class of
 * "helpful" repair the constitution exists to forbid.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw } from 'lucide-react';

import { HEALTH_URL } from '../components/tracker-actions';
import { cardStyle, ctaBtn, ghostBtn, T, TAP } from '../components/theme';

interface HealthIssue {
  code: string;
  classroom_id?: string;
  child_id?: string;
  work_key?: string;
  message: string;
  fix?: string;
  severity?: 'error' | 'warning';
}

interface HealthPayload {
  checked_at: string;
  status: string;
  ok: boolean;
  error_count: number;
  warning_count: number;
  classrooms_checked: number;
  issues: HealthIssue[];
}

export default function TrackerHealthPage() {
  const [data, setData] = useState<HealthPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fixing, setFixing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(HEALTH_URL, { credentials: 'include' });
      if (!res.ok) throw new Error(`health ${res.status}`);
      setData((await res.json()) as HealthPayload);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not run the health check');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const rebuild = useCallback(
    async (childId: string) => {
      setFixing(childId);
      try {
        const res = await fetch('/api/montree/tracking/rebuild', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ child_id: childId }),
        });
        if (!res.ok) throw new Error(`rebuild ${res.status}`);
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'The rebuild did not run');
      } finally {
        setFixing(null);
      }
    },
    [load]
  );

  return (
    <main style={{ minHeight: '100dvh', background: T.bg, backgroundImage: T.glow, padding: '16px 16px 64px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link href="/montree/dashboard/tracker" style={{ ...ghostBtn, minHeight: TAP, textDecoration: 'none' }}>
            <ArrowLeft size={16} /> Tracker
          </Link>
          <h1 style={{ fontFamily: T.serif, fontSize: 26, color: T.text, margin: 0, flex: '1 1 auto' }}>Health</h1>
          <button type="button" onClick={() => void load()} style={{ ...ghostBtn, minHeight: TAP }}>
            <RefreshCw size={16} /> Run again
          </button>
        </div>

        {error && (
          <div style={{ ...cardStyle, border: `1px solid ${T.danger}`, color: T.danger, fontFamily: T.sans }}>{error}</div>
        )}
        {loading && !data && <div style={{ ...cardStyle, fontFamily: T.sans, color: T.muted }}>Checking…</div>}

        {data && (
          <>
            <section style={cardStyle}>
              <div style={{ fontFamily: T.serif, fontSize: 24, color: data.ok ? T.emerald : T.gold }}>
                {data.error_count === 0 && data.warning_count === 0 ? 'All consistent' : data.status}
              </div>
              <div style={{ fontFamily: T.sans, fontSize: 13, color: T.muted, marginTop: 6 }}>
                {data.classrooms_checked} classroom(s) · checked {new Date(data.checked_at).toLocaleString()}
              </div>
              <p style={{ fontFamily: T.sans, fontSize: 12.5, color: T.faint, marginTop: 10, marginBottom: 0 }}>
                The same checks run every night at 20:00 UTC (.github/workflows/tracking-health.yml). An error there fails
                the job; a warning does not.
              </p>
            </section>

            {data.issues.length === 0 ? (
              <section style={cardStyle}>
                <p style={{ fontFamily: T.sans, fontSize: 15, color: T.text, margin: 0 }}>
                  Nothing to fix. Every status has an event behind it, every event has a key, and no child has been
                  unseen for ten days.
                </p>
              </section>
            ) : (
              <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {data.issues.map((issue, i) => {
                  const isError = (issue.severity ?? 'error') === 'error';
                  return (
                    <div
                      key={`${issue.code}-${i}`}
                      style={{
                        ...cardStyle,
                        borderLeft: `3px solid ${isError ? T.danger : T.gold}`,
                      }}
                    >
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                        <span
                          style={{
                            fontFamily: T.sans,
                            fontSize: 11,
                            textTransform: 'uppercase',
                            letterSpacing: 1,
                            color: isError ? T.danger : T.gold,
                          }}
                        >
                          {isError ? 'error' : 'warning'} · {issue.code}
                        </span>
                        {issue.work_key && (
                          <span style={{ fontFamily: T.sans, fontSize: 11.5, color: T.faint }}>{issue.work_key}</span>
                        )}
                      </div>
                      <p style={{ fontFamily: T.sans, fontSize: 14.5, color: T.text, margin: '8px 0 6px' }}>
                        {issue.message}
                      </p>
                      {issue.fix && (
                        <p style={{ fontFamily: T.sans, fontSize: 13, color: T.muted, margin: '0 0 10px' }}>{issue.fix}</p>
                      )}

                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {issue.code === 'cache-journal-drift' && issue.child_id && (
                          <button
                            type="button"
                            disabled={fixing === issue.child_id}
                            onClick={() => void rebuild(issue.child_id as string)}
                            style={{ ...ctaBtn, minHeight: TAP }}
                          >
                            {fixing === issue.child_id ? 'Rebuilding…' : 'Fix — rebuild from the journal'}
                          </button>
                        )}
                        {issue.child_id && (
                          <Link
                            href={`/montree/dashboard/tracker/child/${issue.child_id}`}
                            style={{ ...ghostBtn, minHeight: TAP, textDecoration: 'none' }}
                          >
                            Open the child
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
