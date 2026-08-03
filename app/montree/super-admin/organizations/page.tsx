'use client';

/**
 * /montree/super-admin/organizations — Tredoux's organization console.
 *
 * ┌─────────────────────────────────────────────────────────────────────────────────┐
 * │ 🚫 NEVER-PARENT. Platform surface. Nothing here touches app/montree/parent/**.   │
 * └─────────────────────────────────────────────────────────────────────────────────┘
 *
 * The FIRST link in the Phase 6 onboarding chain lives here, and it is deliberately manual:
 * there is no self-serve route into the organization tier. Tredoux meets a school group,
 * decides they belong on Montree, mints a link here, and sends it to them himself. That is
 * the whole admission policy, and it is enforced in code — POST /api/montree/org/invites
 * with inviteType='organization' accepts nothing but a super-admin session.
 *
 * Sign-in, session key (`sa_session`) and visual language match
 * /montree/super-admin/milestones exactly, so the two consoles feel like one place. Copy is
 * hardcoded English like the rest of /montree/super-admin/* — this surface has one reader.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import InviteLinkCard from '@/components/montree/org/InviteLinkCard';
import { Card, DataTable, EmptyState, Section, StatTile, TileRow } from '@/components/montree/evaluation-reports/ReportChrome';
import { T } from '@/components/montree/evaluation-reports/tokens';

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  contactName: string | null;
  contactEmail: string | null;
  createdAt: string;
  schoolCount: number;
}

interface InviteRow {
  id: string;
  inviteType: 'organization' | 'school';
  prefillName: string | null;
  note: string | null;
  expiresAt: string;
  usedAt: string | null;
  usedByEmail: string | null;
  createdAt: string;
  status: 'valid' | 'used' | 'expired' | 'not_found';
}

/** Same session key the rest of /montree/super-admin/* uses. */
const SA_TOKEN_KEY = 'sa_session';

export default function SuperAdminOrganizationsPage() {
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  const [orgs, setOrgs] = useState<OrgRow[] | null>(null);
  const [invites, setInvites] = useState<InviteRow[] | null>(null);
  const [migrationPending, setMigrationPending] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [prefillName, setPrefillName] = useState('');
  const [note, setNote] = useState('');
  const [minting, setMinting] = useState(false);
  const [mintError, setMintError] = useState('');
  const [freshLink, setFreshLink] = useState<{ link: string; expiresAt: string } | null>(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SA_TOKEN_KEY);
      if (saved) setToken(saved);
    } catch { /* sessionStorage unavailable */ }
  }, []);

  const load = useCallback(async (saToken: string) => {
    setLoadError(null);
    try {
      const [orgRes, invRes] = await Promise.all([
        fetch('/api/montree/super-admin/organizations', {
          headers: { 'x-super-admin-token': saToken }, cache: 'no-store',
        }),
        fetch('/api/montree/org/invites', {
          headers: { 'x-super-admin-token': saToken }, cache: 'no-store',
        }),
      ]);

      if (orgRes.status === 401) {
        try { sessionStorage.removeItem(SA_TOKEN_KEY); } catch { /* ignore */ }
        setToken(null);
        return;
      }

      const orgBody = await orgRes.json().catch(() => null);
      if (orgRes.status === 503 && orgBody?.migration_pending) {
        setMigrationPending(orgBody.message ?? 'The organization tables are not installed yet.');
        return;
      }
      if (!orgRes.ok || !orgBody?.available) {
        setLoadError(orgBody?.error ?? `Could not load organizations (${orgRes.status}).`);
        return;
      }
      setOrgs(orgBody.organizations as OrgRow[]);

      const invBody = await invRes.json().catch(() => null);
      setInvites(invRes.ok && invBody?.available ? (invBody.invites as InviteRow[]) : []);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Could not load organizations.');
    }
  }, []);

  useEffect(() => { if (token) void load(token); }, [token, load]);

  const signIn = useCallback(async () => {
    setAuthError(null);
    try {
      const res = await fetch('/api/montree/super-admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) { setAuthError('That did not work.'); return; }
      const next = data?.token ?? data?.session ?? null;
      if (!next) { setAuthError('Signed in, but no session token came back.'); return; }
      try {
        sessionStorage.setItem(SA_TOKEN_KEY, next);
        sessionStorage.setItem('sa_session_ts', Date.now().toString());
      } catch { /* ignore */ }
      setToken(next);
    } catch {
      setAuthError('Could not reach the sign-in service.');
    }
  }, [password]);

  const mint = async () => {
    if (!token) return;
    setMinting(true);
    setMintError('');
    try {
      const res = await fetch('/api/montree/org/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-super-admin-token': token },
        body: JSON.stringify({
          inviteType: 'organization',
          prefillName: prefillName.trim() || undefined,
          note: note.trim() || undefined,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Could not create the invitation.');
      setFreshLink({ link: body.link, expiresAt: body.invite.expiresAt });
      setPrefillName('');
      setNote('');
      void load(token);
    } catch (err) {
      setMintError(err instanceof Error ? err.message : 'Could not create the invitation.');
    } finally {
      setMinting(false);
    }
  };

  const revoke = async (id: string) => {
    if (!token) return;
    if (!window.confirm('Withdraw this invitation? The link stops working immediately.')) return;
    try {
      const res = await fetch(`/api/montree/org/invites/${id}`, {
        method: 'DELETE',
        headers: { 'x-super-admin-token': token },
      });
      if (res.ok) setInvites((prev) => (prev ? prev.filter((i) => i.id !== id) : prev));
    } catch { /* the list refreshes on next load */ }
  };

  const open = (invites ?? []).filter((i) => i.status === 'valid');
  const settled = (invites ?? []).filter((i) => i.status !== 'valid');

  return (
    <div style={{ minHeight: '100vh', background: T.bg, position: 'relative' }}>
      <div aria-hidden style={{ position: 'fixed', inset: 0, background: T.glow, pointerEvents: 'none' }} />
      <div style={{ position: 'relative', maxWidth: 1080, margin: '0 auto', padding: '32px 22px 80px' }}>

        <header style={{ marginBottom: 26 }}>
          <Link href="/montree/super-admin" style={{ fontFamily: T.sans, fontSize: 12.5, color: T.emeraldDim, textDecoration: 'none' }}>
            ← Back to Montree Admin
          </Link>
          <h1 style={{ fontFamily: T.serif, fontSize: 32, fontWeight: 500, color: T.textPrimary, margin: '14px 0 0', letterSpacing: -0.5 }}>
            🏛 Organizations
          </h1>
          <p style={{ fontFamily: T.sans, fontSize: 14, color: T.textSecondary, margin: '8px 0 0', lineHeight: 1.65, maxWidth: 800 }}>
            School groups, chains and programme offices sitting above their own schools. There is no
            self-serve way in — you mint a link here and send it to the person yourself. They register
            their organization, then invite their own schools from their dashboard.
          </p>
        </header>

        {!token ? (
          <Card>
            <h2 style={{ fontFamily: T.serif, fontSize: 20, color: T.textPrimary, margin: '0 0 12px' }}>Sign in</h2>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void signIn(); }}
                placeholder="Super-admin password"
                style={{
                  flex: '1 1 240px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.14)',
                  borderRadius: 10, padding: '10px 13px', color: T.textPrimary, fontFamily: T.sans, fontSize: 14,
                }}
              />
              <button
                type="button"
                onClick={() => void signIn()}
                style={{
                  background: T.emerald, color: '#062017', border: 'none', borderRadius: 10,
                  padding: '10px 18px', fontFamily: T.sans, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Sign in
              </button>
            </div>
            {authError ? (
              <p style={{ fontFamily: T.sans, fontSize: 12.5, color: '#f2a883', margin: '10px 0 0' }}>{authError}</p>
            ) : null}
          </Card>
        ) : migrationPending ? (
          <Card>
            <h2 style={{ fontFamily: T.serif, fontSize: 20, color: T.textPrimary, margin: '0 0 10px' }}>Almost there</h2>
            <p style={{ fontFamily: T.sans, fontSize: 13.5, color: T.textSecondary, margin: 0, lineHeight: 1.65 }}>{migrationPending}</p>
            <p style={{ fontFamily: T.sans, fontSize: 12.5, color: T.textMuted, margin: '12px 0 0' }}>
              Run <code>migrations/315_montree_organizations.sql</code>, then reload.
            </p>
          </Card>
        ) : loadError ? (
          <Card>
            <h2 style={{ fontFamily: T.serif, fontSize: 20, color: T.textPrimary, margin: '0 0 10px' }}>Could not load organizations</h2>
            <p style={{ fontFamily: T.sans, fontSize: 13.5, color: T.textSecondary, margin: 0, lineHeight: 1.65 }}>{loadError}</p>
            <button
              type="button"
              onClick={() => token && void load(token)}
              style={{
                marginTop: 16, background: T.emerald, color: '#062017', border: 'none', borderRadius: 10,
                padding: '9px 16px', fontFamily: T.sans, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </Card>
        ) : (
          <>
            <Section title="Invite an organization">
              {freshLink ? (
                <InviteLinkCard
                  link={freshLink.link}
                  expiresAt={freshLink.expiresAt}
                  title="The link is ready"
                  hint="Send this to the person who will lead the organization. It works once, then it is spent."
                  tone="dark"
                  onDone={() => setFreshLink(null)}
                />
              ) : (
                <Card>
                  <label style={{ display: 'block', fontFamily: T.sans, fontSize: 12.5, color: T.textSecondary, marginBottom: 6 }}>
                    Organization name (optional — greets them by name and pre-fills the form)
                  </label>
                  <input
                    type="text"
                    value={prefillName}
                    onChange={(e) => setPrefillName(e.target.value)}
                    placeholder="Sunrise Montessori Group"
                    style={inputStyle}
                  />
                  <label style={{ display: 'block', fontFamily: T.sans, fontSize: 12.5, color: T.textSecondary, margin: '14px 0 6px' }}>
                    Note to yourself (optional — only you ever see this)
                  </label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Met at the Shenzhen conference, 6 schools"
                    style={inputStyle}
                  />
                  {mintError ? (
                    <p style={{ fontFamily: T.sans, fontSize: 12.5, color: '#f2a883', margin: '12px 0 0' }}>{mintError}</p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void mint()}
                    disabled={minting}
                    style={{
                      marginTop: 16, background: T.emerald, color: '#062017', border: 'none', borderRadius: 10,
                      padding: '10px 18px', fontFamily: T.sans, fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    {minting ? 'Creating the link…' : 'Create an invite link'}
                  </button>
                  <p style={{ fontFamily: T.sans, fontSize: 12, color: T.textMuted, margin: '12px 0 0', lineHeight: 1.6 }}>
                    Links last 14 days, work once, and can be withdrawn any time before they are used.
                    Nothing is emailed — you share it yourself.
                  </p>
                </Card>
              )}
            </Section>

            <Section title="Organizations" subtitle="Newest first. School counts include every school registered through that organization's own invite links.">
              {orgs === null ? (
                <div className="animate-pulse" aria-hidden style={{ height: 120, background: 'rgba(255,255,255,0.04)', borderRadius: 16 }} />
              ) : orgs.length === 0 ? (
                <EmptyState
                  headline="No organization has registered yet"
                  lead="This fills in the moment someone accepts one of your invite links."
                  steps={[
                    { title: 'Mint a link above', detail: 'Add the organization name if you know it — the landing page greets them by it.' },
                    { title: 'Send it to them yourself', detail: 'WhatsApp, WeChat, email, or point their phone at the QR code. Montree does not send it for you.' },
                    { title: 'They register and start inviting schools', detail: 'Their dashboard at /montree/org mints school links of its own, and each school that registers is linked automatically.' },
                  ]}
                />
              ) : (
                <>
                  <TileRow>
                    <StatTile label="Organizations" value={String(orgs.length)} tone="hero" />
                    <StatTile
                      label="Schools inside them"
                      value={String(orgs.reduce((a, o) => a + o.schoolCount, 0))}
                      context="Registered through an organization invite link"
                    />
                  </TileRow>
                  <div style={{ marginTop: 16 }}>
                    <Card>
                      <DataTable
                        head={['Organization', 'Leader', 'Email', 'Schools', 'Joined']}
                        rows={orgs.map((o) => [
                          o.name,
                          o.contactName ?? '—',
                          o.contactEmail ?? '—',
                          o.schoolCount,
                          new Date(o.createdAt).toLocaleDateString(),
                        ])}
                      />
                    </Card>
                  </div>
                </>
              )}
            </Section>

            <Section title="Invitations" subtitle="Organization links you have minted. A link you withdraw stops working immediately and disappears from this list.">
              {invites === null ? (
                <div className="animate-pulse" aria-hidden style={{ height: 90, background: 'rgba(255,255,255,0.04)', borderRadius: 16 }} />
              ) : invites.length === 0 ? (
                <Card>
                  <p style={{ fontFamily: T.sans, fontSize: 13.5, color: T.textSecondary, margin: 0, lineHeight: 1.7 }}>
                    You have not minted any organization links yet.
                  </p>
                </Card>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {[...open, ...settled].map((i) => (
                    <Card key={i.id} padding={14}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontFamily: T.sans, fontSize: 14, color: T.textPrimary }}>
                            {i.prefillName || 'Unnamed invitation'}
                          </div>
                          <div style={{ fontFamily: T.sans, fontSize: 12, color: T.textMuted, marginTop: 3 }}>
                            {i.status === 'valid'
                              ? `Open · works until ${new Date(i.expiresAt).toLocaleDateString()}`
                              : i.status === 'used'
                                ? `Accepted by ${i.usedByEmail ?? '—'}`
                                : 'Expired'}
                            {i.note ? ` · ${i.note}` : ''}
                          </div>
                        </div>
                        {i.status === 'valid' || i.status === 'expired' ? (
                          <button
                            type="button"
                            onClick={() => void revoke(i.id)}
                            style={{
                              background: 'transparent', color: T.textSecondary,
                              border: '1px solid rgba(255,255,255,0.14)', borderRadius: 10,
                              padding: '9px 16px', fontFamily: T.sans, fontSize: 13, cursor: 'pointer',
                            }}
                          >
                            Withdraw
                          </button>
                        ) : null}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Section>
          </>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 10,
  padding: '10px 13px',
  color: 'rgba(255,255,255,0.92)',
  fontFamily: T.sans,
  fontSize: 14,
};
