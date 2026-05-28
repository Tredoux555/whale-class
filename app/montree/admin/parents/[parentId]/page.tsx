// app/montree/admin/parents/[parentId]/page.tsx
//
// Ultimate Tracy Phase D — per-parent page.
// Profile card + meeting list + key actions:
//   - Onboard / re-onboard (voice)
//   - Record new meeting
//   - Prepare for next meeting (Tracy dossier — links into existing
//     prepare_parent_meeting modal pattern on parent threads)

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ChevronLeft,
  Mic,
  Phone,
  FileText,
  AlertCircle,
} from 'lucide-react';

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

const ARCHETYPE_LABELS: Record<string, { label: string; color: string }> = {
  expectation_driven: { label: 'Expectation-driven', color: '#fbbf24' },
  anxiety_projecting: { label: 'Anxiety-projecting', color: '#f87171' },
  hands_off: { label: 'Hands-off', color: '#94a3b8' },
  comparison_trapped: { label: 'Comparison-trapped', color: '#c084fc' },
  defended: { label: 'Defended', color: '#fb923c' },
};

const TEMP_COLORS: Record<string, string> = {
  warm: '#34d399',
  neutral: '#94a3b8',
  strained: '#f87171',
  repairing: '#fbbf24',
};

interface ProfileShape {
  archetypes: string[];
  cultural_register: Record<string, string>;
  preferred_language: string;
  known_triggers: string[];
  effective_moves: string[];
  relationship_temperature: string;
  family_context: string;
  priorities_for_child: string[];
  history_notes: string;
  meeting_count: number;
  last_meeting_date: string | null;
}

interface ParentInfo {
  parent: {
    id: string;
    school_id: string;
    name: string;
    email: string | null;
  };
  profile: ProfileShape | null;
}

interface MeetingRow {
  id: string;
  meeting_type: string;
  status: string;
  held_at: string | null;
  scheduled_at: string | null;
  duration_minutes: number | null;
  child_id: string | null;
  transcript_id: string | null;
  analysis_id: string | null;
  outcome_notes: string;
  locale: string;
}

export default function ParentPage() {
  const params = useParams();
  const parentId = String(params.parentId || '');

  const [info, setInfo] = useState<ParentInfo | null>(null);
  const [meetings, setMeetings] = useState<MeetingRow[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [profileMigrationPending, setProfileMigrationPending] = useState(false);
  const [meetingsMigrationPending, setMeetingsMigrationPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [profileRes, meetingsRes] = await Promise.all([
          fetch(
            `/api/montree/admin/parent-profile?parent_id=${encodeURIComponent(parentId)}`
          ),
          fetch(
            `/api/montree/admin/parent-meetings?parent_id=${encodeURIComponent(parentId)}`
          ),
        ]);

        if (profileRes.ok) {
          const data = await profileRes.json();
          if (cancelled) return;
          setProfileMigrationPending(!!data.migration_pending);
          if (data.parent) {
            setInfo({ parent: data.parent, profile: data.profile ?? null });
          } else {
            setErrorMsg('Parent not found.');
          }
        } else {
          if (cancelled) return;
          const body = await profileRes.text().catch(() => '');
          setErrorMsg(`Failed to load parent: ${body.slice(0, 200)}`);
        }

        if (meetingsRes.ok) {
          const m = await meetingsRes.json();
          if (cancelled) return;
          setMeetingsMigrationPending(!!m.migration_pending);
          setMeetings(Array.isArray(m.meetings) ? m.meetings : []);
        }
      } catch (err) {
        if (cancelled) return;
        setErrorMsg(err instanceof Error ? err.message : 'unknown');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [parentId]);

  return (
    <div
      style={{
        minHeight: 'calc(100dvh - 60px)',
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

      <main
        style={{
          position: 'relative',
          maxWidth: 880,
          margin: '0 auto',
          padding: '24px 24px 80px',
          zIndex: 1,
        }}
      >
        <Link
          href="/montree/admin/parents"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: T.textSecondary,
            textDecoration: 'none',
            fontSize: 14,
          }}
        >
          <ChevronLeft size={16} /> All parents
        </Link>

        {loading && (
          <p style={{ textAlign: 'center', color: T.textSecondary, marginTop: 64 }}>
            Loading…
          </p>
        )}

        {errorMsg && (
          <div
            style={{
              marginTop: 24,
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

        {info && (
          <>
            <h1
              style={{
                fontFamily: T.serif,
                fontSize: 32,
                margin: '24px 0 4px',
                color: T.textPrimary,
              }}
            >
              {info.parent.name || 'Parent'}
            </h1>
            {info.parent.email && (
              <p style={{ color: T.textSecondary, fontSize: 14, marginBottom: 24 }}>
                {info.parent.email}
              </p>
            )}

            {profileMigrationPending && (
              <div
                style={{
                  background: 'rgba(232,201,106,0.08)',
                  border: '1px solid rgba(232,201,106,0.30)',
                  borderRadius: 8,
                  padding: '10px 12px',
                  marginBottom: 16,
                  fontSize: 13,
                  color: 'rgba(232,201,106,0.92)',
                }}
              >
                Parent-profile schema not yet migrated (migration 238).
              </div>
            )}

            {/* Action row */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
              <Link
                href={`/montree/admin/parents/${parentId}/onboard`}
                style={primaryButtonStyle}
              >
                <Mic size={16} /> {info.profile ? 'Re-onboard' : 'Onboard via voice'}
              </Link>
              <Link
                href={`/montree/admin/parents/${parentId}/meetings/new`}
                style={secondaryButtonStyle}
              >
                <Phone size={16} /> Record new meeting
              </Link>
            </div>

            {/* Profile card */}
            <Section title="Profile">
              {info.profile ? (
                <ProfileBlock profile={info.profile} />
              ) : (
                <p style={{ margin: 0, fontSize: 13, color: T.textMuted }}>
                  No profile yet. Tap &ldquo;Onboard via voice&rdquo; to teach Tracy what
                  you know about this parent in 60-90 seconds.
                </p>
              )}
            </Section>

            {/* Meetings */}
            <Section title="Meeting history">
              {meetingsMigrationPending && (
                <p style={{ margin: 0, fontSize: 13, color: 'rgba(232,201,106,0.92)' }}>
                  Meetings schema not yet migrated (migrations 239-241).
                </p>
              )}
              {!meetingsMigrationPending && meetings.length === 0 && (
                <p style={{ margin: 0, fontSize: 13, color: T.textMuted }}>
                  No meetings recorded yet. Tap &ldquo;Record new meeting&rdquo; above to
                  capture your next conversation.
                </p>
              )}
              {meetings.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6 }}>
                  {meetings.map((m) => (
                    <Link
                      key={m.id}
                      href={`/montree/admin/parents/${parentId}/meetings/${m.id}/review`}
                      style={{
                        textDecoration: 'none',
                        color: T.textPrimary,
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 10,
                        padding: 12,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: 12,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>
                          {m.meeting_type.replace(/_/g, ' ')}
                        </div>
                        <div style={{ fontSize: 12, color: T.textMuted }}>
                          {m.held_at
                            ? new Date(m.held_at).toLocaleString(m.locale || 'en')
                            : m.scheduled_at
                              ? `scheduled: ${new Date(m.scheduled_at).toLocaleString(m.locale || 'en')}`
                              : 'not yet held'}
                          {m.duration_minutes ? ` · ${m.duration_minutes} min` : ''}
                        </div>
                        {m.outcome_notes && (
                          <div
                            style={{
                              fontSize: 12,
                              color: T.textSecondary,
                              marginTop: 4,
                            }}
                          >
                            {m.outcome_notes}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        <Status label={m.status} />
                        {m.analysis_id && <FileText size={14} style={{ color: T.emeraldDim }} />}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Section>
          </>
        )}
      </main>
    </div>
  );
}

function ProfileBlock({ profile }: { profile: ProfileShape }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
      {profile.relationship_temperature && (
        <div>
          <Label>Relationship</Label>
          <span
            style={{
              display: 'inline-block',
              padding: '3px 10px',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
              background: `${TEMP_COLORS[profile.relationship_temperature] || '#94a3b8'}33`,
              color: TEMP_COLORS[profile.relationship_temperature] || '#94a3b8',
              border: `1px solid ${TEMP_COLORS[profile.relationship_temperature] || '#94a3b8'}66`,
            }}
          >
            {profile.relationship_temperature}
          </span>
        </div>
      )}

      <div>
        <Label>Archetypes</Label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {profile.archetypes.length === 0 && (
            <span style={{ fontSize: 13, color: T.textMuted, fontStyle: 'italic' }}>
              none identified
            </span>
          )}
          {profile.archetypes.map((a) => (
            <span
              key={a}
              style={{
                padding: '3px 10px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                background: `${ARCHETYPE_LABELS[a]?.color || '#94a3b8'}22`,
                color: ARCHETYPE_LABELS[a]?.color || '#94a3b8',
                border: `1px solid ${ARCHETYPE_LABELS[a]?.color || '#94a3b8'}55`,
              }}
            >
              {ARCHETYPE_LABELS[a]?.label || a}
            </span>
          ))}
        </div>
      </div>

      {profile.known_triggers.length > 0 && (
        <Block label="Known triggers — avoid" color="rgba(255,200,200,0.92)">
          <ul style={listStyle}>
            {profile.known_triggers.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </Block>
      )}

      {profile.effective_moves.length > 0 && (
        <Block label="Effective moves — use" color="rgba(180,255,200,0.92)">
          <ul style={listStyle}>
            {profile.effective_moves.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </Block>
      )}

      {profile.priorities_for_child.length > 0 && (
        <Block label="Priorities for child">
          <ul style={listStyle}>
            {profile.priorities_for_child.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </Block>
      )}

      {profile.family_context && (
        <Block label="Family context">
          <p style={{ margin: 0, fontSize: 13, color: T.textPrimary, lineHeight: 1.5 }}>
            {profile.family_context}
          </p>
        </Block>
      )}

      {profile.history_notes && (
        <Block label="History notes">
          <p style={{ margin: 0, fontSize: 13, color: T.textPrimary, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
            {profile.history_notes}
          </p>
        </Block>
      )}

      <p style={{ margin: '8px 0 0', fontSize: 12, color: T.textMuted }}>
        {profile.meeting_count} meeting{profile.meeting_count === 1 ? '' : 's'} on file
        {profile.last_meeting_date
          ? ` · last on ${profile.last_meeting_date.slice(0, 10)}`
          : ''}
        {profile.preferred_language ? ` · preferred lang: ${profile.preferred_language}` : ''}
      </p>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: T.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
        marginBottom: 4,
      }}
    >
      {children}
    </div>
  );
}

function Block({
  label,
  color,
  children,
}: {
  label: string;
  color?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: color || T.textMuted,
          textTransform: 'uppercase',
          letterSpacing: 0.3,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function Status({ label }: { label: string }) {
  const colors: Record<string, string> = {
    planned: '#94a3b8',
    held: '#34d399',
    cancelled: '#94a3b8',
    needs_follow_up: '#fbbf24',
    closed: '#34d399',
  };
  const c = colors[label] || '#94a3b8';
  return (
    <span
      style={{
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        background: `${c}22`,
        color: c,
        border: `1px solid ${c}55`,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
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

const primaryButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 18px',
  background: T.emerald,
  color: '#0a1a0f',
  borderRadius: 8,
  textDecoration: 'none',
  fontSize: 14,
  fontWeight: 600,
};

const secondaryButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 18px',
  background: 'transparent',
  color: T.textPrimary,
  border: '1px solid rgba(255,255,255,0.18)',
  borderRadius: 8,
  textDecoration: 'none',
  fontSize: 14,
};

const listStyle: React.CSSProperties = {
  margin: 0,
  paddingLeft: 20,
  fontSize: 13,
  color: T.textPrimary,
  lineHeight: 1.5,
};
