// /components/montree/messaging/MessageCard.tsx
// Individual message card for inbox display

'use client';

import { useState } from 'react';

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

export function MessageCard({
  message,
  childName,
  onRead,
  onReply,
  isTeacher,
}: MessageCardProps) {
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

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
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
  const badgeColor = isFromTeacher
    ? 'bg-emerald-100 text-emerald-700'
    : 'bg-sky-100 text-sky-700';
  const avatarColor = isFromTeacher
    ? 'bg-gradient-to-br from-emerald-400 to-teal-500'
    : 'bg-gradient-to-br from-sky-400 to-blue-500';

  return (
    <div
      onClick={handleCardClick}
      className={`
        transition-all duration-200 cursor-pointer
        border rounded-xl p-4
        ${
          message.is_read
            ? 'border-gray-200 bg-white hover:border-gray-300'
            : 'border-emerald-200 bg-emerald-50/50 hover:border-emerald-300'
        }
        ${isExpanded ? 'ring-2 ring-emerald-500/20' : ''}
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {/* Avatar */}
          <div
            className={`
              flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
              text-white text-sm font-semibold shadow-sm
              ${avatarColor}
            `}
          >
            {senderInitials}
          </div>

          {/* Sender info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900 text-sm">
                {message.sender_name}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeColor}`}>
                {isFromTeacher ? 'Teacher' : 'Parent'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {formatDate(message.created_at)}
            </p>
          </div>
        </div>

        {/* Unread indicator */}
        {!message.is_read && (
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0 mt-2" />
        )}
      </div>

      {/* Subject and preview */}
      <div className="mt-3 ml-13">
        {message.subject && (
          <p className="text-sm font-medium text-gray-900">
            {message.subject}
          </p>
        )}
        <p className={`text-sm leading-relaxed mt-1 line-clamp-2 ${
          message.subject ? 'text-gray-600' : 'text-gray-900'
        }`}>
          {message.message_text}
        </p>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200 space-y-3 animate-slide-up">
          {/* Full message */}
          <div>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {message.message_text}
            </p>
          </div>

          {/* Child context */}
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
            <span className="text-2xl">👶</span>
            <span className="text-sm text-gray-700 font-medium">{childName}</span>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            {onReply && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onReply(message);
                }}
                className="flex-1 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-medium rounded-lg transition-colors duration-200"
              >
                ↩️ Reply
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
