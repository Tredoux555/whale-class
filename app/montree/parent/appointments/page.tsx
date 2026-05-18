// app/montree/parent/appointments/page.tsx
//
// Parent appointment booking flow + list of existing appointments.
// One page, three views via internal state:
//   - list  — past + upcoming appointments
//   - book  — recipient picker → slot picker → intake form → confirm
//   - detail — view one appointment + cancel / reschedule
//
// Gated on the `appointments` feature flag — endpoint returns 404 when
// the flag is OFF and we redirect to the parent dashboard. Same posture
// as the messaging page from Session 98.

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  Calendar,
  ArrowLeft,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronRight,
  Video,
} from 'lucide-react';

// Lazy-mount the Agora call. ~600KB SDK chunk — only loads when a parent
// taps Join on an Agora-provider appointment.
const AgoraVideoCallLazy = dynamic(
  () => import('@/components/montree/appointments/AgoraVideoCall'),
  { ssr: false }
);

const T = {
  bg: '#0a1a0f',
  bgGradient:
    'radial-gradient(ellipse 1100px 900px at 88% 8%, rgba(39,129,90,0.48), transparent 60%)',
  emerald: '#34d399',
  emeraldDeep: '#10b981',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  gold: '#E8C96A',
  card: 'rgba(255,255,255,0.06)',
  cardBg: 'rgba(8,20,12,0.55)',
  cardBorder: '1px solid rgba(52,211,153,0.18)',
  cardBorderStrong: '1px solid rgba(52,211,153,0.35)',
  inputBg: 'rgba(0,0,0,0.30)',
  inputBorder: '1px solid rgba(52,211,153,0.25)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
  red: '#fca5a5',
};

interface Appointment {
  id: string;
  scheduled_start: string;
  scheduled_end: string;
  duration_minutes: number;
  status: string;
  intake_subject: string | null;
  intake_body: string | null;
  location: string | null;
  cancelled_reason: string | null;
  child_id: string | null;
  thread_id: string | null;
  // Phase 116.2 — Jitsi room URL. Optional because pre-migration-222
  // bookings + schools without the video_calls flag have no value here.
  video_url?: string | null;
  // Phase 116.3 — which video provider serves this appointment.
  provider?: 'jitsi' | 'agora' | null;
  recording_enabled?: boolean | null;
  hosts: Array<{ role: string; id: string; name: string | null; is_primary: boolean }>;
}

interface FeatureFlagsEcho {
  video_calls?: boolean;
  agora_video_calls?: boolean;
  video_recording?: boolean;
}

interface RecipientBundle {
  child_id: string;
  child_name: string;
  classroom_id: string | null;
  classroom_name: string | null;
  teachers: Array<{ id: string; name: string; is_lead?: boolean }>;
  principal: { id: string; name: string } | null;
}

type View =
  | { kind: 'list' }
  | { kind: 'book' }
  | { kind: 'detail'; appt: Appointment };

export default function ParentAppointmentsPage() {
  const router = useRouter();
  const [view, setView] = useState<View>({ kind: 'list' });
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [bundles, setBundles] = useState<RecipientBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Phase 116.2 — server echoes feature flags so the booking flow can
  // show/hide the "Video call" checkbox without a second round-trip.
  // The same flag also gates the WRITE on the server side; this is UI
  // discoverability only.
  const [featureFlags, setFeatureFlags] = useState<FeatureFlagsEcho>({});

  const reload = useCallback(async () => {
    try {
      const res = await fetch('/api/montree/parent/appointments', {
        credentials: 'same-origin',
        cache: 'no-store',
      });
      if (res.status === 404) {
        router.replace('/montree/parent/dashboard');
        return;
      }
      if (res.status === 401 || res.status === 403) {
        router.replace('/montree/parent');
        return;
      }
      if (!res.ok) {
        setError('Could not load appointments.');
        return;
      }
      const data = await res.json();
      setAppointments(data?.appointments || []);
      // Stash the feature_flags echo so BookFlow + DetailView can gate
      // their video-call UI surfaces.
      if (data?.feature_flags && typeof data.feature_flags === 'object') {
        setFeatureFlags(data.feature_flags as FeatureFlagsEcho);
      }
    } catch {
      setError('Network error.');
    }
  }, [router]);

  // Load on mount + fetch recipients bundle (reuses messaging endpoint
  // which already returns per-child {teachers, principal}).
  useEffect(() => {
    (async () => {
      setLoading(true);
      await reload();
      try {
        const r = await fetch('/api/montree/parent/messages/recipients', {
          credentials: 'same-origin',
        });
        if (r.ok) {
          const data = await r.json();
          setBundles(data?.recipients || []);
        }
      } catch {
        // Non-fatal — booking page just shows empty recipients.
      }
      setLoading(false);
    })();
  }, [reload]);

  // Live updates — poll every 5s while the page is visible. New
  // teacher-initiated invitations pop in without a refresh; status flips
  // (cancel/confirm) propagate live (matters for the detail view so the
  // parent sees the teacher's cancel immediately). Skip ONLY the active
  // booking flow — we don't want a poll to mid-tap the booking form.
  // Same pattern as messaging thread polling (hooks/useThreadPolling.ts).
  useEffect(() => {
    if (loading) return;
    if (view.kind === 'book') return; // don't churn while user is filling the form
    let inFlight = false;
    const tick = async () => {
      if (document.hidden) return;
      if (inFlight) return;
      inFlight = true;
      try {
        await reload();
      } finally {
        inFlight = false;
      }
    };
    const id = window.setInterval(tick, 5000);
    return () => window.clearInterval(id);
  }, [loading, view.kind, reload]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: T.bg, backgroundImage: T.bgGradient, color: T.textSecondary, fontFamily: T.sans, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading…
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: T.bg, backgroundImage: T.bgGradient, backgroundAttachment: 'fixed', color: T.textPrimary, fontFamily: T.sans }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 20, background: T.card, backdropFilter: 'blur(18px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => view.kind === 'list' ? router.push('/montree/parent/dashboard') : setView({ kind: 'list' })} style={backBtn()}>
            <ArrowLeft size={16} strokeWidth={1.75} /> Back
          </button>
          <div style={{ fontFamily: T.serif, fontSize: 18, fontWeight: 500 }}>Appointments</div>
          <div style={{ width: 48 }} />
        </div>
      </header>

      <main style={{ maxWidth: 560, margin: '0 auto', padding: '20px 16px 80px' }}>
        {error && (
          <div style={{ marginBottom: 14, padding: 12, borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.32)', color: T.red, fontSize: 13 }}>
            {error}
          </div>
        )}

        {view.kind === 'list' && (
          <ListView
            appointments={appointments}
            onBook={() => setView({ kind: 'book' })}
            onOpen={(a) => setView({ kind: 'detail', appt: a })}
            onChanged={async () => {
              await reload();
            }}
          />
        )}
        {view.kind === 'book' && (
          <BookFlow
            bundles={bundles}
            featureFlags={featureFlags}
            onCancel={() => setView({ kind: 'list' })}
            onBooked={async (appt) => {
              await reload();
              setView({ kind: 'detail', appt });
            }}
          />
        )}
        {view.kind === 'detail' && (
          <DetailView
            appt={view.appt}
            onClose={() => setView({ kind: 'list' })}
            onChanged={async () => {
              await reload();
            }}
          />
        )}
      </main>
    </div>
  );
}

// ── List view ─────────────────────────────────────────────────────────
function ListView({
  appointments,
  onBook,
  onOpen,
  onChanged,
}: {
  appointments: Appointment[];
  onBook: () => void;
  onOpen: (a: Appointment) => void;
  onChanged: () => void;
}) {
  // Session 117 continued — split out pending invitations (staff sent
  // them; parent must accept or decline) from confirmed/past/cancelled.
  // Pending invites surface FIRST because they're the action-required.
  const pendingInvites = appointments.filter((a) => a.status === 'pending');
  const otherAppointments = appointments.filter((a) => a.status !== 'pending');

  return (
    <>
      {pendingInvites.length > 0 && (
        <PendingInvitations
          invitations={pendingInvites}
          onChanged={onChanged}
        />
      )}

      <button onClick={onBook} style={{
        width: '100%', padding: '14px 18px', borderRadius: 12,
        background: `linear-gradient(135deg, ${T.emerald}, ${T.emeraldDeep})`,
        color: '#0a1a0f', fontWeight: 600, fontSize: 15, border: 'none',
        cursor: 'pointer', marginBottom: 18,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        <Plus size={18} strokeWidth={2} /> Book a meeting
      </button>

      {otherAppointments.length === 0 ? (
        <div style={{ padding: 30, borderRadius: 12, background: T.cardBg, border: T.cardBorder, color: T.textSecondary, fontSize: 14, lineHeight: 1.6, textAlign: 'center' }}>
          <Calendar size={28} color={T.emerald} strokeWidth={1.5} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.6 }} />
          {pendingInvites.length > 0
            ? 'No confirmed meetings yet. Pending invitations are above.'
            : "You haven't booked any meetings yet."}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {otherAppointments.map((a) => {
            const primary = a.hosts.find((h) => h.is_primary);
            const isPast = new Date(a.scheduled_end) < new Date();
            return (
              <button key={a.id} onClick={() => onOpen(a)} style={{
                width: '100%', padding: '14px 16px', borderRadius: 12,
                background: T.cardBg, border: T.cardBorder, color: T.textPrimary,
                textAlign: 'left', cursor: 'pointer', fontFamily: T.sans,
                opacity: a.status === 'cancelled' ? 0.6 : 1,
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, color: T.textPrimary }}>
                    {primary?.name || 'Staff'}
                    {a.status === 'cancelled' && <span style={{ color: T.red, fontSize: 11, marginLeft: 8 }}>· cancelled</span>}
                    {isPast && a.status !== 'cancelled' && <span style={{ color: T.textMuted, fontSize: 11, marginLeft: 8 }}>· past</span>}
                  </span>
                  <ChevronRight size={16} color={T.textMuted} strokeWidth={1.75} />
                </div>
                <div style={{ fontSize: 13, color: T.textSecondary }}>
                  <Clock size={12} strokeWidth={1.75} style={{ verticalAlign: 'middle', marginRight: 4, color: T.emerald }} />
                  {fmtDateTime(a.scheduled_start)}
                </div>
                {a.intake_subject && (
                  <div style={{ fontSize: 12, color: T.textMuted, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.intake_subject}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

// ── Pending invitations (Session 117 continued) ──────────────────────
// Staff-initiated appointments awaiting parent response. Each row has
// Accept + Decline buttons that PATCH the appointment status.
function PendingInvitations({
  invitations,
  onChanged,
}: {
  invitations: Appointment[];
  onChanged: () => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const respond = async (id: string, action: 'accept' | 'decline') => {
    if (action === 'decline') {
      const confirmed =
        typeof window !== 'undefined'
          ? window.confirm('Decline this invitation? The staff member will see your response.')
          : true;
      if (!confirmed) return;
    }
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/montree/parent/appointments/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || (action === 'accept' ? 'Could not accept.' : 'Could not decline.'));
        return;
      }
      onChanged();
    } catch {
      setError('Network error.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div
      style={{
        marginBottom: 18,
        padding: 16,
        borderRadius: 14,
        background: 'rgba(232,201,106,0.08)',
        border: '1px solid rgba(232,201,106,0.32)',
        color: T.textPrimary,
      }}
    >
      <div
        style={{
          fontFamily: T.serif,
          fontSize: 17,
          fontWeight: 500,
          color: T.gold,
          marginBottom: 4,
        }}
      >
        {invitations.length === 1
          ? 'New invitation'
          : `${invitations.length} new invitations`}
      </div>
      <div style={{ fontSize: 12, color: T.textSecondary, marginBottom: 12 }}>
        A staff member from your school invited you to a meeting. Tap accept to
        confirm or decline if it doesn&apos;t work.
      </div>

      {error && (
        <div
          style={{
            padding: 10,
            borderRadius: 10,
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.32)',
            color: T.red,
            fontSize: 12,
            marginBottom: 10,
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {invitations.map((a) => {
          const primary = a.hosts.find((h) => h.is_primary);
          return (
            <div
              key={a.id}
              style={{
                padding: '12px 14px',
                borderRadius: 10,
                background: 'rgba(8,20,12,0.55)',
                border: T.cardBorder,
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
                <span style={{ fontWeight: 600, fontSize: 14 }}>
                  {primary?.name || 'Staff'}
                </span>
                {a.provider === 'agora' || a.video_url ? (
                  <span
                    style={{
                      fontSize: 11,
                      color: T.emerald,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Video size={12} strokeWidth={1.75} /> Video call
                  </span>
                ) : (
                  <span style={{ fontSize: 11, color: T.textMuted }}>In-person</span>
                )}
              </div>
              <div style={{ fontSize: 13, color: T.textSecondary, marginBottom: 6 }}>
                <Clock
                  size={12}
                  strokeWidth={1.75}
                  style={{ verticalAlign: 'middle', marginRight: 4, color: T.emerald }}
                />
                {fmtDateTime(a.scheduled_start)}
              </div>
              {a.intake_subject && (
                <div
                  style={{
                    fontSize: 12,
                    color: T.textMuted,
                    marginBottom: 10,
                    fontStyle: 'italic',
                  }}
                >
                  &ldquo;{a.intake_subject}&rdquo;
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => respond(a.id, 'accept')}
                  disabled={busyId === a.id}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 10,
                    background: T.emerald,
                    border: 'none',
                    color: '#0a1a0f',
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: busyId === a.id ? 'not-allowed' : 'pointer',
                    opacity: busyId === a.id ? 0.6 : 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <CheckCircle2 size={14} strokeWidth={2} />
                  {busyId === a.id ? '…' : 'Accept'}
                </button>
                <button
                  type="button"
                  onClick={() => respond(a.id, 'decline')}
                  disabled={busyId === a.id}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 10,
                    background: 'transparent',
                    border: '1px solid rgba(239,68,68,0.4)',
                    color: T.red,
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: busyId === a.id ? 'not-allowed' : 'pointer',
                    opacity: busyId === a.id ? 0.6 : 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <XCircle size={14} strokeWidth={2} />
                  {busyId === a.id ? '…' : 'Decline'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Book flow ─────────────────────────────────────────────────────────
function BookFlow({ bundles, featureFlags, onCancel, onBooked }: { bundles: RecipientBundle[]; featureFlags: FeatureFlagsEcho; onCancel: () => void; onBooked: (a: Appointment) => void }) {
  const [step, setStep] = useState<'recipient' | 'slot' | 'intake'>('recipient');
  const [childId, setChildId] = useState<string>('');
  const [recipient, setRecipient] = useState<{ role: 'teacher' | 'principal'; id: string; name: string } | null>(null);
  const [slots, setSlots] = useState<Array<{ start: string; end: string }>>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null);
  const [subject, setSubject] = useState('');
  const [bodyText, setBodyText] = useState('');
  // Phase 116.2 — opt-in checkbox. 🚨 Defaults TRUE as of 2026-05-18.
  // Previous "Montessori parents skew towards in-person" framing turned
  // out to be wrong in practice — every booking the user tested with the
  // checkbox unchecked landed with no Join button + no way to enter the
  // meeting, breaking the whole point of the feature. Default to video
  // when the school has video on; parent can untick if they want
  // in-person. Mirrors the server-side default added in 45becce6.
  const [videoCall, setVideoCall] = useState<boolean>(true);
  // Phase 116.3 — opt-in to recording. Only visible when school has BOTH
  // agora_video_calls AND video_recording flags on AND the parent has
  // ticked the video-call checkbox above. Defaults OFF — parents opt in.
  const [recordMeeting, setRecordMeeting] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Whether the video checkbox surface should appear at all (either Jitsi
  // legacy or Agora premium counts as "video available").
  const videoAvailable = !!featureFlags.video_calls || !!featureFlags.agora_video_calls;
  // Whether to surface the "Record this meeting" sub-checkbox.
  const recordingAvailable = !!featureFlags.agora_video_calls && !!featureFlags.video_recording;

  const currentBundle = bundles.find((b) => b.child_id === childId) || null;

  // Auto-pick the only child + only recipient
  useEffect(() => {
    if (bundles.length === 1 && !childId) setChildId(bundles[0].child_id);
  }, [bundles, childId]);

  const loadSlots = useCallback(async () => {
    if (!recipient) return;
    setSlotsLoading(true);
    try {
      const params = new URLSearchParams({
        event_kind: 'single_host',
        hosts: `${recipient.role}:${recipient.id}`,
      });
      const res = await fetch(`/api/montree/appointments/slots?${params.toString()}`, {
        credentials: 'same-origin',
      });
      if (!res.ok) {
        setError('Could not load available times.');
        setSlots([]);
        return;
      }
      const data = await res.json();
      setSlots(data?.slots || []);
    } catch {
      setError('Network error.');
    } finally {
      setSlotsLoading(false);
    }
  }, [recipient]);

  useEffect(() => {
    if (step === 'slot' && recipient) loadSlots();
  }, [step, recipient, loadSlots]);

  const handleBook = async () => {
    if (!recipient || !selectedSlot) return;
    setSubmitting(true);
    setError(null);
    try {
      const start = new Date(selectedSlot.start);
      const end = new Date(selectedSlot.end);
      const duration = Math.round((end.getTime() - start.getTime()) / 60000);
      const res = await fetch('/api/montree/parent/appointments', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_kind: 'single_host',
          hosts: [{ role: recipient.role, id: recipient.id }],
          scheduled_start: selectedSlot.start,
          duration_minutes: duration,
          child_id: childId || null,
          intake_subject: subject.trim() || null,
          intake_body: bodyText.trim() || null,
          // Phase 116.2/116.3 — opt-in video call. Sent when either Jitsi
          // (video_calls) or Agora (agora_video_calls) is on. Server
          // chooses provider based on its own flag check (defense in depth).
          ...(videoAvailable && videoCall ? { video_call: true } : {}),
          // Phase 116.3 — opt-in recording. Only sent when recording is
          // available AND the parent ticked the video-call checkbox AND
          // the parent ticked the recording sub-checkbox.
          ...(recordingAvailable && videoCall && recordMeeting ? { record_meeting: true } : {}),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j?.error || 'Could not book the meeting.');
        return;
      }
      const data = await res.json();
      if (data?.appointment) onBooked(data.appointment);
    } catch {
      setError('Network error.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2 style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 500, margin: 0 }}>
        Book a meeting
      </h2>

      {bundles.length === 0 ? (
        <div style={{ padding: 18, borderRadius: 12, background: T.cardBg, border: T.cardBorder, color: T.textSecondary, fontSize: 14 }}>
          You don&apos;t have any children linked to a classroom yet. Contact your school.
        </div>
      ) : (
        <>
          {/* Child picker */}
          {bundles.length > 1 && (
            <FieldRow label="About">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {bundles.map((b) => (
                  <button key={b.child_id} onClick={() => { setChildId(b.child_id); setRecipient(null); setStep('recipient'); }} style={{
                    padding: '8px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600,
                    border: 'none', cursor: 'pointer',
                    background: childId === b.child_id ? T.emerald : T.card,
                    color: childId === b.child_id ? '#0a1a0f' : T.textPrimary,
                  }}>
                    {b.child_name}
                  </button>
                ))}
              </div>
            </FieldRow>
          )}

          {step === 'recipient' && currentBundle && (
            <FieldRow label="Who do you want to meet with?">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {currentBundle.teachers.map((teacher) => (
                  <button key={`t:${teacher.id}`} onClick={() => { setRecipient({ role: 'teacher', id: teacher.id, name: teacher.name }); setStep('slot'); }} style={recipientCard()}>
                    <div style={{ fontWeight: 600 }}>{teacher.name}</div>
                    <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
                      {teacher.is_lead ? 'Lead teacher' : 'Teacher'}
                    </div>
                  </button>
                ))}
                {currentBundle.principal && (
                  <button onClick={() => { setRecipient({ role: 'principal', id: currentBundle.principal!.id, name: currentBundle.principal!.name }); setStep('slot'); }} style={recipientCard()}>
                    <div style={{ fontWeight: 600 }}>{currentBundle.principal.name}</div>
                    <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>Principal</div>
                  </button>
                )}
              </div>
            </FieldRow>
          )}

          {step === 'slot' && recipient && (
            <FieldRow label={`Pick a time with ${recipient.name}`}>
              {slotsLoading ? (
                <div style={{ padding: 24, textAlign: 'center', color: T.textSecondary, fontSize: 13 }}>
                  <Loader2 size={20} style={{ animation: 'spin 1.4s linear infinite' }} /> Loading times…
                </div>
              ) : slots.length === 0 ? (
                <div style={{ padding: 18, borderRadius: 12, background: T.cardBg, border: T.cardBorder, color: T.textSecondary, fontSize: 13 }}>
                  No open slots in the next 30 days. {recipient.role === 'teacher' ? 'Try another teacher' : 'Try again later'}, or message them directly first.
                </div>
              ) : (
                <SlotGrid slots={slots} selectedStart={selectedSlot?.start || null} onPick={(s) => { setSelectedSlot(s); setStep('intake'); }} />
              )}
            </FieldRow>
          )}

          {step === 'intake' && recipient && selectedSlot && (
            <>
              <div style={{ padding: 14, borderRadius: 12, background: T.cardBg, border: T.cardBorder, fontSize: 13, color: T.textSecondary }}>
                Meeting with <strong style={{ color: T.textPrimary }}>{recipient.name}</strong><br />
                {fmtDateTime(selectedSlot.start)}
              </div>

              <FieldRow label="What would you like to talk about?">
                <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="One short line — optional" maxLength={200} style={inputStyle()} />
              </FieldRow>

              <FieldRow label="Anything they should know before?">
                <textarea value={bodyText} onChange={(e) => setBodyText(e.target.value)} rows={4} placeholder="Context, questions, what's on your mind — optional" maxLength={2000} style={{ ...inputStyle(), resize: 'vertical', minHeight: 90 }} />
              </FieldRow>

              {/* Phase 116.2/116.3 — video-call opt-in. Surfaces when
                  EITHER provider is on. Copy + features adapt to which
                  one is active (Agora native > Jitsi external). */}
              {videoAvailable && (
                <>
                  <label style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: 12, borderRadius: 10,
                    background: T.cardBg, border: T.cardBorder,
                    fontSize: 13, color: T.textPrimary, cursor: 'pointer',
                  }}>
                    <input
                      type="checkbox"
                      checked={videoCall}
                      onChange={(e) => setVideoCall(e.target.checked)}
                      style={{ marginTop: 3, width: 18, height: 18, cursor: 'pointer', accentColor: T.emerald }}
                    />
                    <span style={{ flex: 1 }}>
                      <span style={{ fontWeight: 600 }}>Video call</span>
                      <span style={{ display: 'block', fontSize: 12, color: T.textSecondary, marginTop: 2, lineHeight: 1.45 }}>
                        {featureFlags.agora_video_calls
                          ? `Meet face-to-face with ${recipient.name} from anywhere — the call opens right here inside Montree. Camera and microphone permission required.`
                          : `Join the meeting from anywhere via Jitsi Meet. A secure room link will be created for you and ${recipient.name}. Browser-only — no app to install.`}
                      </span>
                    </span>
                  </label>

                  {/* Recording sub-option. Indented under video to show it
                      depends on the parent checkbox. */}
                  {videoCall && recordingAvailable && (
                    <label style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      padding: 12, borderRadius: 10,
                      background: 'rgba(232,201,106,0.08)',
                      border: '1px solid rgba(232,201,106,0.28)',
                      fontSize: 13, color: T.textPrimary, cursor: 'pointer',
                      marginLeft: 24,
                    }}>
                      <input
                        type="checkbox"
                        checked={recordMeeting}
                        onChange={(e) => setRecordMeeting(e.target.checked)}
                        style={{ marginTop: 3, width: 18, height: 18, cursor: 'pointer', accentColor: '#E8C96A' }}
                      />
                      <span style={{ flex: 1 }}>
                        <span style={{ fontWeight: 600, color: '#E8C96A' }}>Record this meeting</span>
                        <span style={{ display: 'block', fontSize: 12, color: T.textSecondary, marginTop: 2, lineHeight: 1.45 }}>
                          The school keeps a copy so the next teacher you meet knows what was discussed. Audio only — never video. You&apos;ll see a recording banner during the call.
                        </span>
                      </span>
                    </label>
                  )}
                </>
              )}

              {error && (
                <div style={{ padding: 10, borderRadius: 8, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.32)', color: T.red, fontSize: 13 }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setStep('slot')} style={btnGhost()}>Back</button>
                <button onClick={handleBook} disabled={submitting} style={btnPrimary(submitting)}>
                  {submitting ? 'Booking…' : 'Confirm meeting'}
                </button>
              </div>
            </>
          )}
        </>
      )}

      {step === 'recipient' && (
        <button onClick={onCancel} style={btnGhost()}>Cancel</button>
      )}

      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ── Slot grid ─────────────────────────────────────────────────────────
function SlotGrid({ slots, selectedStart, onPick }: { slots: Array<{ start: string; end: string }>; selectedStart: string | null; onPick: (s: { start: string; end: string }) => void }) {
  // Group by day.
  const byDay = new Map<string, Array<{ start: string; end: string }>>();
  for (const s of slots) {
    const day = new Date(s.start).toDateString();
    const arr = byDay.get(day) || [];
    arr.push(s);
    byDay.set(day, arr);
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {Array.from(byDay.entries()).slice(0, 14).map(([day, dayslots]) => (
        <div key={day}>
          <div style={{ fontSize: 11, color: T.gold, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600, marginBottom: 8 }}>
            {fmtDayHeader(dayslots[0].start)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 8 }}>
            {dayslots.map((s) => {
              const selected = selectedStart === s.start;
              return (
                <button key={s.start} onClick={() => onPick(s)} style={{
                  padding: '10px 8px', borderRadius: 8,
                  background: selected ? T.emerald : T.cardBg,
                  border: selected ? 'none' : T.cardBorder,
                  color: selected ? '#0a1a0f' : T.textPrimary,
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}>
                  {fmtTime(s.start)}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Detail view ───────────────────────────────────────────────────────
function DetailView({ appt, onClose, onChanged }: { appt: Appointment; onClose: () => void; onChanged: () => Promise<void> }) {
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Phase 116.3 — controls whether the AgoraVideoCall component is
  // mounted (covers the whole viewport when active). Lazy-required so
  // the SDK isn't downloaded until the user actually taps Join.
  const [agoraOpen, setAgoraOpen] = useState(false);
  const primary = appt.hosts.find((h) => h.is_primary);
  const isPast = new Date(appt.scheduled_end) < new Date();
  const canModify = appt.status === 'confirmed' && !isPast;

  const handleCancel = async () => {
    if (!confirm('Cancel this meeting?')) return;
    setCancelling(true);
    setError(null);
    try {
      const res = await fetch(`/api/montree/parent/appointments/${appt.id}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });
      if (!res.ok) {
        setError('Could not cancel.');
        return;
      }
      await onChanged();
      onClose();
    } catch {
      setError('Network error.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ padding: 18, borderRadius: 12, background: T.cardBg, border: T.cardBorder }}>
        <div style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 500 }}>
          {primary?.name || 'Meeting'}
        </div>
        <div style={{ fontSize: 13, color: T.textSecondary, marginTop: 6 }}>
          <Clock size={13} strokeWidth={1.75} style={{ verticalAlign: 'middle', marginRight: 6, color: T.emerald }} />
          {fmtDateTime(appt.scheduled_start)} · {appt.duration_minutes} min
        </div>
        <div style={{ fontSize: 12, marginTop: 8 }}>
          <span style={{ color: statusColor(appt.status) }}>
            {appt.status === 'confirmed' ? <><CheckCircle2 size={12} strokeWidth={1.75} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Confirmed</> :
             appt.status === 'cancelled' ? <><XCircle size={12} strokeWidth={1.75} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Cancelled</> :
             appt.status}
          </span>
        </div>
        {appt.location && (
          <div style={{ fontSize: 13, color: T.textPrimary, marginTop: 10 }}>
            {appt.location}
          </div>
        )}
        {/* Phase 116.2/116.3 — Join button. Two variants:
            (a) provider='agora' → button mounts the AgoraVideoCall
                component inline (no external URL). Recording UX surfaces
                inside the call if recording_enabled.
            (b) Otherwise → falls back to the Jitsi video_url anchor.
            🚨 No isPast guard (2026-05-18) — matches the teacher calendar
            BookingRow. Agora rooms don't auto-close, so a parent dropped
            mid-call OR a meeting that overran the scheduled window needs
            to keep being join-able. Cancelled status DOES block (intent
            was explicit), but past + confirmed stays joinable. */}
        {appt.provider === 'agora' && appt.status === 'confirmed' && (
          <button
            type="button"
            onClick={() => setAgoraOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 12,
              padding: '10px 14px',
              borderRadius: 10,
              background: T.emerald,
              color: '#0a1a0f',
              fontWeight: 600,
              fontSize: 14,
              border: 'none',
              cursor: 'pointer',
            }}
            aria-label="Join the video call"
          >
            <Video size={16} strokeWidth={1.75} /> Join video call
          </button>
        )}
        {appt.provider !== 'agora' && appt.video_url && (
          <a
            href={appt.video_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 12,
              padding: '10px 14px',
              borderRadius: 10,
              background: T.emerald,
              color: '#0a1a0f',
              fontWeight: 600,
              fontSize: 14,
              textDecoration: 'none',
            }}
            aria-label="Join the video call (opens in a new tab)"
          >
            <Video size={16} strokeWidth={1.75} /> Join video call
          </a>
        )}
        {appt.intake_subject && (
          <div style={{ fontSize: 13, color: T.textPrimary, marginTop: 10, fontStyle: 'italic' }}>
            “{appt.intake_subject}”
          </div>
        )}
        {appt.intake_body && (
          <div style={{ fontSize: 13, color: T.textSecondary, marginTop: 8, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
            {appt.intake_body}
          </div>
        )}
      </div>

      {error && (
        <div style={{ padding: 10, borderRadius: 8, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.32)', color: T.red, fontSize: 13 }}>
          {error}
        </div>
      )}

      {canModify && (
        <button onClick={handleCancel} disabled={cancelling} style={{
          padding: '12px 14px', borderRadius: 10,
          background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.32)',
          color: T.red, fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>
          {cancelling ? 'Cancelling…' : 'Cancel meeting'}
        </button>
      )}

      <button onClick={onClose} style={btnGhost()}>Back</button>

      {/* Phase 116.3 — full-viewport Agora call overlay. Dynamic import
          to keep the SDK chunk out of the initial bundle for anyone who
          doesn't open a video call. */}
      {agoraOpen && appt.provider === 'agora' && (
        <AgoraVideoCallLazy
          appointmentId={appt.id}
          callerRole="parent"
          remoteDisplayName={primary?.name || 'Your teacher'}
          recordingEnabledForAppointment={!!appt.recording_enabled}
          onClose={() => setAgoraOpen(false)}
        />
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────
function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: T.gold, letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>
        {label}
      </div>
      {children}
    </div>
  );
}
function fmtDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: 'long', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
function fmtDayHeader(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      weekday: 'long', month: 'short', day: 'numeric',
    });
  } catch {
    return iso;
  }
}
function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: 'numeric', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
function statusColor(s: string): string {
  if (s === 'confirmed') return T.emerald;
  if (s === 'cancelled') return T.red;
  if (s === 'completed') return T.textMuted;
  return T.gold;
}
function inputStyle(): React.CSSProperties {
  return {
    width: '100%', padding: '10px 12px', borderRadius: 10,
    background: T.inputBg, border: T.inputBorder,
    color: T.textPrimary, fontSize: 16, fontFamily: T.sans, outline: 'none',
  };
}
function backBtn(): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: 6,
    background: 'none', border: 'none', color: T.textSecondary,
    cursor: 'pointer', fontSize: 13,
  };
}
function btnPrimary(disabled = false): React.CSSProperties {
  return {
    flex: 1, padding: '12px 18px', borderRadius: 12,
    background: disabled ? 'rgba(52,211,153,0.35)' : T.emerald,
    border: 'none', color: '#0a1a0f', fontWeight: 600, fontSize: 15,
    cursor: disabled ? 'wait' : 'pointer',
  };
}
function btnGhost(): React.CSSProperties {
  return {
    padding: '12px 18px', borderRadius: 12,
    background: T.cardBg, border: T.cardBorder,
    color: T.textPrimary, fontSize: 14, cursor: 'pointer',
  };
}
function recipientCard(): React.CSSProperties {
  return {
    padding: '14px 16px', borderRadius: 12,
    background: T.cardBg, border: T.cardBorder,
    color: T.textPrimary, textAlign: 'left', fontFamily: T.sans, fontSize: 14,
    cursor: 'pointer',
  };
}
