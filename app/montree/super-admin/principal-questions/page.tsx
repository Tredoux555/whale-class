// /montree/super-admin/principal-questions/page.tsx
//
// Super-admin view of every question principals have asked the home-page
// "ask anything" agent. The signal source for "what should I build next?"
//
// Default view: most recent 50 questions across all schools.
// Filters: by school, by date range.
// For each row: school, principal, the question, the answer, tools used,
// cost in USD, duration. Errors highlighted in red.
'use client';

import { useState, useEffect, useCallback } from 'react';

interface ToolCall {
  name: string;
  input?: unknown;
  success?: boolean;
  duration_ms?: number;
  result_summary?: string;
}

interface QuestionRow {
  id: string;
  school_id: string;
  school_name: string;
  principal_id: string;
  principal_name: string;
  principal_email: string | null;
  conversation_id: string;
  question: string;
  answer: string | null;
  tools_called: ToolCall[] | null;
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cost_usd: number | null;
  duration_ms: number | null;
  error: string | null;
  asked_at: string;
}

interface PerSchoolSummary {
  school_id: string;
  school_name: string;
  questions: number;
  cost: number;
}

interface Response {
  items: QuestionRow[];
  total: number;
  page: { limit: number; offset: number; returned: number };
  summary: {
    total_cost_usd: number;
    error_count: number;
    per_school: PerSchoolSummary[];
  };
}

const C = {
  bg: '#0a1a0f',
  cardBg: 'rgba(8,20,12,0.55)',
  cardBgStrong: 'rgba(8,20,12,0.80)',
  border: '1px solid rgba(52,211,153,0.18)',
  emerald: '#34d399',
  emeraldDim: 'rgba(52,211,153,0.65)',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  gold: '#E8C96A',
  red: '#f87171',
  redSoft: 'rgba(239,68,68,0.10)',
  redBorder: '1px solid rgba(239,68,68,0.25)',
  textPrimary: 'rgba(255,255,255,0.92)',
  textSecondary: 'rgba(255,255,255,0.62)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: '"Lora", Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
  inputBg: 'rgba(0,0,0,0.30)',
  inputBorder: '1px solid rgba(52,211,153,0.25)',
};

export default function PrincipalQuestionsPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Filters
  const [schoolFilter, setSchoolFilter] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Auth bootstrap from sessionStorage
  useEffect(() => {
    const saved =
      typeof window !== 'undefined' ? sessionStorage.getItem('sa_pwd') : '';
    if (saved) {
      setPassword(saved);
      setAuthenticated(true);
    }
  }, []);

  const handleLogin = async () => {
    setLoginError('');
    try {
      const res = await fetch('/api/montree/super-admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        sessionStorage.setItem('sa_pwd', password);
        setAuthenticated(true);
      } else {
        setLoginError('Wrong password.');
      }
    } catch {
      setLoginError('Network error.');
    }
  };

  const fetchData = useCallback(async () => {
    if (!authenticated) return;
    setLoading(true);
    setFetchError(null);
    const params = new URLSearchParams();
    if (schoolFilter.trim()) params.set('school_id', schoolFilter.trim());
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    params.set('limit', '100');
    try {
      const pwd =
        typeof window !== 'undefined'
          ? sessionStorage.getItem('sa_pwd') || password
          : password;
      const res = await fetch(
        `/api/montree/super-admin/principal-questions?${params.toString()}`,
        {
          headers: { 'x-super-admin-password': pwd },
        }
      );
      if (res.status === 401) {
        setAuthenticated(false);
        setFetchError('Session expired. Please log in again.');
        return;
      }
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        setFetchError(payload?.error || 'Failed to load.');
        return;
      }
      const payload = (await res.json()) as Response;
      setData(payload);
    } catch (err) {
      console.error('[principal-questions] fetch error', err);
      setFetchError('Network error.');
    } finally {
      setLoading(false);
    }
  }, [authenticated, password, schoolFilter, from, to]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!authenticated) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: C.bg,
          color: C.textPrimary,
          fontFamily: C.sans,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}
      >
        <div
          style={{
            background: C.cardBgStrong,
            border: C.border,
            borderRadius: 18,
            padding: 28,
            maxWidth: 420,
            width: '100%',
          }}
        >
          <h1
            style={{
              fontFamily: C.serif,
              fontSize: 22,
              margin: 0,
              marginBottom: 16,
              color: C.textPrimary,
            }}
          >
            Super-admin sign in
          </h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Super-admin password"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleLogin();
            }}
            style={{
              width: '100%',
              padding: '12px 14px',
              background: C.inputBg,
              border: C.inputBorder,
              borderRadius: 10,
              color: C.textPrimary,
              fontFamily: C.sans,
              fontSize: 14,
              outline: 'none',
              marginBottom: 12,
            }}
          />
          {loginError && (
            <div
              style={{
                padding: '8px 12px',
                background: C.redSoft,
                border: C.redBorder,
                borderRadius: 8,
                color: C.red,
                fontSize: 13,
                marginBottom: 12,
              }}
            >
              {loginError}
            </div>
          )}
          <button
            type="button"
            onClick={handleLogin}
            style={{
              width: '100%',
              padding: '11px 22px',
              background: C.emerald,
              color: '#0a1a0f',
              border: 'none',
              borderRadius: 999,
              fontFamily: C.sans,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: C.bg,
        color: C.textPrimary,
        fontFamily: C.sans,
        padding: '32px 24px 60px',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 22 }}>
          <h1
            style={{
              fontFamily: C.serif,
              fontSize: 'clamp(26px, 3.4vw, 36px)',
              fontWeight: 500,
              letterSpacing: -0.5,
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            Principal questions
          </h1>
          <p
            style={{
              color: C.textSecondary,
              fontSize: 14,
              marginTop: 8,
              maxWidth: 640,
              lineHeight: 1.55,
            }}
          >
            Every question a principal has asked the home-page agent. This is
            your build signal — patterns here tell you what features matter.
          </p>
        </div>

        {/* Filters */}
        <div
          style={{
            background: C.cardBg,
            backdropFilter: 'blur(18px)',
            border: C.border,
            borderRadius: 14,
            padding: '14px 16px',
            marginBottom: 18,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 10,
          }}
        >
          <FilterField label="School ID (optional)">
            <input
              type="text"
              value={schoolFilter}
              onChange={(e) => setSchoolFilter(e.target.value)}
              placeholder="UUID, blank = all"
              style={inputStyle()}
            />
          </FilterField>
          <FilterField label="From (date)">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              style={inputStyle()}
            />
          </FilterField>
          <FilterField label="To (date)">
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              style={inputStyle()}
            />
          </FilterField>
          <FilterField label="&nbsp;">
            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              style={{
                padding: '10px 18px',
                background: C.emerald,
                color: '#0a1a0f',
                border: 'none',
                borderRadius: 10,
                fontFamily: C.sans,
                fontSize: 13,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Loading…' : 'Apply filters'}
            </button>
          </FilterField>
        </div>

        {/* Summary */}
        {data && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 10,
              marginBottom: 18,
            }}
          >
            <Stat
              label="Questions in view"
              value={String(data.total)}
              hint={`(showing ${data.page.returned})`}
            />
            <Stat
              label="Total cost (USD)"
              value={`$${data.summary.total_cost_usd.toFixed(4)}`}
            />
            <Stat
              label="Errors"
              value={String(data.summary.error_count)}
              hint={data.summary.error_count > 0 ? 'investigate ↓' : ''}
              hintColor={data.summary.error_count > 0 ? C.red : C.textMuted}
            />
            <Stat
              label="Schools active"
              value={String(data.summary.per_school.length)}
            />
          </div>
        )}

        {/* Per-school summary chips */}
        {data && data.summary.per_school.length > 0 && (
          <div
            style={{
              background: C.cardBg,
              backdropFilter: 'blur(18px)',
              border: C.border,
              borderRadius: 14,
              padding: '12px 14px',
              marginBottom: 18,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            {data.summary.per_school.slice(0, 12).map((s) => (
              <button
                key={s.school_id}
                type="button"
                onClick={() => setSchoolFilter(s.school_id)}
                title="Click to filter to this school"
                style={{
                  padding: '6px 12px',
                  background: C.emeraldSoft,
                  border: '1px solid rgba(52,211,153,0.22)',
                  borderRadius: 999,
                  color: C.textPrimary,
                  fontSize: 12,
                  fontFamily: C.sans,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span style={{ color: C.emerald }}>{s.school_name}</span>
                <span style={{ color: C.textMuted }}>
                  · {s.questions} · ${s.cost.toFixed(4)}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Errors */}
        {fetchError && (
          <div
            style={{
              padding: '12px 14px',
              background: C.redSoft,
              border: C.redBorder,
              borderRadius: 12,
              color: C.red,
              fontSize: 13,
              marginBottom: 18,
            }}
          >
            {fetchError}
          </div>
        )}

        {/* Question rows */}
        {data && data.items.length === 0 && !loading && (
          <div
            style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: C.textMuted,
              background: C.cardBg,
              border: C.border,
              borderRadius: 14,
            }}
          >
            No questions in this view.
          </div>
        )}

        {data && data.items.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.items.map((row) => (
              <QuestionRowCard
                key={row.id}
                row={row}
                expanded={expandedId === row.id}
                onToggle={() =>
                  setExpandedId(expandedId === row.id ? null : row.id)
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Subcomponents ────────────────────────────────────────────────────────

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        style={{
          display: 'block',
          fontSize: 10.5,
          fontWeight: 600,
          color: C.emeraldDim,
          textTransform: 'uppercase',
          letterSpacing: 1.2,
          marginBottom: 4,
        }}
        dangerouslySetInnerHTML={{ __html: label }}
      />
      {children}
    </div>
  );
}

function inputStyle(): React.CSSProperties {
  return {
    width: '100%',
    padding: '10px 12px',
    background: C.inputBg,
    border: C.inputBorder,
    borderRadius: 10,
    color: C.textPrimary,
    fontFamily: C.sans,
    fontSize: 13,
    outline: 'none',
  };
}

function Stat({
  label,
  value,
  hint,
  hintColor,
}: {
  label: string;
  value: string;
  hint?: string;
  hintColor?: string;
}) {
  return (
    <div
      style={{
        background: C.cardBg,
        backdropFilter: 'blur(18px)',
        border: C.border,
        borderRadius: 14,
        padding: '14px 16px',
      }}
    >
      <div
        style={{
          fontSize: 10.5,
          fontWeight: 600,
          color: C.emeraldDim,
          textTransform: 'uppercase',
          letterSpacing: 1.2,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: C.serif,
          fontSize: 22,
          color: C.textPrimary,
        }}
      >
        {value}
      </div>
      {hint && (
        <div
          style={{
            marginTop: 4,
            fontSize: 11,
            color: hintColor || C.textMuted,
          }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}

function QuestionRowCard({
  row,
  expanded,
  onToggle,
}: {
  row: QuestionRow;
  expanded: boolean;
  onToggle: () => void;
}) {
  const askedAt = new Date(row.asked_at);
  const askedAtLabel = isNaN(askedAt.getTime())
    ? row.asked_at
    : askedAt.toLocaleString();
  const tools = row.tools_called || [];
  const cost = row.cost_usd ?? 0;
  const dur = row.duration_ms ?? 0;
  return (
    <div
      style={{
        background: C.cardBg,
        backdropFilter: 'blur(18px)',
        border: row.error ? C.redBorder : C.border,
        borderRadius: 14,
        padding: '14px 16px',
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        style={{
          background: 'transparent',
          border: 'none',
          color: C.textPrimary,
          width: '100%',
          textAlign: 'left',
          padding: 0,
          cursor: 'pointer',
          fontFamily: C.sans,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
            marginBottom: 8,
            fontSize: 11,
          }}
        >
          <div style={{ color: C.emeraldDim }}>
            <strong style={{ color: C.emerald }}>{row.school_name}</strong>
            <span style={{ color: C.textMuted }}> · {row.principal_name}</span>
          </div>
          <div style={{ color: C.textMuted }}>{askedAtLabel}</div>
        </div>
        <div
          style={{
            fontSize: 15,
            color: C.textPrimary,
            lineHeight: 1.5,
            marginBottom: 6,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: expanded ? 10 : 2,
            WebkitBoxOrient: 'vertical' as const,
          }}
        >
          {row.question}
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
            fontSize: 11,
            color: C.textMuted,
          }}
        >
          <div>
            {tools.length > 0
              ? `${tools.length} tool call${tools.length === 1 ? '' : 's'}`
              : 'no tools'}
          </div>
          <div>
            ${cost.toFixed(4)} · {dur}ms
            {row.error && (
              <span style={{ color: C.red, marginLeft: 8 }}>· error</span>
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div
          style={{
            marginTop: 14,
            paddingTop: 14,
            borderTop: '1px solid rgba(52,211,153,0.12)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {row.error && (
            <div
              style={{
                padding: '10px 12px',
                background: C.redSoft,
                border: C.redBorder,
                borderRadius: 10,
                color: C.red,
                fontSize: 12.5,
                lineHeight: 1.5,
              }}
            >
              <strong>Error:</strong> {row.error}
            </div>
          )}

          <div>
            <Label>Answer</Label>
            <div
              style={{
                fontFamily: C.serif,
                fontSize: 14,
                lineHeight: 1.65,
                color: C.textPrimary,
                whiteSpace: 'pre-wrap',
                background: 'rgba(0,0,0,0.20)',
                borderRadius: 10,
                padding: '10px 14px',
              }}
            >
              {row.answer || (
                <span style={{ color: C.textMuted }}>(no answer text)</span>
              )}
            </div>
          </div>

          {tools.length > 0 && (
            <div>
              <Label>Tools called ({tools.length})</Label>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                {tools.map((t, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '8px 12px',
                      background: 'rgba(0,0,0,0.20)',
                      border: '1px solid rgba(52,211,153,0.12)',
                      borderRadius: 10,
                      fontSize: 12,
                      color: C.textSecondary,
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 8,
                    }}
                  >
                    <div>
                      <span style={{ color: C.emerald, fontFamily: 'monospace' }}>
                        {t.name}
                      </span>
                      {t.result_summary && (
                        <span style={{ color: C.textMuted, marginLeft: 8 }}>
                          → {t.result_summary}
                        </span>
                      )}
                    </div>
                    <div style={{ color: C.textMuted, whiteSpace: 'nowrap' }}>
                      {t.success === false ? (
                        <span style={{ color: C.red }}>failed · </span>
                      ) : null}
                      {t.duration_ms ?? 0}ms
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 10,
              fontSize: 11.5,
              color: C.textMuted,
            }}
          >
            <Meta label="Model" value={row.model || '—'} />
            <Meta
              label="Tokens"
              value={`${row.input_tokens ?? 0} in · ${row.output_tokens ?? 0} out`}
            />
            <Meta
              label="Conversation"
              value={
                <span style={{ fontFamily: 'monospace', fontSize: 10.5 }}>
                  {row.conversation_id.slice(0, 8)}…
                </span>
              }
            />
            <Meta
              label="Principal"
              value={row.principal_email || row.principal_name}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 600,
        color: C.emeraldDim,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginBottom: 6,
      }}
    >
      {children}
    </div>
  );
}

function Meta({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 9.5,
          color: C.textMuted,
          textTransform: 'uppercase',
          letterSpacing: 1,
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div style={{ color: C.textPrimary, fontSize: 12 }}>{value}</div>
    </div>
  );
}
