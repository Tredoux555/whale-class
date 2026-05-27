// /montree/super-admin/all-logins/page.tsx
//
// Session 133 — "show me every login code in the system, neat and clear."
// Super-admin only. Lists principals + teachers + agents grouped first by
// role, then by school. Each row has a one-tap copy button on the code.
//
// 🚨 SECURITY POSTURE
//   Every visible code is the literal plaintext login code. This page is
//   the highest-value data-exfiltration target in the codebase. The auth
//   gate (verifySuperAdminAuth) is enforced on the backing API. The token
//   is read from sessionStorage just like the rest of the super-admin
//   surface. Codes are never cached client-side or in any proxy.

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const T = {
  bg: '#0a1a0f',
  cardBg: 'rgba(8,20,12,0.55)',
  cardBgStrong: 'rgba(8,20,12,0.75)',
  border: '1px solid rgba(52,211,153,0.18)',
  borderStrong: '1px solid rgba(52,211,153,0.32)',
  emerald: '#34d399',
  emeraldDim: 'rgba(52,211,153,0.65)',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  gold: '#E8C96A',
  goldSoft: 'rgba(232,201,106,0.18)',
  red: '#ef4444',
  redSoft: 'rgba(239,68,68,0.18)',
  amber: '#fb923c',
  amberSoft: 'rgba(251,146,60,0.18)',
  textPrimary: 'rgba(255,255,255,0.92)',
  textSecondary: 'rgba(255,255,255,0.62)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: 'var(--font-inter), -apple-system, sans-serif',
  mono: 'ui-monospace, "SF Mono", Menlo, monospace',
};

interface PrincipalLogin {
  kind: 'principal';
  id: string;
  name: string | null;
  email: string | null;
  login_code: string;
  school_id: string;
  school_name: string | null;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

interface TeacherLogin {
  kind: 'teacher';
  id: string;
  name: string | null;
  email: string | null;
  login_code: string;
  school_id: string | null;
  school_name: string | null;
  classroom_id: string | null;
  classroom_name: string | null;
  role: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

interface AgentLogin {
  kind: 'agent';
  id: string;
  name: string | null;
  email: string | null;
  login_code: string;
  agent_default_share_pct: number | null;
  agent_login_set_at: string | null;
  agent_login_last_used_at: string | null;
  agent_suspended_at: string | null;
  created_at: string;
}

interface ParentInviteLogin {
  kind: 'parent_invite';
  id: string;
  invite_code: string;
  parent_email: string | null;
  child_id: string;
  child_name: string | null;
  classroom_id: string | null;
  classroom_name: string | null;
  school_id: string | null;
  school_name: string | null;
  is_active: boolean;
  is_reusable: boolean;
  use_count: number;
  max_uses: number | null;
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
}

interface AllLoginsResponse {
  principals: PrincipalLogin[];
  teachers: TeacherLogin[];
  agents: AgentLogin[];
  parent_invites: ParentInviteLogin[];
  desynced_principal_ids: string[];
  counts: {
    principals: number;
    teachers: number;
    agents: number;
    parent_invites: number;
    total: number;
  };
  generated_at: string;
}

type RoleFilter = 'all' | 'principals' | 'teachers' | 'agents' | 'parents';

export default function AllLoginsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [data, setData] = useState<AllLoginsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Token lives in sessionStorage from the super-admin login screen.
    const stored = sessionStorage.getItem('super-admin-token');
    if (!stored) {
      router.push('/montree/super-admin');
      return;
    }
    setToken(stored);
  }, [router]);

  const load = useCallback(
    async (t: string) => {
      setLoading(true);
      setError(null);
      try {
        const qs = includeInactive ? '?include_inactive=1' : '';
        const res = await fetch(`/api/montree/super-admin/all-logins${qs}`, {
          headers: { 'x-super-admin-token': t },
          cache: 'no-store',
        });
        if (!res.ok) {
          if (res.status === 401) {
            sessionStorage.removeItem('super-admin-token');
            router.push('/montree/super-admin');
            return;
          }
          throw new Error(`HTTP ${res.status}`);
        }
        const json = (await res.json()) as AllLoginsResponse;
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Load failed');
      } finally {
        setLoading(false);
      }
    },
    [includeInactive, router]
  );

  // Re-load whenever the token changes OR the includeInactive filter
  // changes — the filter is a server-side query param, not just client-
  // side filtering. Audit fix: was previously [token, load] which let
  // the toggle silently no-op.
  useEffect(() => {
    if (token) void load(token);
  }, [token, load]);

  const handleCopy = useCallback((id: string, code: string) => {
    void navigator.clipboard.writeText(code).catch(() => {
      /* clipboard API may fail on non-https — ignore */
    });
    // Audit fix: clear the prior timer BEFORE assigning the new one, so
    // a stale 1500ms tick from a previous click can't blank the "Copied"
    // state of the new one.
    if (copyTimer.current) {
      clearTimeout(copyTimer.current);
      copyTimer.current = null;
    }
    setCopiedId(id);
    copyTimer.current = setTimeout(() => {
      setCopiedId(null);
      copyTimer.current = null;
    }, 1500);
  }, []);

  useEffect(() => () => {
    if (copyTimer.current) clearTimeout(copyTimer.current);
  }, []);

  // Filtered rows.
  const filtered = useMemo(() => {
    if (!data) return { principals: [], teachers: [], agents: [], parents: [] };
    const needle = search.trim().toLowerCase();
    const match = (s: string | null | undefined) =>
      !needle || (typeof s === 'string' && s.toLowerCase().includes(needle));
    return {
      principals:
        roleFilter === 'all' || roleFilter === 'principals'
          ? data.principals.filter(
              (p) =>
                match(p.name) ||
                match(p.email) ||
                match(p.login_code) ||
                match(p.school_name)
            )
          : [],
      teachers:
        roleFilter === 'all' || roleFilter === 'teachers'
          ? data.teachers.filter(
              (t) =>
                match(t.name) ||
                match(t.email) ||
                match(t.login_code) ||
                match(t.school_name) ||
                match(t.classroom_name)
            )
          : [],
      agents:
        roleFilter === 'all' || roleFilter === 'agents'
          ? data.agents.filter(
              (a) =>
                match(a.name) || match(a.email) || match(a.login_code)
            )
          : [],
      parents:
        roleFilter === 'all' || roleFilter === 'parents'
          ? data.parent_invites.filter(
              (i) =>
                match(i.parent_email) ||
                match(i.invite_code) ||
                match(i.child_name) ||
                match(i.classroom_name) ||
                match(i.school_name)
            )
          : [],
    };
  }, [data, roleFilter, search]);

  if (loading && !data) {
    return (
      <div style={pageWrapStyle}>
        <p style={{ color: T.textSecondary, fontFamily: T.sans }}>Loading…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div style={pageWrapStyle}>
        <p style={{ color: T.red, fontFamily: T.sans }}>Error: {error}</p>
        <button style={btnGhostStyle} onClick={() => token && load(token)}>
          Retry
        </button>
      </div>
    );
  }
  if (!data) return null;

  return (
    <div style={pageWrapStyle}>
      {/* Header */}
      <header style={{ marginBottom: 24 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: T.serif,
                fontSize: 28,
                fontWeight: 500,
                margin: 0,
                color: T.textPrimary,
                letterSpacing: -0.3,
              }}
            >
              All logins
            </h1>
            <p
              style={{
                color: T.textSecondary,
                fontFamily: T.sans,
                fontSize: 13,
                margin: '4px 0 0',
              }}
            >
              Every active login code in the system — principals, teachers,
              agents. Tap any code to copy.
            </p>
          </div>
          <button style={btnGhostStyle} onClick={() => router.push('/montree/super-admin')}>
            ← Super-admin
          </button>
        </div>

        {/* Counts strip */}
        <div style={countsStripStyle}>
          <CountChip label="Total" value={data.counts.total} />
          <CountChip label="Principals" value={data.counts.principals} />
          <CountChip label="Teachers" value={data.counts.teachers} />
          <CountChip label="Agents" value={data.counts.agents} />
          <CountChip label="Parent invites" value={data.counts.parent_invites} />
          {data.desynced_principal_ids.length > 0 && (
            <span style={desyncChipStyle}>
              ⚠ {data.desynced_principal_ids.length} principal hash-desync
            </span>
          )}
        </div>
      </header>

      {/* Filters */}
      <div style={filterBarStyle}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, code, school…"
          style={searchInputStyle}
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(['all', 'principals', 'teachers', 'agents', 'parents'] as const).map(
            (r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                style={roleFilterPillStyle(roleFilter === r)}
              >
                {r === 'all'
                  ? 'All'
                  : r === 'principals'
                  ? 'Principals'
                  : r === 'teachers'
                  ? 'Teachers'
                  : r === 'agents'
                  ? 'Agents'
                  : 'Parents'}
              </button>
            )
          )}
        </div>
        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontFamily: T.sans,
            fontSize: 13,
            color: T.textSecondary,
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
          />
          Include inactive
        </label>
      </div>

      {/* Principals */}
      {filtered.principals.length > 0 && (
        <section style={sectionStyle}>
          <h2 style={sectionHeadingStyle}>
            Principals · {filtered.principals.length}
          </h2>
          <div style={listStyle}>
            {filtered.principals.map((p) => (
              <LoginRow
                key={p.id}
                copiedId={copiedId}
                onCopy={handleCopy}
                id={p.id}
                code={p.login_code}
                code_warning={
                  data.desynced_principal_ids.includes(p.id)
                    ? 'Hash desync — code may not work until SQL fix is applied'
                    : null
                }
                name={p.name || '(no name)'}
                email={p.email}
                meta={[p.school_name || '(school?)', p.is_active ? 'active' : 'inactive']}
                last={p.last_login}
              />
            ))}
          </div>
        </section>
      )}

      {/* Teachers — grouped by school */}
      {filtered.teachers.length > 0 && (
        <section style={sectionStyle}>
          <h2 style={sectionHeadingStyle}>
            Teachers · {filtered.teachers.length}
          </h2>
          <div style={listStyle}>
            {filtered.teachers.map((t) => (
              <LoginRow
                key={t.id}
                copiedId={copiedId}
                onCopy={handleCopy}
                id={t.id}
                code={t.login_code}
                code_warning={null}
                name={t.name || '(no name)'}
                email={t.email}
                meta={[
                  t.school_name || '(school?)',
                  t.classroom_name || '(no classroom)',
                  t.role || '',
                  t.is_active ? 'active' : 'inactive',
                ].filter(Boolean)}
                last={t.last_login_at}
              />
            ))}
          </div>
        </section>
      )}

      {/* Agents */}
      {filtered.agents.length > 0 && (
        <section style={sectionStyle}>
          <h2 style={sectionHeadingStyle}>Agents · {filtered.agents.length}</h2>
          <div style={listStyle}>
            {filtered.agents.map((a) => (
              <LoginRow
                key={a.id}
                copiedId={copiedId}
                onCopy={handleCopy}
                id={a.id}
                code={a.login_code}
                code_warning={
                  a.agent_suspended_at ? 'SUSPENDED — code won\'t authenticate' : null
                }
                name={a.name || '(no name)'}
                email={a.email}
                meta={[
                  a.agent_default_share_pct != null
                    ? `${a.agent_default_share_pct}% share`
                    : 'no default share',
                  a.agent_suspended_at ? 'suspended' : 'active',
                ]}
                last={a.agent_login_last_used_at}
              />
            ))}
          </div>
        </section>
      )}

      {/* Parents */}
      {filtered.parents.length > 0 && (
        <section style={sectionStyle}>
          <h2 style={sectionHeadingStyle}>
            Parent invites · {filtered.parents.length}
          </h2>
          <div style={listStyle}>
            {filtered.parents.map((i) => {
              const usage =
                i.max_uses != null
                  ? `${i.use_count}/${i.max_uses} uses`
                  : `${i.use_count} uses`;
              const expired =
                i.expires_at && new Date(i.expires_at).getTime() < Date.now();
              const exhausted =
                i.max_uses != null && i.use_count >= i.max_uses;
              const warnings: string[] = [];
              if (expired) warnings.push('EXPIRED');
              if (exhausted) warnings.push('USES EXHAUSTED');
              if (!i.is_active) warnings.push('INACTIVE');
              return (
                <LoginRow
                  key={i.id}
                  copiedId={copiedId}
                  onCopy={handleCopy}
                  id={i.id}
                  code={i.invite_code}
                  code_warning={
                    warnings.length > 0
                      ? `${warnings.join(' · ')} — won't authenticate`
                      : null
                  }
                  name={
                    i.parent_email ||
                    (i.child_name
                      ? `Parent of ${i.child_name}`
                      : '(no email on file)')
                  }
                  email={i.parent_email ? null : null}
                  meta={[
                    i.school_name || '(school?)',
                    i.classroom_name || '(no classroom)',
                    i.child_name ? `child: ${i.child_name}` : '',
                    usage,
                    i.is_reusable ? 'reusable' : 'single-use',
                  ].filter(Boolean)}
                  last={i.last_used_at}
                />
              );
            })}
          </div>
        </section>
      )}

      {filtered.principals.length === 0 &&
        filtered.teachers.length === 0 &&
        filtered.agents.length === 0 &&
        filtered.parents.length === 0 && (
          <p
            style={{
              color: T.textMuted,
              fontFamily: T.sans,
              padding: 32,
              textAlign: 'center',
            }}
          >
            No matches.
          </p>
        )}

      <footer
        style={{
          marginTop: 32,
          color: T.textMuted,
          fontFamily: T.sans,
          fontSize: 11,
        }}
      >
        Generated {new Date(data.generated_at).toLocaleString()}
      </footer>
    </div>
  );
}

interface LoginRowProps {
  id: string;
  code: string;
  code_warning: string | null;
  name: string;
  email: string | null;
  meta: string[];
  last: string | null;
  copiedId: string | null;
  onCopy: (id: string, code: string) => void;
}

function LoginRow(props: LoginRowProps) {
  const justCopied = props.copiedId === props.id;
  return (
    <div style={rowStyle}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: '1 1 auto' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontFamily: T.sans,
              fontSize: 15,
              fontWeight: 500,
              color: T.textPrimary,
            }}
          >
            {props.name}
          </span>
          {props.email && (
            <span
              style={{
                fontFamily: T.sans,
                fontSize: 12,
                color: T.textMuted,
              }}
            >
              {props.email}
            </span>
          )}
        </div>
        <div
          style={{
            fontFamily: T.sans,
            fontSize: 11,
            color: T.textMuted,
            textTransform: 'uppercase',
            letterSpacing: 0.4,
          }}
        >
          {props.meta.filter(Boolean).join(' · ')}
        </div>
        {props.last && (
          <div
            style={{
              fontFamily: T.sans,
              fontSize: 11,
              color: T.textMuted,
            }}
          >
            Last login: {new Date(props.last).toLocaleDateString()}
          </div>
        )}
        {props.code_warning && (
          <div
            style={{
              fontFamily: T.sans,
              fontSize: 11,
              color: T.amber,
              marginTop: 2,
            }}
          >
            ⚠ {props.code_warning}
          </div>
        )}
      </div>
      <button
        onClick={() => props.onCopy(props.id, props.code)}
        style={codeChipStyle(justCopied)}
        title="Click to copy"
      >
        {justCopied ? '✓ Copied' : props.code}
      </button>
    </div>
  );
}

function CountChip({ label, value }: { label: string; value: number }) {
  return (
    <span style={countChipStyle}>
      <span style={{ color: T.textMuted }}>{label}</span>
      <span style={{ color: T.textPrimary, fontWeight: 600 }}>{value}</span>
    </span>
  );
}

// ── Styles ────────────────────────────────────────────────────────────

const pageWrapStyle: React.CSSProperties = {
  background: T.bg,
  minHeight: '100vh',
  padding: '32px 24px 64px',
  color: T.textPrimary,
  fontFamily: T.sans,
};

const countsStripStyle: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  marginTop: 16,
  flexWrap: 'wrap',
};

const countChipStyle: React.CSSProperties = {
  display: 'inline-flex',
  gap: 6,
  padding: '6px 12px',
  borderRadius: 999,
  border: T.border,
  background: T.cardBg,
  fontFamily: T.sans,
  fontSize: 13,
};

const desyncChipStyle: React.CSSProperties = {
  ...countChipStyle,
  borderColor: 'rgba(251,146,60,0.5)',
  background: T.amberSoft,
  color: T.amber,
  fontWeight: 600,
};

const filterBarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  flexWrap: 'wrap',
  marginBottom: 20,
};

const searchInputStyle: React.CSSProperties = {
  flex: '1 1 280px',
  minWidth: 240,
  padding: '10px 14px',
  fontSize: 14,
  color: T.textPrimary,
  background: 'rgba(0,0,0,0.25)',
  border: T.border,
  borderRadius: 8,
  fontFamily: T.sans,
  outline: 'none',
};

const roleFilterPillStyle = (active: boolean): React.CSSProperties => ({
  fontSize: 13,
  fontFamily: T.sans,
  fontWeight: 500,
  padding: '8px 14px',
  borderRadius: 999,
  border: active ? `1px solid ${T.emerald}` : T.border,
  background: active ? T.emeraldSoft : 'transparent',
  color: active ? T.textPrimary : T.textSecondary,
  cursor: 'pointer',
});

const sectionStyle: React.CSSProperties = {
  marginBottom: 28,
};

const sectionHeadingStyle: React.CSSProperties = {
  fontFamily: T.serif,
  fontSize: 18,
  fontWeight: 500,
  color: T.emerald,
  margin: '0 0 10px',
  letterSpacing: -0.2,
};

const listStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  padding: '12px 16px',
  background: T.cardBg,
  border: T.border,
  borderRadius: 10,
};

const codeChipStyle = (justCopied: boolean): React.CSSProperties => ({
  fontFamily: T.mono,
  fontSize: 15,
  fontWeight: 600,
  letterSpacing: 1.5,
  padding: '8px 16px',
  borderRadius: 8,
  border: justCopied ? `1px solid ${T.emerald}` : `1px solid ${T.gold}`,
  background: justCopied ? T.emeraldSoft : T.goldSoft,
  color: justCopied ? T.emerald : T.gold,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  flex: '0 0 auto',
});

const btnGhostStyle: React.CSSProperties = {
  fontSize: 13,
  fontFamily: T.sans,
  padding: '6px 14px',
  borderRadius: 8,
  border: T.border,
  background: 'transparent',
  color: T.textSecondary,
  cursor: 'pointer',
};
