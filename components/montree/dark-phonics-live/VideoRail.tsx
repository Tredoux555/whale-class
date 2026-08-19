/**
 * VideoRail — the right rail: teacher tile, student tile, star jar, at-home chip.
 *
 * IMPORTANT: this component does NOT implement video. It frames two slots that
 * the caller fills with the EXISTING `AgoraVideoCall` component
 * (`components/montree/appointments/AgoraVideoCall.tsx`), which renders its own
 * tile internally. Slots are passed as ReactNode props rather than imported here
 * so this file has zero hard dependency on that module's path or prop shape.
 *
 * REAL usage (Phase 2): fill the slots with `VideoCallSlot` from this same
 * directory — NOT with AgoraVideoCall directly. AgoraVideoCall renders itself
 * `position: fixed; inset: 0; z-index: 9999` in every branch (including its
 * error panel), so dropping it into a 138px tile would cover the whole class.
 * VideoCallSlot pre-flights the agora-token route, offers a "Join video" tap
 * that opens AgoraVideoCall as the full-screen surface it is, and degrades to a
 * "video not configured" tile when Agora isn't provisioned:
 *
 *   import VideoCallSlot from '@/components/montree/dark-phonics-live/VideoCallSlot';
 *
 *   <VideoRail
 *     teacherSlot={<VideoCallSlot appointmentId={id} callerRole="teacher" remoteDisplayName={parentName} />}
 *     teacherLabel="Teacher Tredoux"
 *     studentLabel="Mei · 5"
 *     starsEarned={3}
 *     atHomeItem={{ emoji: '🐍', label: 'Grab your snake!' }}
 *   />
 *
 * VERIFIED 2026-08-19 by direct read of AgoraVideoCall.tsx: its real props are
 * `{ appointmentId, callerRole: 'parent'|'teacher'|'principal', remoteDisplayName,
 * recordingEnabledForAppointment, onClose, audioOnly? }` — there is no `role`
 * prop. VideoCallSlot passes exactly those. AgoraVideoCall.tsx is unmodified.
 *
 * Visual source of truth: mockups/draft-a-midnight-studio.html (.rail).
 */

import type { ReactNode } from 'react';
import StarJar from './StarJar';

export interface AtHomeItem {
  emoji: string;
  label: string;
}

export interface VideoRailProps {
  /** Usually <AgoraVideoCall appointmentId=… role="teacher" />. */
  teacherSlot?: ReactNode;
  /** Usually <AgoraVideoCall appointmentId=… role="parent" />. */
  studentSlot?: ReactNode;
  teacherLabel?: string;
  studentLabel?: string;
  /** Small pill top-left of each tile, e.g. "host" / "hand up". */
  teacherTag?: string;
  studentTag?: string;
  starsEarned: number;
  starsTotal?: number;
  /** Teacher-only star awarding; omit on the parent surface. */
  onAwardStar?: () => void;
  /** The physical 3D-printed kit prompt for this lesson. */
  atHomeItem?: AtHomeItem;
  /** Kit label on the right of the at-home chip, e.g. "kit 07". */
  atHomeKitLabel?: string;
}

function MicIcon() {
  return (
    <svg
      className="h-[14px] w-[14px]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9.2" y="2.8" width="5.6" height="10.6" rx="2.8" />
      <path d="M5.6 11.9a6.4 6.4 0 0 0 12.8 0" />
      <path d="M12 18.3V21.2" />
    </svg>
  );
}

function CamIcon() {
  return (
    <svg
      className="h-[14px] w-[14px]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2.8" y="6.2" width="12.4" height="11.6" rx="3.2" />
      <path d="M15.2 11.1l5.9-3.3v8.4l-5.9-3.3z" />
    </svg>
  );
}

/**
 * Frame around one video slot. The Agora component paints inside `inset-0`;
 * the label footer and tag sit above it so the chrome stays consistent whether
 * or not the stream has connected.
 */
function VideoTile({
  slot,
  label,
  tag,
  tagVariant = 'lime',
  gradient,
  fallbackInitial,
  grow,
}: {
  slot?: ReactNode;
  label: string;
  tag?: string;
  tagVariant?: 'lime' | 'amber';
  gradient: string;
  fallbackInitial: string;
  grow: string;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-[var(--dpl-r-lg)] border border-[var(--dpl-line)]"
      style={{ boxShadow: 'var(--dpl-shadow)', flex: grow, minHeight: 138 }}
    >
      {/* placeholder background — visible only until/unless the stream paints */}
      <div className="absolute inset-0" style={{ background: gradient }} />
      {slot ? (
        <div className="absolute inset-0">{slot}</div>
      ) : (
        <span
          className="absolute left-1/2 top-[46%] flex h-[62px] w-[62px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-[24px] font-bold"
          style={{
            background: 'var(--dpl-av-bg)',
            color: 'var(--dpl-av-ink)',
            borderColor: 'var(--dpl-av-line)',
            boxShadow: 'var(--dpl-av-shadow)',
            fontFamily: 'var(--dpl-font-display)',
          }}
        >
          {fallbackInitial}
        </span>
      )}

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center gap-2 px-3 py-[10px]"
        style={{ background: 'var(--dpl-tile-foot)' }}
      >
        <span className="text-[12px] font-semibold tracking-[0.02em] text-white">{label}</span>
        <span className="ml-auto flex gap-[7px] text-white/80">
          <MicIcon />
          <CamIcon />
        </span>
      </div>

      {tag ? (
        <span
          className="absolute left-[10px] top-[10px] rounded-full px-[9px] py-1 text-[9.5px] font-bold uppercase tracking-[0.12em]"
          style={{
            background: tagVariant === 'lime' ? 'var(--dpl-tag-bg)' : 'var(--dpl-tag2-bg)',
            color: tagVariant === 'lime' ? 'var(--dpl-tag-ink)' : 'var(--dpl-tag2-ink)',
          }}
        >
          {tag}
        </span>
      ) : null}
    </div>
  );
}

export default function VideoRail({
  teacherSlot,
  studentSlot,
  teacherLabel = 'Teacher',
  studentLabel = 'Student',
  teacherTag = 'host',
  studentTag,
  starsEarned,
  starsTotal = 5,
  onAwardStar,
  atHomeItem,
  atHomeKitLabel,
}: VideoRailProps) {
  return (
    <aside className="flex min-h-0 flex-col gap-[var(--dpl-s3)]">
      <VideoTile
        slot={teacherSlot}
        label={teacherLabel}
        tag={teacherTag}
        tagVariant="lime"
        gradient="var(--dpl-vid-1)"
        fallbackInitial={teacherLabel.trim().charAt(0).toUpperCase() || 'T'}
        grow="1.1"
      />
      <VideoTile
        slot={studentSlot}
        label={studentLabel}
        tag={studentTag}
        tagVariant="amber"
        gradient="var(--dpl-vid-2)"
        fallbackInitial={studentLabel.trim().charAt(0).toUpperCase() || 'S'}
        grow="1"
      />

      <StarJar starsEarned={starsEarned} starsTotal={starsTotal} onAwardStar={onAwardStar} />

      {atHomeItem ? (
        <div
          className="flex items-center gap-[11px] rounded-[var(--dpl-r-lg)] border border-[var(--dpl-athome-line)] bg-[var(--dpl-athome-bg)] px-[13px] py-[11px]"
          style={{ boxShadow: 'var(--dpl-shadow)' }}
        >
          <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[var(--dpl-r-sm)] bg-[var(--dpl-athome-ic-bg)] text-[var(--dpl-athome-ic)]">
            {/* 3D-printed kit cube */}
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 2.9l8.2 4.5v9.2L12 21.1l-8.2-4.5V7.4z" />
              <path d="M3.8 7.4l8.2 4.5 8.2-4.5" />
              <path d="M12 11.9v9.2" />
              <path d="M7.6 9.6v4.6" />
            </svg>
          </span>
          <span className="flex min-w-0 flex-col gap-[2px]">
            <span className="text-[9px] uppercase tracking-[0.18em] text-[var(--dpl-athome-label)]">At home</span>
            <span
              className="whitespace-nowrap text-[14px] font-bold text-[var(--dpl-athome-ink)]"
              style={{ fontFamily: 'var(--dpl-font-display)' }}
            >
              {atHomeItem.label} {atHomeItem.emoji}
            </span>
          </span>
          {atHomeKitLabel ? (
            <span className="ml-auto rounded-full bg-[var(--dpl-kit-bg)] px-2 py-1 text-[9.5px] font-bold uppercase tracking-[0.1em] text-[var(--dpl-kit-ink)]">
              {atHomeKitLabel}
            </span>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}
