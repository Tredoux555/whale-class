// components/montree/guru/ChatBubble.tsx
// Single chat message bubble for the Guru conversational thread
'use client';

import { useState, useEffect, useRef, memo } from 'react';
import { useI18n } from '@/lib/montree/i18n';

interface ChatBubbleProps {
  content: string;
  isUser: boolean;
  timestamp?: string;
  imageUrl?: string;
  thinking?: string;       // Extended thinking text from AI
  isThinkingLive?: boolean; // true while thinking is still streaming in
  isTeacher?: boolean;      // true for teacher theme (warm earth tones), false for parent theme (botanical green)
}

function formatRelativeTime(dateStr: string, t: (key: string, params?: Record<string, string | number>) => string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return t('time.justNow');
  if (diffMins < 60) return t('time.minutesAgo', { count: diffMins });
  if (diffHours < 24) return t('time.hoursAgo', { count: diffHours });
  if (diffDays === 1) return t('time.yesterday');
  if (diffDays < 7) return t('time.daysAgo', { count: diffDays });
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Render inline bold (**text**) and bullet points from Guru response */
function renderMarkdown(text: string) {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    // Bullet points
    if (line.startsWith('- ') || line.startsWith('* ')) {
      return (
        <li key={i} className="ml-4 list-disc text-sm leading-relaxed">
          {renderInlineBold(line.slice(2))}
        </li>
      );
    }
    // Numbered items
    if (/^\d+\.\s/.test(line)) {
      return (
        <li key={i} className="ml-4 list-decimal text-sm leading-relaxed">
          {renderInlineBold(line.replace(/^\d+\.\s/, ''))}
        </li>
      );
    }
    // Empty line
    if (line.trim() === '') {
      return <div key={i} className="h-2" />;
    }
    // Regular text
    return (
      <p key={i} className="text-sm leading-relaxed">
        {renderInlineBold(line)}
      </p>
    );
  });
}

function renderInlineBold(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

function ChatBubble({ content, isUser, timestamp, imageUrl, thinking, isThinkingLive, isTeacher = false }: ChatBubbleProps) {
  const { t } = useI18n();
  const [imgError, setImgError] = useState(false);
  const [thinkingExpanded, setThinkingExpanded] = useState(false);
  const thinkingRef = useRef<HTMLDivElement>(null);

  const showThinking = thinking && thinking.trim().length > 0;

  // Thinking block colors based on theme
  const thinkingColors = isTeacher
    ? {
        liveGradient: 'bg-[rgba(139,92,246,0.08)]',
        liveBorder: 'border-[rgba(139,92,246,0.25)]',
        liveDot: 'bg-[#34d399]',
        liveText: 'text-[#34d399]',
        liveContent: 'text-white/70',
        liveCursor: 'bg-[#34d399]/60',
        collapsedButton: 'text-white/40 hover:text-white/70',
        collapsedBg: 'bg-[rgba(255,255,255,0.04)]',
        collapsedBorder: 'border-[rgba(255,255,255,0.10)]',
        collapsedText: 'text-white/50',
      }
    : {
        liveGradient: 'bg-gradient-to-br from-[#0D3330]/10 to-[#164340]/10',
        liveBorder: 'border-[#0D3330]/10',
        liveDot: 'bg-[#0D3330]',
        liveText: 'text-[#0D3330]/70',
        liveContent: 'text-[#0D3330]/70',
        liveCursor: 'bg-[#0D3330]/60',
        collapsedButton: 'text-[#0D3330]/50 hover:text-[#0D3330]',
        collapsedBg: 'bg-[#0D3330]/5',
        collapsedBorder: 'border-[#0D3330]/10',
        collapsedText: 'text-[#0D3330]/50',
      };

  // Auto-scroll thinking block as it streams
  useEffect(() => {
    if (isThinkingLive && thinkingRef.current) {
      thinkingRef.current.scrollTop = thinkingRef.current.scrollHeight;
    }
  }, [thinking, isThinkingLive]);

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      {/* Guru avatar */}
      {!isUser && (
        <div
          className={!isTeacher ? "flex-shrink-0 w-8 h-8 rounded-full bg-[#0D3330] flex items-center justify-center mr-2 mt-1" : undefined}
          style={isTeacher ? {
            flexShrink: 0, width: 28, height: 28, borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(52,211,153,0.30), rgba(16,185,129,0.18))',
            border: '1px solid rgba(52,211,153,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginRight: 8, marginTop: 4,
          } : undefined}
        >
          {isTeacher
            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
            : <span className="text-sm">🌿</span>
          }
        </div>
      )}

      <div className={`max-w-[85%] ${isUser ? 'order-1' : ''}`}>
        {/* THINKING BLOCK — visible while live, collapsible after done */}
        {!isUser && showThinking && (
          <div className="mb-2">
            {isThinkingLive ? (
              /* LIVE THINKING — fully visible, auto-scrolling, prominent */
              <div
                ref={thinkingRef}
                className={`${thinkingColors.liveGradient} border ${thinkingColors.liveBorder} rounded-2xl rounded-bl-md px-4 py-3 shadow-sm max-h-64 overflow-y-auto`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={`inline-block w-2 h-2 rounded-full ${thinkingColors.liveDot} animate-pulse`} />
                  <span className={`text-[11px] font-semibold ${thinkingColors.liveText} uppercase tracking-wider`}>
                    Thinking
                  </span>
                </div>
                <p className={`text-[13px] leading-relaxed ${thinkingColors.liveContent} whitespace-pre-wrap`}>
                  {thinking}
                  <span className={`inline-block w-1.5 h-4 ${thinkingColors.liveCursor} animate-pulse rounded-sm ml-0.5 align-middle`} />
                </p>
              </div>
            ) : (
              /* COMPLETED THINKING — collapsed with toggle */
              <div>
                <button
                  onClick={() => setThinkingExpanded(!thinkingExpanded)}
                  className={`flex items-center gap-1.5 text-[11px] ${thinkingColors.collapsedButton} transition-colors mb-1 ml-1`}
                >
                  <svg
                    className={`w-3 h-3 transition-transform duration-200 ${thinkingExpanded ? 'rotate-90' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                  <span>{t('guru.viewThinking') || 'View thinking'}</span>
                </button>
                {thinkingExpanded && (
                  <div
                    ref={thinkingRef}
                    className={`${thinkingColors.collapsedBg} border ${thinkingColors.collapsedBorder} rounded-xl px-3 py-2 mb-1 max-h-48 overflow-y-auto`}
                  >
                    <p className={`text-[12px] leading-relaxed ${thinkingColors.collapsedText} whitespace-pre-wrap`}>
                      {thinking}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div
          className={!isTeacher ? `rounded-2xl px-4 py-3 ${
            isUser
              ? 'bg-[#F5E6D3] text-[#0D3330] rounded-br-md'
              : 'bg-white border border-[#0D3330]/10 text-[#0D3330] rounded-bl-md shadow-sm'
          }` : undefined}
          style={isTeacher ? {
            borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
            padding: '12px 16px',
            background: isUser ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${isUser ? 'rgba(52,211,153,0.35)' : 'rgba(255,255,255,0.10)'}`,
            backdropFilter: 'blur(18px) saturate(140%)',
            WebkitBackdropFilter: 'blur(18px) saturate(140%)',
            color: 'rgba(255,255,255,0.95)',
            fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: 14.5,
            lineHeight: 1.55,
          } : undefined}
        >
          {/* Image attachment */}
          {imageUrl && !imgError && (
            <div className="mb-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="Attached image" className="max-w-full max-h-48 rounded-lg object-contain" onError={() => setImgError(true)} />
            </div>
          )}
          {isUser ? (
            <p className="text-sm leading-relaxed">{content}</p>
          ) : content ? (
            <div className="space-y-0.5">{renderMarkdown(content)}</div>
          ) : isThinkingLive ? (
            /* Show nothing in the text bubble while thinking is live — the thinking block is visible above */
            <span
              className={!isTeacher ? "text-[11px] text-[#0D3330]/30 italic" : "text-[11px] italic"}
              style={isTeacher ? { color: 'rgba(255,255,255,0.35)' } : undefined}
            >{t('guru.thinkingGenerating') || 'Generating response...'}</span>
          ) : (
            <span
              className={!isTeacher ? "inline-block w-2 h-4 bg-[#0D3330]/40 animate-pulse rounded-sm" : "inline-block w-2 h-4 animate-pulse rounded-sm"}
              style={isTeacher ? { background: 'rgba(255,255,255,0.40)' } : undefined}
            />
          )}
        </div>

        {timestamp && (
          <p
            className={!isTeacher ? `text-[10px] text-[#0D3330]/40 mt-1 ${isUser ? 'text-right' : 'text-left ml-1'}` : undefined}
            style={isTeacher ? {
              fontFamily: '"Inter", sans-serif',
              fontSize: 10,
              color: 'rgba(255,255,255,0.35)',
              marginTop: 4,
              textAlign: isUser ? 'right' : 'left',
              paddingLeft: isUser ? 0 : 4,
            } : undefined}
          >
            {formatRelativeTime(timestamp, t)}
          </p>
        )}
      </div>
    </div>
  );
}

// PERF: Memoize to prevent re-rendering all previous messages when a new one is added
export default memo(ChatBubble);
