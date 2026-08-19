'use client';

/**
 * /montree/parent/online-classes — the PARENT surface for Dark Phonics Live.
 *
 *   credits   GET  /api/montree/dark-phonics-live/credits?childId=…   (per child)
 *   classes   GET  /api/montree/dark-phonics-live/classes
 *   booking   POST /api/montree/dark-phonics-live/book
 *   children  GET  /api/montree/parent/children   ← existing Montree endpoint,
 *             the same one the parent dashboard uses (resolveAuthorizedParent →
 *             authorizedChildIds). If it ever fails we fall back to the child
 *             ids/names embedded in the classes response.
 *
 * Written for Chinese parents on phones: short English with a zh gloss on the
 * things that matter (book / join / no classes left), every time in Beijing.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarClock, Coins, History, Loader2, Sparkles, Star } from 'lucide-react';

import BookClassForm from '@/components/montree/dark-phonics-live/portal/BookClassForm';
import JoinClassButton from '@/components/montree/dark-phonics-live/portal/JoinClassButton';
import {
  CLASS_TZ_LABEL,
  PT,
  STATUS_LABEL,
  cardStyle,
  formatClassDateTime,
  formatShortDate,
  getJson,
  ghostButtonStyle,
  primaryButtonStyle,
  reasonLabel,
  sectionLabelStyle,
  stateForStatus,
  type CreditLedgerEntry,
  type CreditsResponse,
  type DplClassesResponse,
  type DplAppointment,
  type DplPastAppointment,
  type LoadState,
  type ParentChild,
} from '@/components/montree/dark-phonics-live/portal/portal-shared';

interface LedgerLine extends CreditLedgerEntry {
  childName: string;
}

export default function ParentOnlineClassesPage() {
  const [classesState, setClassesState] = useState<LoadState>('loading');
  const [upcoming, setUpcoming] = useState<DplAppointment[]>([]);
  const [past, setPast] = useState<DplPastAppointment[]>([]);

  const [children, setChildren] = useState<ParentChild[]>([]);
  /** True when the child list came from the classes payload, not /parent/children. */
  const [childrenDerived, setChildrenDerived] = useState(false);

  const [creditsState, setCreditsState] = useState<LoadState>('loading');
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [ledger, setLedger] = useState<LedgerLine[]>([]);

  /* ------------------------------------------------------------- loaders */

  const loadClasses = useCallback(async () => {
    const { status, data } = await getJson<DplClassesResponse>(
      '/api/montree/dark-phonics-live/classes'
    );
    const next = stateForStatus(status);
    setClassesState(next);
    const up = data && Array.isArray(data.upcoming) ? data.upcoming : [];
    const pa = data && Array.isArray(data.past) ? data.past : [];
    if (next === 'ready') {
      setUpcoming(up);
      setPast(pa);
    }
    return [...up, ...pa];
  }, []);

  const loadChildren = useCallback(async (fromClasses: DplAppointment[]) => {
    const { status, data } = await getJson<{ children?: ParentChild[] }>(
      '/api/montree/parent/children'
    );
    if (stateForStatus(status) === 'ready' && data && Array.isArray(data.children) && data.children.length) {
      setChildren(data.children);
      setChildrenDerived(false);
      return data.children;
    }
    // Fallback: every child that appears on one of this parent's classes.
    const seen = new Map<string, ParentChild>();
    for (const appt of fromClasses) {
      if (appt.childId && !seen.has(appt.childId)) {
        seen.set(appt.childId, { id: appt.childId, name: appt.childName || 'Your child', nickname: null });
      }
    }
    const derived = [...seen.values()];
    setChildren(derived);
    setChildrenDerived(true);
    return derived;
  }, []);

  const loadCredits = useCallback(async (kids: ParentChild[]) => {
    if (kids.length === 0) {
      setCreditsState('ready');
      setBalances({});
      setLedger([]);
      return;
    }
    const results = await Promise.all(
      kids.map(async (kid) => ({
        kid,
        res: await getJson<CreditsResponse>(
          `/api/montree/dark-phonics-live/credits?childId=${encodeURIComponent(kid.id)}`
        ),
      }))
    );

    // One 404 means the flag is off for everyone; one 401 means the session died.
    const flagOff = results.some((r) => r.res.status === 404);
    const unauthorized = results.some((r) => r.res.status === 401 || r.res.status === 403);
    if (flagOff) return setCreditsState('flagOff');
    if (unauthorized) return setCreditsState('unauthorized');
    if (results.every((r) => r.res.status >= 400)) return setCreditsState('error');

    const nextBalances: Record<string, number> = {};
    const lines: LedgerLine[] = [];
    for (const { kid, res } of results) {
      if (res.status >= 400 || !res.data) continue;
      nextBalances[kid.id] = typeof res.data.balance === 'number' ? res.data.balance : 0;
      for (const entry of Array.isArray(res.data.ledger) ? res.data.ledger : []) {
        lines.push({ ...entry, childName: kid.nickname || kid.name });
      }
    }
    lines.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    setBalances(nextBalances);
    setLedger(lines);
    setCreditsState('ready');
  }, []);

  const reload = useCallback(async () => {
    const all = await loadClasses();
    const kids = await loadChildren(all);
    await loadCredits(kids);
  }, [loadClasses, loadChildren, loadCredits]);

  useEffect(() => {
    void reload();
  }, [reload]);

  /** After a successful booking: trust the server's balance, refresh the lists. */
  const handleBooked = useCallback(
    (childId: string, creditsRemaining: number | null) => {
      if (typeof creditsRemaining === 'number') {
        setBalances((b) => ({ ...b, [childId]: creditsRemaining }));
      }
      void reload();
    },
    [reload]
  );

  const totalCredits = useMemo(
    () => Object.values(balances).reduce((sum, n) => sum + n, 0),
    [balances]
  );

  const bothLoading = classesState === 'loading' && creditsState === 'loading';
  const flagOff = classesState === 'flagOff' || creditsState === 'flagOff';
  const needsLogin = classesState === 'unauthorized' || creditsState === 'unauthorized';

  /* ---------------------------------------------------------------- shell */

  const shell = (body: React.ReactNode) => (
    <div className="min-h-screen" style={{ background: PT.bg, fontFamily: PT.sans }}>
      <div style={{ background: PT.glow }}>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '36px 18px 90px' }}>
          <Link
            href="/montree/parent/dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              color: PT.textFaint,
              fontSize: 13.5,
              textDecoration: 'none',
              marginBottom: 26,
            }}
          >
            ← Home 首页
          </Link>

          <header style={{ marginBottom: 30 }}>
            <span style={sectionLabelStyle}>Dark Phonics Live</span>
            <h1
              style={{
                fontFamily: PT.serif,
                fontWeight: 400,
                fontSize: 'clamp(1.8rem, 6vw, 2.4rem)',
                color: '#fff',
                lineHeight: 1.15,
                letterSpacing: '-0.022em',
                marginTop: 10,
              }}
            >
              Online Classes <span style={{ color: PT.textSecondary }}>在线课堂</span>
            </h1>
            <p style={{ marginTop: 8, color: PT.textMuted, fontSize: 13.5, lineHeight: 1.6 }}>
              25-minute 1-on-1 phonics classes with Teacher Tredoux. All times are {CLASS_TZ_LABEL}.
            </p>
          </header>

          {body}
        </div>
      </div>
    </div>
  );

  if (bothLoading) {
    return shell(
      <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 10, color: PT.textMuted }}>
        <Loader2 size={16} className="animate-spin" /> Loading…
      </div>
    );
  }

  if (needsLogin) {
    return shell(
      <div style={{ ...cardStyle, textAlign: 'center', padding: '36px 22px' }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: PT.textPrimary, marginBottom: 8 }}>
          Please sign in again 请重新登录
        </div>
        <p style={{ fontSize: 13.5, color: PT.textMuted, lineHeight: 1.6, marginBottom: 20 }}>
          Your session has expired.
        </p>
        <Link href="/montree/parent" style={primaryButtonStyle}>
          Sign in 登录
        </Link>
      </div>
    );
  }

  if (flagOff) {
    return shell(
      <div style={{ ...cardStyle, textAlign: 'center', padding: '36px 22px' }}>
        <Sparkles size={22} color={PT.gold} style={{ marginBottom: 12 }} />
        <div style={{ fontSize: 16, fontWeight: 600, color: PT.textPrimary, marginBottom: 8 }}>
          Online Classes isn&apos;t available on this account
        </div>
        <p style={{ fontSize: 13.5, color: PT.textMuted, lineHeight: 1.6, margin: 0 }}>
          Ask Teacher Tredoux to switch on Dark Phonics Live for your school.
          <br />
          <span style={{ color: PT.textFaint }}>请联系 Tredoux 老师开通在线课堂。</span>
        </p>
      </div>
    );
  }

  /* ------------------------------------------------------------ main body */

  return shell(
    <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
      {/* ----------------------------------------------------- balances --- */}
      <section style={{ ...cardStyle, border: PT.cardBorderStrong }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Coins size={16} color={PT.gold} />
          <h2 style={{ fontSize: 14.5, fontWeight: 600, color: PT.textPrimary, margin: 0 }}>
            Classes left 剩余课时
          </h2>
        </div>

        {creditsState === 'loading' ? (
          <div style={{ color: PT.textMuted, fontSize: 13.5 }}>Loading balance…</div>
        ) : creditsState === 'error' ? (
          <div style={{ color: PT.red, fontSize: 13.5 }}>
            Couldn&apos;t load your balance.{' '}
            <button onClick={() => void reload()} style={{ ...ghostButtonStyle, marginLeft: 8 }}>
              Retry
            </button>
          </div>
        ) : children.length === 0 ? (
          <div style={{ color: PT.textMuted, fontSize: 13.5, lineHeight: 1.6 }}>
            We couldn&apos;t find a child on your account yet. Teacher Tredoux links your child when
            your account is set up.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {children.map((kid) => {
              const bal = balances[kid.id] ?? 0;
              return (
                <div
                  key={kid.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '10px 12px',
                    borderRadius: 12,
                    background: 'rgba(0,0,0,0.20)',
                  }}
                >
                  <span style={{ fontSize: 14, color: PT.textSecondary }}>
                    {kid.nickname || kid.name}
                  </span>
                  <span
                    style={{
                      fontFamily: PT.serif,
                      fontSize: 20,
                      lineHeight: 1,
                      color: bal > 0 ? PT.emerald : PT.gold,
                    }}
                  >
                    {bal}
                  </span>
                </div>
              );
            })}
            <div style={{ fontSize: 11.5, color: PT.textFaint, marginTop: 2 }}>
              {totalCredits > 0
                ? '1 credit = 1 class. Book below.'
                : 'Message Teacher Tredoux to add classes 联系老师充值课时.'}
              {childrenDerived && (
                <>
                  <br />
                  Showing only children who already have a class booked.
                </>
              )}
            </div>
          </div>
        )}
      </section>

      {/* --------------------------------------------------------- book --- */}
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
          <CalendarClock size={16} color={PT.emerald} /> Book a class 预约课程
        </h2>
        <div style={cardStyle}>
          <BookClassForm childOptions={children} balances={balances} onBooked={handleBooked} />
        </div>
      </section>

      {/* ----------------------------------------------------- upcoming --- */}
      <section>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: PT.textPrimary, margin: '0 0 12px' }}>
          Upcoming classes 即将开始
        </h2>

        {classesState === 'loading' ? (
          <div style={{ ...cardStyle, color: PT.textMuted, fontSize: 13.5 }}>Loading…</div>
        ) : classesState === 'error' ? (
          <div style={{ ...cardStyle, color: PT.red, fontSize: 13.5 }}>
            Couldn&apos;t load your classes.{' '}
            <button onClick={() => void reload()} style={{ ...ghostButtonStyle, marginLeft: 8 }}>
              Retry
            </button>
          </div>
        ) : upcoming.length === 0 ? (
          <div style={{ ...cardStyle, color: PT.textMuted, fontSize: 13.5, lineHeight: 1.6 }}>
            No classes booked yet. Pick a time above and we&apos;ll see you in the classroom.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {upcoming.map((appt) => (
              <div key={appt.id} style={{ ...cardStyle, padding: '14px 16px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: PT.textPrimary }}>
                      {formatClassDateTime(appt.scheduledStart)}
                    </div>
                    <div style={{ fontSize: 12.5, color: PT.textMuted, marginTop: 3 }}>
                      {appt.childName || 'Your child'} · {appt.durationMinutes} min ·{' '}
                      {STATUS_LABEL[appt.status] ?? appt.status}
                    </div>
                  </div>
                  <JoinClassButton
                    appointmentId={appt.id}
                    scheduledStart={appt.scheduledStart}
                    durationMinutes={appt.durationMinutes}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* --------------------------------------------------------- past --- */}
      {past.length > 0 && (
        <section>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: PT.textPrimary, margin: '0 0 12px' }}>
            Finished classes 已完成
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {past.map((appt) => (
              <div
                key={appt.id}
                style={{
                  ...cardStyle,
                  padding: '12px 14px',
                  background: 'rgba(255,255,255,0.03)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, color: PT.textSecondary }}>
                    {formatClassDateTime(appt.scheduledStart)}
                  </div>
                  <div style={{ fontSize: 11.5, color: PT.textFaint, marginTop: 2 }}>
                    {appt.childName || 'Your child'} · {STATUS_LABEL[appt.status] ?? appt.status}
                  </div>
                </div>
                {appt.hasRecap ? (
                  <Link
                    href={`/montree/parent/recap/${appt.id}?child=${encodeURIComponent(appt.childName || '')}`}
                    style={ghostButtonStyle}
                  >
                    <Star size={13} color={PT.gold} /> View recap 课后报告
                  </Link>
                ) : (
                  <span style={{ fontSize: 11.5, color: PT.textFaint }}>Recap coming soon</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ------------------------------------------------------- ledger --- */}
      {ledger.length > 0 && (
        <section>
          <h2
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              fontSize: 13,
              fontWeight: 600,
              color: PT.textMuted,
              margin: '0 0 10px',
            }}
          >
            <History size={14} /> Credit history 课时记录
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {ledger.slice(0, 12).map((line, i) => (
              <div
                key={`${line.createdAt}-${i}`}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 8,
                  padding: '6px 10px',
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.02)',
                  fontSize: 11.5,
                  color: PT.textFaint,
                }}
              >
                <span style={{ flex: '0 0 78px' }}>{formatShortDate(line.createdAt)}</span>
                <span
                  style={{
                    flex: '0 0 34px',
                    fontWeight: 700,
                    color: line.delta >= 0 ? PT.emerald : PT.gold,
                  }}
                >
                  {line.delta > 0 ? `+${line.delta}` : line.delta}
                </span>
                <span style={{ flex: 1, minWidth: 0, color: PT.textMuted }}>
                  {reasonLabel(line.reason)}
                  {children.length > 1 ? ` · ${line.childName}` : ''}
                  {line.note ? ` · ${line.note}` : ''}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
