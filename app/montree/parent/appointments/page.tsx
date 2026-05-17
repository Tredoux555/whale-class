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
  hosts: Array<{ role: string; id: string; name: string | null; is_primary: boolean }>;
}

interface FeatureFlagsEcho {
  video_calls?: boolean;
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
function ListView({ appointments, onBook, onOpen }: { appointments: Appointment[]; onBook: () => void; onOpen: (a: Appointment) => void }) {
  return (
    <>
      <button onClick={onBook} style={{
        width: '100%', padding: '14px 18px', borderRadius: 12,
        background: `linear-gradient(135deg, ${T.emerald}, ${T.emeraldDeep})`,
        color: '#0a1a0f', fontWeight: 600, fontSize: 15, border: 'none',
        cursor: 'pointer', marginBottom: 18,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        <Plus size={18} strokeWidth={2} /> Book a meeting
      </button>

      {appointments.length === 0 ? (
        <div style={{ padding: 30, borderRadius: 12, background: T.cardBg, border: T.cardBorder, color: T.textSecondary, fontSize: 14, lineHeight: 1.6, textAlign: 'center' }}>
          <Calendar size={28} color={T.emerald} strokeWidth={1.5} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.6 }} />
          You haven&apos;t booked any meetings yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {appointments.map((a) => {
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
  // Phase 116.2 — opt-in checkbox. Defaults OFF — Montessori parents
  // skew towards in-person, and surprise-defaulting to video would be
  // a worse first impression than asking. Server ignores this when the
  // school's video_calls flag is OFF (defense in depth).
  const [videoCall, setVideoCall] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          // Phase 116.2 — opt-in video call. Only sent when the flag is
          // on (UI hides the checkbox otherwise). Server gates this
          // against the same flag for defense in depth.
          ...(featureFlags.video_calls && videoCall ? { video_call: true } : {}),
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

              {/* Phase 116.2 — video-call opt-in. Surfaces only when the
                  school has the `video_calls` flag on. Schools without
                  the flag never see this checkbox. */}
              {featureFlags.video_calls && (
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
                      Join the meeting from anywhere via Jitsi Meet. A secure room link will be created for you and {recipient.name}. Browser-only — no app to install.
                    </span>
                  </span>
                </label>
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
        {/* Phase 116.2 — Join button for Jitsi calls. Renders only when
            the booking has a video_url (parent opted in + school has
            video_calls on). Past appointments still show the button so
            the parent can re-enter the room if they got dropped. We
            don't disable it on cancelled because some flows re-open. */}
        {appt.video_url && (
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
