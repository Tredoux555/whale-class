'use client';

/**
 * VideoCallSlot — the classroom's video tile content.
 *
 * WHY THIS EXISTS (read before "simplifying" it into a plain <AgoraVideoCall/>):
 * `components/montree/appointments/AgoraVideoCall.tsx` is a FULL-SCREEN call
 * surface — every one of its render branches (in-call, waiting, and crucially
 * its ErrorPanel) is `position: fixed; inset: 0; z-index: 9999`. Dropping it
 * straight into VideoRail's 138px tile would either cover the whole classroom
 * on mount, or — when Agora isn't configured — cover the classroom with a
 * "can't start call" panel and take the lesson down with it. The contract's
 * product decision 1 is the opposite: **the class must work with video absent.**
 *
 * So this component:
 *   1. Pre-flights `POST /api/montree/appointments/[id]/agora-token?as=<role>`
 *      exactly the way `app/montree/{dashboard,parent}/calls/[appointmentId]`
 *      do (same route, same `?as=` hint, same `credentials: 'same-origin'`).
 *      That single call answers "is video available for this user, on this
 *      appointment, in this deployment?" — it 404s when the appointment/flag is
 *      off and 5xx/4xx when Agora creds are missing.
 *   2. If it succeeds → renders a "Join video" affordance in the tile, and only
 *      on click mounts the real AgoraVideoCall (dynamic, `ssr: false`) as the
 *      full-screen overlay it was built to be. Closing it returns to the board
 *      with the lesson state untouched.
 *   3. If it fails → renders the styled "video not configured" tile copy. The
 *      board, the sync, the stars and End Class all keep working.
 *
 * The double token fetch (pre-flight here, real one inside AgoraVideoCall) is
 * the established pattern from the two calls pages, not an oversight.
 */

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const AgoraVideoCall = dynamic(
  () => import('@/components/montree/appointments/AgoraVideoCall'),
  { ssr: false },
);

export type VideoCallRole = 'parent' | 'teacher';

export interface VideoCallSlotProps {
  appointmentId: string;
  /** Local user's role — drives the `?as=` hint and the recording affordance. */
  callerRole: VideoCallRole;
  /** Display name of the OTHER party (staff name for a parent, parent/child name for staff). */
  remoteDisplayName: string;
  /** Recording was enabled at booking time. Staff-only UI inside AgoraVideoCall gates on it. */
  recordingEnabledForAppointment?: boolean;
}

type Availability = 'checking' | 'available' | 'unavailable';

export default function VideoCallSlot({
  appointmentId,
  callerRole,
  remoteDisplayName,
  recordingEnabledForAppointment = false,
}: VideoCallSlotProps) {
  const [availability, setAvailability] = useState<Availability>('checking');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/montree/appointments/${encodeURIComponent(appointmentId)}/agora-token?as=${callerRole}`,
          { method: 'POST', credentials: 'same-origin' }
        );
        if (cancelled) return;
        setAvailability(res.ok ? 'available' : 'unavailable');
      } catch {
        if (!cancelled) setAvailability('unavailable');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [appointmentId, callerRole]);

  if (open) {
    return (
      <AgoraVideoCall
        appointmentId={appointmentId}
        callerRole={callerRole}
        remoteDisplayName={remoteDisplayName}
        recordingEnabledForAppointment={recordingEnabledForAppointment}
        onClose={() => setOpen(false)}
      />
    );
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-[7px] px-3 pb-9 text-center">
      {availability === 'checking' ? (
        <span className="text-[10.5px] uppercase tracking-[0.16em] text-white/55">connecting…</span>
      ) : availability === 'available' ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full border border-[var(--dpl-tag-ink)] px-[14px] py-[7px] text-[10.5px] font-bold uppercase tracking-[0.14em] text-[var(--dpl-tag-ink)]"
          style={{ background: 'var(--dpl-tag-bg)' }}
        >
          Join video
        </button>
      ) : (
        <>
          <span className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-white/70">
            video not configured
          </span>
          <span className="max-w-[190px] text-[11px] leading-[1.45] text-white/45">
            class continues on the board
          </span>
        </>
      )}
    </div>
  );
}
