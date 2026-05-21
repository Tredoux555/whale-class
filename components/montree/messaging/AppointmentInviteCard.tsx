'use client';

// components/montree/messaging/AppointmentInviteCard.tsx
//
// 🚨 Session 120 — renders `[[APPT:<id>:<status>]] <caption>` messages
// as a rich inline card in chat threads.
//
// VIEWPORT BEHAVIOUR:
//   - Parent view: shows Accept / Decline buttons when status='invite' or
//     when the appointment is server-side 'pending'. After server confirms,
//     shows "Confirmed" pill with date/time + Join button (if video).
//   - Staff view: shows date/time + cancel button when pending. After
//     confirmed, shows "Confirmed by <parent>" + Join button (if video).
//
// HYDRATION:
//   On mount we fetch the latest appointment status. This means a
//   `[[APPT:invite]]` card that was posted hours ago but has since been
//   accepted will paint as "Confirmed" not as "Accept/Decline". The
//   marker's status is just for first-paint speed — canonical state lives
//   in the appointment row.
//
// AUTH:
//   The card chooses its data-fetch endpoint based on the `viewer` prop:
//     - viewer='parent' → /api/montree/parent/appointments/[id]
//     - viewer='staff'  → /api/montree/appointments  (then client-side find)
//   This keeps the card's auth-context derivation trivial — it doesn't
//   need to know about role nuances; the parent surface passes 'parent',
//   the staff surfaces pass 'staff'.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, Clock, Video, CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react';
import type { ApptInviteStatus } from '@/lib/montree/messaging/appointment-invite';
import { useI18n } from '@/lib/montree/i18n';

const T = {
  cardBg: 'rgba(8,20,12,0.55)',
  cardBorder: '1px solid rgba(232,201,106,0.32)',
  cardBorderConfirmed: '1px solid rgba(52,211,153,0.32)',
  cardBorderDeclined: '1px solid rgba(239,68,68,0.32)',
  emerald: '#34d399',
  emeraldDeep: '#10b981',
  gold: '#E8C96A',
  red: '#fca5a5',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

interface FetchedAppt {
  id: string;
  status: string;
  scheduled_start: string;
  scheduled_end?: string;
  duration_minutes?: number;
  provider?: 'jitsi' | 'agora' | null;
  video_url?: string | null;
  intake_subject?: string | null;
  hosts?: Array<{ id: string; name?: string | null; role: string; is_primary?: boolean }>;
  parent_id?: string;
}

export interface AppointmentInviteCardProps {
  /** UUID of the appointment this card points to. */
  appointmentId: string;
  /** Initial status from the message marker (for first paint). */
  initialStatus: ApptInviteStatus;
  /** Human-readable caption that came after the marker. */
  caption: string;
  /** Which surface this card is rendered on. */
  viewer: 'parent' | 'staff';
  /** Triggered when the card's state changes (Accept / Decline succeeds) so
   *  the parent of the chat surface can refresh its message list. Optional. */
  onChanged?: () => void;
}

function formatDateTime(iso: string, locale: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(locale, {
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

export default function AppointmentInviteCard({
  appointmentId,
  initialStatus,
  caption,
  viewer,
  onChanged,
}: AppointmentInviteCardProps) {
  const { t, locale } = useI18n();
  const [appt, setAppt] = useState<FetchedAppt | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'accept' | 'decline' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch latest appointment state on mount ─────────────────────────
  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const endpoint =
          viewer === 'parent'
            ? `/api/montree/parent/appointments/${appointmentId}`
            : `/api/montree/appointments?include_past=1`;
        const res = await fetch(endpoint, { credentials: 'same-origin', signal: ctrl.signal });
        if (!res.ok) {
          // Quietly fall back to marker-derived state. Card stays usable.
          if (!ctrl.signal.aborted) setLoading(false);
          return;
        }
        const data = await res.json();
        if (ctrl.signal.aborted) return;
        if (viewer === 'parent') {
          if (data?.appointment) setAppt(data.appointment as FetchedAppt);
        } else {
          // Staff endpoint returns `appointments[]`; find ours.
          const arr = Array.isArray(data?.appointments) ? data.appointments : [];
          const found = (arr as FetchedAppt[]).find((a) => a.id === appointmentId);
          if (found) setAppt(found);
        }
      } catch (e) {
        // AbortError on unmount is normal.
        if ((e as Error).name !== 'AbortError') {
          console.error('[AppointmentInviteCard] fetch failed', e);
        }
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [appointmentId, viewer]);

  const respond = useCallback(async (action: 'accept' | 'decline') => {
    if (action === 'decline') {
      const ok = typeof window !== 'undefined'
        ? window.confirm(t('msg.declineConfirm'))
        : true;
      if (!ok) return;
    }
    setBusy(action);
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
        setError(data?.error || (action === 'accept' ? t('msg.couldNotAccept') : t('msg.couldNotDecline')));
        return;
      }
      const data = await res.json();
      if (data?.appointment) setAppt(data.appointment as FetchedAppt);
      onChanged?.();
    } catch {
      setError(t('msg.networkError'));
    } finally {
      setBusy(null);
    }
  }, [appointmentId, onChanged, t]);

  // Derive UI state.
  // Priority: server state (if loaded) > marker state.
  const effectiveStatus: ApptInviteStatus =
    appt ? (
      appt.status === 'pending' ? 'invite' :
      appt.status === 'confirmed' ? 'confirmed' :
      appt.status === 'cancelled' ? (initialStatus === 'declined' ? 'declined' : 'cancelled') :
      initialStatus
    ) : initialStatus;

  const scheduledStart = appt?.scheduled_start;
  const isVideo = !!(appt?.provider === 'agora' || appt?.video_url);
  const canActAsParent = viewer === 'parent' && effectiveStatus === 'invite' && !loading;
  // 🚨 Session 120 audit fix — only the [[APPT:confirmed]] card shows the
  // Join button. The original [[APPT:invite]] card may have hydrated to
  // 'confirmed' status (because the appointment was accepted later) but it
  // shouldn't ALSO render Join — that produces multiple Join buttons in the
  // same thread. The [[APPT:confirmed]] card posted by the accept route IS
  // the canonical "the call is on, tap to join" surface.
  const showJoin = initialStatus === 'confirmed' && effectiveStatus === 'confirmed' && isVideo && scheduledStart && (() => {
    // Show Join button if the appointment is within ±2h of now.
    const t = new Date(scheduledStart).getTime();
    const now = Date.now();
    return Math.abs(now - t) < 2 * 60 * 60 * 1000;
  })();

  const cardBorder =
    effectiveStatus === 'confirmed' ? T.cardBorderConfirmed :
    effectiveStatus === 'declined' || effectiveStatus === 'cancelled' ? T.cardBorderDeclined :
    T.cardBorder;

  const headerColor =
    effectiveStatus === 'confirmed' ? T.emerald :
    effectiveStatus === 'declined' || effectiveStatus === 'cancelled' ? T.red :
    T.gold;

  const headerLabel =
    effectiveStatus === 'confirmed' ? t('msg.statusConfirmed') :
    effectiveStatus === 'declined' ? t('msg.statusDeclined') :
    effectiveStatus === 'cancelled' ? t('msg.statusCancelled') :
    t('msg.newInvitation');

  const headerIcon =
    effectiveStatus === 'confirmed' ? <CheckCircle2 size={14} strokeWidth={2} /> :
    effectiveStatus === 'declined' || effectiveStatus === 'cancelled' ? <XCircle size={14} strokeWidth={2} /> :
    <Calendar size={14} strokeWidth={2} />;

  return (
    <div
      style={{
        padding: 14,
        borderRadius: 12,
        background: T.cardBg,
        border: cardBorder,
        color: T.textPrimary,
        fontFamily: T.sans,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        minWidth: 220,
        maxWidth: 360,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 11,
          fontWeight: 600,
          color: headerColor,
          textTransform: 'uppercase',
          letterSpacing: 0.4,
        }}
      >
        {headerIcon}
        {headerLabel}
        {isVideo && (
          <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, color: T.emerald, textTransform: 'none', letterSpacing: 0 }}>
            <Video size={12} strokeWidth={1.75} /> {t('msg.video')}
          </span>
        )}
      </div>

      {/* Date/time + caption */}
      {scheduledStart ? (
        <div style={{ fontFamily: T.serif, fontSize: 16, fontWeight: 500, color: T.textPrimary, lineHeight: 1.3 }}>
          <Clock size={13} strokeWidth={1.75} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6, color: T.emerald }} />
          {formatDateTime(scheduledStart, locale)}
          {appt?.duration_minutes && (
            <span style={{ marginLeft: 6, fontSize: 12, color: T.textSecondary, fontFamily: T.sans }}>
              · {t('msg.nMin', { n: appt.duration_minutes })}
            </span>
          )}
        </div>
      ) : (
        <div style={{ fontFamily: T.serif, fontSize: 14, color: T.textSecondary }}>{caption || t('msg.appointment')}</div>
      )}

      {appt?.intake_subject && (
        <div style={{ fontSize: 12, color: T.textMuted, fontStyle: 'italic' }}>
          “{appt.intake_subject}”
        </div>
      )}

      {/* Caption (when status meaningful + server hydrated) */}
      {appt && caption && (
        <div style={{ fontSize: 12, color: T.textSecondary, lineHeight: 1.4 }}>{caption}</div>
      )}

      {/* Error */}
      {error && (
        <div
          style={{
            padding: '6px 10px',
            borderRadius: 8,
            background: 'rgba(239,68,68,0.10)',
            border: '1px solid rgba(239,68,68,0.32)',
            color: T.red,
            fontSize: 11,
          }}
        >
          {error}
        </div>
      )}

      {/* Actions */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: T.textMuted, fontSize: 12 }}>
          <Loader2 size={12} style={{ animation: 'spin 1.4s linear infinite' }} />
          {t('common.loading')}
        </div>
      ) : canActAsParent ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
          <button
            type="button"
            onClick={() => respond('accept')}
            disabled={!!busy}
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              background: T.emerald,
              color: '#0a1a0f',
              border: 'none',
              fontWeight: 600,
              fontSize: 13,
              cursor: busy ? 'wait' : 'pointer',
              opacity: busy ? 0.6 : 1,
              fontFamily: T.sans,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            {busy === 'accept' ? <Loader2 size={14} style={{ animation: 'spin 1.4s linear infinite' }} /> : <CheckCircle2 size={14} />}
            {t('msg.accept')}
          </button>
          <button
            type="button"
            onClick={() => respond('decline')}
            disabled={!!busy}
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.05)',
              color: T.textSecondary,
              border: '1px solid rgba(255,255,255,0.18)',
              fontWeight: 600,
              fontSize: 13,
              cursor: busy ? 'wait' : 'pointer',
              opacity: busy ? 0.6 : 1,
              fontFamily: T.sans,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            {busy === 'decline' ? <Loader2 size={14} style={{ animation: 'spin 1.4s linear infinite' }} /> : <XCircle size={14} />}
            {t('msg.decline')}
          </button>
        </div>
      ) : showJoin ? (
        <Link
          href={viewer === 'parent' ? `/montree/parent/calls/${appointmentId}` : `/montree/dashboard/calls/${appointmentId}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '10px 16px',
            borderRadius: 10,
            background: T.emerald,
            color: '#0a1a0f',
            fontWeight: 600,
            fontSize: 13,
            textDecoration: 'none',
            marginTop: 4,
          }}
        >
          {t('msg.joinNow')} <ArrowRight size={14} />
        </Link>
      ) : null}

      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
