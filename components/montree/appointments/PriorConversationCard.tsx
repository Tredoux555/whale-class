'use client';

// components/montree/appointments/PriorConversationCard.tsx
//
// THE KILLER-FEATURE UI.
//
// Staff opens an upcoming appointment → this card shows up at the top of
// the detail with the summary of the LAST meeting with this parent. Plus
// an expandable "Meeting history" list of older meetings.
//
// HOW STAFF USE IT:
//   "Oh — last meeting Tredoux raised reading concerns and I committed to
//   sending weekly photos. I should mention that progress when she joins."
//   No more "wait, what did we talk about last time?" — the briefing is
//   right there.
//
// FETCH: hits /api/montree/appointments/[id]/prior-conversations on mount.
// Renders nothing (no shrug, no error) if there are no prior conversations
// — first-meeting-ever has no history.
//
// STYLING: matches Montree's dark-forest tokens. Lora serif for the meeting
// date header; emerald accent for the most-recent summary card; muted slate
// for older entries.

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Sparkles, Clock } from 'lucide-react';

const T = {
  cardBg: 'rgba(8,20,12,0.55)',
  cardBgAccent: 'rgba(52,211,153,0.08)',
  cardBorder: '1px solid rgba(52,211,153,0.18)',
  cardBorderAccent: '1px solid rgba(52,211,153,0.32)',
  emerald: '#34d399',
  gold: '#E8C96A',
  textPrimary: 'rgba(255,255,255,0.92)',
  textSoft: '#eaf1e6',
  textSecondary: 'rgba(234,241,230,0.55)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

interface PriorConversation {
  recording_id: string;
  appointment_id: string;
  meeting_date: string;
  intake_subject: string | null;
  summary: string | null;
  summary_locale: string | null;
  summarized_at: string | null;
  ended_at: string | null;
  host: { role: string; id: string; name: string | null } | null;
}

interface PriorConversationCardProps {
  appointmentId: string;
}

export default function PriorConversationCard({ appointmentId }: PriorConversationCardProps) {
  const [conversations, setConversations] = useState<PriorConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/montree/appointments/${appointmentId}/prior-conversations`,
          { credentials: 'same-origin', cache: 'no-store' }
        );
        if (cancelled) return;
        if (!res.ok) {
          setConversations([]);
          return;
        }
        const data = await res.json();
        setConversations(Array.isArray(data?.prior_conversations) ? data.prior_conversations : []);
      } catch {
        if (!cancelled) setConversations([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [appointmentId]);

  if (loading) {
    return (
      <div style={{ padding: 14, borderRadius: 12, background: T.cardBg, border: T.cardBorder, color: T.textMuted, fontSize: 12, fontFamily: T.sans }}>
        Loading prior conversations…
      </div>
    );
  }

  if (conversations.length === 0) {
    // Brand-new parent → no card. Avoid clutter.
    return null;
  }

  const mostRecent = conversations[0];
  const older = conversations.slice(1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Most-recent summary — emphasised */}
      <div style={{ padding: 16, borderRadius: 14, background: T.cardBgAccent, border: T.cardBorderAccent, fontFamily: T.sans }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Sparkles size={14} color={T.gold} strokeWidth={1.75} />
          <div style={{ fontSize: 11, color: T.gold, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase' }}>
            Last meeting briefing
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10, fontSize: 12, color: T.textSecondary }}>
          <Clock size={11} strokeWidth={1.75} color={T.emerald} />
          {formatDate(mostRecent.meeting_date)}
          {mostRecent.host?.name && (
            <span style={{ color: T.textMuted }}>· with {mostRecent.host.name}</span>
          )}
        </div>
        {mostRecent.intake_subject && (
          <div style={{ fontSize: 12, color: T.textMuted, fontStyle: 'italic', marginBottom: 8 }}>
            Parent asked: &ldquo;{mostRecent.intake_subject}&rdquo;
          </div>
        )}
        <div style={{ fontFamily: T.serif, fontSize: 14, lineHeight: 1.65, color: T.textPrimary, whiteSpace: 'pre-wrap' }}>
          {mostRecent.summary || '(Summary still processing — check back in a moment.)'}
        </div>
      </div>

      {/* Older meetings — collapsible */}
      {older.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowHistory((s) => !s)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 10, background: T.cardBg, border: T.cardBorder, color: T.textPrimary, fontFamily: T.sans, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <span>
              {showHistory ? 'Hide' : 'Show'} {older.length} earlier meeting{older.length === 1 ? '' : 's'}
            </span>
            {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showHistory && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {older.map((c) => (
                <div key={c.recording_id} style={{ padding: 14, borderRadius: 10, background: T.cardBg, border: T.cardBorder, fontFamily: T.sans }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8, fontSize: 11, color: T.textMuted }}>
                    {formatDate(c.meeting_date)}
                    {c.host?.name && <span>· {c.host.name}</span>}
                  </div>
                  {c.intake_subject && (
                    <div style={{ fontSize: 11, color: T.textMuted, fontStyle: 'italic', marginBottom: 6 }}>
                      &ldquo;{c.intake_subject}&rdquo;
                    </div>
                  )}
                  <div style={{ fontSize: 13, lineHeight: 1.55, color: T.textSecondary, whiteSpace: 'pre-wrap' }}>
                    {c.summary}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso + (iso.length === 10 ? 'T12:00:00' : '')).toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}
