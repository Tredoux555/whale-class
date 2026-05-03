// /montree/admin/child/[childId]/page.tsx
//
// "[Name] in 30 seconds, then a question box."
//
// The principal lands here after tapping a child name on the home page.
// One AI-synthesised briefing paragraph (or two), then a big text input:
// "What did the parent ask?". Sonnet answers in the principal's voice,
// grounded in the same context the briefing was built from. No tabs, no
// drilldowns, no charts. The whole page is two reads and a typed reply.
'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send, RefreshCw } from 'lucide-react';

const T = {
  emerald: '#34d399',
  emeraldDim: 'rgba(52,211,153,0.65)',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  emeraldGlow: 'rgba(52,211,153,0.22)',
  gold: '#E8C96A',
  goldDim: 'rgba(232,201,106,0.65)',
  goldSoft: 'rgba(232,201,106,0.10)',
  cardBg: 'rgba(8,20,12,0.55)',
  cardBgStrong: 'rgba(8,20,12,0.78)',
  cardBorder: '1px solid rgba(52,211,153,0.18)',
  inputBg: 'rgba(0,0,0,0.30)',
  inputBorder: '1px solid rgba(52,211,153,0.25)',
  textPrimary: 'rgba(255,255,255,0.92)',
  textSecondary: 'rgba(255,255,255,0.62)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: '"Lora", Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

interface ChildHeader {
  id: string;
  name: string;
  age: number | null;
  photo_url: string | null;
  classroom_name: string;
  classroom_id: string;
  teacher_name: string | null;
}

interface BriefingResponse {
  child: ChildHeader;
  briefing: string;
  generated_at: string;
  data_age_days: number;
  has_data: boolean;
}

interface AnswerExchange {
  question: string;
  answer: string;
  asked_at: string; // ISO
  pending?: boolean;
  error?: string;
}

export default function ChildBriefingPage() {
  const params = useParams();
  const router = useRouter();
  const childId = params.childId as string;

  const [briefing, setBriefing] = useState<BriefingResponse | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(true);
  const [briefingError, setBriefingError] = useState<string | null>(null);

  const [question, setQuestion] = useState('');
  const [exchanges, setExchanges] = useState<AnswerExchange[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const answerScrollRef = useRef<HTMLDivElement>(null);

  // ── Load briefing on mount ──────────────────────────────────────────
  const loadBriefing = (silent = false) => {
    if (!silent) setBriefingLoading(true);
    setBriefingError(null);
    fetch(`/api/montree/admin/child-briefing/${childId}`, {
      credentials: 'include',
      cache: silent ? 'reload' : 'default',
    })
      .then(async (res) => {
        if (res.status === 401) {
          router.replace('/montree/login-select');
          return null;
        }
        if (res.status === 402) {
          setBriefingError(
            'AI briefings require a paid AI tier. Please contact support to upgrade.'
          );
          return null;
        }
        if (res.status === 403) {
          setBriefingError("You don't have access to this child.");
          return null;
        }
        if (res.status === 404) {
          setBriefingError("We couldn't find that child.");
          return null;
        }
        if (!res.ok) {
          setBriefingError("Couldn't load the briefing. Please try again.");
          return null;
        }
        return res.json();
      })
      .then((data: BriefingResponse | null) => {
        if (data) setBriefing(data);
      })
      .catch((err) => {
        console.error('[child briefing] fetch error', err);
        setBriefingError('Network error. Please try again.');
      })
      .finally(() => setBriefingLoading(false));
  };

  useEffect(() => {
    if (!childId) return;
    loadBriefing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId]);

  // ── Submit a parent question ─────────────────────────────────────────
  const submitQuestion = async () => {
    const trimmed = question.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    const askedAt = new Date().toISOString();

    // Optimistic placeholder
    setExchanges((prev) => [
      ...prev,
      { question: trimmed, answer: '', asked_at: askedAt, pending: true },
    ]);
    setQuestion('');

    try {
      const res = await fetch('/api/montree/admin/parent-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ child_id: childId, question: trimmed }),
      });

      if (res.status === 402) {
        setExchanges((prev) =>
          prev.map((ex) =>
            ex.asked_at === askedAt
              ? {
                  ...ex,
                  pending: false,
                  error:
                    'Answers require a paid AI tier. Please contact support to upgrade.',
                }
              : ex
          )
        );
        return;
      }

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        setExchanges((prev) =>
          prev.map((ex) =>
            ex.asked_at === askedAt
              ? {
                  ...ex,
                  pending: false,
                  error:
                    payload?.error || "I couldn't answer that. Please try rephrasing.",
                }
              : ex
          )
        );
        return;
      }

      const data = await res.json();
      const answer: string = (data?.answer || '').trim();
      setExchanges((prev) =>
        prev.map((ex) =>
          ex.asked_at === askedAt
            ? { ...ex, pending: false, answer }
            : ex
        )
      );

      // Scroll the latest exchange into view after a beat
      setTimeout(() => {
        answerScrollRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'end',
        });
      }, 60);
    } catch (err) {
      console.error('[parent question] error', err);
      setExchanges((prev) =>
        prev.map((ex) =>
          ex.asked_at === askedAt
            ? {
                ...ex,
                pending: false,
                error: 'Network error. Please try again.',
              }
            : ex
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      submitQuestion();
    }
  };

  return (
    <div style={{ fontFamily: T.sans, color: T.textPrimary }}>
      {/* Back link */}
      <button
        type="button"
        onClick={() => router.push('/montree/admin')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: 'transparent',
          border: 'none',
          color: T.emeraldDim,
          cursor: 'pointer',
          padding: 0,
          fontSize: 13,
          fontFamily: T.sans,
          marginBottom: 22,
        }}
      >
        <ArrowLeft size={16} strokeWidth={1.75} />
        Find another child
      </button>

      {/* Header — name, photo, classroom, teacher */}
      <Header
        loading={briefingLoading && !briefing}
        child={briefing?.child || null}
      />

      {/* Briefing body */}
      <div
        style={{
          background: T.cardBg,
          backdropFilter: 'blur(18px)',
          border: T.cardBorder,
          borderRadius: 18,
          padding: '26px 28px',
          marginBottom: 28,
          minHeight: 200,
        }}
      >
        {briefingLoading ? (
          <BriefingSkeleton />
        ) : briefingError ? (
          <ErrorBlock
            message={briefingError}
            onRetry={() => loadBriefing(true)}
          />
        ) : briefing ? (
          <BriefingProse
            text={briefing.briefing}
            dataAgeDays={briefing.data_age_days}
            hasData={briefing.has_data}
            onRefresh={() => loadBriefing(true)}
          />
        ) : null}
      </div>

      {/* Q&A section */}
      <div ref={answerScrollRef}>
        {exchanges.length > 0 && (
          <div style={{ marginBottom: 22 }}>
            {exchanges.map((ex) => (
              <ExchangeCard key={ex.asked_at} exchange={ex} />
            ))}
          </div>
        )}

        {/* Question input */}
        <div
          style={{
            background: T.cardBgStrong,
            backdropFilter: 'blur(18px)',
            border: T.cardBorder,
            borderRadius: 18,
            padding: '20px 22px',
          }}
        >
          <label
            htmlFor="parent-question"
            style={{
              display: 'block',
              fontSize: 11,
              fontWeight: 600,
              color: T.emeraldDim,
              textTransform: 'uppercase',
              letterSpacing: 1.4,
              marginBottom: 10,
            }}
          >
            What did the parent ask?
          </label>
          <textarea
            id="parent-question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              briefing?.child?.name
                ? `e.g. How is ${briefing.child.name} doing this week? Has she been calmer?`
                : 'Paste their question here…'
            }
            rows={3}
            maxLength={800}
            disabled={submitting || !briefing || !!briefingError}
            style={{
              width: '100%',
              padding: '14px 16px',
              background: T.inputBg,
              border: T.inputBorder,
              borderRadius: 12,
              color: T.textPrimary,
              fontFamily: T.sans,
              fontSize: 15,
              outline: 'none',
              resize: 'vertical',
              lineHeight: 1.55,
              opacity: submitting || !briefing || briefingError ? 0.6 : 1,
            }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 12,
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: T.textMuted,
              }}
            >
              {question.length}/800 · ⌘/Ctrl + Enter to send
            </span>
            <button
              type="button"
              onClick={submitQuestion}
              disabled={
                submitting || !question.trim() || !briefing || !!briefingError
              }
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '11px 22px',
                background: T.emerald,
                color: '#0a1a0f',
                border: 'none',
                borderRadius: 999,
                fontFamily: T.sans,
                fontSize: 14,
                fontWeight: 600,
                cursor:
                  submitting || !question.trim() || !briefing || briefingError
                    ? 'not-allowed'
                    : 'pointer',
                opacity:
                  submitting || !question.trim() || !briefing || briefingError
                    ? 0.4
                    : 1,
              }}
            >
              <Send size={14} strokeWidth={2} />
              {submitting ? 'Thinking…' : 'Get an answer'}
            </button>
          </div>
        </div>

        <p
          style={{
            fontSize: 12,
            color: T.textMuted,
            marginTop: 14,
            lineHeight: 1.55,
            textAlign: 'center',
          }}
        >
          Answers are grounded in the briefing above. If something requires
          checking with the teacher, the answer will say so.
        </p>
      </div>
    </div>
  );
}

// ── Subcomponents ────────────────────────────────────────────────────────

function Header({
  loading,
  child,
}: {
  loading: boolean;
  child: ChildHeader | null;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        marginBottom: 24,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: child?.photo_url
            ? `url(${child.photo_url}) center/cover`
            : T.emeraldSoft,
          border: '1px solid rgba(52,211,153,0.28)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: T.emerald,
          fontFamily: T.serif,
          fontSize: 26,
          fontWeight: 500,
          flexShrink: 0,
        }}
      >
        {!loading && child && !child.photo_url
          ? child.name.charAt(0).toUpperCase()
          : ''}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1
          style={{
            fontFamily: T.serif,
            fontSize: 'clamp(24px, 3.4vw, 32px)',
            fontWeight: 500,
            letterSpacing: -0.4,
            color: T.textPrimary,
            margin: 0,
            lineHeight: 1.1,
          }}
        >
          {loading ? ' ' : child?.name || 'Child'}
        </h1>
        {!loading && child && (
          <p
            style={{
              fontSize: 13,
              color: T.textSecondary,
              marginTop: 6,
              margin: '6px 0 0',
            }}
          >
            {child.classroom_name}
            {child.teacher_name ? ` · ${child.teacher_name}` : ''}
            {child.age != null ? ` · age ${child.age}` : ''}
          </p>
        )}
      </div>
    </div>
  );
}

function BriefingProse({
  text,
  dataAgeDays,
  hasData,
  onRefresh,
}: {
  text: string;
  dataAgeDays: number;
  hasData: boolean;
  onRefresh: () => void;
}) {
  // Split on blank lines into paragraphs
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: T.emeraldDim,
          textTransform: 'uppercase',
          letterSpacing: 1.4,
          marginBottom: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>30-second briefing</span>
        <button
          type="button"
          onClick={onRefresh}
          aria-label="Refresh briefing"
          style={{
            background: 'transparent',
            border: 'none',
            color: T.emeraldDim,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 1.2,
            padding: 4,
            textTransform: 'uppercase',
          }}
        >
          <RefreshCw size={12} strokeWidth={1.75} />
          Refresh
        </button>
      </div>
      {paragraphs.map((p, i) => (
        <p
          key={i}
          style={{
            fontFamily: T.serif,
            fontSize: 17,
            lineHeight: 1.7,
            color: T.textPrimary,
            margin: i === 0 ? '0 0 16px' : '0 0 16px',
          }}
        >
          {p}
        </p>
      ))}
      {hasData && dataAgeDays > 7 && (
        <div
          style={{
            marginTop: 6,
            fontSize: 12,
            color: T.goldDim,
            background: T.goldSoft,
            border: '1px solid rgba(232,201,106,0.18)',
            borderRadius: 10,
            padding: '8px 12px',
          }}
        >
          Most recent observation is {dataAgeDays} days old. Worth checking in
          with the teacher before relying on this in a parent conversation.
        </div>
      )}
    </div>
  );
}

function BriefingSkeleton() {
  return (
    <div>
      <div
        style={{
          height: 14,
          width: 140,
          background: 'rgba(52,211,153,0.10)',
          borderRadius: 6,
          marginBottom: 18,
        }}
      />
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ marginBottom: 14 }}>
          {[0, 1, 2].map((j) => (
            <div
              key={j}
              style={{
                height: 14,
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 6,
                marginBottom: 8,
                width: j === 2 ? '70%' : '100%',
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function ErrorBlock({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div style={{ textAlign: 'center', padding: '20px 10px' }}>
      <p
        style={{
          color: T.textSecondary,
          fontSize: 14,
          lineHeight: 1.55,
          marginBottom: 16,
        }}
      >
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        style={{
          padding: '10px 22px',
          background: T.emerald,
          color: '#0a1a0f',
          border: 'none',
          borderRadius: 999,
          fontFamily: T.sans,
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Try again
      </button>
    </div>
  );
}

function ExchangeCard({ exchange }: { exchange: AnswerExchange }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {/* The question */}
      <div
        style={{
          padding: '12px 16px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 12,
          marginBottom: 10,
          fontSize: 14,
          lineHeight: 1.55,
          color: T.textSecondary,
          fontStyle: 'italic',
        }}
      >
        “{exchange.question}”
      </div>

      {/* The answer */}
      <div
        style={{
          padding: '18px 20px',
          background: T.cardBgStrong,
          backdropFilter: 'blur(18px)',
          border: '1px solid rgba(52,211,153,0.25)',
          borderRadius: 14,
        }}
      >
        {exchange.pending ? (
          <div
            style={{
              color: T.textMuted,
              fontSize: 14,
              fontStyle: 'italic',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: T.emerald,
                marginRight: 8,
                animation: 'pulse 1.2s ease-in-out infinite',
              }}
            />
            Composing an answer…
            <style jsx>{`
              @keyframes pulse {
                0%,
                100% {
                  opacity: 0.4;
                }
                50% {
                  opacity: 1;
                }
              }
            `}</style>
          </div>
        ) : exchange.error ? (
          <div
            style={{
              color: '#f87171',
              fontSize: 14,
              lineHeight: 1.55,
            }}
          >
            {exchange.error}
          </div>
        ) : (
          <div
            style={{
              fontFamily: T.serif,
              fontSize: 16,
              lineHeight: 1.65,
              color: T.textPrimary,
              whiteSpace: 'pre-wrap',
            }}
          >
            {exchange.answer}
          </div>
        )}
      </div>
    </div>
  );
}
