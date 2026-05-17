// components/montree/appointments/SetAppointmentModal.tsx
//
// Staff-initiated appointment invitation form. Opens from inside the
// AppointmentsCalendar day-detail sheet when staff taps "Set appointment".
//
// FLOW (per Session 117 continued UX feedback):
//   1. Type pills — Parent meeting / Video call
//   2. Time — start time + duration
//   3. Parent picker — search + select. Auto-links the parent's child.
//   4. (Principal only) Optionally invite teachers — multi-select.
//   5. Subject — optional one-line note for the parent.
//   6. Send invitation → POST /api/montree/appointments
//
// SUCCESS: parent gets a pending invitation, can accept or decline from
// /montree/parent/appointments. The new pending appointment appears on
// the calendar with a gold dot until the parent responds.
//
// CROSS-POLLINATION: the API enforces school + child-parent linkage on
// the server. This component just passes the IDs through. No client-side
// trust.

'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Users, Video, X, Send, ChevronDown, Check } from 'lucide-react';

const T = {
  emerald: '#34d399',
  emeraldSoft: 'rgba(52,211,153,0.12)',
  emeraldRing: 'rgba(52,211,153,0.45)',
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

type ApptKind = 'parent_meeting' | 'video_call';

interface ParentOption {
  id: string;
  name: string;
  email: string;
}

interface ChildBundle {
  child_id: string;
  child_name: string;
  parents: ParentOption[];
}

interface TeacherOption {
  id: string;
  name: string;
}

interface RecipientsResponse {
  children: ChildBundle[];
  // Principal-only — list of other teachers in the school the principal
  // can invite as co-hosts.
  teachers?: TeacherOption[];
  principal?: { id: string; name: string } | null;
}

export interface SetAppointmentModalProps {
  /** ISO date string of the day the staff picked from the calendar. */
  selectedDay: Date;
  /** Called when the user closes without sending. */
  onClose: () => void;
  /** Called after a successful POST. Parent calendar should reload. */
  onSent: () => void;
}

export default function SetAppointmentModal({
  selectedDay,
  onClose,
  onSent,
}: SetAppointmentModalProps) {
  // Whether the "Also invite teachers" section is shown is derived from
  // the recipients response — the parents endpoint only returns `teachers`
  // when the caller is a principal. No need for the modal to know its
  // caller's role explicitly.
  // Form state
  const [kind, setKind] = useState<ApptKind>('parent_meeting');
  const [startTime, setStartTime] = useState<string>('09:00');
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [parentId, setParentId] = useState<string | null>(null);
  const [childId, setChildId] = useState<string | null>(null);
  const [additionalHostIds, setAdditionalHostIds] = useState<string[]>([]);
  const [subject, setSubject] = useState<string>('');

  // Recipients (parents + teachers) loaded from the messaging recipients API.
  const [loading, setLoading] = useState(true);
  const [recipients, setRecipients] = useState<RecipientsResponse | null>(null);
  const [recipientError, setRecipientError] = useState<string | null>(null);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ parentName: string; whenISO: string } | null>(null);

  // Parent search filter
  const [parentSearch, setParentSearch] = useState('');

  // Body-scroll lock + Escape close
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose, submitting]);

  // Load recipients (children + their parents + optional teachers list).
  // Uses the shared /api/montree/appointments/parents endpoint that returns
  // a uniform shape for both teacher and principal callers. Teacher scope
  // is limited to their classroom; principal sees all of the school.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setRecipientError(null);
      try {
        const res = await fetch('/api/montree/appointments/parents', {
          credentials: 'include',
          cache: 'no-store',
        });
        if (!res.ok) {
          if (!cancelled) setRecipientError('Could not load parents.');
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        setRecipients({
          children: data.children || [],
          teachers: data.teachers || undefined,
        });
      } catch {
        if (!cancelled) setRecipientError('Network error loading parents.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Flatten all parent entries to a searchable list, with their child links.
  const flatParents = useMemo(() => {
    const out: Array<{ parent: ParentOption; child: { id: string; name: string } }> = [];
    if (!recipients) return out;
    for (const childBundle of recipients.children) {
      for (const p of childBundle.parents) {
        out.push({
          parent: p,
          child: { id: childBundle.child_id, name: childBundle.child_name },
        });
      }
    }
    return out;
  }, [recipients]);

  const filteredParents = useMemo(() => {
    const q = parentSearch.trim().toLowerCase();
    if (!q) return flatParents;
    return flatParents.filter(
      ({ parent, child }) =>
        parent.name.toLowerCase().includes(q) ||
        parent.email.toLowerCase().includes(q) ||
        child.name.toLowerCase().includes(q)
    );
  }, [flatParents, parentSearch]);

  // Selected parent entry (for the success state + child display).
  const selectedEntry = useMemo(() => {
    if (!parentId || !childId) return null;
    return flatParents.find(
      (e) => e.parent.id === parentId && e.child.id === childId
    );
  }, [parentId, childId, flatParents]);

  const computedStartIso = useMemo(() => {
    const [hh, mm] = startTime.split(':').map((s) => parseInt(s, 10));
    const d = new Date(selectedDay);
    d.setHours(hh || 9, mm || 0, 0, 0);
    return d.toISOString();
  }, [selectedDay, startTime]);

  const canSubmit =
    !!parentId && !!childId && !!startTime && durationMinutes >= 5 && !submitting;

  const handleSubmit = useCallback(async () => {
    if (!parentId || !childId) {
      setSubmitError('Pick a parent before sending.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/montree/appointments', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parent_id: parentId,
          child_id: childId,
          scheduled_start: computedStartIso,
          duration_minutes: durationMinutes,
          kind,
          subject: subject.trim() || undefined,
          // additional_host_ids is principal-only on the server. The
          // modal only renders the picker when recipients.teachers came
          // back populated (principal-only), so this won't be set for
          // teachers. Server defends in depth anyway.
          additional_host_ids:
            additionalHostIds.length > 0 ? additionalHostIds : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSubmitError(data?.error || 'Failed to send the invitation.');
        return;
      }
      const parentName = selectedEntry?.parent.name || 'the parent';
      setSuccess({ parentName, whenISO: computedStartIso });
      // Let the parent caller refresh the calendar so the new pending
      // appointment lands as a marker.
      onSent();
    } catch {
      setSubmitError('Network error.');
    } finally {
      setSubmitting(false);
    }
  }, [
    parentId,
    childId,
    computedStartIso,
    durationMinutes,
    kind,
    subject,
    additionalHostIds,
    selectedEntry,
    onSent,
  ]);

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={() => {
        if (!submitting) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 1100, // above the day-sheet (1000)
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '4vh 16px 24px',
        overflowY: 'auto',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 560,
          padding: 22,
          borderRadius: 18,
          background: 'rgba(10, 26, 15, 0.98)',
          border: '1px solid rgba(52,211,153,0.30)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          color: T.textPrimary,
          fontFamily: T.sans,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: 16,
            gap: 12,
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontFamily: T.serif,
                fontSize: 22,
                fontWeight: 500,
                letterSpacing: -0.3,
                color: T.textPrimary,
              }}
            >
              {success ? 'Invitation sent' : 'Set appointment'}
            </h2>
            {!success && (
              <p style={{ margin: '6px 0 0', fontSize: 12, color: T.textSecondary }}>
                {formatDayLong(selectedDay)}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              if (!submitting) onClose();
            }}
            aria-label="Close"
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: T.textSecondary,
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.5 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        {/* ── SUCCESS STATE ─────────────────────────────────────────── */}
        {success ? (
          <div>
            <div
              style={{
                padding: 18,
                borderRadius: 12,
                background: T.emeraldSoft,
                border: '1px solid rgba(52,211,153,0.30)',
                color: T.emerald,
                marginBottom: 16,
              }}
            >
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <Check size={18} strokeWidth={2} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    Invitation sent to {success.parentName}
                  </div>
                  <div style={{ fontSize: 12, color: T.textSecondary, marginTop: 4 }}>
                    {formatDayLong(new Date(success.whenISO))} ·{' '}
                    {new Date(success.whenISO).toLocaleTimeString(undefined, {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </div>
                  <div style={{ fontSize: 12, color: T.textSecondary, marginTop: 8 }}>
                    They&apos;ll see it on their appointments page and can accept or decline.
                  </div>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={btnPrimary()}
            >
              Done
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* ── Type pills ───────────────────────────────────────── */}
            <Field label="Type">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <TypePill
                  active={kind === 'parent_meeting'}
                  icon={<Users size={16} strokeWidth={1.75} />}
                  label="Parent meeting"
                  onClick={() => setKind('parent_meeting')}
                />
                <TypePill
                  active={kind === 'video_call'}
                  icon={<Video size={16} strokeWidth={1.75} />}
                  label="Video call"
                  onClick={() => setKind('video_call')}
                />
              </div>
            </Field>

            {/* ── Time ─────────────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Start time">
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  style={inputStyle()}
                />
              </Field>
              <Field label="Duration">
                <div style={{ position: 'relative' }}>
                  <select
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10))}
                    style={{ ...inputStyle(), appearance: 'none', paddingRight: 36 }}
                  >
                    <option value={15}>15 min</option>
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>60 min</option>
                    <option value={90}>90 min</option>
                  </select>
                  <ChevronDown
                    size={16}
                    strokeWidth={1.75}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      pointerEvents: 'none',
                      color: T.textMuted,
                    }}
                  />
                </div>
              </Field>
            </div>

            {/* ── Parent picker ────────────────────────────────────── */}
            <Field label="Who they want to meet">
              {loading ? (
                <div style={emptyHintStyle()}>Loading parents…</div>
              ) : recipientError ? (
                <div style={errorBlockStyle()}>{recipientError}</div>
              ) : flatParents.length === 0 ? (
                <div style={emptyHintStyle()}>
                  No parents in your classroom yet.
                </div>
              ) : (
                <div>
                  <input
                    type="text"
                    placeholder="Search by parent or child name…"
                    value={parentSearch}
                    onChange={(e) => setParentSearch(e.target.value)}
                    style={{ ...inputStyle(), marginBottom: 8 }}
                  />
                  <div
                    style={{
                      maxHeight: 240,
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      padding: 4,
                      borderRadius: 10,
                      background: T.inputBg,
                      border: T.inputBorder,
                    }}
                  >
                    {filteredParents.length === 0 ? (
                      <div
                        style={{
                          padding: 14,
                          textAlign: 'center',
                          color: T.textMuted,
                          fontSize: 12,
                        }}
                      >
                        No matches.
                      </div>
                    ) : (
                      filteredParents.map((entry) => {
                        const selected =
                          parentId === entry.parent.id && childId === entry.child.id;
                        return (
                          <button
                            key={`${entry.parent.id}-${entry.child.id}`}
                            type="button"
                            onClick={() => {
                              setParentId(entry.parent.id);
                              setChildId(entry.child.id);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 12,
                              padding: '10px 12px',
                              borderRadius: 8,
                              background: selected
                                ? T.emeraldSoft
                                : 'transparent',
                              border: selected
                                ? `1px solid ${T.emeraldRing}`
                                : '1px solid transparent',
                              color: T.textPrimary,
                              textAlign: 'left',
                              cursor: 'pointer',
                              fontFamily: T.sans,
                              fontSize: 14,
                            }}
                          >
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {entry.parent.name}
                              </div>
                              <div
                                style={{
                                  fontSize: 11,
                                  color: T.textSecondary,
                                  marginTop: 2,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                about {entry.child.name}
                              </div>
                            </div>
                            {selected && (
                              <Check
                                size={16}
                                strokeWidth={2}
                                style={{ color: T.emerald, flexShrink: 0 }}
                              />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </Field>

            {/* ── (Principal only) Additional hosts ────────────────── */}
            {/* Show "Also invite" only when teachers list came back —
                the appointments/parents endpoint only includes it for
                principal callers. */}
            {recipients?.teachers && recipients.teachers.length > 0 && (
              <Field label="Also invite (optional)">
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  {recipients.teachers.map((t) => {
                    const checked = additionalHostIds.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setAdditionalHostIds((prev) =>
                            prev.includes(t.id)
                              ? prev.filter((id) => id !== t.id)
                              : [...prev, t.id]
                          );
                        }}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 999,
                          background: checked ? T.emeraldSoft : T.inputBg,
                          border: checked
                            ? `1px solid ${T.emeraldRing}`
                            : T.inputBorder,
                          color: T.textPrimary,
                          fontSize: 12,
                          fontWeight: 500,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        {checked && <Check size={12} strokeWidth={2} />}
                        {t.name}
                      </button>
                    );
                  })}
                </div>
              </Field>
            )}

            {/* ── Subject (optional) ───────────────────────────────── */}
            <Field label="Subject (optional)">
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. End-of-term update"
                maxLength={200}
                style={inputStyle()}
              />
            </Field>

            {/* ── Error ────────────────────────────────────────────── */}
            {submitError && (
              <div style={errorBlockStyle()}>{submitError}</div>
            )}

            {/* ── Send button ──────────────────────────────────────── */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              style={{
                ...btnPrimary(),
                opacity: canSubmit ? 1 : 0.55,
                cursor: canSubmit ? 'pointer' : 'not-allowed',
              }}
            >
              {submitting ? (
                'Sending…'
              ) : (
                <>
                  <Send size={16} strokeWidth={1.75} /> Send invitation
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          color: T.gold,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          fontWeight: 600,
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function TypePill({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '14px 12px',
        borderRadius: 12,
        background: active ? T.emeraldSoft : T.inputBg,
        border: active ? `2px solid ${T.emeraldRing}` : T.inputBorder,
        color: active ? T.textPrimary : T.textSecondary,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        fontSize: 14,
        fontWeight: 500,
        fontFamily: T.sans,
        transition: 'background 0.18s, border 0.18s',
      }}
    >
      {icon}
      {label}
    </button>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────
function formatDayLong(d: Date): string {
  try {
    return d.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return d.toDateString();
  }
}

function inputStyle(): React.CSSProperties {
  return {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 10,
    background: T.inputBg,
    border: T.inputBorder,
    color: T.textPrimary,
    fontSize: 16, // iOS keyboard-zoom prevention
    fontFamily: T.sans,
    outline: 'none',
  };
}

function btnPrimary(): React.CSSProperties {
  return {
    width: '100%',
    padding: '14px 16px',
    borderRadius: 12,
    background: T.emerald,
    border: 'none',
    color: '#0a1a0f',
    fontWeight: 600,
    fontSize: 15,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  };
}

function emptyHintStyle(): React.CSSProperties {
  return {
    padding: 14,
    borderRadius: 10,
    background: T.inputBg,
    border: T.inputBorder,
    color: T.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  };
}

function errorBlockStyle(): React.CSSProperties {
  return {
    padding: 12,
    borderRadius: 10,
    background: T.redBg,
    border: T.redBorder,
    color: T.red,
    fontSize: 13,
  };
}
