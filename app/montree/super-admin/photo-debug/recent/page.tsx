// /montree/super-admin/photo-debug/recent/page.tsx
//
// Session 113 V2 — photo-debug recent decisions view.
// Top-down look at the last 50 pipeline decisions across all schools.
// Filter by outcome / decision / school. Drill in to /[mediaId] for the
// full per-photo detail page.

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const C = {
  bg: '#0a1a0f',
  cardBg: 'rgba(8,20,12,0.55)',
  cardBgStrong: 'rgba(8,20,12,0.85)',
  border: '1px solid rgba(52,211,153,0.18)',
  emerald: '#34d399',
  emeraldDim: 'rgba(52,211,153,0.65)',
  gold: '#E8C96A',
  red: '#f87171',
  amber: '#fbbf24',
  textPrimary: 'rgba(255,255,255,0.92)',
  textSecondary: 'rgba(255,255,255,0.62)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: 'var(--font-lora), Georgia, serif',
  mono: '"SF Mono", Menlo, Monaco, monospace',
  inputBg: 'rgba(0,0,0,0.30)',
  inputBorder: '1px solid rgba(52,211,153,0.25)',
};

const OUTCOME_COLOR: Record<string, string> = {
  haiku_matched: C.emerald,
  haiku_drafted: C.amber,
  sonnet_drafted: C.gold,
  confirmed: C.emerald,
  failed: C.red,
  pass1_failed: C.red,
  pending: 'rgba(255,255,255,0.50)',
};

interface RecentResponse {
  rows: Array<{
    id: number;
    media_id: string | null;
    school_id: string | null;
    classroom_id: string | null;
    school_name: string | null;
    classroom_name: string | null;
    outcome: string | null;
    decision: string | null;
    pass1_failed: boolean | null;
    pass1_description_len: number | null;
    pass2_success: boolean | null;
    pass2_confidence: number | null;
    pass2_work_name: string | null;
    pass2_haiku_raw_work_name: string | null;
    pass2_match_score: number | null;
    pass2_area: string | null;
    has_visual_memory_for_match: boolean | null;
    visual_memory_set_size: number | null;
    pass2b_fired: boolean | null;
    pass2b_improved: boolean | null;
    auto_sonnet_queued: boolean | null;
    haiku_trust_confidence_threshold: number | null;
    errors: string[] | null;
    created_at: string;
  }>;
  telemetry_missing_table: boolean;
  total_returned: number;
  limit: number;
  outcome_summary: Record<string, number>;
  summary_window: number;
  filters: { outcome: string | null; decision: string | null; school_id: string | null };
  fetched_at: string;
}

export default function PhotoDebugRecent() {
  const router = useRouter();

  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [data, setData] = useState<RecentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [outcomeFilter, setOutcomeFilter] = useState('');
  const [decisionFilter, setDecisionFilter] = useState('');

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? sessionStorage.getItem('sa_pwd') : '';
    if (saved) {
      setPassword(saved);
      setAuthenticated(true);
    }
  }, []);

  const fetchData = useCallback(async () => {
    if (!authenticated) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (outcomeFilter) params.set('outcome', outcomeFilter);
      if (decisionFilter) params.set('decision', decisionFilter);
      params.set('limit', '50');
      const res = await fetch(`/api/montree/super-admin/photo-debug/recent?${params.toString()}`, {
        headers: { 'x-super-admin-password': password },
      });
      if (!res.ok) {
        if (res.status === 401) {
          setAuthenticated(false);
          sessionStorage.removeItem('sa_pwd');
          setError('Session expired. Re-enter password.');
        } else {
          const body = await res.json().catch(() => ({}));
          setError(`Fetch failed: ${(body as { error?: string }).error || res.statusText}`);
        }
        setData(null);
        return;
      }
      const j = (await res.json()) as RecentResponse;
      setData(j);
    } catch (e) {
      setError(`Network: ${e instanceof Error ? e.message : 'unknown'}`);
    } finally {
      setLoading(false);
    }
  }, [authenticated, outcomeFilter, decisionFilter, password]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!authenticated) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textPrimary, fontFamily: 'Inter, sans-serif' }}>
        <div style={{ maxWidth: 360, width: '100%', padding: 28, background: C.cardBg, border: C.border, borderRadius: 12 }}>
          <h2 style={{ fontFamily: C.serif, fontSize: 22, margin: '0 0 16px', color: C.emerald }}>Photo Debug — Recent</h2>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={async e => {
              if (e.key === 'Enter') {
                const res = await fetch('/api/montree/super-admin/auth', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }),
                });
                if (res.ok) { sessionStorage.setItem('sa_pwd', password); setAuthenticated(true); }
              }
            }}
            placeholder="Super-admin password"
            style={{ width: '100%', padding: '10px 12px', background: C.inputBg, border: C.inputBorder, borderRadius: 6, color: C.textPrimary, fontSize: 14 }}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.textPrimary, fontFamily: 'Inter, sans-serif', padding: 28 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 22px' }}>
          <button onClick={() => router.push('/montree/super-admin/photo-debug')} style={{ background: 'transparent', border: '1px solid rgba(52,211,153,0.30)', color: C.emeraldDim, padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>← Search by id</button>
          <button onClick={fetchData} disabled={loading} style={{ background: C.emerald, color: C.bg, border: 'none', padding: '8px 18px', borderRadius: 6, cursor: loading ? 'wait' : 'pointer', fontWeight: 600, fontSize: 13, opacity: loading ? 0.5 : 1 }}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        <h1 style={{ fontFamily: C.serif, fontSize: 30, color: C.emerald, margin: '0 0 6px', letterSpacing: -0.4 }}>Recent decisions</h1>
        <p style={{ fontSize: 13, color: C.textSecondary, margin: '0 0 24px' }}>
          The last 50 pipeline Gate-A decisions across all schools. Tap any row to drill into the per-photo debug page.
        </p>

        {error && (
          <div style={{ padding: 20, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, color: C.red, marginBottom: 18 }}>
            {error}
          </div>
        )}

        {data?.telemetry_missing_table && (
          <div style={{ padding: 20, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 8, color: C.amber, marginBottom: 18 }}>
            <b>Migration 211 hasn&apos;t run yet.</b> The <code>montree_pipeline_telemetry</code> table doesn&apos;t exist on this DB. Run <code>migrations/211_pipeline_telemetry.sql</code> in the Supabase SQL Editor — every Gate-A decision from that point onwards will appear here.
          </div>
        )}

        {data && !data.telemetry_missing_table && Object.keys(data.outcome_summary).length > 0 && (
          <div style={{ background: C.cardBg, border: C.border, borderRadius: 10, padding: 16, marginBottom: 18 }}>
            <div style={{ fontSize: 11, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>
              Outcome summary (last {data.summary_window} decisions)
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {Object.entries(data.outcome_summary).sort((a, b) => b[1] - a[1]).map(([outcome, count]) => (
                <button
                  key={outcome}
                  onClick={() => setOutcomeFilter(outcome === outcomeFilter ? '' : outcome)}
                  style={{
                    padding: '6px 12px',
                    background: outcomeFilter === outcome ? OUTCOME_COLOR[outcome] || C.textMuted : 'rgba(0,0,0,0.30)',
                    border: `1px solid ${OUTCOME_COLOR[outcome] || C.textMuted}`,
                    color: outcomeFilter === outcome ? C.bg : OUTCOME_COLOR[outcome] || C.textPrimary,
                    borderRadius: 4,
                    fontSize: 12,
                    fontFamily: C.mono,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {outcome} <span style={{ opacity: 0.7 }}>×{count}</span>
                </button>
              ))}
              {outcomeFilter && (
                <button
                  onClick={() => setOutcomeFilter('')}
                  style={{ padding: '6px 12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.20)', color: C.textMuted, borderRadius: 4, fontSize: 12, cursor: 'pointer' }}
                >
                  clear filter
                </button>
              )}
            </div>
          </div>
        )}

        {data && data.rows.length === 0 && !data.telemetry_missing_table && (
          <div style={{ padding: 32, background: C.cardBg, border: C.border, borderRadius: 10, textAlign: 'center', color: C.textMuted, fontStyle: 'italic' }}>
            No telemetry rows yet{outcomeFilter || decisionFilter ? ' for this filter' : ''}. The pipeline will start filling this in as photos are processed.
          </div>
        )}

        {data && data.rows.length > 0 && (
          <div style={{ background: C.cardBg, border: C.border, borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'Inter, sans-serif' }}>
              <thead style={{ background: 'rgba(0,0,0,0.3)' }}>
                <tr style={{ textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px', color: C.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, fontSize: 11 }}>When</th>
                  <th style={{ padding: '10px 12px', color: C.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, fontSize: 11 }}>Outcome</th>
                  <th style={{ padding: '10px 12px', color: C.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, fontSize: 11 }}>Work</th>
                  <th style={{ padding: '10px 12px', color: C.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, fontSize: 11 }}>Conf</th>
                  <th style={{ padding: '10px 12px', color: C.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, fontSize: 11 }}>VM</th>
                  <th style={{ padding: '10px 12px', color: C.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, fontSize: 11 }}>Pass2b</th>
                  <th style={{ padding: '10px 12px', color: C.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, fontSize: 11 }}>School / Classroom</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map(row => {
                  const outcomeColor = OUTCOME_COLOR[row.outcome || ''] || C.textMuted;
                  const confidence = row.pass2_confidence !== null ? row.pass2_confidence : null;
                  const matched = row.pass2_work_name && row.pass2_haiku_raw_work_name &&
                    row.pass2_work_name.toLowerCase() !== row.pass2_haiku_raw_work_name.toLowerCase();
                  return (
                    <tr
                      key={row.id}
                      onClick={() => row.media_id && router.push(`/montree/super-admin/photo-debug/${row.media_id}`)}
                      style={{
                        borderTop: '1px solid rgba(255,255,255,0.04)',
                        cursor: row.media_id ? 'pointer' : 'default',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(52,211,153,0.06)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
                    >
                      <td style={{ padding: '10px 12px', color: C.textSecondary, fontFamily: C.mono, fontSize: 11, whiteSpace: 'nowrap' }}>
                        {row.created_at.replace('T', ' ').slice(0, 19)}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ display: 'inline-block', padding: '2px 8px', background: 'rgba(0,0,0,0.30)', border: `1px solid ${outcomeColor}`, color: outcomeColor, borderRadius: 3, fontSize: 11, fontFamily: C.mono, fontWeight: 600 }}>
                          {row.outcome || 'null'}
                        </span>
                        {row.decision && row.decision !== row.outcome && (
                          <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>decision: {row.decision}</div>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', color: C.textPrimary, fontSize: 12 }}>
                        {row.pass2_work_name || <span style={{ color: C.textMuted }}>—</span>}
                        {matched && row.pass2_haiku_raw_work_name && (
                          <div style={{ fontSize: 10, color: C.amber, marginTop: 2 }}>raw: {row.pass2_haiku_raw_work_name}</div>
                        )}
                        {row.pass2_area && (
                          <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>{row.pass2_area}</div>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', color: C.textSecondary, fontFamily: C.mono, fontSize: 11 }}>
                        {confidence !== null ? confidence.toFixed(3) : <span style={{ color: C.textMuted }}>—</span>}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', fontFamily: C.mono, fontSize: 11 }}>
                        {row.has_visual_memory_for_match
                          ? <span style={{ color: C.emerald, fontWeight: 600 }}>✓</span>
                          : <span style={{ color: C.textMuted }}>—</span>}
                        <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>{row.visual_memory_set_size ?? '?'} set</div>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', fontFamily: C.mono, fontSize: 11 }}>
                        {row.pass2b_fired
                          ? <span style={{ color: row.pass2b_improved ? C.gold : C.amber, fontWeight: 600 }}>
                              {row.pass2b_improved ? '✓→' : '✓'}
                            </span>
                          : <span style={{ color: C.textMuted }}>—</span>}
                      </td>
                      <td style={{ padding: '10px 12px', color: C.textSecondary, fontSize: 11 }}>
                        {row.school_name ? <div>{row.school_name}</div> : <div style={{ color: C.textMuted }}>—</div>}
                        {row.classroom_name && <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>{row.classroom_name}</div>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {data && (
          <p style={{ fontSize: 10, color: C.textMuted, fontFamily: C.mono, textAlign: 'center', margin: '20px 0' }}>
            {data.total_returned} of {data.limit} rows · fetched {new Date(data.fetched_at).toISOString().replace('T', ' ').slice(0, 19)}
          </p>
        )}

      </div>
    </div>
  );
}
