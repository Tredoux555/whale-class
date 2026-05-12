// components/montree/guru/ChatBubble.tsx
// Single chat message bubble for the Guru conversational thread
// Dark forest visual treatment — uniform across teacher / parent / admin
// All wiring intact (props signature, memoization, scroll-to-bottom on stream)
'use client';

import { useState, useEffect, useRef, memo } from 'react';
import { ChevronRight, Sparkles } from 'lucide-react';
import { useI18n } from '@/lib/montree/i18n';

interface ChatBubbleProps {
  content: string;
  isUser: boolean;
  timestamp?: string;
  imageUrl?: string;
  thinking?: string;
  isThinkingLive?: boolean;
  /**
   * Kept for backwards compatibility with consumers — both teacher and
   * parent themes now render the same dark forest aesthetic. The flag is
   * still accepted so existing call sites compile and we keep room to
   * diverge later if needed.
   */
  isTeacher?: boolean;
}

const T = {
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  emerald: '#34d399',
  emeraldStrong: 'rgba(52,211,153,0.18)',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  violetSoft: 'rgba(139,92,246,0.10)',
  violetBorder: 'rgba(139,92,246,0.30)',
  violet: '#c4b5fd',
  blur: 'blur(18px) saturate(140%)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

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

function renderInlineBold(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

function renderMarkdown(text: string) {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    if (line.startsWith('- ') || line.startsWith('* ')) {
      return (
        <li
          key={i}
          style={{
            marginLeft: 18,
            listStyle: 'disc',
            fontFamily: T.sans,
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          {renderInlineBold(line.slice(2))}
        </li>
      );
    }
    if (/^\d+\.\s/.test(line)) {
      return (
        <li
          key={i}
          style={{
            marginLeft: 18,
            listStyle: 'decimal',
            fontFamily: T.sans,
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          {renderInlineBold(line.replace(/^\d+\.\s/, ''))}
        </li>
      );
    }
    if (line.trim() === '') {
      return <div key={i} style={{ height: 8 }} />;
    }
    return (
      <p key={i} style={{ margin: 0, fontFamily: T.sans, fontSize: 14, lineHeight: 1.6 }}>
        {renderInlineBold(line)}
      </p>
    );
  });
}

function ChatBubble({ content, isUser, timestamp, imageUrl, thinking, isThinkingLive }: ChatBubbleProps) {
  const { t } = useI18n();
  const [imgError, setImgError] = useState(false);
  const [thinkingExpanded, setThinkingExpanded] = useState(false);
  const thinkingRef = useRef<HTMLDivElement>(null);

  const showThinking = thinking && thinking.trim().length > 0;

  useEffect(() => {
    if (isThinkingLive && thinkingRef.current) {
      thinkingRef.current.scrollTop = thinkingRef.current.scrollHeight;
    }
  }, [thinking, isThinkingLive]);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: 12,
        fontFamily: T.sans,
      }}
    >
      {/* Guru avatar (assistant only) */}
      {!isUser && (
        <div
          style={{
            flexShrink: 0,
            width: 30,
            height: 30,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(52,211,153,0.32), rgba(16,185,129,0.18))',
            border: '1px solid rgba(52,211,153,0.40)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 8,
            marginTop: 4,
            color: T.emerald,
          }}
        >
          <Sparkles size={14} strokeWidth={1.75} />
        </div>
      )}

      <div style={{ maxWidth: '85%', order: isUser ? 1 : 0 }}>
        {/* Thinking block (assistant only) */}
        {!isUser && showThinking && (
          <div style={{ marginBottom: 8 }}>
            {isThinkingLive ? (
              <div
                ref={thinkingRef}
                style={{
                  background: T.violetSoft,
                  border: `1px solid ${T.violetBorder}`,
                  borderRadius: '14px 14px 14px 4px',
                  padding: '12px 16px',
                  maxHeight: 256,
                  overflowY: 'auto',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.20)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: T.violet,
                      animation: 'cb-pulse 1.4s ease-in-out infinite',
                    }}
                  />
                  <span
                    style={{
                      fontFamily: T.sans,
                      fontSize: 11,
                      fontWeight: 700,
                      color: T.violet,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}
                  >
                    Thinking
                  </span>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontFamily: T.sans,
                    fontSize: 13,
                    lineHeight: 1.6,
                    color: T.textSecondary,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {thinking}
                  <span
                    style={{
                      display: 'inline-block',
                      width: 6,
                      height: 16,
                      background: 'rgba(196,181,253,0.65)',
                      borderRadius: 2,
                      marginLeft: 2,
                      verticalAlign: 'middle',
                      animation: 'cb-pulse 1.2s ease-in-out infinite',
                    }}
                  />
                </p>
                <style>{`@keyframes cb-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.45; } }`}</style>
              </div>
            ) : (
              <div>
                <button
                  onClick={() => setThinkingExpanded(!thinkingExpanded)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '3px 8px 3px 4px',
                    marginBottom: 4,
                    marginLeft: 4,
                    background: 'transparent',
                    border: 'none',
                    color: T.textMuted,
                    fontFamily: T.sans,
                    fontSize: 11,
                    cursor: 'pointer',
                    transition: 'color 120ms ease',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = T.textSecondary)}
                  onMouseLeave={e => (e.currentTarget.style.color = T.textMuted)}
                >
                  <ChevronRight
                    size={11}
                    strokeWidth={2}
                    style={{
                      transition: 'transform 200ms ease',
                      transform: thinkingExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                    }}
                  />
                  <span>{t('guru.viewThinking') || 'View thinking'}</span>
                </button>
                {thinkingExpanded && (
                  <div
                    ref={thinkingRef}
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.10)',
                      borderRadius: 12,
                      padding: '10px 12px',
                      marginBottom: 4,
                      maxHeight: 192,
                      overflowY: 'auto',
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontFamily: T.sans,
                        fontSize: 12,
                        lineHeight: 1.6,
                        color: T.textMuted,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {thinking}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Message bubble */}
        <div
          style={{
            borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
            padding: '12px 16px',
            background: isUser ? 'rgba(52,211,153,0.14)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${isUser ? 'rgba(52,211,153,0.40)' : 'rgba(255,255,255,0.10)'}`,
            backdropFilter: T.blur,
            WebkitBackdropFilter: T.blur,
            color: T.textPrimary,
            fontFamily: T.sans,
            fontSize: 14,
            lineHeight: 1.55,
          }}
        >
          {imageUrl && !imgError && (
            <div style={{ marginBottom: 8 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="Attached"
                onError={() => setImgError(true)}
                style={{
                  maxWidth: '100%',
                  maxHeight: 192,
                  borderRadius: 10,
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
            </div>
          )}

          {isUser ? (
            <p style={{ margin: 0, fontFamily: T.sans, fontSize: 14, lineHeight: 1.55 }}>
              {content}
            </p>
          ) : content ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {renderMarkdown(content)}
            </div>
          ) : isThinkingLive ? (
            <span
              style={{
                fontFamily: T.sans,
                fontSize: 11,
                color: T.textMuted,
                fontStyle: 'italic',
              }}
            >
              {t('guru.thinkingGenerating') || 'Generating response...'}
            </span>
          ) : (
            <span
              style={{
                display: 'inline-block',
                width: 8,
                height: 16,
                background: 'rgba(255,255,255,0.40)',
                borderRadius: 2,
                animation: 'cb-pulse 1.2s ease-in-out infinite',
              }}
            />
          )}
        </div>

        {timestamp && (
          <p
            style={{
              margin: '4px 0 0',
              fontFamily: T.sans,
              fontSize: 10,
              color: T.textMuted,
              textAlign: isUser ? 'right' : 'left',
              paddingLeft: isUser ? 0 : 4,
              paddingRight: isUser ? 4 : 0,
            }}
          >
            {formatRelativeTime(timestamp, t)}
          </p>
        )}
      </div>
    </div>
  );
}

export default memo(ChatBubble);
