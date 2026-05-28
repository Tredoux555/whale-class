// app/montree/admin/parents/[parentId]/meetings/[meetingId]/page.tsx
//
// Ultimate Tracy — per-meeting detail page (Spec §8.1).
//
// Renders the meeting record + analysis summary + decrypt-on-demand
// transcript viewer. Distinct from /review which is the proposals
// approval flow. This is the long-term "what happened in this meeting"
// reference surface. Links to /review when proposals exist + unhandled.
//
// Decrypt-on-demand: the transcript fetch is gated behind an explicit
// "Show transcript" button. The encrypted blob never lands client-side
// until the principal asks for it.

'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ChevronLeft,
  AlertCircle,
  FileText,
  Eye,
  EyeOff,
  ClipboardEdit,
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

interface Meeting {
  id: string;
  parent_id: string;
  child_id: string | null;
  meeting_type: string;
  status: string;
  held_at: string | null;
  scheduled_at: string | null;
  duration_minutes: number | null;
  outcome_notes: string;
  locale: string;
  transcript_id: string | null;
  analysis_id: string | null;
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
  profile_update_proposals: Record<string, unknown>;
  proposals_reviewed_at: string | null;
  proposals_review_outcome: string | null;
  cost_usd: number | null;
}

interface ExportPayload {
  parent?: { name?: string };
  transcripts?: Array<{
    id: string;
    transcript_text: string;
    locale_detected: string | null;
    chunk_count: number;
    audio_destroyed_at: string;
    created_at: string;
  }>;
}

export default function MeetingDetailPage() {
  const params = useParams();
  const parentId = String(params.parentId || '');
  const meetingId = String(params.meetingId || '');

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const [transcriptVisible, setTranscriptVisible] = useState(false);
  const [transcriptText, setTranscriptText] = useState<string | null>(null);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [transcriptError, setTranscriptError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(
        `/api/montree/admin/parent-meetings/${encodeURIComponent(meetingId)}/analyse`
      );
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        setErrorMsg(`Failed to load meeting (HTTP ${res.status}): ${body.slice(0, 200)}`);
        return;
      }
      const data = await res.json();
      setMeeting(data.meeting ?? null);
      setAnalysis(data.analysis ?? null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'unknown');
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  useEffect(() => {
    load();
  }, [load]);

  const fetchAndShowTranscript = useCallback(async () => {
    if (transcriptText !== null) {
      setTranscriptVisible(true);
      return;
    }
    setTranscriptLoading(true);
    setTranscriptError('');
    try {
      // Decrypt-on-demand via the GDPR export endpoint, which is the only
      // surface that returns decrypted transcript content. We filter
      // client-side to just this meeting's transcript.
      const res = await fetch(
        `/api/montree/admin/parents/${encodeURIComponent(parentId)}/export`
      );
      if (!res.ok) {
        setTranscriptError(`Failed to fetch transcript (HTTP ${res.status})`);
        return;
      }
      const data = (await res.json()) as ExportPayload;
      const transcriptRow = (data.transcripts ?? []).find(
        (t) => t && meeting?.transcript_id && t.id === meeting.transcript_id
      );
      if (!transcriptRow) {
        setTranscriptError('Transcript row not found in export payload.');
        return;
      }
      setTranscriptText(transcriptRow.transcript_text || '(empty)');
      setTranscriptVisible(true);
    } catch (err) {
      setTranscriptError(err instanceof Error ? err.message : 'unknown');
    } finally {
      setTranscriptLoading(false);
    }
  }, [meeting?.transcript_id, parentId, transcriptText]);

  const formatList = (label: string, items: string[] | undefined) => {
    if (!items || items.length === 0) return null;
    return (
      <Section title={label}>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.6 }}>
          {items.map((s, i) => (
            <li key={i} style={{ marginBottom: 4 }}>
              {s}
            </li>
          ))}
        </ul>
      </Section>
    );
  };

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

        {loading && (
          <p style={{ textAlign: 'center', color: T.textSecondary, marginTop: 32 }}>
            Loading meeting…
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

        {meeting && (
          <>
            <h1
              style={{
                fontFamily: T.serif,
                fontSize: 30,
                margin: '24px 0 4px',
                color: T.textPrimary,
              }}
            >
              {meeting.meeting_type.replace(/_/g, ' ')}
            </h1>
            <p
              style={{
                color: T.textSecondary,
                fontSize: 13,
                marginBottom: 24,
                display: 'flex',
                gap: 14,
                flexWrap: 'wrap',
              }}
            >
              <span>{statusLabel(meeting.status)}</span>
              <span>
                {meeting.held_at
                  ? new Date(meeting.held_at).toLocaleString(meeting.locale || 'en')
                  : meeting.scheduled_at
                    ? `scheduled ${new Date(meeting.scheduled_at).toLocaleString(meeting.locale || 'en')}`
                    : 'no date set'}
              </span>
              {meeting.duration_minutes ? <span>{meeting.duration_minutes} min</span> : null}
              {analysis?.cost_usd ? <span>${analysis.cost_usd.toFixed(3)} USD</span> : null}
            </p>

            {/* Outcome */}
            {meeting.outcome_notes && (
              <Section title="Outcome">
                <p style={{ margin: 0, fontSize: 14, color: T.textPrimary, lineHeight: 1.6 }}>
                  {meeting.outcome_notes}
                </p>
              </Section>
            )}

            {/* Analysis */}
            {analysis ? (
              <>
                <Section title="Summary">
                  <div
                    style={{
                      fontSize: 14,
                      color: T.textPrimary,
                      lineHeight: 1.6,
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

                {formatList('What the parent revealed', analysis.parent_revealed)}
                {formatList('Commitments made', analysis.commitments_made)}
                {formatList('Triggers observed', analysis.triggers_observed)}
                {formatList('Moves that landed', analysis.moves_that_landed)}
                {formatList('Unresolved threads', analysis.unresolved_threads)}

                {analysis.recommended_follow_up && (
                  <Section title="Recommended follow-up">
                    <p style={{ margin: 0, fontSize: 14, color: T.textPrimary, lineHeight: 1.6 }}>
                      {analysis.recommended_follow_up}
                    </p>
                  </Section>
                )}

                {/* Proposals review status */}
                {Object.keys(analysis.profile_update_proposals).length > 0 && (
                  <Section title="Profile-update proposals">
                    {analysis.proposals_reviewed_at ? (
                      <p style={{ margin: 0, fontSize: 13, color: T.textSecondary }}>
                        Reviewed{' '}
                        {new Date(analysis.proposals_reviewed_at).toLocaleString(
                          meeting.locale || 'en'
                        )}
                        {analysis.proposals_review_outcome
                          ? ` · outcome: ${analysis.proposals_review_outcome.replace(/_/g, ' ')}`
                          : ''}
                        .
                      </p>
                    ) : (
                      <div>
                        <p style={{ margin: '0 0 12px', fontSize: 13, color: 'rgba(232,201,106,0.92)' }}>
                          {Object.keys(analysis.profile_update_proposals).length} proposal(s) awaiting your review.
                        </p>
                        <Link
                          href={`/montree/admin/parents/${parentId}/meetings/${meetingId}/review`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '8px 14px',
                            background: T.emerald,
                            color: '#0a1a0f',
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 600,
                            textDecoration: 'none',
                          }}
                        >
                          <ClipboardEdit size={14} /> Review proposals
                        </Link>
                      </div>
                    )}
                  </Section>
                )}
              </>
            ) : (
              <Section title="Analysis">
                <p style={{ margin: 0, fontSize: 14, color: T.textMuted }}>
                  This meeting hasn&apos;t been analysed yet. If a transcript exists,
                  trigger analysis from the new-meeting flow.
                </p>
              </Section>
            )}

            {/* Transcript decrypt-on-demand */}
            {meeting.transcript_id && (
              <Section title="Transcript">
                {!transcriptVisible && (
                  <button
                    onClick={fetchAndShowTranscript}
                    disabled={transcriptLoading}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 14px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.10)',
                      color: T.textPrimary,
                      borderRadius: 8,
                      fontSize: 13,
                      cursor: transcriptLoading ? 'wait' : 'pointer',
                    }}
                  >
                    <Eye size={14} /> {transcriptLoading ? 'Decrypting…' : 'Show transcript'}
                  </button>
                )}
                {transcriptVisible && transcriptText && (
                  <>
                    <button
                      onClick={() => setTranscriptVisible(false)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 12px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.10)',
                        color: T.textSecondary,
                        borderRadius: 8,
                        fontSize: 12,
                        cursor: 'pointer',
                        marginBottom: 12,
                      }}
                    >
                      <EyeOff size={14} /> Hide
                    </button>
                    <div
                      style={{
                        background: 'rgba(0,0,0,0.30)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 8,
                        padding: 14,
                        fontSize: 13,
                        color: T.textPrimary,
                        whiteSpace: 'pre-wrap',
                        fontFamily:
                          '"SF Mono", Menlo, Consolas, monospace',
                        maxHeight: 480,
                        overflowY: 'auto',
                      }}
                    >
                      {transcriptText}
                    </div>
                  </>
                )}
                {transcriptError && (
                  <p style={{ margin: '8px 0 0', fontSize: 12, color: 'rgba(255,180,180,0.92)' }}>
                    {transcriptError}
                  </p>
                )}
                <p style={{ marginTop: 10, fontSize: 11, color: T.textMuted }}>
                  <FileText size={10} style={{ display: 'inline-block', marginRight: 4 }} />
                  Transcript is encrypted at rest. Audio was destroyed after transcription.
                </p>
              </Section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    planned: 'Planned',
    held: 'Held',
    cancelled: 'Cancelled',
    needs_follow_up: 'Needs follow-up',
    closed: 'Closed',
  };
  return map[status] || status;
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
