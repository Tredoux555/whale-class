// /components/montree/messaging/MessageCard.tsx
// Individual message card for inbox display
// Dark forest visual treatment — all wiring intact

'use client';

import { useState } from 'react';
import { CornerUpLeft, User } from 'lucide-react';
import { useI18n } from '@/lib/montree/i18n';
import { getIntlLocale } from '@/lib/montree/i18n/locales';

interface Message {
  id: string;
  sender_name: string;
  sender_type: 'teacher' | 'parent';
  subject?: string;
  message_text: string;
  is_read: boolean;
  created_at: string;
}

interface MessageCardProps {
  message: Message;
  childName: string;
  onRead?: (id: string) => void;
  onReply?: (message: Message) => void;
  isTeacher?: boolean;
}

const T = {
  cardBg: 'rgba(255,255,255,0.06)',
  cardBgUnread: 'rgba(52,211,153,0.08)',
  cardBorder: 'rgba(255,255,255,0.10)',
  cardBorderUnread: 'rgba(52,211,153,0.30)',
  cardRadius: 14,
  blur: 'blur(14px) saturate(140%)',
  emerald: '#34d399',
  emeraldStrong: 'rgba(52,211,153,0.18)',
  blue: '#60a5fa',
  blueStrong: 'rgba(96,165,250,0.18)',
  blueBorder: 'rgba(96,165,250,0.40)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: '"Lora", Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

export function MessageCard({
  message,
  childName,
  onRead,
  onReply,
}: MessageCardProps) {
  const { t, locale } = useI18n();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCardClick = () => {
    if (!message.is_read && onRead) {
      onRead(message.id);
    }
    setIsExpanded(!isExpanded);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return t('messaging.justNow');
    if (diffMins < 60) return t('messaging.minutesAgo').replace('{m}', diffMins.toString());
    if (diffHours < 24) return t('messaging.hoursAgo').replace('{h}', diffHours.toString());
    if (diffDays < 7) return t('messaging.daysAgo').replace('{d}', diffDays.toString());

    return date.toLocaleDateString(getIntlLocale(locale), {
      month: 'short',
      day: 'numeric',
    });
  };

  const senderInitials = message.sender_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase();

  const isFromTeacher = message.sender_type === 'teacher';
  const badgeBg = isFromTeacher ? T.emeraldStrong : T.blueStrong;
  const badgeBorder = isFromTeacher ? 'rgba(52,211,153,0.40)' : T.blueBorder;
  const badgeColor = isFromTeacher ? T.emerald : T.blue;
  const avatarBg = isFromTeacher
    ? 'linear-gradient(135deg, #34d399, #10b981)'
    : 'linear-gradient(135deg, #60a5fa, #3b82f6)';

  return (
    <div
      onClick={handleCardClick}
      style={{
        cursor: 'pointer',
        padding: 16,
        borderRadius: T.cardRadius,
        background: message.is_read ? T.cardBg : T.cardBgUnread,
        border: `1px solid ${message.is_read ? T.cardBorder : T.cardBorderUnread}`,
        backdropFilter: T.blur,
        WebkitBackdropFilter: T.blur,
        boxShadow: isExpanded ? `0 0 0 2px rgba(52,211,153,0.20)` : 'none',
        transition: 'all 200ms ease',
        fontFamily: T.sans,
        color: T.textPrimary,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, minWidth: 0, flex: 1 }}>
          <div
            style={{
              flexShrink: 0,
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: avatarBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#06281a',
              fontFamily: T.sans,
              fontSize: 13,
              fontWeight: 700,
              boxShadow: '0 4px 12px rgba(0,0,0,0.20)',
            }}
          >
            {senderInitials || <User size={16} strokeWidth={1.75} />}
          </div>

          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{
                fontFamily: T.sans,
                fontSize: 13,
                fontWeight: 600,
                color: T.textPrimary,
              }}>
                {message.sender_name}
              </span>
              <span style={{
                fontFamily: T.sans,
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 999,
                background: badgeBg,
                border: `1px solid ${badgeBorder}`,
                color: badgeColor,
                letterSpacing: 0.3,
              }}>
                {isFromTeacher ? t('messaging.teacher') : t('messaging.parent')}
              </span>
            </div>
            <p style={{
              margin: '3px 0 0',
              fontFamily: T.sans,
              fontSize: 11,
              color: T.textMuted,
            }}>
              {formatDate(message.created_at)}
            </p>
          </div>
        </div>

        {!message.is_read && (
          <span style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: T.emerald,
            flexShrink: 0,
            marginTop: 6,
            boxShadow: '0 0 0 3px rgba(52,211,153,0.25)',
          }} />
        )}
      </div>

      <div style={{ marginTop: 12, marginLeft: 52 }}>
        {message.subject && (
          <p style={{
            margin: 0,
            fontFamily: T.sans,
            fontSize: 13,
            fontWeight: 600,
            color: T.textPrimary,
          }}>
            {message.subject}
          </p>
        )}
        <p style={{
          margin: message.subject ? '4px 0 0' : 0,
          fontFamily: T.sans,
          fontSize: 13,
          lineHeight: 1.55,
          color: message.subject ? T.textSecondary : T.textPrimary,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {message.message_text}
        </p>
      </div>

      {isExpanded && (
        <div style={{
          marginTop: 16,
          paddingTop: 16,
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          <p style={{
            margin: 0,
            fontFamily: T.sans,
            fontSize: 13.5,
            lineHeight: 1.6,
            color: T.textPrimary,
            whiteSpace: 'pre-wrap',
          }}>
            {message.message_text}
          </p>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            borderRadius: 10,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <User size={13} strokeWidth={1.75} color={T.emerald} />
            <span style={{
              fontFamily: T.sans,
              fontSize: 12,
              fontWeight: 600,
              color: T.textPrimary,
            }}>
              {childName}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
            {onReply && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onReply(message);
                }}
                style={{
                  flex: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 10,
                  background: T.emeraldStrong,
                  border: '1px solid rgba(52,211,153,0.40)',
                  color: T.emerald,
                  fontFamily: T.sans,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 120ms ease',
                }}
              >
                <CornerUpLeft size={12} strokeWidth={1.75} />
                {t('messaging.reply')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
