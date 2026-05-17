// components/montree/appointments/AvailabilityEditor.tsx
//
// 🚨 DEPRECATED as of Session 117 (May 17, 2026).
//
// This component is the legacy database-list view of staff availability.
// It has been replaced by AppointmentsCalendar (in this same directory),
// which is the canonical calendar-first surface at /montree/dashboard/
// appointments and /montree/admin/appointments.
//
// Kept on disk per the hide-don't-delete posture (architectural rule #56):
//   - No remaining importers anywhere in the codebase (verified).
//   - Useful as a fallback reference if AppointmentsCalendar ever needs to
//     be rolled back surgically.
//   - Future contributors should NOT re-import this file. Extend
//     AppointmentsCalendar instead — the underlying APIs are unchanged.
//
// ───────────────────────────────────────────────────────────────────────
// Original docs (preserved):
//
// Staff availability editor. Used at both /montree/dashboard/appointments
// (teacher view) and /montree/admin/appointments (principal view). The
// API auto-scopes to the caller's identity via auth.role + auth.userId
// so the same component renders identically for both roles.
//
// SURFACE:
//   - Weekly recurring availability windows (one row per day-of-week + range).
//   - One-off blackouts (vacation, sick day) with start/end picker.
//   - Read-only list of "my upcoming bookings".
//
// PRIVACY: no audio, no AI. Pure CRUD on top of the appointment routes.

'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  Calendar,
  Plus,
  Trash2,
  Clock,
  XCircle,
  CheckCircle2,
  Video,
} from 'lucide-react';

// Lazy-mount the Agora call — SDK ~600KB chunk only loads when staff
// actually taps Join on an upcoming Agora booking.
const AgoraVideoCallLazy = dynamic(
  () => import('@/components/montree/appointments/AgoraVideoCall'),
  { ssr: false }
);

// Lazy-mount the PriorConversationCard. Renders summaries from prior
// meetings with this parent — the killer-feature briefing surface.
const PriorConversationCardLazy = dynamic(
  () => import('@/components/montree/appointments/PriorConversationCard'),
  { ssr: false }
);

const T = {
  emerald: '#34d399',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  gold: '#E8C96A',
  cardBg: 'rgba(8,20,12,0.55)',
  cardBorder: '1px solid rgba(52,211,153,0.18)',
  inputBg: 'rgba(0,0,0,0.30)',
  inputBorder: '1px solid rgba(52,211,153,0.25)',
  textPrimary: 'rgba(255,255,255,0.92)',
  textSecondary: 'rgba(234,241,230,0.55)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif',
  red: '#fca5a5',
  redBg: 'rgba(239,68,68,0.12)',
  redBorder: '1px solid rgba(239,68,68,0.32)',
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface Rule {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  buffer_minutes: number;
  timezone: string;
  is_active: boolean;
}

interface Blackout {
  id: string;
  start_at: string;
  end_at: string;
  reason: string | null;
}

interface Appointment {
  id: string;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
  intake_subject: string | null;
  parent_name: string | null;
  child_name: string | null;
  // Phase 116.2 — Jitsi room URL surfaced by the staff appointments API
  // when migration 222 is run. Optional because legacy schools / pre-
  // migration bookings won't have it.
  video_url?: string | null;
  // Phase 116.3 — which provider serves this appointment's video call.
  // 'agora' = open AgoraVideoCall inline (native). 'jitsi' or absent =
  // fall through to the video_url external anchor.
  provider?: 'jitsi' | 'agora' | null;
  recording_enabled?: boolean | null;
  hosts: Array<{ role: string; id: string; name: string | null; is_primary: boolean; response: string | null }>;
}

export default function AvailabilityEditor() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [blackouts, setBlackouts] = useState<Blackout[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [migrationPending, setMigrationPending] = useState(false);
  const [featureDisabled, setFeatureDisabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Phase 116.3 — which appointment's Agora call is currently mounted.
  // Null = no call open. We track the appointment object so the call
  // component has the remote display name + recording flag.
  const [agoraCall, setAgoraCall] = useState<Appointment | null>(null);
  // Phase 116.3 — which appointment rows have their PriorConversationCard
  // expanded. Set, not single, so staff can preview multiple briefings
  // in the same session.
  const [expandedPriorIds, setExpandedPriorIds] = useState<Set<string>>(new Set());

  // Add-rule form state
  const [showAddRule, setShowAddRule] = useState(false);
  const [newDay, setNewDay] = useState(1);
  const [newStart, setNewStart] = useState('09:00');
  const [newEnd, setNewEnd] = useState('17:00');
  const [newDuration, setNewDuration] = useState(30);
  const [newBuffer, setNewBuffer] = useState(5);
  const browserTz = typeof window !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC';
  const [newTz, setNewTz] = useState(browserTz);

  // Add-blackout form state
  const [showAddBlackout, setShowAddBlackout] = useState(false);
  const [newBlackoutStart, setNewBlackoutStart] = useState('');
  const [newBlackoutEnd, setNewBlackoutEnd] = useState('');
  const [newBlackoutReason, setNewBlackoutReason] = useState('');

  const reload = useCallback(async () => {
    setError(null);
    try {
      const [availRes, apptsRes] = await Promise.all([
        fetch('/api/montree/appointments/availability', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/montree/appointments', { credentials: 'include', cache: 'no-store' }),
      ]);
      if (!availRes.ok) {
        if (availRes.status === 401 || availRes.status === 403) {
          window.location.href = '/montree/login-select';
          return;
        }
        setError('Could not load availability.');
        return;
      }
      const availData = await availRes.json();
      if (availData?.migration_pending) setMigrationPending(true);
      if (availData?.feature_disabled) setFeatureDisabled(true);
      setRules(availData?.rules || []);
      setBlackouts(availData?.blackouts || []);

      if (apptsRes.ok) {
        const apptsData = await apptsRes.json();
        setAppointments(apptsData?.appointments || []);
      }
    } catch {
      setError('Network error.');
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await reload();
      setLoading(false);
    })();
  }, [reload]);

  const addRule = async () => {
    if (newStart >= newEnd) {
      setError('Start time must be before end time.');
      return;
    }
    setError(null);
    try {
      const res = await fetch('/api/montree/appointments/availability', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          day_of_week: newDay,
          start_time: newStart,
          end_time: newEnd,
          slot_duration_minutes: newDuration,
          buffer_minutes: newBuffer,
          timezone: newTz,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j?.error || 'Failed to add availability.');
        return;
      }
      setShowAddRule(false);
      await reload();
    } catch {
      setError('Network error.');
    }
  };

  const deleteRule = async (id: string) => {
    if (!confirm('Remove this availability window?')) return;
    try {
      const res = await fetch(`/api/montree/appointments/availability?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) await reload();
      else setError('Failed to delete.');
    } catch {
      setError('Network error.');
    }
  };

  const toggleRuleActive = async (rule: Rule) => {
    try {
      const res = await fetch('/api/montree/appointments/availability', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rule.id, is_active: !rule.is_active }),
      });
      if (res.ok) await reload();
    } catch {
      // ignore
    }
  };

  const addBlackout = async () => {
    if (!newBlackoutStart || !newBlackoutEnd) {
      setError('Pick a start and end.');
      return;
    }
    try {
      const res = await fetch('/api/montree/appointments/availability/blackouts', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_at: new Date(newBlackoutStart).toISOString(),
          end_at: new Date(newBlackoutEnd).toISOString(),
          reason: newBlackoutReason.trim() || null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j?.error || 'Failed to add blackout.');
        return;
      }
      setShowAddBlackout(false);
      setNewBlackoutReason('');
      await reload();
    } catch {
      setError('Network error.');
    }
  };

  const deleteBlackout = async (id: string) => {
    if (!confirm('Remove this blackout?')) return;
    try {
      const res = await fetch(`/api/montree/appointments/availability/blackouts?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) await reload();
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 30, color: T.textSecondary, fontFamily: T.sans }}>
        Loading availability…
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px 60px', fontFamily: T.sans, color: T.textPrimary }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: T.serif, fontSize: 28, fontWeight: 500, letterSpacing: -0.3, margin: 0 }}>
          <Calendar size={26} strokeWidth={1.75} style={{ verticalAlign: 'text-bottom', marginRight: 10, color: T.emerald }} />
          Appointments
        </h1>
        <p style={{ color: T.textSecondary, fontSize: 13, margin: '6px 0 0' }}>
          Set the windows when parents can book meetings with you.
        </p>
      </div>

      {featureDisabled && (
        <div style={{ padding: 14, borderRadius: 12, marginBottom: 18, background: 'rgba(232,201,106,0.10)', border: '1px solid rgba(232,201,106,0.40)', color: T.gold, fontSize: 13 }}>
          Appointments isn&apos;t enabled for your school yet. Ask the school owner to flip the feature flag on.
        </div>
      )}

      {migrationPending && (
        <div style={{ padding: 14, borderRadius: 12, marginBottom: 18, background: 'rgba(232,201,106,0.10)', border: '1px solid rgba(232,201,106,0.40)', color: T.gold, fontSize: 13 }}>
          ⚠️ The appointments table isn&apos;t set up yet. Tredoux needs to run <code>migrations/216_appointments.sql</code>.
        </div>
      )}

      {error && (
        <div style={{ padding: 12, borderRadius: 10, marginBottom: 14, background: T.redBg, border: T.redBorder, color: T.red, fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* ── Weekly availability ──────────────────────────────────────── */}
      <Section
        title="Weekly availability"
        subtitle="When you're open to meet, every week."
        action={
          !featureDisabled && !migrationPending ? (
            <button onClick={() => setShowAddRule((v) => !v)} style={btnPrimary()}>
              <Plus size={16} strokeWidth={1.75} /> Add window
            </button>
          ) : null
        }
      >
        {showAddRule && (
          <div style={addCardStyle()}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <Field label="Day">
                <select value={newDay} onChange={(e) => setNewDay(parseInt(e.target.value, 10))} style={inputStyle()}>
                  {DAYS.map((d, i) => (
                    <option key={i} value={i}>{d}</option>
                  ))}
                </select>
              </Field>
              <Field label="Timezone">
                <input value={newTz} onChange={(e) => setNewTz(e.target.value)} style={inputStyle()} />
              </Field>
              <Field label="From">
                <input type="time" value={newStart} onChange={(e) => setNewStart(e.target.value)} style={inputStyle()} />
              </Field>
              <Field label="To">
                <input type="time" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} style={inputStyle()} />
              </Field>
              <Field label="Slot length (min)">
                <input type="number" min={5} max={240} value={newDuration} onChange={(e) => setNewDuration(parseInt(e.target.value, 10) || 30)} style={inputStyle()} />
              </Field>
              <Field label="Buffer (min)">
                <input type="number" min={0} max={60} value={newBuffer} onChange={(e) => setNewBuffer(parseInt(e.target.value, 10) || 0)} style={inputStyle()} />
              </Field>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowAddRule(false)} style={btnGhost()}>Cancel</button>
              <button onClick={addRule} style={btnPrimary()}>Save window</button>
            </div>
          </div>
        )}

        {rules.length === 0 && !showAddRule ? (
          <div style={emptyStyle()}>
            No availability set yet. Tap <strong style={{ color: T.textPrimary }}>Add window</strong> above to open your first one.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rules.map((rule) => (
              <div key={rule.id} style={ruleRowStyle(rule.is_active)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                  <div style={{
                    minWidth: 44, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: rule.is_active ? T.emeraldSoft : 'rgba(255,255,255,0.06)',
                    color: rule.is_active ? T.emerald : T.textMuted,
                    fontWeight: 700, fontSize: 12, letterSpacing: 0.5,
                  }}>
                    {DAYS[rule.day_of_week]}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>
                      {rule.start_time.slice(0, 5)} – {rule.end_time.slice(0, 5)}
                    </div>
                    <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
                      {rule.slot_duration_minutes}-min slots · {rule.buffer_minutes}-min buffer · {rule.timezone}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => toggleRuleActive(rule)}
                    title={rule.is_active ? 'Pause' : 'Activate'}
                    style={iconBtn(rule.is_active ? T.emerald : T.textMuted)}
                  >
                    {rule.is_active ? <CheckCircle2 size={16} strokeWidth={1.75} /> : <XCircle size={16} strokeWidth={1.75} />}
                  </button>
                  <button onClick={() => deleteRule(rule.id)} title="Remove" style={iconBtn(T.red)}>
                    <Trash2 size={16} strokeWidth={1.75} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── Blackouts ────────────────────────────────────────────────── */}
      <Section
        title="One-off blackouts"
        subtitle="Vacation, sick day, school closure — block out specific times."
        action={
          !featureDisabled && !migrationPending ? (
            <button onClick={() => setShowAddBlackout((v) => !v)} style={btnPrimary()}>
              <Plus size={16} strokeWidth={1.75} /> Add blackout
            </button>
          ) : null
        }
      >
        {showAddBlackout && (
          <div style={addCardStyle()}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <Field label="From">
                <input type="datetime-local" value={newBlackoutStart} onChange={(e) => setNewBlackoutStart(e.target.value)} style={inputStyle()} />
              </Field>
              <Field label="To">
                <input type="datetime-local" value={newBlackoutEnd} onChange={(e) => setNewBlackoutEnd(e.target.value)} style={inputStyle()} />
              </Field>
            </div>
            <Field label="Reason (optional, parents don't see this)">
              <input value={newBlackoutReason} onChange={(e) => setNewBlackoutReason(e.target.value)} style={inputStyle()} placeholder="Vacation, sick, training day…" />
            </Field>
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button onClick={() => setShowAddBlackout(false)} style={btnGhost()}>Cancel</button>
              <button onClick={addBlackout} style={btnPrimary()}>Save blackout</button>
            </div>
          </div>
        )}

        {blackouts.length === 0 && !showAddBlackout ? (
          <div style={emptyStyle()}>None scheduled.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {blackouts.map((b) => (
              <div key={b.id} style={blackoutRowStyle()}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>
                    {fmtDateTime(b.start_at)} → {fmtDateTime(b.end_at)}
                  </div>
                  {b.reason && (
                    <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
                      {b.reason}
                    </div>
                  )}
                </div>
                <button onClick={() => deleteBlackout(b.id)} title="Remove" style={iconBtn(T.red)}>
                  <Trash2 size={16} strokeWidth={1.75} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── My upcoming bookings ─────────────────────────────────────── */}
      <Section
        title="Upcoming bookings"
        subtitle="Meetings parents have scheduled with you."
        action={null}
      >
        {appointments.length === 0 ? (
          <div style={emptyStyle()}>No bookings yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {appointments.map((a) => (
              <div key={a.id} style={apptRowStyle()}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>
                      <Clock size={13} strokeWidth={1.75} style={{ verticalAlign: 'middle', marginRight: 6, color: T.emerald }} />
                      {fmtDateTime(a.scheduled_start)}
                    </span>
                    <span style={{ fontSize: 11, color: statusColor(a.status) }}>
                      {a.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: T.textPrimary, marginTop: 4 }}>
                    {a.parent_name || 'Parent'}
                    {a.child_name ? ` · about ${a.child_name}` : ''}
                  </div>
                  {a.intake_subject && (
                    <div style={{ fontSize: 12, color: T.textSecondary, marginTop: 4 }}>
                      “{a.intake_subject}”
                    </div>
                  )}
                  {/* Phase 116.2/116.3 — Join button.
                      provider='agora' opens AgoraVideoCall inline.
                      Otherwise falls through to the Jitsi video_url anchor.
                      Past + cancelled appointments hide the button. */}
                  {a.provider === 'agora' && a.status === 'confirmed' && (
                    <button
                      type="button"
                      onClick={() => setAgoraCall(a)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        marginTop: 8,
                        padding: '6px 10px',
                        borderRadius: 8,
                        background: T.emerald,
                        color: '#0a1a0f',
                        fontWeight: 600,
                        fontSize: 12,
                        border: 'none',
                        cursor: 'pointer',
                      }}
                      aria-label="Join the video call"
                    >
                      <Video size={12} strokeWidth={1.75} /> Join video call
                    </button>
                  )}
                  {a.provider !== 'agora' && a.video_url && (
                    <a
                      href={a.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        marginTop: 8,
                        padding: '6px 10px',
                        borderRadius: 8,
                        background: T.emerald,
                        color: '#0a1a0f',
                        fontWeight: 600,
                        fontSize: 12,
                        textDecoration: 'none',
                      }}
                      aria-label="Join the video call (opens in a new tab)"
                    >
                      <Video size={12} strokeWidth={1.75} /> Join video call
                    </a>
                  )}

                  {/* Phase 116.3 — Prior conversations toggle. The killer
                      feature surface — staff opens this BEFORE joining to
                      see what was discussed in past meetings with the same
                      parent. Renders nothing if no prior summaries exist. */}
                  <div style={{ marginTop: 10 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setExpandedPriorIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(a.id)) next.delete(a.id);
                          else next.add(a.id);
                          return next;
                        });
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'rgba(232,201,106,0.85)',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: 0,
                        textDecoration: 'underline',
                        textUnderlineOffset: 2,
                      }}
                    >
                      {expandedPriorIds.has(a.id) ? 'Hide prior conversations' : 'Show prior conversations'}
                    </button>
                    {expandedPriorIds.has(a.id) && (
                      <div style={{ marginTop: 10 }}>
                        <PriorConversationCardLazy appointmentId={a.id} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Phase 116.3 — full-viewport Agora call overlay. Staff sees the
          same UI the parent sees, including recording controls (staff
          can start/stop; parent only sees the recording banner). */}
      {agoraCall && (
        <AgoraVideoCallLazy
          appointmentId={agoraCall.id}
          callerRole="teacher"
          remoteDisplayName={agoraCall.parent_name || 'Parent'}
          recordingEnabledForAppointment={!!agoraCall.recording_enabled}
          onClose={() => setAgoraCall(null)}
        />
      )}
    </div>
  );
}

// ── Small reusable bits ───────────────────────────────────────────────
function Section({ title, subtitle, action, children }: { title: string; subtitle: string; action: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 30 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
        <div>
          <div style={{ fontFamily: T.serif, fontSize: 18, fontWeight: 500, color: T.textPrimary }}>{title}</div>
          <div style={{ fontSize: 12, color: T.textSecondary, marginTop: 2 }}>{subtitle}</div>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: T.gold, letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function fmtDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function statusColor(status: string): string {
  switch (status) {
    case 'confirmed': return T.emerald;
    case 'pending': return T.gold;
    case 'cancelled': return T.red;
    case 'completed': return T.textMuted;
    default: return T.textMuted;
  }
}

function inputStyle(): React.CSSProperties {
  return {
    width: '100%', padding: '10px 12px', borderRadius: 10,
    background: T.inputBg, border: T.inputBorder,
    color: T.textPrimary, fontSize: 16, fontFamily: T.sans, outline: 'none',
  };
}
function btnPrimary(): React.CSSProperties {
  return {
    padding: '10px 14px', borderRadius: 10, background: T.emerald, border: 'none',
    color: '#0a1a0f', fontWeight: 600, fontSize: 13, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 6,
  };
}
function btnGhost(): React.CSSProperties {
  return {
    padding: '10px 14px', borderRadius: 10, background: T.cardBg, border: T.cardBorder,
    color: T.textPrimary, fontWeight: 500, fontSize: 13, cursor: 'pointer',
  };
}
function iconBtn(color: string): React.CSSProperties {
  return {
    width: 32, height: 32, borderRadius: 8, border: T.cardBorder,
    background: 'transparent', color, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  };
}
function addCardStyle(): React.CSSProperties {
  return { padding: 16, borderRadius: 12, background: T.cardBg, border: T.cardBorder, marginBottom: 10 };
}
function emptyStyle(): React.CSSProperties {
  return { padding: 18, borderRadius: 12, background: T.cardBg, border: T.cardBorder, color: T.textSecondary, fontSize: 13 };
}
function ruleRowStyle(active: boolean): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
    borderRadius: 10, background: T.cardBg, border: T.cardBorder,
    opacity: active ? 1 : 0.55,
  };
}
function blackoutRowStyle(): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
    borderRadius: 10, background: T.cardBg, border: T.cardBorder,
  };
}
function apptRowStyle(): React.CSSProperties {
  return {
    padding: '12px 14px', borderRadius: 10,
    background: T.cardBg, border: T.cardBorder,
  };
}
