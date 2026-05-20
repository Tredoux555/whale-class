// lib/montree/appointments/share-to-thread.ts
//
// Generalised "appointment becomes a message" helper — mirror of the
// Session 115 shareMeetingNoteToThread pattern.
//
// FIRES ON:
//   - Successful new appointment creation (booking confirmation).
//   - Cancellation (cancellation notice).
//   - Reschedule (new time notice).
//
// CONTRACT:
//   - Posts into a parent_principal or parent_teacher thread, NOT a
//     single dedicated appointment thread (the booking belongs in the
//     existing parent ↔ staff conversation, not its own silo).
//   - Idempotent for the INITIAL confirmation: the appointment's
//     thread_id is checked before creating a new thread. If a previous
//     event already opened a thread for this booking, we reuse it.
//   - For subsequent notices (cancellation, reschedule), we ALWAYS use
//     the existing thread_id if present — never spawn a second thread
//     for the same appointment.
//   - Gated on the `parent_messaging` feature flag, same as Session 115.
//     Without messaging enabled, the appointment still confirms — the
//     parent will see it on /montree/parent/appointments — there's just
//     no thread post.
//
// CROSS-POLLINATION: every query filters by appointment.school_id. The
// parent_id + host_id on the appointment row were verified upstream
// (the booking flow only accepts hosts in the parent's school).

import type { SupabaseClient } from '@supabase/supabase-js';
import { isFeatureEnabled } from '@/lib/montree/features/server';
import { createThreadWithParticipants } from '@/lib/montree/messaging/thread-resolver';
import type { ParticipantRole } from '@/lib/montree/messaging/types';
import type { StaffRole } from './types';
import {
  isEncryptionEnabledForSchool,
  writeEncryptedField,
} from '@/lib/montree/messaging-crypto';

export type ShareEventKind = 'booking' | 'cancellation' | 'reschedule';

interface ShareInput {
  supabase: SupabaseClient;
  appointment: {
    id: string;
    school_id: string;
    classroom_id: string | null;
    child_id: string | null;
    parent_id: string;
    scheduled_start: string;
    scheduled_end: string;
    duration_minutes: number;
    location: string | null;
    intake_subject: string | null;
    intake_body: string | null;
    thread_id: string | null;
    // Phase 116.2 — Jitsi video URL. Optional because the field is null
    // (and the legacy SELECT-fallback path strips it entirely) when the
    // school doesn't have video_calls enabled OR the parent didn't opt in.
    video_url?: string | null;
  };
  primaryHost: {
    role: StaffRole;
    id: string;
  };
  // For new bookings, kind='booking'. For status changes:
  kind: ShareEventKind;
  /** Optional message body override. If absent, a default templated
   *  body is composed from appointment fields. */
  bodyOverride?: string;
  /** Locale for date formatting. */
  locale?: string;
}

export interface ShareResult {
  threadId: string | null;
  reason?:
    | 'feature_disabled'
    | 'host_not_found'
    | 'parent_not_found'
    | 'thread_create_failed'
    | 'message_insert_failed';
  error?: string;
}

/** Returns the thread_id on success. The caller stamps it back on the
 *  appointment row so subsequent shares find it. */
export async function shareAppointmentToThread(input: ShareInput): Promise<ShareResult> {
  const { supabase, appointment, primaryHost, kind } = input;

  // ── Feature gate ───────────────────────────────────────────────────
  const messagingEnabled = await isFeatureEnabled(
    supabase,
    appointment.school_id,
    'parent_messaging'
  );
  if (!messagingEnabled) {
    return { threadId: null, reason: 'feature_disabled' };
  }

  // ── Resolve host name for sender_name on the message row ───────────
  let hostName = primaryHost.role === 'teacher' ? 'Teacher' : 'Principal';
  if (primaryHost.role === 'teacher') {
    const { data: t } = await supabase
      .from('montree_teachers')
      .select('name')
      .eq('id', primaryHost.id)
      .eq('school_id', appointment.school_id)
      .maybeSingle();
    if (!t) return { threadId: null, reason: 'host_not_found' };
    hostName = t.name || hostName;
  } else {
    const { data: p } = await supabase
      .from('montree_school_admins')
      .select('name')
      .eq('id', primaryHost.id)
      .eq('school_id', appointment.school_id)
      .maybeSingle();
    if (!p) return { threadId: null, reason: 'host_not_found' };
    hostName = p.name || hostName;
  }

  // ── Resolve parent for participant list ────────────────────────────
  const { data: parentRow } = await supabase
    .from('montree_parents')
    .select('id, school_id')
    .eq('id', appointment.parent_id)
    .eq('school_id', appointment.school_id)
    .maybeSingle();
  if (!parentRow) return { threadId: null, reason: 'parent_not_found' };

  // ── Find or create the thread ──────────────────────────────────────
  let threadId = appointment.thread_id;

  if (!threadId) {
    // First-time post → create a fresh thread named for the booking. We
    // use parent_teacher / parent_principal type so the principal-as-
    // observer auto-add (Session 97 transparency rule) fires.
    const dateLabel = formatDate(appointment.scheduled_start, input.locale || 'en');
    const subjectKindLabel =
      kind === 'cancellation' ? 'Meeting cancelled' : 'Meeting booked';
    const subject = `${subjectKindLabel} — ${dateLabel}`;

    const threadType = primaryHost.role === 'teacher' ? 'parent_teacher' : 'parent_principal';

    const created = await createThreadWithParticipants(supabase, {
      schoolId: appointment.school_id,
      classroomId: appointment.classroom_id,
      childId: appointment.child_id,
      threadType,
      subject,
      // The "creator" is the host — they're the one whose action (or
      // whose schedule) triggered this notice. For parent-initiated
      // bookings the parent created the appointment, but the thread
      // narrative belongs to the host's inbox.
      createdBy: { role: primaryHost.role as ParticipantRole, id: primaryHost.id },
      participants: [
        {
          role: 'parent' as ParticipantRole,
          id: parentRow.id,
          isPrimary: false,
          canReply: true,
        },
      ],
    });
    if (!created) return { threadId: null, reason: 'thread_create_failed' };
    threadId = created.id;
  }

  // ── Compose + post the message ─────────────────────────────────────
  const body =
    input.bodyOverride ||
    composeBody({
      kind,
      appointment,
      hostName,
      locale: input.locale || 'en',
    });

  // 🚨 Session 121 — encrypt the body when encryption_v1 is enabled.
  const encEnabled = await isEncryptionEnabledForSchool(supabase, appointment.school_id);
  const enc = writeEncryptedField(body, encEnabled);
  const { error: msgErr } = await supabase.from('montree_thread_messages').insert({
    thread_id: threadId,
    sender_role: primaryHost.role,
    sender_id: primaryHost.id,
    sender_name: hostName,
    body: enc.value,
    encryption_version: enc.version,
    body_locale: input.locale || 'en',
    ai_drafted: false,
    ai_draft_source: null,
    approved_by_id: null,
  });

  if (msgErr) {
    console.error('[appointments/share-to-thread] insert failed', msgErr);
    return {
      threadId,
      reason: 'message_insert_failed',
      error: msgErr.message,
    };
  }

  return { threadId };
}

// ── Default body templating ───────────────────────────────────────────
// Localised later (Phase 2 ships English; i18n batch will fill the rest
// once translations land via npm run i18n:fill-ui).
function composeBody(args: {
  kind: ShareEventKind;
  appointment: ShareInput['appointment'];
  hostName: string;
  locale: string;
}): string {
  const dateLabel = formatDate(args.appointment.scheduled_start, args.locale);
  const timeLabel = formatTime(args.appointment.scheduled_start, args.locale);
  const subject = args.appointment.intake_subject?.trim();
  const note = args.appointment.intake_body?.trim();
  const location = args.appointment.location?.trim();
  const videoUrl = args.appointment.video_url?.trim();

  const lines: string[] = [];

  if (args.kind === 'booking') {
    lines.push(`Your meeting is confirmed for ${dateLabel} at ${timeLabel}.`);
    if (videoUrl) lines.push(`Video call: ${videoUrl}`);
    if (location) lines.push(`Where: ${location}`);
    if (subject) lines.push(`What you wrote: ${subject}`);
    if (note && note !== subject) lines.push(note);
    lines.push('I look forward to it.');
  } else if (args.kind === 'cancellation') {
    lines.push(`The meeting scheduled for ${dateLabel} at ${timeLabel} has been cancelled.`);
    lines.push('Reach out if you’d like to find another time.');
  } else if (args.kind === 'reschedule') {
    lines.push(`Your meeting has been rescheduled to ${dateLabel} at ${timeLabel}.`);
    // Same Jitsi room URL stays valid across reschedule (deterministic
    // from ical_token). Surface it again so the parent doesn't have to
    // scroll up to the original booking message to find the link.
    if (videoUrl) lines.push(`Video call: ${videoUrl}`);
    if (location) lines.push(`Where: ${location}`);
  }

  return lines.join('\n\n');
}

function formatDate(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleDateString(intlLocale(locale), {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatTime(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleTimeString(intlLocale(locale), {
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function intlLocale(loc: string): string {
  // Lightweight mapping for the most common cases. Full mapping lives
  // in lib/montree/i18n/locales.ts (getIntlLocale) — we duplicate the
  // top entries here to keep this helper dependency-free.
  const map: Record<string, string> = {
    en: 'en-US',
    zh: 'zh-CN',
    es: 'es-ES',
    fr: 'fr-FR',
    de: 'de-DE',
    pt: 'pt-PT',
    nl: 'nl-NL',
    it: 'it-IT',
    ja: 'ja-JP',
    ko: 'ko-KR',
    uk: 'uk-UA',
    ru: 'ru-RU',
  };
  return map[loc] || 'en-US';
}
