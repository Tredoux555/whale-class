// app/montree/super-admin/tracy-corpus/page.tsx
//
// Ultimate Tracy Phase E — super-admin corpus monitor.
// Shows per-school stats so Tredoux can watch corpus quality + pruning
// candidates over time.

'use client';

import { useEffect, useState } from 'react';

interface PerSchool {
  school_id: string;
  school_name: string;
  total_active: number;
  total_superseded: number;
  by_type: Record<string, number>;
  most_referenced: Array<{
    id: string;
    insight_text: string;
    reference_count: number;
  }>;
  never_referenced_count: number;
}

const T = {
  bg: '#0a1a0f',
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

export default function TracyCorpusPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [bySchool, setBySchool] = useState<PerSchool[]>([]);
  const [migrationPending, setMigrationPending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const saved =
      typeof window !== 'undefined' ? sessionStorage.getItem('sa_pwd') : '';
    if (saved) {
      setPassword(saved);
      setAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErrorMsg('');
      try {
        const pwd =
          (typeof window !== 'undefined' && sessionStorage.getItem('sa_pwd')) ||
          password;
        const res = await fetch('/api/montree/super-admin/tracy-corpus', {
          headers: { 'x-super-admin-password': pwd },
        });
        if (res.status === 401 || res.status === 403) {
          if (!cancelled) {
            setAuthenticated(false);
            setErrorMsg('Session expired. Please log in again.');
          }
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        setMigrationPending(!!data.migration_pending);
        setBySchool(Array.isArray(data.by_school) ? data.by_school : []);
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(err instanceof Error ? err.message : 'unknown');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authenticated, password]);

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

  if (!authenticated) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          background: T.bg,
          color: T.textPrimary,
          fontFamily: T.sans,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}
      >
        <div
          style={{
            background: T.card,
            border: T.cardBorder,
            borderRadius: 12,
            padding: 28,
            maxWidth: 420,
            width: '100%',
          }}
        >
          <h1 style={{ fontFamily: T.serif, fontSize: 24, margin: '0 0 16px' }}>
            Super-admin login
          </h1>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleLogin();
            }}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: 'rgba(0,0,0,0.30)',
              border: '1px solid rgba(52,211,153,0.25)',
              borderRadius: 8,
              color: T.textPrimary,
              fontSize: 14,
              fontFamily: T.sans,
              marginBottom: 12,
            }}
          />
          <button
            onClick={handleLogin}
            style={{
              width: '100%',
              padding: '10px 18px',
              background: T.emerald,
              color: '#0a1a0f',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Sign in
          </button>
          {loginError && (
            <p style={{ marginTop: 12, color: '#f87171', fontSize: 13 }}>
              {loginError}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: T.bg,
        color: T.textPrimary,
        fontFamily: T.sans,
        padding: '32px 24px',
      }}
    >
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <h1
          style={{
            fontFamily: T.serif,
            fontSize: 32,
            margin: '0 0 8px',
            color: T.textPrimary,
          }}
        >
          Tracy corpus
        </h1>
        <p style={{ color: T.textSecondary, fontSize: 14, marginBottom: 24 }}>
          Self-improving school memory. Per-school totals + top-referenced +
          pruning candidates.
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
            Corpus schema not yet migrated (migration 242 + 242b).
          </div>
        )}

        {loading && (
          <p style={{ textAlign: 'center', color: T.textSecondary, marginTop: 32 }}>
            Loading…
          </p>
        )}

        {errorMsg && (
          <p style={{ color: '#f87171', fontSize: 13 }}>{errorMsg}</p>
        )}

        {!loading && !migrationPending && bySchool.length === 0 && (
          <div
            style={{
              background: T.card,
              border: T.cardBorder,
              borderRadius: 12,
              padding: 24,
              textAlign: 'center',
              color: T.textMuted,
            }}
          >
            No corpus entries yet across any school. After a parent meeting
            analysis runs, entries will accrue here.
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
          {bySchool.map((s) => (
            <div
              key={s.school_id}
              style={{
                background: T.card,
                border: T.cardBorder,
                borderRadius: 12,
                padding: 16,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: 12,
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                <h2
                  style={{
                    fontFamily: T.serif,
                    fontSize: 18,
                    margin: 0,
                    color: T.textPrimary,
                  }}
                >
                  {s.school_name}
                </h2>
                <div style={{ fontSize: 12, color: T.textMuted }}>
                  active {s.total_active} · superseded {s.total_superseded} ·
                  never referenced (&gt;30d): {s.never_referenced_count}
                </div>
              </div>

              {Object.keys(s.by_type).length > 0 && (
                <div style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {Object.entries(s.by_type).map(([type, count]) => (
                    <span
                      key={type}
                      style={{
                        padding: '3px 10px',
                        borderRadius: 999,
                        fontSize: 11,
                        background: 'rgba(52,211,153,0.10)',
                        border: '1px solid rgba(52,211,153,0.30)',
                        color: T.emeraldDim,
                      }}
                    >
                      {type}: {count}
                    </span>
                  ))}
                </div>
              )}

              {s.most_referenced.length > 0 && (
                <>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: T.textMuted,
                      textTransform: 'uppercase',
                      letterSpacing: 0.3,
                      marginBottom: 6,
                    }}
                  >
                    Most referenced
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13 }}>
                    {s.most_referenced.map((r) => (
                      <li key={r.id} style={{ marginBottom: 4 }}>
                        <span style={{ color: T.emeraldDim }}>
                          ({r.reference_count}×){' '}
                        </span>
                        {r.insight_text}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
