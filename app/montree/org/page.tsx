'use client';

/**
 * /montree/org — the ORGANIZATION dashboard.
 *
 * ┌─────────────────────────────────────────────────────────────────────────────────┐
 * │ 🚫 NEVER-PARENT. Leadership surface. Nothing here is imported from, or linked to, │
 * │ app/montree/parent/** or components/parent/**.                                    │
 * └─────────────────────────────────────────────────────────────────────────────────┘
 *
 * The home of the second link in the onboarding chain. An organisation leader arrives here
 * straight out of /montree/org/join/[token], already signed in, with nothing at all — and
 * this page's whole job is to make the next move obvious: invite a school.
 *
 * What lives here:
 *   • the organisation's schools, with children / teachers / Milestones participation;
 *   • "Invite a school" → a link, a QR code and a copy button (delivery is by hand — see
 *     components/montree/org/InviteLinkCard for why email is not the mechanism);
 *   • outstanding invitations, with a withdraw button while they are still unused;
 *   • Montree Milestones across the organisation's own schools — the org-level report
 *     finally reading its own data rather than standing in on the platform view;
 *   • "How onboarding works", written out in plain language, because the person reading
 *     this has to explain the whole chain to principals who have never seen Montree.
 *
 * Empty states are treated as first-class: a brand-new organisation with no schools and no
 * invitations is the MOST common state this page will ever be in.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/montree/i18n';
import LanguageToggle from '@/components/montree/LanguageToggle';
import InviteLinkCard from '@/components/montree/org/InviteLinkCard';
import MapComparisonChart, { type MapComparisonRow } from '@/components/montree/evaluation-reports/MapComparisonChart';
import { Callout, Card, EmptyState, Section, StatTile, SuppressionNote, TileRow } from '@/components/montree/evaluation-reports/ReportChrome';
import { T, pct, windowLabel } from '@/components/montree/evaluation-reports/tokens';

interface OrgSchool {
  id: string;
  name: string;
  slug: string | null;
  createdAt: string | null;
  principalName: string | null;
  principalEmail: string | null;
  subscriptionStatus: string | null;
  childCount: number;
  teacherCount: number;
  milestonesEnabled: boolean;
  milestonesCheckIns: number;
}

interface SchoolsPayload {
  available: true;
  organization: { id: string; name: string; slug: string };
  admin: { id: string; name: string; email: string };
  schools: OrgSchool[];
  totals: { schools: number; children: number; teachers: number; milestonesSchools: number };
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

interface MilestonesPayload {
  available: true;
  scope: { schoolYear: string; window: string; compareWindow?: string | null };
  windows: Array<{ windowCode: string; completed: number; children: number }>;
  schools: Array<{
    schoolId: string; name: string; childrenAssessed: number; reportableChildren: number;
    mapMeanPercent: number | null; denominatorMean: number | null;
    suppressed: boolean; suppressionReason: string | null;
  }>;
  totals: {
    schools: number; schoolsWithData: number; childrenAssessed: number; sessionsCompleted: number;
    mapMeanPercent: number | null; denominatorMean: number | null; reportableChildren: number;
    suppressed: boolean; suppressionReason: string | null;
  };
}

type Load =
  | { kind: 'loading' }
  | { kind: 'unauthorized' }
  | { kind: 'migration_pending'; message: string }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; data: SchoolsPayload };

export default function OrgDashboardPage() {
  const { t } = useI18n();
  const router = useRouter();

  const [state, setState] = useState<Load>({ kind: 'loading' });
  const [invites, setInvites] = useState<InviteRow[] | null>(null);
  const [milestones, setMilestones] = useState<MilestonesPayload | null>(null);

  // Invite composer
  const [composerOpen, setComposerOpen] = useState(false);
  const [prefillName, setPrefillName] = useState('');
  const [note, setNote] = useState('');
  const [minting, setMinting] = useState(false);
  const [mintError, setMintError] = useState('');
  const [freshLink, setFreshLink] = useState<{ link: string; expiresAt: string } | null>(null);

  const loadSchools = useCallback(async () => {
    try {
      const res = await fetch('/api/montree/org/schools', { cache: 'no-store' });
      const body = await res.json().catch(() => null);
      if (res.status === 401 || res.status === 403) { setState({ kind: 'unauthorized' }); return; }
      if (res.status === 503 && body?.migration_pending) {
        setState({ kind: 'migration_pending', message: body.message ?? '' });
        return;
      }
      if (!res.ok || !body?.available) {
        setState({ kind: 'error', message: body?.error ?? t('org.dash.loadFailed') });
        return;
      }
      setState({ kind: 'ready', data: body as SchoolsPayload });
    } catch {
      setState({ kind: 'error', message: t('org.dash.loadFailed') });
    }
  }, [t]);

  const loadInvites = useCallback(async () => {
    try {
      const res = await fetch('/api/montree/org/invites', { cache: 'no-store' });
      const body = await res.json().catch(() => null);
      if (res.ok && body?.available) setInvites(body.invites as InviteRow[]);
      else setInvites([]);
    } catch {
      setInvites([]);
    }
  }, []);

  const loadMilestones = useCallback(async () => {
    try {
      const res = await fetch('/api/montree/org/reports/milestones', { cache: 'no-store' });
      const body = await res.json().catch(() => null);
      if (res.ok && body?.available) setMilestones(body as MilestonesPayload);
      else setMilestones(null);
    } catch {
      setMilestones(null);
    }
  }, []);

  useEffect(() => {
    void loadSchools();
    void loadInvites();
    void loadMilestones();
  }, [loadSchools, loadInvites, loadMilestones]);

  // No session (or a session that is no longer an org leader's) → the org login page, never
  // a dead end. The card below is only what shows for the instant before the route changes,
  // and it stays on screen if the client-side navigation is blocked for any reason.
  useEffect(() => {
    if (state.kind === 'unauthorized') router.replace('/montree/org/login');
  }, [state.kind, router]);

  const mintInvite = async () => {
    setMinting(true);
    setMintError('');
    try {
      const res = await fetch('/api/montree/org/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviteType: 'school',
          prefillName: prefillName.trim() || undefined,
          note: note.trim() || undefined,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || t('org.dash.inviteFailed'));
      setFreshLink({ link: body.link, expiresAt: body.invite.expiresAt });
      setPrefillName('');
      setNote('');
      void loadInvites();
    } catch (err) {
      setMintError(err instanceof Error ? err.message : t('org.dash.inviteFailed'));
    } finally {
      setMinting(false);
    }
  };

  const revoke = async (id: string) => {
    if (!window.confirm(t('org.dash.revokeConfirm'))) return;
    try {
      const res = await fetch(`/api/montree/org/invites/${id}`, { method: 'DELETE' });
      if (res.ok) setInvites((prev) => (prev ? prev.filter((i) => i.id !== id) : prev));
    } catch { /* the list refreshes on next load */ }
  };

  // ── Chrome ─────────────────────────────────────────────────────────────────────────────
  const shell = (children: React.ReactNode) => (
    <div style={{ minHeight: '100vh', background: T.bg, position: 'relative' }}>
      <div aria-hidden style={{ position: 'fixed', inset: 0, background: T.glow, pointerEvents: 'none' }} />
      <div style={{ position: 'relative', maxWidth: 1080, margin: '0 auto', padding: '28px 22px 90px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <Link href="/montree" style={{ fontFamily: T.serif, fontSize: 20, color: '#E8C96A', textDecoration: 'none' }}>
            {t('app.name')}
          </Link>
          <LanguageToggle className="bg-white/10 hover:bg-white/20 text-white border border-white/[0.08]" />
        </div>
        {children}
      </div>
    </div>
  );

  if (state.kind === 'loading') {
    return shell(
      <div className="animate-pulse" aria-hidden style={{ display: 'grid', gap: 14 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ height: i === 0 ? 96 : 200, background: 'rgba(255,255,255,0.04)', borderRadius: 16 }} />
        ))}
      </div>,
    );
  }

  if (state.kind === 'unauthorized') {
    return shell(
      <Card>
        <h1 style={{ fontFamily: T.serif, fontSize: 24, color: T.textPrimary, margin: '0 0 10px' }}>
          {t('org.dash.signedOutTitle')}
        </h1>
        <p style={{ fontFamily: T.sans, fontSize: 14, color: T.textSecondary, margin: 0, lineHeight: 1.7 }}>
          {t('org.dash.signedOutBody')}
        </p>
        <Link
          href="/montree/org/login"
          style={{
            display: 'inline-block', marginTop: 16, background: T.emerald, color: '#062017',
            borderRadius: 10, padding: '10px 18px', fontFamily: T.sans, fontSize: 13.5,
            fontWeight: 600, textDecoration: 'none',
          }}
        >
          {t('org.dash.goToLogin')}
        </Link>
      </Card>,
    );
  }

  if (state.kind === 'migration_pending') {
    return shell(
      <Card>
        <h1 style={{ fontFamily: T.serif, fontSize: 24, color: T.textPrimary, margin: '0 0 10px' }}>
          {t('org.dash.almostThere')}
        </h1>
        <p style={{ fontFamily: T.sans, fontSize: 14, color: T.textSecondary, margin: 0, lineHeight: 1.7 }}>
          {state.message}
        </p>
        <p style={{ fontFamily: T.sans, fontSize: 12.5, color: T.textMuted, margin: '12px 0 0' }}>
          <code>migrations/315_montree_organizations.sql</code>
        </p>
      </Card>,
    );
  }

  if (state.kind === 'error') {
    return shell(
      <Card>
        <h1 style={{ fontFamily: T.serif, fontSize: 24, color: T.textPrimary, margin: '0 0 10px' }}>
          {t('org.dash.loadFailed')}
        </h1>
        <p style={{ fontFamily: T.sans, fontSize: 14, color: T.textSecondary, margin: 0, lineHeight: 1.7 }}>{state.message}</p>
        <button
          type="button"
          onClick={() => void loadSchools()}
          style={{
            marginTop: 16, background: T.emerald, color: '#062017', border: 'none', borderRadius: 10,
            padding: '9px 16px', fontFamily: T.sans, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          {t('common.tryAgain')}
        </button>
      </Card>,
    );
  }

  const { data } = state;
  const openInvites = (invites ?? []).filter((i) => i.status === 'valid');
  const settledInvites = (invites ?? []).filter((i) => i.status !== 'valid');

  return shell(
    <>
      <header style={{ marginBottom: 26 }}>
        <div style={{ fontFamily: T.sans, fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.emeraldDim }}>
          {t('org.dash.eyebrow')}
        </div>
        <h1 style={{ fontFamily: T.serif, fontSize: 32, fontWeight: 500, color: T.textPrimary, margin: '10px 0 0', letterSpacing: -0.5 }}>
          {data.organization.name}
        </h1>
        <p style={{ fontFamily: T.sans, fontSize: 14, color: T.textSecondary, margin: '8px 0 0', lineHeight: 1.65, maxWidth: 760 }}>
          {t('org.dash.subtitle', { name: data.admin.name })}
        </p>
      </header>

      <Section title={t('org.dash.atAGlance')}>
        <TileRow>
          <StatTile label={t('org.dash.schools')} value={String(data.totals.schools)} context={t('org.dash.schoolsContext')} tone="hero" />
          <StatTile label={t('org.dash.children')} value={String(data.totals.children)} context={t('org.dash.childrenContext')} />
          <StatTile label={t('org.dash.teachers')} value={String(data.totals.teachers)} context={t('org.dash.teachersContext')} />
        </TileRow>
      </Section>

      {/* ── Invite a school ─────────────────────────────────────────────────────────── */}
      <Section title={t('org.dash.inviteTitle')} subtitle={t('org.dash.inviteSubtitle')}>
        {freshLink ? (
          <InviteLinkCard
            link={freshLink.link}
            expiresAt={freshLink.expiresAt}
            title={t('org.dash.linkReadyTitle')}
            hint={t('org.dash.linkReadyHint')}
            tone="dark"
            onDone={() => setFreshLink(null)}
          />
        ) : composerOpen ? (
          <Card>
            <label style={{ display: 'block', fontFamily: T.sans, fontSize: 12.5, color: T.textSecondary, marginBottom: 6 }}>
              {t('org.dash.prefillLabel')}
            </label>
            <input
              type="text"
              value={prefillName}
              onChange={(e) => setPrefillName(e.target.value)}
              placeholder={t('org.dash.prefillPlaceholder')}
              style={inputStyle}
            />
            <label style={{ display: 'block', fontFamily: T.sans, fontSize: 12.5, color: T.textSecondary, margin: '14px 0 6px' }}>
              {t('org.dash.noteLabel')}
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('org.dash.notePlaceholder')}
              style={inputStyle}
            />
            {mintError ? (
              <p style={{ fontFamily: T.sans, fontSize: 12.5, color: '#f2a883', margin: '12px 0 0' }}>{mintError}</p>
            ) : null}
            <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
              <button type="button" onClick={() => void mintInvite()} disabled={minting} style={primaryBtn}>
                {minting ? t('org.dash.creatingLink') : t('org.dash.createLink')}
              </button>
              <button type="button" onClick={() => { setComposerOpen(false); setMintError(''); }} style={ghostBtn}>
                {t('common.cancel')}
              </button>
            </div>
          </Card>
        ) : (
          <Card>
            <p style={{ fontFamily: T.sans, fontSize: 13.5, color: T.textSecondary, margin: '0 0 14px', lineHeight: 1.7 }}>
              {t('org.dash.inviteBlurb')}
            </p>
            <button type="button" onClick={() => setComposerOpen(true)} style={primaryBtn}>
              {t('org.dash.inviteButton')}
            </button>
          </Card>
        )}
      </Section>

      {/* ── Schools ─────────────────────────────────────────────────────────────────── */}
      <Section title={t('org.dash.schoolsTitle')} subtitle={t('org.dash.schoolsSubtitle')}>
        {data.schools.length === 0 ? (
          <EmptyState
            headline={t('org.dash.noSchoolsHeadline')}
            lead={t('org.dash.noSchoolsLead')}
            steps={[
              { title: t('org.dash.noSchoolsStep1Title'), detail: t('org.dash.noSchoolsStep1Detail') },
              { title: t('org.dash.noSchoolsStep2Title'), detail: t('org.dash.noSchoolsStep2Detail') },
              { title: t('org.dash.noSchoolsStep3Title'), detail: t('org.dash.noSchoolsStep3Detail') },
            ]}
          />
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {data.schools.map((s) => (
              <Card key={s.id} padding={16}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: T.serif, fontSize: 18, color: T.textPrimary }}>{s.name}</div>
                    <div style={{ fontFamily: T.sans, fontSize: 12.5, color: T.textMuted, marginTop: 4 }}>
                      {s.principalName || t('org.dash.principalUnknown')}
                      {s.principalEmail ? ` · ${s.principalEmail}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontFamily: T.sans, fontSize: 12.5, color: T.textSecondary }}>
                    <span>{t('org.dash.childCount', { n: String(s.childCount) })}</span>
                    <span>{t('org.dash.teacherCount', { n: String(s.teacherCount) })}</span>
                    <span style={{ color: s.milestonesEnabled ? T.emerald : T.textMuted }}>
                      {s.milestonesEnabled
                        ? t('org.dash.milestonesOn', { n: String(s.milestonesCheckIns) })
                        : t('org.dash.milestonesOff')}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Section>

      {/* ── Outstanding invitations ─────────────────────────────────────────────────── */}
      <Section title={t('org.dash.invitesTitle')} subtitle={t('org.dash.invitesSubtitle')}>
        {invites === null ? (
          <div className="animate-pulse" aria-hidden style={{ height: 90, background: 'rgba(255,255,255,0.04)', borderRadius: 16 }} />
        ) : invites.length === 0 ? (
          <Card>
            <p style={{ fontFamily: T.sans, fontSize: 13.5, color: T.textSecondary, margin: 0, lineHeight: 1.7 }}>
              {t('org.dash.noInvites')}
            </p>
          </Card>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {[...openInvites, ...settledInvites].map((i) => (
              <Card key={i.id} padding={14}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: T.sans, fontSize: 14, color: T.textPrimary }}>
                      {i.prefillName || t('org.dash.unnamedInvite')}
                    </div>
                    <div style={{ fontFamily: T.sans, fontSize: 12, color: T.textMuted, marginTop: 3 }}>
                      {i.status === 'valid'
                        ? t('org.dash.inviteOpen', { date: new Date(i.expiresAt).toLocaleDateString() })
                        : i.status === 'used'
                          ? t('org.dash.inviteAccepted', { who: i.usedByEmail || '—' })
                          : t('org.dash.inviteExpired')}
                      {i.note ? ` · ${i.note}` : ''}
                    </div>
                  </div>
                  {i.status === 'valid' || i.status === 'expired' ? (
                    <button type="button" onClick={() => void revoke(i.id)} style={ghostBtn}>
                      {t('org.dash.revoke')}
                    </button>
                  ) : null}
                </div>
              </Card>
            ))}
          </div>
        )}
      </Section>

      {/* ── Milestones, this organisation's own schools ─────────────────────────────── */}
      <Section title={t('org.dash.milestonesTitle')} subtitle={t('org.dash.milestonesSubtitle')}>
        {!milestones ? (
          <Card>
            <p style={{ fontFamily: T.sans, fontSize: 13.5, color: T.textSecondary, margin: 0, lineHeight: 1.7 }}>
              {t('org.dash.milestonesUnavailable')}
            </p>
          </Card>
        ) : !milestones.totals.schools ? (
          <Card>
            <p style={{ fontFamily: T.sans, fontSize: 13.5, color: T.textSecondary, margin: 0, lineHeight: 1.7 }}>
              {milestones.totals.suppressionReason || t('org.dash.milestonesNoneOn')}
            </p>
          </Card>
        ) : (
          <>
            <TileRow>
              <StatTile
                label={t('org.dash.msSchoolsOn')}
                value={String(milestones.totals.schools)}
                context={t('org.dash.msSchoolsOnContext', { n: String(milestones.totals.schoolsWithData) })}
              />
              <StatTile
                label={t('org.dash.msChildren')}
                value={String(milestones.totals.childrenAssessed)}
                context={t('org.dash.msChildrenContext', { n: String(milestones.totals.sessionsCompleted) })}
                tone="hero"
              />
              <StatTile
                label={t('org.dash.msSecurelyMet')}
                value={milestones.totals.suppressed ? '—' : pct(milestones.totals.mapMeanPercent, 1)}
                context={
                  milestones.totals.suppressed
                    ? t('org.dash.msNotShown')
                    : t('org.dash.msAcross', { n: String(milestones.totals.reportableChildren) })
                }
              />
            </TileRow>
            <SuppressionNote reason={milestones.totals.suppressed ? milestones.totals.suppressionReason : null} />
            {milestones.schools.length ? (
              <div style={{ marginTop: 16 }}>
                <Card>
                  <div style={{ fontFamily: T.sans, fontSize: 12.5, color: T.textMuted, marginBottom: 10 }}>
                    {windowLabel(milestones.scope.window)}
                  </div>
                  <MapComparisonChart
                    rows={milestones.schools.map((s): MapComparisonRow => ({
                      id: s.schoolId,
                      label: s.name,
                      childrenAssessed: s.childrenAssessed,
                      reportableChildren: s.reportableChildren,
                      mapMeanPercent: s.mapMeanPercent,
                      denominatorMean: s.denominatorMean,
                      suppressed: s.suppressed,
                      suppressionReason: s.suppressionReason,
                    }))}
                    unitLabel="school"
                  />
                </Card>
              </div>
            ) : null}
            <div style={{ marginTop: 16 }}>
              <Callout title={t('org.dash.msCalloutTitle')}>{t('org.dash.msCalloutBody')}</Callout>
            </div>
          </>
        )}
      </Section>

      {/* ── How onboarding works ────────────────────────────────────────────────────── */}
      <Section title={t('org.dash.howTitle')} subtitle={t('org.dash.howSubtitle')}>
        <Card>
          <ol style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 16 }}>
            {[
              { k: 'org', title: t('org.dash.how1Title'), body: t('org.dash.how1Body') },
              { k: 'school', title: t('org.dash.how2Title'), body: t('org.dash.how2Body') },
              { k: 'teacher', title: t('org.dash.how3Title'), body: t('org.dash.how3Body') },
              { k: 'child', title: t('org.dash.how4Title'), body: t('org.dash.how4Body') },
            ].map((row) => (
              <li key={row.k} style={{ fontFamily: T.sans, color: T.textSecondary }}>
                <div style={{ fontSize: 14.5, color: T.textPrimary, fontWeight: 600, marginBottom: 4 }}>{row.title}</div>
                <div style={{ fontSize: 13.5, lineHeight: 1.75 }}>{row.body}</div>
              </li>
            ))}
          </ol>
          <p style={{ fontFamily: T.sans, fontSize: 12.5, color: T.textMuted, margin: '18px 0 0', lineHeight: 1.7 }}>
            {t('org.dash.howFooter')}
          </p>
        </Card>
      </Section>
    </>,
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

const primaryBtn: React.CSSProperties = {
  background: T.emerald,
  color: '#062017',
  border: 'none',
  borderRadius: 10,
  padding: '10px 18px',
  fontFamily: T.sans,
  fontSize: 13.5,
  fontWeight: 600,
  cursor: 'pointer',
};

const ghostBtn: React.CSSProperties = {
  background: 'transparent',
  color: 'rgba(255,255,255,0.62)',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 10,
  padding: '9px 16px',
  fontFamily: T.sans,
  fontSize: 13,
  cursor: 'pointer',
};
