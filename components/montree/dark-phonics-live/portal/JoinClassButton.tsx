'use client';

/**
 * "Join class" for a parent's upcoming Dark Phonics Live class.
 *
 * The door opens JOIN_WINDOW_MINUTES (10) before scheduled_start; before that
 * the parent sees a countdown instead of a dead button, so nobody sits on a
 * greyed-out control wondering whether it is broken.
 *
 * Mounted `now` starts at null so the server render and the first client render
 * agree (no hydration mismatch); the countdown appears on the first tick.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock, Video } from 'lucide-react';

import {
  JOIN_WINDOW_MINUTES,
  PT,
  formatCountdown,
  isJoinable,
  msUntil,
  primaryButtonStyle,
} from './portal-shared';

interface Props {
  appointmentId: string;
  scheduledStart: string;
  durationMinutes: number;
}

export default function JoinClassButton({ appointmentId, scheduledStart, durationMinutes }: Props) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  if (now === null) {
    // Pre-hydration placeholder — same box size, no time-dependent text.
    return (
      <span style={{ ...primaryButtonStyle, opacity: 0.4, pointerEvents: 'none' }}>
        <Video size={14} /> Join class
      </span>
    );
  }

  if (isJoinable(scheduledStart, now, durationMinutes)) {
    return (
      <Link href={`/montree/parent/live/${appointmentId}`} style={primaryButtonStyle}>
        <Video size={14} /> Join class 进入课堂
      </Link>
    );
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '11px 18px',
        borderRadius: 999,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.10)',
        color: PT.textMuted,
        fontSize: 13.5,
        fontWeight: 500,
      }}
      title={`The classroom opens ${JOIN_WINDOW_MINUTES} minutes before the start time`}
    >
      <Clock size={14} /> Opens {formatCountdown(msUntil(scheduledStart, now))}
    </span>
  );
}
