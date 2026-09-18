// app/montree/super-admin/dark-phonics/page.tsx
//
// "Is the front door working?" — the Dark Phonics hub's last 30 days.
//
// Daily hub views and unique browsers, the open → finish funnel, the top
// lessons, the traffic sources and the latest 50 mailing-list addresses. It
// reads ONE endpoint (/api/montree/super-admin/dark-phonics) which does all the
// aggregation server-side, so this page is a table renderer and nothing more.
//
// The password gate is the same shape as /montree/super-admin/community: the
// password is held in component state and sent as x-super-admin-password on
// every request. It is never stored anywhere.
'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

interface Daily { day: string; views: number; uniques: number }
interface TopLesson { lesson: number; opens: number; dones: number }
interface BySource { source: string; views: number; uniques: number }
interface Lead { email: string; role: string | null; utm: { source?: string | null } | null; created_at: string }

interface Payload {
  ready: boolean;
  days: number;
  daily: Daily[];
  totals: Record<string, number>;
  topLessons: TopLesson[];
  bySource: BySource[];
  leads: Lead[];
}

const FUNNEL: Array<[string, string]> = [
  ['hub_view', 'Hub views'],
  ['unique_browsers', 'Unique browsers'],
  ['lesson_open', 'Lessons opened'],
  ['stage_done', 'Stages finished'],
  ['lesson_done', 'Lessons finished'],
  ['share_open', 'Share card shown'],
  ['share_done', 'Shared'],
  ['lead_submit', 'Emails given'],
  ['community_view', 'Community opened'],
  ['paywall_view', 'Lock seen'],
  ['checkout_start', 'Checkout started'],
  ['subscribe_done', 'Subscribed'],
];

export default function DarkPhonicsAdminPage() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/montree/super-admin/dark-phonics', {
        headers: { 'x-super-admin-password': password },
      });
      if (res.status === 401) {
        setError('Wrong password.');
        setAuthed(false);
        return;
      }
      if (!res.ok) {
        setError('That query failed.');
        return;
      }
      setData((await res.json()) as Payload);
      setAuthed(true);
    } catch {
      setError('Could not reach the server.');
    } finally {
      setLoading(false);
    }
  }, [password]);

  useEffect(() => {
    if (authed) void load();
  }, [authed, load]);

  const peak = Math.max(1, ...(data?.daily ?? []).map((d) => d.views));

  return (
    <main className="dpa2">
      <div className="dpa2-bar">
        <Link href="/montree/super-admin">← Super admin</Link>
        <h1>Dark Phonics · last {data?.days ?? 30} days</h1>
        {authed ? (
          <button type="button" onClick={() => void load()} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        ) : null}
      </div>

      {!authed ? (
        <form
          className="dpa2-gate"
          onSubmit={(e) => {
            e.preventDefault();
            void load();
          }}
        >
          <label htmlFor="dpa2-pw">Super-admin password</label>
          <input
            id="dpa2-pw"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          <button type="submit" disabled={loading || !password}>
            {loading ? 'Checking…' : 'Open'}
          </button>
          {error ? <p className="dpa2-error">{error}</p> : null}
        </form>
      ) : !data ? null : !data.ready ? (
        <p className="dpa2-empty">
          migration 360 has not been run yet, so there is nothing to count. Run
          <code> migrations/360_dark_phonics_hub.sql</code> and come back.
        </p>
      ) : (
        <>
          <section className="dpa2-panel">
            <h2>Funnel</h2>
            <div className="dpa2-tiles">
              {FUNNEL.map(([key, label]) => (
                <div className="dpa2-tile" key={key}>
                  <span className="dpa2-tile-n">{data.totals[key] ?? 0}</span>
                  <span className="dpa2-tile-l">{label}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="dpa2-panel">
            <h2>Daily</h2>
            {data.daily.length === 0 ? (
              <p className="dpa2-empty">No visits yet.</p>
            ) : (
              <table className="dpa2-table">
                <thead>
                  <tr>
                    <th>Day</th>
                    <th>Views</th>
                    <th>Unique</th>
                    <th aria-label="bar" />
                  </tr>
                </thead>
                <tbody>
                  {data.daily.map((d) => (
                    <tr key={d.day}>
                      <td>{d.day}</td>
                      <td>{d.views}</td>
                      <td>{d.uniques}</td>
                      <td>
                        <span className="dpa2-bar-cell" style={{ width: `${(d.views / peak) * 100}%` }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="dpa2-panel">
            <h2>Top lessons</h2>
            {data.topLessons.length === 0 ? (
              <p className="dpa2-empty">Nobody has opened a lesson yet.</p>
            ) : (
              <table className="dpa2-table">
                <thead>
                  <tr>
                    <th>Lesson</th>
                    <th>Opened</th>
                    <th>Finished</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topLessons.map((l) => (
                    <tr key={l.lesson}>
                      <td>{l.lesson}</td>
                      <td>{l.opens}</td>
                      <td>{l.dones}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="dpa2-panel">
            <h2>Where they came from</h2>
            {data.bySource.length === 0 ? (
              <p className="dpa2-empty">No visits yet.</p>
            ) : (
              <table className="dpa2-table">
                <thead>
                  <tr>
                    <th>utm_source</th>
                    <th>Views</th>
                    <th>Unique</th>
                  </tr>
                </thead>
                <tbody>
                  {data.bySource.map((s) => (
                    <tr key={s.source}>
                      <td>{s.source}</td>
                      <td>{s.views}</td>
                      <td>{s.uniques}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="dpa2-panel">
            <h2>Latest emails</h2>
            {data.leads.length === 0 ? (
              <p className="dpa2-empty">Nobody has signed up yet.</p>
            ) : (
              <table className="dpa2-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Source</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {data.leads.map((l) => (
                    <tr key={l.email}>
                      <td>{l.email}</td>
                      <td>{l.role ?? '—'}</td>
                      <td>{l.utm?.source ?? 'direct'}</td>
                      <td>{l.created_at.slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}

      <style jsx global>{`
        .dpa2 {
          min-height: 100dvh;
          background: #06140e;
          color: rgba(255, 250, 240, 0.9);
          padding: 20px 16px 60px;
          font-size: 14px;
        }
        .dpa2-bar {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }
        .dpa2-bar a {
          color: rgba(255, 250, 240, 0.5);
          text-decoration: none;
          min-height: 44px;
          display: inline-flex;
          align-items: center;
        }
        .dpa2-bar h1 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 600;
        }
        .dpa2-bar button,
        .dpa2-gate button {
          appearance: none;
          min-height: 44px;
          padding: 10px 18px;
          border-radius: 999px;
          border: 1px solid rgba(130, 217, 174, 0.4);
          background: rgba(130, 217, 174, 0.14);
          color: #d6f5e6;
          font: inherit;
          cursor: pointer;
        }
        .dpa2-gate {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-width: 320px;
        }
        .dpa2-gate input {
          min-height: 44px;
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: rgba(0, 0, 0, 0.3);
          color: inherit;
          font: inherit;
        }
        .dpa2-panel {
          border: 1px solid rgba(255, 255, 255, 0.09);
          border-radius: 14px;
          padding: 16px;
          margin-bottom: 18px;
          background: rgba(255, 255, 255, 0.02);
        }
        .dpa2-panel h2 {
          margin: 0 0 12px;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: rgba(255, 250, 240, 0.45);
        }
        .dpa2-tiles {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 10px;
        }
        .dpa2-tile {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 12px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.04);
        }
        .dpa2-tile-n {
          font-size: 1.5rem;
          font-weight: 700;
          color: #9fe3c0;
        }
        .dpa2-tile-l {
          font-size: 0.74rem;
          color: rgba(255, 250, 240, 0.5);
        }
        .dpa2-table {
          width: 100%;
          border-collapse: collapse;
        }
        .dpa2-table th,
        .dpa2-table td {
          text-align: left;
          padding: 7px 10px 7px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          font-size: 0.84rem;
        }
        .dpa2-table th {
          color: rgba(255, 250, 240, 0.4);
          font-weight: 500;
        }
        .dpa2-bar-cell {
          display: block;
          height: 8px;
          border-radius: 4px;
          background: rgba(130, 217, 174, 0.5);
          min-width: 2px;
        }
        .dpa2-empty {
          color: rgba(255, 250, 240, 0.45);
          margin: 0;
        }
        .dpa2-error {
          color: #ffb4a8;
        }
        .dpa2 :focus-visible {
          outline: 2px solid #82d9ae;
          outline-offset: 2px;
        }
      `}</style>
    </main>
  );
}
