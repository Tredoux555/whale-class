// app/montree/admin/parents/page.tsx
//
// Ultimate Tracy Phase D — parents-as-first-class-entities home.
//
// Lists every parent in the school with archetype tags, relationship
// temperature, child links, meeting count, last meeting date. Search
// + filter to "no profile yet" surfaces unonboarded parents the
// principal hasn't met yet.

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, AlertCircle } from 'lucide-react';

const T = {
  bg: '#0a1a0f',
  glow:
    'radial-gradient(ellipse 1100px 900px at 88% 8%, rgba(39,129,90,0.32), transparent 60%)',
  card: 'rgba(8,20,12,0.55)',
  cardBorder: '1px solid rgba(52,211,153,0.18)',
  emerald: '#34d399',
  emeraldDim: 'rgba(52,211,153,0.65)',
  textPrimary: 'rgba(255,255,255,0.92)',
  textSecondary: 'rgba(255,255,255,0.62)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

const ARCHETYPE_LABELS: Record<string, { label: string; color: string }> = {
  expectation_driven: { label: 'Expectation-driven', color: '#fbbf24' },
  anxiety_projecting: { label: 'Anxiety-projecting', color: '#f87171' },
  hands_off: { label: 'Hands-off', color: '#94a3b8' },
  comparison_trapped: { label: 'Comparison-trapped', color: '#c084fc' },
  defended: { label: 'Defended', color: '#fb923c' },
};

const TEMP_COLORS: Record<string, string> = {
  warm: '#34d399',
  neutral: '#94a3b8',
  strained: '#f87171',
  repairing: '#fbbf24',
};

interface ParentRow {
  parent_id: string;
  parent_name: string;
  parent_email: string;
  is_active?: boolean;
  child_names: string[];
  child_ids: string[];
  archetypes: string[];
  relationship_temperature: string | null;
  meeting_count: number;
  last_meeting_date: string | null;
  has_profile: boolean;
}

type Filter = 'all' | 'no_profile' | 'has_profile';

export default function ParentsListPage() {
  const [parents, setParents] = useState<ParentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [migrationPending, setMigrationPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/montree/admin/parent-profile/list');
        if (!res.ok) {
          if (cancelled) return;
          setErrorMsg(`Failed to load parents (HTTP ${res.status})`);
          setLoading(false);
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        setMigrationPending(!!data.migration_pending);
        setParents(Array.isArray(data.parents) ? data.parents : []);
      } catch (err) {
        if (cancelled) return;
        setErrorMsg(err instanceof Error ? err.message : 'unknown');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return parents.filter((p) => {
      if (filter === 'no_profile' && p.has_profile) return false;
      if (filter === 'has_profile' && !p.has_profile) return false;
      if (q.length > 0) {
        const hay = `${p.parent_name} ${p.parent_email} ${p.child_names.join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [parents, search, filter]);

  return (
    <div
      style={{
        minHeight: 'calc(100dvh - 60px)',
        background: T.bg,
        color: T.textPrimary,
        fontFamily: T.sans,
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          background: T.glow,
          zIndex: 0,
        }}
      />

      <main
        style={{
          position: 'relative',
          maxWidth: 980,
          margin: '0 auto',
          padding: '32px 24px 80px',
          zIndex: 1,
        }}
      >
        <h1
          style={{
            fontFamily: T.serif,
            fontSize: 32,
            margin: '0 0 8px',
            color: T.textPrimary,
          }}
        >
          Parents
        </h1>
        <p style={{ color: T.textSecondary, fontSize: 14, marginBottom: 24 }}>
          Every parent in the school. Tap a row to see their profile, meeting
          history, and prepare for the next conversation.
        </p>

        {migrationPending && (
          <div
            style={{
              background: 'rgba(232,201,106,0.08)',
              border: '1px solid rgba(232,201,106,0.30)',
              borderRadius: 8,
              padding: '10px 12px',
              marginBottom: 16,
              fontSize: 13,
              color: 'rgba(232,201,106,0.92)',
            }}
          >
            Parent-profile schema not yet migrated. Tredoux needs to run
            migration 238 in Supabase. Until then, the profile tags below
            stay empty — every parent listed here is real but their
            archetype + history fields are unpopulated.
          </div>
        )}

        {errorMsg && (
          <div
            style={{
              background: 'rgba(220,50,50,0.10)',
              border: '1px solid rgba(220,50,50,0.30)',
              borderRadius: 8,
              padding: '10px 12px',
              marginBottom: 16,
              fontSize: 13,
              color: 'rgba(255,180,180,0.92)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <AlertCircle size={14} /> {errorMsg}
          </div>
        )}

        {/* Search + filter */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            alignItems: 'center',
            marginBottom: 20,
          }}
        >
          <div
            style={{
              flex: 1,
              minWidth: 220,
              position: 'relative',
              background: T.card,
              border: T.cardBorder,
              borderRadius: 10,
              padding: '8px 14px 8px 38px',
            }}
          >
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: 12,
                top: 11,
                color: T.textMuted,
              }}
            />
            <input
              type="text"
              placeholder="Search by name, email, or child…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: T.textPrimary,
                fontSize: 14,
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['all', 'no_profile', 'has_profile'] as Filter[]).map((f) => {
              const labels: Record<Filter, string> = {
                all: 'All',
                no_profile: 'No profile',
                has_profile: 'Profiled',
              };
              const on = filter === f;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 999,
                    fontSize: 13,
                    cursor: 'pointer',
                    background: on
                      ? 'rgba(52,211,153,0.18)'
                      : 'rgba(255,255,255,0.04)',
                    border: on
                      ? '1px solid rgba(52,211,153,0.55)'
                      : '1px solid rgba(255,255,255,0.10)',
                    color: on ? T.emerald : T.textSecondary,
                  }}
                >
                  {labels[f]}
                </button>
              );
            })}
          </div>
        </div>

        {loading && (
          <p style={{ textAlign: 'center', color: T.textSecondary, marginTop: 32 }}>
            Loading parents…
          </p>
        )}

        {!loading && filtered.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              marginTop: 32,
              padding: 32,
              background: T.card,
              border: T.cardBorder,
              borderRadius: 12,
              color: T.textMuted,
            }}
          >
            No parents match.
          </div>
        )}

        {/* Parent rows */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
          {filtered.map((p) => (
            <Link
              key={p.parent_id}
              href={`/montree/admin/parents/${p.parent_id}`}
              style={{
                background: T.card,
                border: T.cardBorder,
                borderRadius: 12,
                padding: 16,
                textDecoration: 'none',
                color: T.textPrimary,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 12,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontFamily: T.serif,
                      fontSize: 17,
                      color: T.textPrimary,
                      marginBottom: 2,
                    }}
                  >
                    {p.parent_name || '(unnamed)'}
                  </div>
                  <div style={{ fontSize: 13, color: T.textMuted }}>
                    {p.child_names.length > 0
                      ? p.child_names.join(', ')
                      : 'no children linked'}
                  </div>
                </div>
                {p.relationship_temperature && (
                  <span
                    style={{
                      padding: '3px 10px',
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 600,
                      background: `${TEMP_COLORS[p.relationship_temperature] || '#94a3b8'}33`,
                      color: TEMP_COLORS[p.relationship_temperature] || '#94a3b8',
                      border: `1px solid ${TEMP_COLORS[p.relationship_temperature] || '#94a3b8'}66`,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {p.relationship_temperature}
                  </span>
                )}
              </div>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 6,
                  alignItems: 'center',
                  marginTop: 4,
                }}
              >
                {p.archetypes.length === 0 && (
                  <span
                    style={{
                      fontSize: 12,
                      color: T.textMuted,
                      fontStyle: 'italic',
                    }}
                  >
                    {p.has_profile ? 'no archetype identified' : 'not yet onboarded'}
                  </span>
                )}
                {p.archetypes.map((a) => (
                  <span
                    key={a}
                    style={{
                      padding: '3px 10px',
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 600,
                      background: `${ARCHETYPE_LABELS[a]?.color || '#94a3b8'}22`,
                      color: ARCHETYPE_LABELS[a]?.color || '#94a3b8',
                      border: `1px solid ${ARCHETYPE_LABELS[a]?.color || '#94a3b8'}55`,
                    }}
                  >
                    {ARCHETYPE_LABELS[a]?.label || a}
                  </span>
                ))}
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: 12,
                    color: T.textMuted,
                  }}
                >
                  {p.meeting_count} meeting{p.meeting_count === 1 ? '' : 's'}
                  {p.last_meeting_date
                    ? ` · last ${p.last_meeting_date.slice(0, 10)}`
                    : ''}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
