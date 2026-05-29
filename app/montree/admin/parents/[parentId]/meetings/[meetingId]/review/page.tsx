// app/montree/admin/parents/[parentId]/meetings/[meetingId]/review/page.tsx
//
// Ultimate Astra Phase B — review the Sonnet analysis + approve / edit /
// dismiss profile-update proposals.

'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronLeft, Check, X, Edit3, AlertCircle } from 'lucide-react';

const T = {
  bg: '#0a1a0f',
  glow:
    'radial-gradient(ellipse 1100px 900px at 88% 8%, rgba(39,129,90,0.32), transparent 60%)',
  card: 'rgba(8,20,12,0.55)',
  cardBorder: '1px solid rgba(52,211,153,0.18)',
  emerald: '#34d399',
  emeraldDim: 'rgba(52,211,153,0.65)',
  textPrimary: 'rgba(255,255,255,0.92)',
  textSecondary: 'rgba(255,255,255,0.62)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

interface Proposal {
  current?: unknown;
  proposed?: unknown;
  reason?: string;
}

interface Analysis {
  id: string;
  summary_markdown: string;
  parent_revealed: string[];
  commitments_made: string[];
  emotional_arc: string;
  triggers_observed: string[];
  moves_that_landed: string[];
  unresolved_threads: string[];
  recommended_follow_up: string;
  profile_update_proposals: Record<string, Proposal>;
  proposals_reviewed_at: string | null;
  proposals_review_outcome: string | null;
  cost_usd: number | null;
}

interface Meeting {
  id: string;
  parent_id: string;
  child_id: string | null;
  meeting_type: string;
  held_at: string | null;
  outcome_notes: string | null;
  locale: string;
}

type Action = 'approved' | 'edited' | 'dismissed' | null;

const FIELD_LABELS: Record<string, string> = {
  archetypes: 'Archetypes',
  cultural_register: 'Cultural register',
  preferred_language: 'Preferred emotional language',
  known_triggers: 'Known triggers (avoid)',
  effective_moves: 'Effective moves (use)',
  relationship_temperature: 'Relationship temperature',
  family_context: 'Family context',
  priorities_for_child: 'Priorities for child',
  history_notes: 'History notes',
};

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return '(empty)';
  if (Array.isArray(val)) return val.join(', ') || '(empty)';
  if (typeof val === 'object')
    return Object.entries(val as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${String(v)}`)
      .join(' · ');
  return String(val);
}

export default function MeetingReviewPage() {
  const params = useParams();
  const parentId = String(params.parentId || '');
  const meetingId = String(params.meetingId || '');

  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [actions, setActions] = useState<Record<string, Action>>({});
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [editingField, setEditingField] = useState<string | null>(null);
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/montree/admin/parent-meetings/${meetingId}/analyse`
      );
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        setErrorMsg(`Failed to load analysis: ${body.slice(0, 200)}`);
        return;
      }
      const data = await res.json();
      setAnalysis(data.analysis ?? null);
      setMeeting(data.meeting ?? null);
      setOutcomeNotes(data.meeting?.outcome_notes ?? '');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'unknown');
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  useEffect(() => {
    load();
  }, [load]);

  const setFieldAction = (field: string, action: Action) => {
    setActions((a) => ({ ...a, [field]: action }));
    if (action !== 'edited') {
      setEditingField(null);
    } else {
      setEditingField(field);
      const proposal = analysis?.profile_update_proposals?.[field];
      if (proposal && edits[field] === undefined) {
        setEdits((e) => ({ ...e, [field]: formatValue(proposal.proposed) }));
      }
    }
  };

  const submitDecisions = async () => {
    if (!analysis) return;
    setSaving(true);
    try {
      // Translate edited string values back to structured form per field.
      const editsPayload: Record<string, unknown> = {};
      for (const [field, val] of Object.entries(edits)) {
        if (actions[field] !== 'edited') continue;
        if (
          field === 'archetypes' ||
          field === 'known_triggers' ||
          field === 'effective_moves' ||
          field === 'priorities_for_child'
        ) {
          // CSV → array.
          editsPayload[field] = val
            .split(/[,\n]/)
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
        } else if (field === 'cultural_register') {
          // key=value lines → object.
          const out: Record<string, string> = {};
          for (const line of val.split('\n')) {
            const m = line.match(/^([^=:]+)[=:]\s*(.+)$/);
            if (m) out[m[1].trim()] = m[2].trim();
          }
          editsPayload[field] = out;
        } else {
          editsPayload[field] = val.trim();
        }
      }

      // Save outcome_notes on meeting (best-effort).
      if (outcomeNotes !== (meeting?.outcome_notes ?? '')) {
        await fetch(
          `/api/montree/admin/parent-meetings?id=${encodeURIComponent(meetingId)}`,
          {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ outcome_notes: outcomeNotes }),
          }
        );
      }

      const res = await fetch(
        `/api/montree/admin/parent-meetings/${meetingId}/proposals`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            approvals: actions,
            edits: editsPayload,
          }),
        }
      );
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        setErrorMsg(`Save failed: ${body.slice(0, 200)}`);
        return;
      }
      const data = await res.json();
      setSavedMessage(
        `${data.approved_count} approved, ${data.edited_count} edited, ${data.dismissed_count} dismissed.`
      );
      await load();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'unknown');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: T.bg,
        color: T.textPrimary,
        fontFamily: T.sans,
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          background: T.glow,
          zIndex: 0,
        }}
      />

      <header
        style={{
          position: 'relative',
          padding: '20px 24px',
          borderBottom: '1px solid rgba(52,211,153,0.12)',
          zIndex: 1,
        }}
      >
        <Link
          href={`/montree/admin/parents/${parentId}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: T.textSecondary,
            textDecoration: 'none',
            fontSize: 14,
          }}
        >
          <ChevronLeft size={16} /> Back
        </Link>
      </header>

      <main
        style={{
          position: 'relative',
          maxWidth: 820,
          margin: '0 auto',
          padding: '32px 24px 96px',
          zIndex: 1,
        }}
      >
        {loading && (
          <p style={{ textAlign: 'center', color: T.textSecondary, marginTop: 32 }}>
            Loading analysis…
          </p>
        )}

        {errorMsg && (
          <div
            style={{
              marginTop: 16,
              background: 'rgba(220,50,50,0.10)',
              border: '1px solid rgba(220,50,50,0.30)',
              borderRadius: 8,
              padding: '10px 12px',
              fontSize: 13,
              color: 'rgba(255,180,180,0.92)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <AlertCircle size={14} /> {errorMsg}
          </div>
        )}

        {!loading && !analysis && (
          <div style={{ marginTop: 32 }}>
            <h2 style={{ fontFamily: T.serif, fontSize: 22, color: T.textPrimary }}>
              No analysis yet
            </h2>
            <p style={{ color: T.textSecondary, fontSize: 14, marginTop: 12 }}>
              This meeting hasn&apos;t been analysed. Astra will read the
              transcript when you trigger analysis from the new-meeting page.
            </p>
          </div>
        )}

        {analysis && meeting && (
          <>
            <h1
              style={{
                fontFamily: T.serif,
                fontSize: 28,
                margin: '8px 0 4px',
                color: T.textPrimary,
              }}
            >
              Astra&apos;s read
            </h1>
            <p
              style={{
                color: T.textSecondary,
                fontSize: 13,
                marginBottom: 24,
              }}
            >
              {meeting.meeting_type.replace(/_/g, ' ')} ·{' '}
              {meeting.held_at
                ? new Date(meeting.held_at).toLocaleString(meeting.locale || 'en')
                : 'no date'}
              {analysis.cost_usd ? ` · $${analysis.cost_usd.toFixed(3)} USD` : ''}
            </p>

            <Section title="Summary">
              <div
                style={{
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: T.textPrimary,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {analysis.summary_markdown}
              </div>
            </Section>

            {analysis.emotional_arc && (
              <Section title="Emotional arc">
                <p style={{ margin: 0, fontSize: 14, color: T.textPrimary }}>
                  {analysis.emotional_arc}
                </p>
              </Section>
            )}

            {analysis.parent_revealed.length > 0 && (
              <Section title="What the parent revealed">
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14 }}>
                  {analysis.parent_revealed.map((item, i) => (
                    <li key={i} style={{ marginBottom: 4 }}>{item}</li>
                  ))}
                </ul>
              </Section>
            )}

            {analysis.commitments_made.length > 0 && (
              <Section title="Commitments made">
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14 }}>
                  {analysis.commitments_made.map((item, i) => (
                    <li key={i} style={{ marginBottom: 4 }}>{item}</li>
                  ))}
                </ul>
              </Section>
            )}

            {analysis.triggers_observed.length > 0 && (
              <Section title="Triggers observed">
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: 20,
                    fontSize: 14,
                    color: 'rgba(255,200,200,0.92)',
                  }}
                >
                  {analysis.triggers_observed.map((item, i) => (
                    <li key={i} style={{ marginBottom: 4 }}>{item}</li>
                  ))}
                </ul>
              </Section>
            )}

            {analysis.moves_that_landed.length > 0 && (
              <Section title="Moves that landed">
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: 20,
                    fontSize: 14,
                    color: 'rgba(180,255,200,0.92)',
                  }}
                >
                  {analysis.moves_that_landed.map((item, i) => (
                    <li key={i} style={{ marginBottom: 4 }}>{item}</li>
                  ))}
                </ul>
              </Section>
            )}

            {analysis.unresolved_threads.length > 0 && (
              <Section title="Unresolved threads">
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14 }}>
                  {analysis.unresolved_threads.map((item, i) => (
                    <li key={i} style={{ marginBottom: 4 }}>{item}</li>
                  ))}
                </ul>
              </Section>
            )}

            {analysis.recommended_follow_up && (
              <Section title="Recommended follow-up">
                <p
                  style={{
                    margin: 0,
                    fontSize: 14,
                    color: T.textPrimary,
                    lineHeight: 1.6,
                  }}
                >
                  {analysis.recommended_follow_up}
                </p>
              </Section>
            )}

            <Section title="Your one-line outcome">
              <textarea
                rows={2}
                value={outcomeNotes}
                onChange={(e) => setOutcomeNotes(e.target.value)}
                placeholder="One line — how did it land?"
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.35)',
                  color: T.textPrimary,
                  border: T.cardBorder,
                  borderRadius: 8,
                  padding: '10px 12px',
                  fontSize: 14,
                  fontFamily: T.sans,
                  resize: 'vertical',
                }}
              />
            </Section>

            {Object.keys(analysis.profile_update_proposals).length > 0 && (
              <>
                <h2
                  style={{
                    marginTop: 32,
                    fontFamily: T.serif,
                    fontSize: 22,
                    color: T.textPrimary,
                  }}
                >
                  Profile-update proposals
                </h2>
                <p
                  style={{
                    color: T.textSecondary,
                    fontSize: 13,
                    marginBottom: 16,
                  }}
                >
                  Approve, edit, or dismiss each proposal. Only approved/edited
                  ones touch the live profile.
                </p>

                {Object.entries(analysis.profile_update_proposals).map(
                  ([field, proposal]) => {
                    const action = actions[field];
                    const label = FIELD_LABELS[field] ?? field;
                    return (
                      <div
                        key={field}
                        style={{
                          marginTop: 12,
                          background: T.card,
                          border: T.cardBorder,
                          borderRadius: 12,
                          padding: 14,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: T.emeraldDim,
                            letterSpacing: 0.3,
                            textTransform: 'uppercase',
                            marginBottom: 8,
                          }}
                        >
                          {label}
                        </div>
                        <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 4 }}>
                          Current: {formatValue(proposal.current)}
                        </div>
                        <div style={{ fontSize: 14, color: T.textPrimary, marginBottom: 4 }}>
                          Proposed: <strong>{formatValue(proposal.proposed)}</strong>
                        </div>
                        {proposal.reason && (
                          <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 10, fontStyle: 'italic' }}>
                            Why: {proposal.reason}
                          </div>
                        )}

                        {editingField === field && (
                          <textarea
                            rows={3}
                            value={edits[field] ?? ''}
                            onChange={(e) =>
                              setEdits((c) => ({ ...c, [field]: e.target.value }))
                            }
                            placeholder={
                              field === 'cultural_register'
                                ? 'One per line: dimension = value'
                                : 'Comma- or newline-separated'
                            }
                            style={{
                              width: '100%',
                              background: 'rgba(0,0,0,0.35)',
                              color: T.textPrimary,
                              border: T.cardBorder,
                              borderRadius: 8,
                              padding: '8px 10px',
                              fontSize: 13,
                              fontFamily: T.sans,
                              resize: 'vertical',
                              marginTop: 8,
                            }}
                          />
                        )}

                        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                          <button
                            onClick={() => setFieldAction(field, 'approved')}
                            style={pillStyle(action === 'approved', T.emerald)}
                          >
                            <Check size={14} /> Approve
                          </button>
                          <button
                            onClick={() => setFieldAction(field, 'edited')}
                            style={pillStyle(action === 'edited', '#fbbf24')}
                          >
                            <Edit3 size={14} /> Edit
                          </button>
                          <button
                            onClick={() => setFieldAction(field, 'dismissed')}
                            style={pillStyle(action === 'dismissed', '#f87171')}
                          >
                            <X size={14} /> Dismiss
                          </button>
                        </div>
                      </div>
                    );
                  }
                )}
              </>
            )}

            {Object.keys(analysis.profile_update_proposals).length === 0 && (
              <Section title="Profile-update proposals">
                <p style={{ margin: 0, color: T.textMuted, fontSize: 13 }}>
                  No proposed profile updates from this meeting.
                </p>
              </Section>
            )}

            <div style={{ marginTop: 32, display: 'flex', gap: 12 }}>
              <button
                onClick={submitDecisions}
                disabled={saving}
                style={{
                  padding: '12px 24px',
                  background: T.emerald,
                  color: '#0a1a0f',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: saving ? 'wait' : 'pointer',
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? 'Saving…' : 'Save decisions'}
              </button>
              <Link
                href={`/montree/admin/parents/${parentId}`}
                style={{
                  padding: '12px 24px',
                  background: 'transparent',
                  color: T.textSecondary,
                  border: '1px solid rgba(255,255,255,0.18)',
                  borderRadius: 8,
                  fontSize: 14,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                Done
              </Link>
            </div>

            {savedMessage && (
              <div
                style={{
                  marginTop: 16,
                  background: 'rgba(52,211,153,0.10)',
                  border: '1px solid rgba(52,211,153,0.30)',
                  borderRadius: 8,
                  padding: '10px 12px',
                  fontSize: 13,
                  color: T.emerald,
                }}
              >
                {savedMessage}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function pillStyle(active: boolean, color: string): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '6px 12px',
    borderRadius: 999,
    fontSize: 13,
    cursor: 'pointer',
    background: active ? `${color}33` : 'rgba(255,255,255,0.04)',
    border: active ? `1px solid ${color}88` : '1px solid rgba(255,255,255,0.10)',
    color: active ? color : 'rgba(255,255,255,0.62)',
  };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        marginTop: 16,
        background: T.card,
        border: T.cardBorder,
        borderRadius: 12,
        padding: 16,
      }}
    >
      <h3
        style={{
          margin: '0 0 10px',
          fontSize: 13,
          fontWeight: 600,
          color: T.emeraldDim,
          letterSpacing: 0.3,
          textTransform: 'uppercase',
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}
