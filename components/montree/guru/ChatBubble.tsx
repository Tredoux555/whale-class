// components/montree/guru/ChatBubble.tsx
// Single chat message bubble for the Guru conversational thread
'use client';

import { useI18n } from '@/lib/montree/i18n';

interface ChatBubbleProps {
  content: string;
  isUser: boolean;
  timestamp?: string;
}

function formatRelativeTime(dateStr: string, t: any): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return t('time.justNow');
  if (diffMins < 60) return t('time.minutesAgo').replace('{minutes}', diffMins.toString());
  if (diffHours < 24) return t('time.hoursAgo').replace('{hours}', diffHours.toString());
  if (diffDays === 1) return t('time.yesterday');
  if (diffDays < 7) return t('time.daysAgo').replace('{days}', diffDays.toString());
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

export default function ChatBubble({ content, isUser, timestamp }: ChatBubbleProps) {
  const { t } = useI18n();
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      {/* Guru avatar */}
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#0D3330] flex items-center justify-center mr-2 mt-1">
          <span className="text-sm">🌿</span>
        </div>
      )}

      <div className={`max-w-[80%] ${isUser ? 'order-1' : ''}`}>
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? 'bg-[#F5E6D3] text-[#0D3330] rounded-br-md'
              : 'bg-white border border-[#0D3330]/10 text-[#0D3330] rounded-bl-md shadow-sm'
          }`}
        >
          {isUser ? (
            <p className="text-sm leading-relaxed">{content}</p>
          ) : (
            <div className="space-y-0.5">{renderMarkdown(content)}</div>
          )}
        </div>

        {timestamp && (
          <p className={`text-[10px] text-[#0D3330]/40 mt-1 ${isUser ? 'text-right' : 'text-left ml-1'}`}>
            {formatRelativeTime(timestamp, t)}
          </p>
        )}
      </div>
    </div>
  );
}
