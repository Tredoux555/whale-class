// /montree/super-admin/photo-debug/[mediaId]/page.tsx
//
// Audit rec #4 (Session 113 photo pipeline audit) — detail view.
// All-in-one read-only debug for a single photo. Renders:
//   - Photo + status header
//   - Child + classroom + school context
//   - sonnet_draft JSONB (raw)
//   - Telemetry timeline (every Gate A decision)
//   - Visual memory currently injectable for this classroom
// Read-only. Mutations are out of scope — the audit page is where
// teachers action photos.

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

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

interface DebugResponse {
  media: {
    id: string;
    school_id: string | null;
    classroom_id: string | null;
    child_id: string | null;
    storage_path: string | null;
    media_type: string | null;
    identification_status: string | null;
    identification_confidence: number | null;
    identification_attempted_at: string | null;
    sonnet_draft: Record<string, unknown> | null;
    work_id: string | null;
    teacher_confirmed: boolean | null;
    captured_at: string | null;
    created_at: string | null;
    updated_at: string | null;
  };
  photoUrl: string | null;
  child: { id: string; name: string | null; birthdate: string | null } | null;
  classroom: { id: string; name: string | null } | null;
  school: { id: string; name: string | null } | null;
  work: { id: string; name: string | null; work_key: string | null; is_custom: boolean | null; area: { area_key: string } | null } | null;
  telemetry: Array<Record<string, unknown>>;
  telemetry_missing_table: boolean;
  visual_memory: Array<{
    work_name: string;
    visual_description: string | null;
    key_materials: string[] | null;
    negative_descriptions: string[] | null;
    description_confidence: number | null;
    source: string | null;
    is_custom: boolean | null;
    updated_at: string | null;
  }>;
  visual_memory_total: number;
  fetched_at: string;
}

const STATUS_COLOR: Record<string, string> = {
  haiku_matched: C.emerald,
  haiku_drafted: C.amber,
  sonnet_drafted: C.gold,
  confirmed: C.emerald,
  failed: C.red,
  pending: 'rgba(255,255,255,0.50)',
  pending_review: 'rgba(255,255,255,0.50)',
  skipped: 'rgba(255,255,255,0.40)',
};

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ background: C.cardBg, border: C.border, borderRadius: 10, padding: 20, marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 14px' }}>
        <h3 style={{ fontFamily: C.serif, fontSize: 18, color: C.emerald, margin: 0 }}>{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function KV({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', padding: '6px 0', borderBottom: '1px dashed rgba(255,255,255,0.05)' }}>
      <div style={{ fontSize: 11, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, minWidth: 180, fontFamily: 'Inter, sans-serif' }}>{label}</div>
      <div style={{ fontSize: 13, color: C.textPrimary, fontFamily: mono ? C.mono : 'Inter, sans-serif', wordBreak: 'break-all' }}>{value ?? <span style={{ color: C.textMuted }}>—</span>}</div>
    </div>
  );
}

export default function PhotoDebugDetail() {
  const params = useParams();
  const router = useRouter();
  const mediaId = typeof params.mediaId === 'string' ? params.mediaId : '';

  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [data, setData] = useState<DebugResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? sessionStorage.getItem('sa_pwd') : '';
    if (saved) {
      setPassword(saved);
      setAuthenticated(true);
    }
  }, []);

  const fetchData = useCallback(async () => {
    if (!authenticated || !mediaId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/montree/super-admin/photo-debug/${mediaId}`, {
        headers: { 'x-super-admin-password': password },
      });
      if (!res.ok) {
        if (res.status === 404) {
          setError(`Media id ${mediaId} not found.`);
        } else if (res.status === 401) {
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
      const j = (await res.json()) as DebugResponse;
      setData(j);
    } catch (e) {
      setError(`Network: ${e instanceof Error ? e.message : 'unknown'}`);
    } finally {
      setLoading(false);
    }
  }, [authenticated, mediaId, password]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!authenticated) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textPrimary, fontFamily: 'Inter, sans-serif' }}>
        <div style={{ maxWidth: 360, width: '100%', padding: 28, background: C.cardBg, border: C.border, borderRadius: 12 }}>
          <h2 style={{ fontFamily: C.serif, fontSize: 22, margin: '0 0 16px', color: C.emerald }}>Photo Debug</h2>
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

  const statusColor = data ? (STATUS_COLOR[data.media.identification_status || ''] || C.textMuted) : C.textMuted;

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.textPrimary, fontFamily: 'Inter, sans-serif', padding: 28 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 22px' }}>
          <button onClick={() => router.push('/montree/super-admin/photo-debug')} style={{ background: 'transparent', border: '1px solid rgba(52,211,153,0.30)', color: C.emeraldDim, padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>← Search another</button>
          <button onClick={fetchData} disabled={loading} style={{ background: C.emerald, color: C.bg, border: 'none', padding: '8px 18px', borderRadius: 6, cursor: loading ? 'wait' : 'pointer', fontWeight: 600, fontSize: 13, opacity: loading ? 0.5 : 1 }}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        <h1 style={{ fontFamily: C.serif, fontSize: 30, color: C.emerald, margin: '0 0 6px', letterSpacing: -0.4 }}>Photo Debug</h1>
        <p style={{ fontSize: 12, color: C.textMuted, fontFamily: C.mono, margin: '0 0 24px', wordBreak: 'break-all' }}>{mediaId}</p>

        {error && (
          <div style={{ padding: 20, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, color: C.red, marginBottom: 18 }}>
            {error}
          </div>
        )}

        {data && (
          <>
            {/* PHOTO + STATUS */}
            <Section title="Photo + status">
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,340px) 1fr', gap: 20 }}>
                {data.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={data.photoUrl} alt="Photo" style={{ width: '100%', height: 'auto', maxHeight: 340, objectFit: 'contain', borderRadius: 6, background: 'rgba(0,0,0,0.4)' }} />
                ) : (
                  <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: 6, padding: 60, textAlign: 'center', color: C.textMuted, fontSize: 12 }}>no storage_path</div>
                )}
                <div>
                  <div style={{ marginBottom: 14 }}>
                    <span style={{ display: 'inline-block', padding: '4px 12px', background: 'rgba(0,0,0,0.4)', border: `1px solid ${statusColor}`, color: statusColor, borderRadius: 4, fontSize: 12, fontFamily: C.mono, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                      {data.media.identification_status || 'null'}
                    </span>
                    {data.media.teacher_confirmed && (
                      <span style={{ marginLeft: 8, padding: '4px 10px', background: 'rgba(52,211,153,0.15)', color: C.emerald, borderRadius: 4, fontSize: 11, fontWeight: 600 }}>✓ teacher confirmed</span>
                    )}
                  </div>
                  <KV label="confidence" value={data.media.identification_confidence?.toFixed(3) ?? null} mono />
                  <KV label="captured_at" value={data.media.captured_at?.replace('T', ' ').slice(0, 19) ?? null} mono />
                  <KV label="attempted_at" value={data.media.identification_attempted_at?.replace('T', ' ').slice(0, 19) ?? null} mono />
                  <KV label="work_id" value={data.media.work_id ?? null} mono />
                  <KV label="work" value={data.work ? `${data.work.name}${data.work.is_custom ? ' (custom)' : ''} · ${data.work.area?.area_key || '?'}` : null} />
                  <KV label="school" value={data.school?.name ?? null} />
                  <KV label="classroom" value={data.classroom?.name ?? null} />
                  <KV label="child" value={data.child?.name ?? null} />
                </div>
              </div>
            </Section>

            {/* SONNET DRAFT JSONB */}
            <Section title="sonnet_draft (raw JSONB)">
              {data.media.sonnet_draft ? (
                <pre style={{ background: C.cardBgStrong, padding: 14, borderRadius: 6, fontSize: 11, fontFamily: C.mono, lineHeight: 1.55, color: C.textSecondary, overflow: 'auto', maxHeight: 480 }}>
                  {JSON.stringify(data.media.sonnet_draft, null, 2)}
                </pre>
              ) : (
                <p style={{ fontSize: 12, color: C.textMuted, fontStyle: 'italic', margin: 0 }}>No sonnet_draft on this photo.</p>
              )}
            </Section>

            {/* TELEMETRY */}
            <Section title={`Pipeline telemetry — ${data.telemetry.length} row${data.telemetry.length === 1 ? '' : 's'}`}>
              {data.telemetry_missing_table && (
                <div style={{ padding: 14, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 6, color: C.amber, marginBottom: 12, fontSize: 12 }}>
                  <b>Migration 211 hasn&apos;t run yet.</b> The <code>montree_pipeline_telemetry</code> table doesn&apos;t exist on this DB. Run <code>migrations/211_pipeline_telemetry.sql</code> in the Supabase SQL Editor to start collecting per-decision data.
                </div>
              )}
              {!data.telemetry_missing_table && data.telemetry.length === 0 && (
                <p style={{ fontSize: 12, color: C.textMuted, fontStyle: 'italic', margin: 0 }}>No telemetry rows for this media_id yet. Subsequent pipeline runs will record decisions here.</p>
              )}
              {data.telemetry.length > 0 && (
                <div style={{ maxHeight: 540, overflow: 'auto' }}>
                  {data.telemetry.map((row, i) => (
                    <details key={i} style={{ background: C.cardBgStrong, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, marginBottom: 8, padding: '8px 12px' }}>
                      <summary style={{ cursor: 'pointer', fontSize: 12, color: C.textPrimary, fontFamily: C.mono, listStyle: 'none' }}>
                        <span style={{ color: C.gold, fontWeight: 600 }}>{String(row.created_at).replace('T', ' ').slice(0, 19)}</span>
                        {' · '}
                        <span style={{ color: STATUS_COLOR[String(row.outcome)] || C.textMuted, fontWeight: 600 }}>{String(row.outcome)}</span>
                        {' · '}
                        <span style={{ color: C.textSecondary }}>decision={String(row.decision)}</span>
                        {row.pass2_confidence !== null && row.pass2_confidence !== undefined && (
                          <span style={{ color: C.textSecondary }}>{' · '}conf={Number(row.pass2_confidence).toFixed(3)}</span>
                        )}
                      </summary>
                      <pre style={{ marginTop: 8, fontSize: 10.5, fontFamily: C.mono, color: C.textMuted, lineHeight: 1.5, overflow: 'auto' }}>
                        {JSON.stringify(row, null, 2)}
                      </pre>
                    </details>
                  ))}
                </div>
              )}
            </Section>

            {/* VISUAL MEMORY */}
            <Section title={`Visual memory — ${data.visual_memory_total} entr${data.visual_memory_total === 1 ? 'y' : 'ies'} in this classroom`}>
              <p style={{ fontSize: 12, color: C.textMuted, margin: '0 0 12px', fontStyle: 'italic' }}>
                Shows CURRENT entries for the classroom, not the snapshot at pipeline time. Filtered to top 120 by description_confidence DESC, updated_at DESC. The Pass 2 injection filter is teacher_setup ≥1.0 OR correction ≥0.9 OR is_custom=true.
              </p>
              <div style={{ maxHeight: 540, overflow: 'auto' }}>
                {data.visual_memory.length === 0 && (
                  <p style={{ fontSize: 12, color: C.textMuted, fontStyle: 'italic' }}>No visual memory entries.</p>
                )}
                {data.visual_memory.map((vm, i) => {
                  const confidence = vm.description_confidence ?? 0;
                  const trustedForInjection =
                    (vm.source === 'teacher_setup' && confidence >= 1.0) ||
                    (vm.source === 'correction' && confidence >= 0.9) ||
                    vm.is_custom === true;
                  return (
                    <details key={i} style={{ background: C.cardBgStrong, border: `1px solid ${trustedForInjection ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.05)'}`, borderRadius: 6, marginBottom: 6, padding: '8px 12px' }}>
                      <summary style={{ cursor: 'pointer', fontSize: 12, fontFamily: 'Inter, sans-serif', listStyle: 'none' }}>
                        <span style={{ color: trustedForInjection ? C.emerald : C.textMuted, fontWeight: 600 }}>{trustedForInjection ? '✓' : '○'}</span>
                        {' '}
                        <span style={{ color: C.textPrimary, fontWeight: 600 }}>{vm.work_name}</span>
                        <span style={{ color: C.textMuted, marginLeft: 8, fontSize: 10.5 }}>
                          {vm.source} · conf={confidence.toFixed(2)}{vm.is_custom ? ' · custom' : ''}
                        </span>
                      </summary>
                      <div style={{ marginTop: 8, fontSize: 11, color: C.textSecondary, lineHeight: 1.55 }}>
                        {vm.visual_description && (
                          <div style={{ marginBottom: 6 }}><b style={{ color: C.gold }}>LOOKS LIKE:</b> {vm.visual_description}</div>
                        )}
                        {vm.key_materials && vm.key_materials.length > 0 && (
                          <div style={{ marginBottom: 6 }}><b style={{ color: C.gold }}>KEY MATERIALS:</b> {vm.key_materials.join(', ')}</div>
                        )}
                        {vm.negative_descriptions && vm.negative_descriptions.length > 0 && (
                          <div><b style={{ color: C.amber }}>DISTINGUISH FROM:</b> {vm.negative_descriptions.join(' | ')}</div>
                        )}
                        <div style={{ marginTop: 8, fontSize: 10, color: C.textMuted, fontFamily: C.mono }}>
                          updated {String(vm.updated_at).replace('T', ' ').slice(0, 19)}
                        </div>
                      </div>
                    </details>
                  );
                })}
              </div>
            </Section>

            <p style={{ fontSize: 10, color: C.textMuted, fontFamily: C.mono, textAlign: 'center', margin: '20px 0' }}>
              fetched {new Date(data.fetched_at).toISOString().replace('T', ' ').slice(0, 19)}
            </p>
          </>
        )}

      </div>
    </div>
  );
}
