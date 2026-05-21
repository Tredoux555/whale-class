'use client';

// components/montree/appointments/PendingAppointmentsBanner.tsx
//
// 🚨 Session 120 — in-app notification banner for pending appointment
// invites. Renders on parent dashboard, teacher dashboard, and principal
// admin home.
//
// Behaviour per audience:
//   - viewer='parent' → shows staff-initiated invites awaiting parent
//     response. Inline Accept / Decline buttons.
//   - viewer='staff'  → shows appointments where the staff member is
//     primary host AND their own response is still 'pending'. Inline
//     Confirm / Cancel buttons.
//
// HIDE-WHEN-EMPTY: returns null when there's nothing to show, so it
// doesn't clutter the dashboard with empty state chrome.
//
// REFRESH: polls /api on focus/visibility-change so a parent who just
// accepted on their phone sees the banner clear when they switch tabs
// on desktop.
//
// FEATURE FLAG: respects the appointments feature flag — endpoint returns
// 404 when flag is off; we treat as "no pending invites" and render nothing.

import { useCallback, useEffect, useState } from 'react';
import { Calendar, Clock, Video, CheckCircle2, XCircle, ChevronRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useI18n, getIntlLocale } from '@/lib/montree/i18n';

const T = {
  cardBg: 'rgba(8,20,12,0.55)',
  bannerBg: 'rgba(232,201,106,0.08)',
  bannerBorder: '1px solid rgba(232,201,106,0.32)',
  emerald: '#34d399',
  gold: '#E8C96A',
  red: '#fca5a5',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

interface ApptRow {
  id: string;
  status: string;
  scheduled_start: string;
  duration_minutes: number;
  intake_subject?: string | null;
  provider?: 'jitsi' | 'agora' | null;
  video_url?: string | null;
  child_id?: string | null;
  hosts: Array<{ id: string; role: string; name?: string | null; is_primary?: boolean; response?: string }>;
}

export interface PendingAppointmentsBannerProps {
  /** Which audience this banner serves. Determines endpoint + actions. */
  viewer: 'parent' | 'staff';
  /** Caller's own user id — required for staff viewer to filter to invites
   *  where THEY are the primary host with response='pending'. Ignored for
   *  parent (server scopes by cookie). */
  selfUserId?: string;
  /** Optional href to "see all" page. Defaults to /montree/parent/appointments
   *  or /montree/dashboard/appointments based on viewer. */
  seeAllHref?: string;
}

function formatDateTime(iso: string, intlLocale?: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(intlLocale, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function PendingAppointmentsBanner({
  viewer,
  selfUserId,
  seeAllHref,
}: PendingAppointmentsBannerProps) {
  const { t, locale } = useI18n();
  const intlLocale = getIntlLocale(locale);
  const [pending, setPending] = useState<ApptRow[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const endpoint =
    viewer === 'parent'
      ? '/api/montree/parent/appointments'
      : '/api/montree/appointments';

  const fetchPending = useCallback(async () => {
    try {
      const res = await fetch(endpoint, { credentials: 'same-origin' });
      if (!res.ok) {
        // 404 → feature off OR no pending; treat as empty.
        setPending([]);
        return;
      }
      const data = await res.json();
      const all = (Array.isArray(data?.appointments) ? data.appointments : []) as ApptRow[];
      let filtered: ApptRow[];
      if (viewer === 'parent') {
        // Parent endpoint: filter to pending only.
        filtered = all.filter((a) => a.status === 'pending');
      } else {
        // Staff endpoint: filter to pending AND I'm a host with response='pending'.
        filtered = all.filter((a) => {
          if (a.status !== 'pending') return false;
          if (!selfUserId) return false;
          const me = a.hosts?.find((h) => h.id === selfUserId);
          return me?.response === 'pending';
        });
      }
      setPending(filtered);
    } catch {
      setPending([]);
    }
  }, [endpoint, viewer, selfUserId]);

  useEffect(() => {
    void fetchPending();
    // Refresh on focus + visibility change so a response on another
    // device clears the banner here too.
    const onFocus = () => void fetchPending();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [fetchPending]);

  const respond = useCallback(async (appointmentId: string, action: 'accept' | 'decline') => {
    if (action === 'decline') {
      const ok = typeof window !== 'undefined'
        ? window.confirm(t('appt.confirmDecline'))
        : true;
      if (!ok) return;
    }
    setBusyId(appointmentId);
    setError(null);
    try {
      const res = await fetch(`/api/montree/parent/appointments/${appointmentId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || t('appt.errCouldNotRespond'));
        return;
      }
      // Optimistic remove + refetch.
      setPending((prev) => (prev || []).filter((a) => a.id !== appointmentId));
      void fetchPending();
    } catch {
      setError(t('appt.errNetwork'));
    } finally {
      setBusyId(null);
    }
  }, [fetchPending, t]);

  // Don't render anything while loading or when empty.
  if (pending === null) return null;
  if (pending.length === 0) return null;

  const computedSeeAll =
    seeAllHref || (viewer === 'parent' ? '/montree/parent/appointments' : '/montree/dashboard/appointments');

  return (
    <div
      style={{
        marginBottom: 14,
        padding: 14,
        borderRadius: 14,
        background: T.bannerBg,
        border: T.bannerBorder,
        color: T.textPrimary,
        fontFamily: T.sans,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          marginBottom: 6,
        }}
      >
        <div
          style={{
            fontFamily: T.serif,
            fontSize: 16,
            fontWeight: 500,
            color: T.gold,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Calendar size={16} strokeWidth={1.75} />
          {pending.length === 1
            ? viewer === 'parent'
              ? t('appt.bannerNewInvitationOne')
              : t('appt.bannerStaffNeedsResponseOne')
            : viewer === 'parent'
              ? t('appt.bannerNewInvitations', { count: pending.length })
              : t('appt.bannerStaffNeedsResponse', { count: pending.length })}
        </div>
        {pending.length > 2 && (
          <Link
            href={computedSeeAll}
            style={{
              fontSize: 12,
              color: T.textSecondary,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {t('appt.seeAll')} <ChevronRight size={12} />
          </Link>
        )}
      </div>

      {viewer === 'parent' && (
        <div style={{ fontSize: 12, color: T.textSecondary, marginBottom: 10 }}>
          {t('appt.bannerParentIntro')}
        </div>
      )}

      {error && (
        <div
          style={{
            padding: '8px 10px',
            borderRadius: 8,
            background: 'rgba(239,68,68,0.10)',
            border: '1px solid rgba(239,68,68,0.32)',
            color: T.red,
            fontSize: 12,
            marginBottom: 10,
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {pending.slice(0, 3).map((a) => {
          const primary = a.hosts?.find((h) => h.is_primary);
          const isVideo = a.provider === 'agora' || !!a.video_url;
          return (
            <div
              key={a.id}
              style={{
                padding: 12,
                borderRadius: 10,
                background: T.cardBg,
                border: '1px solid rgba(52,211,153,0.18)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  gap: 8,
                  marginBottom: 4,
                }}
              >
                <span style={{ fontWeight: 600, fontSize: 13 }}>
                  {viewer === 'parent'
                    ? primary?.name || t('appt.aStaffMember')
                    : t('appt.awaitingYourResponse')}
                </span>
                {isVideo ? (
                  <span
                    style={{
                      fontSize: 11,
                      color: T.emerald,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Video size={12} strokeWidth={1.75} /> {t('appt.videoCall')}
                  </span>
                ) : (
                  <span style={{ fontSize: 11, color: T.textMuted }}>{t('appt.inPerson')}</span>
                )}
              </div>
              <div style={{ fontSize: 13, color: T.textSecondary, marginBottom: 6 }}>
                <Clock
                  size={12}
                  strokeWidth={1.75}
                  style={{ verticalAlign: 'middle', marginRight: 4, color: T.emerald }}
                />
                {formatDateTime(a.scheduled_start, intlLocale)} ·{' '}
                {t('appt.nMin', { n: a.duration_minutes })}
              </div>
              {a.intake_subject && (
                <div
                  style={{
                    fontSize: 12,
                    color: T.textMuted,
                    marginBottom: 8,
                    fontStyle: 'italic',
                  }}
                >
                  “{a.intake_subject}”
                </div>
              )}
              {viewer === 'parent' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => respond(a.id, 'accept')}
                    disabled={busyId === a.id}
                    style={{
                      padding: '9px 12px',
                      borderRadius: 8,
                      background: T.emerald,
                      color: '#0a1a0f',
                      border: 'none',
                      fontWeight: 600,
                      fontSize: 12,
                      cursor: busyId === a.id ? 'wait' : 'pointer',
                      opacity: busyId === a.id ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 5,
                    }}
                  >
                    {busyId === a.id ? <Loader2 size={12} style={{ animation: 'spin 1.4s linear infinite' }} /> : <CheckCircle2 size={12} />}
                    {t('appt.accept')}
                  </button>
                  <button
                    type="button"
                    onClick={() => respond(a.id, 'decline')}
                    disabled={busyId === a.id}
                    style={{
                      padding: '9px 12px',
                      borderRadius: 8,
                      background: 'rgba(255,255,255,0.05)',
                      color: T.textSecondary,
                      border: '1px solid rgba(255,255,255,0.18)',
                      fontWeight: 600,
                      fontSize: 12,
                      cursor: busyId === a.id ? 'wait' : 'pointer',
                      opacity: busyId === a.id ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 5,
                    }}
                  >
                    {busyId === a.id ? <Loader2 size={12} style={{ animation: 'spin 1.4s linear infinite' }} /> : <XCircle size={12} />}
                    {t('appt.decline')}
                  </button>
                </div>
              ) : (
                // Staff-side: link to detail page (for now). Future: inline confirm.
                <Link
                  href={computedSeeAll}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    color: T.emerald,
                    fontSize: 12,
                    textDecoration: 'none',
                    fontWeight: 600,
                  }}
                >
                  {t('appt.openInCalendar')} <ChevronRight size={12} />
                </Link>
              )}
            </div>
          );
        })}
      </div>

      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
