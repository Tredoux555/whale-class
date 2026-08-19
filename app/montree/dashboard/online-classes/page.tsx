'use client';

/**
 * /montree/dashboard/online-classes — the TEACHER surface for Dark Phonics Live.
 *
 * Three jobs, one page:
 *   1. Upcoming classes  → GET  /api/montree/dark-phonics-live/classes?as=teacher
 *   2. Class credits     → GET  /api/montree/dark-phonics-live/credits/admin
 *                          POST /api/montree/dark-phonics-live/credits/grant
 *   3. Past classes      → same classes call, `past[]`, with a recap indicator
 *
 * Auth is the cookie the API routes already read (verifySchoolRequest); this
 * page holds no session logic of its own — it just reacts to 401 by pointing at
 * the login screen, and to 404 (the flag-off response) with an explain state.
 *
 * Visual language: ordinary Montree dark-forest, NOT the Midnight Studio
 * classroom skin — this page lives inside the normal dashboard.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CalendarClock,
  ChevronDown,
  ChevronRight,
  Coins,
  Loader2,
  Plus,
  Sparkles,
  Video,
} from 'lucide-react';

import GrantCreditsForm from '@/components/montree/dark-phonics-live/portal/GrantCreditsForm';
import {
  CLASS_TZ_LABEL,
  PT,
  STATUS_LABEL,
  cardStyle,
  formatClassDateTime,
  getJson,
  ghostButtonStyle,
  isLiveEligible,
  primaryButtonStyle,
  sectionLabelStyle,
  stateForStatus,
  type CreditAdminRow,
  type CreditsAdminResponse,
  type DplAppointment,
  type DplClassesResponse,
  type DplPastAppointment,
  type LoadState,
} from '@/components/montree/dark-phonics-live/portal/portal-shared';

export default function TeacherOnlineClassesPage() {
  const [classesState, setClassesState] = useState<LoadState>('loading');
  const [upcoming, setUpcoming] = useState<DplAppointment[]>([]);
  const [past, setPast] = useState<DplPastAppointment[]>([]);

  const [creditsState, setCreditsState] = useState<LoadState>('loading');
  const [creditRows, setCreditRows] = useState<CreditAdminRow[]>([]);

  const [grantFor, setGrantFor] = useState<string | null>(null);
  const [showPast, setShowPast] = useState(false);

  const loadClasses = useCallback(async () => {
    const { status, data } = await getJson<DplClassesResponse>(
      '/api/montree/dark-phonics-live/classes?as=teacher'
    );
    const next = stateForStatus(status);
    setClassesState(next);
    if (next === 'ready') {
      setUpcoming(data && Array.isArray(data.upcoming) ? data.upcoming : []);
      setPast(data && Array.isArray(data.past) ? data.past : []);
    }
  }, []);

  const loadCredits = useCallback(async () => {
    const { status, data } = await getJson<CreditsAdminResponse>(
      '/api/montree/dark-phonics-live/credits/admin'
    );
    const next = stateForStatus(status);
    setCreditsState(next);
    if (next === 'ready') {
      setCreditRows(data && Array.isArray(data.children) ? data.children : []);
    }
  }, []);

  useEffect(() => {
    void loadClasses();
    void loadCredits();
  }, [loadClasses, loadCredits]);

  /** Optimistic balance nudge while the grant POST is in flight. */
  const applyOptimistic = useCallback((childId: string, delta: number) => {
    setCreditRows((rows) =>
      rows.map((r) => (r.childId === childId ? { ...r, balance: r.balance + delta } : r))
    );
  }, []);

  /** Authoritative balance from the server (null = grant failed, keep rollback). */
  const applySettled = useCallback((childId: string, balance: number | null) => {
    if (balance === null) return;
    setCreditRows((rows) => rows.map((r) => (r.childId === childId ? { ...r, balance } : r)));
  }, []);

  const bothLoading = classesState === 'loading' && creditsState === 'loading';
  const flagOff = classesState === 'flagOff' || creditsState === 'flagOff';
  const needsLogin = classesState === 'unauthorized' || creditsState === 'unauthorized';

  /* ---------------------------------------------------------------- shell */

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen" style={{ background: PT.bg, fontFamily: PT.sans }}>
      <div style={{ background: PT.glow }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 20px 90px' }}>
          <Link
            href="/montree/dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              color: PT.textFaint,
              fontSize: 13.5,
              textDecoration: 'none',
              marginBottom: 30,
            }}
          >
            ← Dashboard
          </Link>

          <header style={{ marginBottom: 34 }}>
            <span style={sectionLabelStyle}>Dark Phonics Live</span>
            <h1
              style={{
                fontFamily: PT.serif,
                fontWeight: 400,
                fontSize: 'clamp(1.9rem, 5vw, 2.5rem)',
                color: '#fff',
                lineHeight: 1.1,
                letterSpacing: '-0.022em',
                marginTop: 10,
              }}
            >
              Online Classes
            </h1>
            <p style={{ marginTop: 8, color: PT.textMuted, fontSize: 14 }}>
              1-on-1 phonics classes · all times shown in {CLASS_TZ_LABEL}
            </p>
          </header>

          {children}
        </div>
      </div>
    </div>
  );

  if (bothLoading) {
    return shell(
      <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 10, color: PT.textMuted }}>
        <Loader2 size={16} className="animate-spin" /> Loading classes…
      </div>
    );
  }

  if (flagOff) {
    return shell(
      <div style={{ ...cardStyle, textAlign: 'center', padding: '38px 24px' }}>
        <Sparkles size={22} color={PT.gold} style={{ marginBottom: 12 }} />
        <div style={{ fontSize: 16, fontWeight: 600, color: PT.textPrimary, marginBottom: 8 }}>
          Online Classes isn&apos;t enabled for this school
        </div>
        <p style={{ fontSize: 13.5, color: PT.textMuted, lineHeight: 1.6, margin: 0 }}>
          Dark Phonics Live is switched off. Ask a super-admin to turn on the{' '}
          <b style={{ color: PT.textSecondary }}>dark_phonics_live</b> feature for your school, then
          reload this page.
        </p>
      </div>
    );
  }

  if (needsLogin) {
    return shell(
      <div style={{ ...cardStyle, textAlign: 'center', padding: '38px 24px' }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: PT.textPrimary, marginBottom: 8 }}>
          Please sign in again
        </div>
        <p style={{ fontSize: 13.5, color: PT.textMuted, lineHeight: 1.6, marginBottom: 20 }}>
          Your teacher session has expired.
        </p>
        <Link href="/montree/login?redirect=%2Fmontree%2Fdashboard%2Fonline-classes" style={primaryButtonStyle}>
          Sign in
        </Link>
      </div>
    );
  }

  /* ------------------------------------------------------------ main body */

  return shell(
    <div style={{ display: 'flex', flexDirection: 'column', gap: 34 }}>
      {/* ---------------------------------------------------- upcoming --- */}
      <section>
        <h2
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 15,
            fontWeight: 600,
            color: PT.textPrimary,
            margin: '0 0 12px',
          }}
        >
          <CalendarClock size={16} color={PT.emerald} /> Upcoming classes
        </h2>

        {classesState === 'loading' ? (
          <div style={{ ...cardStyle, color: PT.textMuted, fontSize: 13.5 }}>Loading…</div>
        ) : classesState === 'error' ? (
          <div style={{ ...cardStyle, color: PT.red, fontSize: 13.5 }}>
            Couldn&apos;t load classes.{' '}
            <button onClick={() => void loadClasses()} style={{ ...ghostButtonStyle, marginLeft: 8 }}>
              Retry
            </button>
          </div>
        ) : upcoming.length === 0 ? (
          <div style={{ ...cardStyle, color: PT.textMuted, fontSize: 13.5 }}>
            No classes booked yet. Parents book from their own Online Classes page once they have
            credits.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {upcoming.map((appt) => (
              <div
                key={appt.id}
                style={{
                  ...cardStyle,
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: PT.textPrimary }}>
                    {appt.childName || 'Child'}
                  </div>
                  <div style={{ fontSize: 12.5, color: PT.textMuted, marginTop: 3 }}>
                    {formatClassDateTime(appt.scheduledStart)} · {appt.durationMinutes} min
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: 999,
                    background: appt.status === 'confirmed' ? PT.emeraldSoft : PT.goldSoft,
                    color: appt.status === 'confirmed' ? PT.emerald : PT.gold,
                  }}
                >
                  {STATUS_LABEL[appt.status] ?? appt.status}
                </span>
                {isLiveEligible(appt.status) && (
                  <Link
                    href={`/montree/dashboard/live/${appt.id}`}
                    style={{ ...primaryButtonStyle, padding: '9px 16px', fontSize: 13.5 }}
                  >
                    <Video size={14} /> Enter classroom
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ----------------------------------------------------- credits --- */}
      <section>
        <h2
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 15,
            fontWeight: 600,
            color: PT.textPrimary,
            margin: '0 0 4px',
          }}
        >
          <Coins size={16} color={PT.gold} /> Class credits
        </h2>
        <p style={{ fontSize: 12.5, color: PT.textMuted, margin: '0 0 12px' }}>
          One credit = one 25-minute class. Grant credits after a parent pays (WeChat, cash,
          transfer) and note what you received.
        </p>

        {creditsState === 'loading' ? (
          <div style={{ ...cardStyle, color: PT.textMuted, fontSize: 13.5 }}>Loading balances…</div>
        ) : creditsState === 'error' ? (
          <div style={{ ...cardStyle, color: PT.red, fontSize: 13.5 }}>
            Couldn&apos;t load credit balances.{' '}
            <button onClick={() => void loadCredits()} style={{ ...ghostButtonStyle, marginLeft: 8 }}>
              Retry
            </button>
          </div>
        ) : creditRows.length === 0 ? (
          <div style={{ ...cardStyle, color: PT.textMuted, fontSize: 13.5 }}>
            No children linked to a parent account yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {creditRows.map((row) => (
              <div key={row.childId} style={{ ...cardStyle, padding: '13px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 600, color: PT.textPrimary }}>
                      {row.childName}
                    </div>
                    <div style={{ fontSize: 12, color: PT.textMuted, marginTop: 2 }}>
                      {row.parentName || 'No parent on file'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        fontFamily: PT.serif,
                        fontSize: 22,
                        lineHeight: 1,
                        color: row.balance > 0 ? PT.emerald : PT.textMuted,
                      }}
                    >
                      {row.balance}
                    </div>
                    <div style={{ fontSize: 10.5, color: PT.textFaint, letterSpacing: '0.08em' }}>
                      CREDITS
                    </div>
                  </div>
                  <button
                    onClick={() => setGrantFor(grantFor === row.childId ? null : row.childId)}
                    style={ghostButtonStyle}
                  >
                    <Plus size={13} /> Grant credits
                  </button>
                </div>

                {grantFor === row.childId && (
                  <GrantCreditsForm
                    childId={row.childId}
                    childName={row.childName}
                    onOptimistic={applyOptimistic}
                    onSettled={applySettled}
                    onClose={() => setGrantFor(null)}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* -------------------------------------------------------- past --- */}
      <section>
        <button
          onClick={() => setShowPast((v) => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            fontSize: 13.5,
            fontWeight: 500,
            color: PT.textSecondary,
            fontFamily: PT.sans,
          }}
        >
          {showPast ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          Past classes {past.length > 0 && `(${past.length})`}
        </button>

        {showPast && (
          <div style={{ marginTop: 12 }}>
            {classesState !== 'ready' ? (
              <div style={{ ...cardStyle, color: PT.textMuted, fontSize: 13.5 }}>
                Past classes are unavailable right now.
              </div>
            ) : past.length === 0 ? (
              <div style={{ ...cardStyle, color: PT.textMuted, fontSize: 13.5 }}>
                No finished classes yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {past.map((appt) => (
                  <div
                    key={appt.id}
                    style={{
                      ...cardStyle,
                      padding: '11px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      flexWrap: 'wrap',
                      background: 'rgba(255,255,255,0.03)',
                    }}
                  >
                    <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, color: PT.textSecondary }}>
                        {appt.childName || 'Child'}
                      </div>
                      <div style={{ fontSize: 11.5, color: PT.textFaint, marginTop: 2 }}>
                        {formatClassDateTime(appt.scheduledStart)} ·{' '}
                        {STATUS_LABEL[appt.status] ?? appt.status}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '3px 9px',
                        borderRadius: 999,
                        background: appt.hasRecap ? PT.emeraldSoft : 'rgba(255,255,255,0.05)',
                        color: appt.hasRecap ? PT.emerald : PT.textFaint,
                      }}
                    >
                      {appt.hasRecap ? 'Recap sent' : 'No recap'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
